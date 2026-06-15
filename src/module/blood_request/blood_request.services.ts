import catchError from "../../app/error/catchError";
import { encrypt } from "../../utility/encryptionHelper/CeyptoSecurity";
import blood_requests from "../blood_request/blood_request.model";
import { PipelineStage } from "mongoose";
import NodeCache from "node-cache";


const CACHE_TTL = {
  critical: 30,    // 30 seconds — life-threatening, always fresh
  urgent: 120,     // 2 minutes
  normal: 300,     // 5 minutes
  default: 300,    // fallback
};

const geoCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,  
  useClones: false,
  deleteOnExpire: true, 
});
geoCache.on("expired", (key: string, value: unknown) => {
  console.log(`⏰ Cache EXPIRED → ${key}`);
});

geoCache.on("del", (key: string, value: unknown) => {
  console.log(`🗑️ Cache DELETED → ${key}`);
});

geoCache.on("set", (key: string, value: unknown) => {
  console.log(`💾 Cache SET → ${key}`);
});

const FULL_FLUSH_INTERVAL_MS = 10 * 60 * 1000;
const fullFlushTimer = setInterval(() => {
  const keyCount = geoCache.keys().length;
  if (keyCount > 0) {
    geoCache.flushAll();
    console.log(`🔄 Scheduled full cache flush → ${keyCount} keys cleared at ${new Date().toISOString()}`);
  }
}, FULL_FLUSH_INTERVAL_MS);

fullFlushTimer.unref();

const resolveCacheTTL = (urgency?: string): number => {
  if (!urgency) return CACHE_TTL.default;
  return CACHE_TTL[urgency as keyof typeof CACHE_TTL] ?? CACHE_TTL.default;
};

const findMyLocationNearestBloodRequestIntoDb = async (
  query: Record<string, unknown>,
  generate_secret_key: string
) => {

  try {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const radius = Number(query.radius) || 10;
    const blood = query.blood as string;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const urgency = query.urgency as string | undefined;

    // ✅ TTL based on urgency in request query
    const cacheTTL = resolveCacheTTL(urgency);

    // ✅ Include urgency in cache key so different urgency filters don't collide
    const cacheKey = `blood_req:${blood}:${urgency ?? "all"}:${lat}:${lng}:${radius}:${page}:${limit}`;

    const cached = geoCache.get(cacheKey);
    if (cached) {
      const ttlRemaining = geoCache.getTtl(cacheKey);
      console.log(`✅ Cache HIT → ${cacheKey} | Expires in: ${ttlRemaining ? Math.round((ttlRemaining - Date.now()) / 1000) : "?"}s`);
      return cached;
    }


    const urgencyMatch = urgency ? { urgency } : {};

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          blood,
          ...urgencyMatch,
          isDelete: { $ne: true },
          isDonorFind: { $ne: true },
        },
      },
      {
        $addFields: {
          distance: {
            $let: {
              vars: {
                lat1: { $multiply: [lat, Math.PI / 180] },
                lat2: { $multiply: ["$locationData.lat", Math.PI / 180] },
                deltaLat: {
                  $multiply: [
                    { $subtract: ["$locationData.lat", lat] },
                    Math.PI / 180,
                  ],
                },
                deltaLng: {
                  $multiply: [
                    { $subtract: ["$locationData.lng", lng] },
                    Math.PI / 180,
                  ],
                },
              },
              in: {
                $multiply: [
                  2,
                  6371,
                  {
                    $asin: {
                      $sqrt: {
                        $add: [
                          {
                            $pow: [
                              { $sin: { $divide: ["$$deltaLat", 2] } },
                              2,
                            ],
                          },
                          {
                            $multiply: [
                              { $cos: "$$lat1" },
                              { $cos: "$$lat2" },
                              {
                                $pow: [
                                  { $sin: { $divide: ["$$deltaLng", 2] } },
                                  2,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },

          urgencyPriority: {
            $switch: {
              branches: [
                { case: { $eq: ["$urgency", "critical"] }, then: 1 },
                { case: { $eq: ["$urgency", "urgent"] }, then: 2 },
                { case: { $eq: ["$urgency", "normal"] }, then: 3 },
              ],
              default: 99,
            },
          },
        },
      },
      {
        $match: {
          distance: { $lte: radius },
        },
      },
      {
        $sort: {
          urgencyPriority: 1 as const,
          distance: 1 as const,
        },
      },
    ];

    const [requests, totalCount] = await Promise.all([
      blood_requests.aggregate([
        ...basePipeline,
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            blood: 1,
            phone: 1,
            hospital: 1,
            urgency: 1,
            bloodResuestType: 1,
            locationData: 1,
            isDonorFind: 1,
            distance: { $round: ["$distance", 2] },
          },
        },
      ]),
      blood_requests.aggregate([...basePipeline, { $count: "total" }]),
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const result = {
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        cachedUntil: new Date(Date.now() + cacheTTL * 1000).toISOString(), // ✅ Tell client when cache expires
      },
      data: requests,
    };

    geoCache.set(cacheKey, result, cacheTTL);

    return  result

  } catch (error) {
    throw catchError(error);
  }
};

const clearBloodRequestCache = (blood: string, urgency?: string) => {
  const keys = geoCache.keys();

  // ✅ If urgency passed, clear only that urgency tier's cache
  const prefix = urgency
    ? `blood_req:${blood}:${urgency}`
    : `blood_req:${blood}`;

  const matchedKeys = keys.filter((key) => key.startsWith(prefix));
  if (matchedKeys.length > 0) {
    geoCache.del(matchedKeys);
    console.log(`🗑️ Cache CLEARED → ${matchedKeys.length} keys deleted (blood: ${blood}, urgency: ${urgency ?? "all"})`);
  }
};

const clearAllCache = () => {
  const keyCount = geoCache.keys().length;
  geoCache.flushAll();
  console.log(`🗑️ Full cache cleared → ${keyCount} keys removed`);
};


const destroyCacheTimer = () => {
  clearInterval(fullFlushTimer);
  geoCache.close();
  console.log("🔌 Cache timer stopped and store closed");
};

const BloodRequestServices = {
  findMyLocationNearestBloodRequestIntoDb,
  clearBloodRequestCache,
  clearAllCache,
  destroyCacheTimer,
};

export default BloodRequestServices;