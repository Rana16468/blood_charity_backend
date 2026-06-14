import catchError from "../../app/error/catchError";
import blood_requests from "../blood_request/blood_request.model";
import { PipelineStage } from "mongoose";
import NodeCache from "node-cache";


const geoCache = new NodeCache({
  stdTTL: 300,       
  checkperiod: 120,
  useClones: false,
});

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

    const urgency = query.urgency as string;
    const cacheTTL = urgency === "urgent" ? 30 : 300;

    const cacheKey = `blood_req:${blood}:${lat}:${lng}:${radius}:${page}:${limit}`;

    const cached = geoCache.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT → ${cacheKey}`);
      return cached;
    }

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          blood,
          isDelete: { $ne: true },
        },
      },
      {
        $addFields: {
          distance: {
            $let: {
              vars: {
                lat1: { $multiply: [lat, Math.PI / 180] },
                lat2: {
                  $multiply: ["$locationData.lat", Math.PI / 180],
                },
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
        },
      },
      {
        $match: {
          distance: { $lte: radius },
        },
      },
      {
        $sort: { distance: 1 as const },
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
            distance: { $round: ["$distance", 2] },
          },
        },
      ]),

      blood_requests.aggregate([
        ...basePipeline,
        { $count: "total" },
      ]),
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);
//http://localhost:3052/api/v1/blood_request/find_my_location_nearest_blood_request?lat=23.780546&lng=90.407469&radius=10&blood=A%2B
    const result = {
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: requests,
    };

    geoCache.set(cacheKey, result, cacheTTL);
    console.log(`💾 Cache SET → ${cacheKey} | TTL: ${cacheTTL}s`);

    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const clearBloodRequestCache = (blood: string) => {
  const keys = geoCache.keys();
  const matchedKeys = keys.filter((key) =>
    key.startsWith(`blood_req:${blood}`)
  );
  if (matchedKeys.length > 0) {
    geoCache.del(matchedKeys);
    console.log(`🗑️ Cache CLEARED → ${matchedKeys.length}টি key deleted (blood: ${blood})`);
  }
};


const clearAllCache = () => {
  geoCache.flushAll();
  console.log("🗑️ সব Cache CLEARED");
};

const BloodRequestServices = {
  findMyLocationNearestBloodRequestIntoDb,
  clearBloodRequestCache,
  clearAllCache,
};

export default BloodRequestServices;