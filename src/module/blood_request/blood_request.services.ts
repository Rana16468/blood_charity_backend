import QueryBuilder from "../../app/builder/QueryBuilder";
import catchError from "../../app/error/catchError";
import blood_requests from "../blood_request/blood_request.model";
import { PipelineStage } from "mongoose";
import NodeCache from "node-cache";
import { excludeField } from "./blood_request.constant";
import ApiError from "../../app/error/ApiError";
import httpStatus from "http-status";


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
    const lat = query.lat ? Number(query.lat) : undefined;
    const lng = query.lng ? Number(query.lng) : undefined;
    const radius = query.radius ? Number(query.radius) : 50; 
    
    // ✅ বাগ ফিক্স: blood অপশনাল করা হলো যাতে প্রথমে অল রিকোয়েস্ট শো করে
    const blood = query.blood as string | undefined; 
    
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const urgency = query.urgency as string | undefined;

    const cacheTTL = resolveCacheTTL(urgency);
    const cacheKey = `blood_req:${blood ?? "all"}:${urgency ?? "all"}:${lat ?? "any"}:${lng ?? "any"}:${radius}:${page}:${limit}`;

    const cached = geoCache.get(cacheKey);
    if (cached) {
      const ttlRemaining = geoCache.getTtl(cacheKey);
      console.log(`✅ Cache HIT → ${cacheKey} | Expires in: ${ttlRemaining ? Math.round((ttlRemaining - Date.now()) / 1000) : "?"}s`);
      return cached;
    }

    // ✅ ডায়নামিক ম্যাচ অবজেক্ট তৈরি
    const matchFilters: Record<string, any> = {
      isDelete: { $ne: true },
      isDonorFind: { $ne: true },
    };

    // ইউজার যদি নির্দিষ্ট ব্লাড গ্রুপ বা আরজেন্সি কুয়েরি করে, তবেই ফিল্টারে যুক্ত হবে
    if (blood) matchFilters.blood = blood;
    if (urgency) matchFilters.urgency = urgency;

    const basePipeline: PipelineStage[] = [
      { $match: matchFilters }
    ];

    // লোকেশন থাকলে ডিস্টেন্স ক্যালকুলেশন এবং ফিল্টারিং হবে
    if (lat !== undefined && lng !== undefined) {
      basePipeline.push(
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
          },
        },
        {
          $match: {
            distance: { $lte: radius }, 
          },
        }
      );
    }

    basePipeline.push({
      $addFields: {
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
    });

    const sortStage: Record<string, 1 | -1> = { urgencyPriority: 1 };
    if (lat !== undefined && lng !== undefined) {
      sortStage.distance = 1;
    }
    basePipeline.push({ $sort: sortStage });

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
            distance: { 
              $cond: [
                { $ifNull: ["$distance", false] }, 
                { $round: ["$distance", 2] }, 
                null
              ] 
            },
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
        cachedUntil: new Date(Date.now() + cacheTTL * 1000).toISOString(),
      },
      data: requests,
    };

    geoCache.set(cacheKey, result, cacheTTL);

    return result;
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

const findByRequestHistoryIntoDb = async (
  userId: string,
  query: Record<string, unknown>
) => {
  try {
    const queryBuilder = new QueryBuilder(
      blood_requests.find({ userId }),
      query
    )
      .search(excludeField)
      .filter()
      .sort()
      .paginate()
      .fields();

    const [result, meta] = await Promise.all([
      queryBuilder.modelQuery,
      queryBuilder.countTotal(),
    ]);

    return {
      meta,
      result,
    };
  } catch (error) {
    throw catchError(error);
  }
};

const IsBloodDonorFindIntoDb=async(id: string, payload:{
isDonorFind: boolean})=>{

  try{

    const result=await blood_requests.findOneAndUpdate({_id:id}, {$set:{
      isDonorFind: payload.isDonorFind
    }}, {new: true});

    if(!result){
      throw new ApiError(httpStatus.NOT_EXTENDED ,"issues by the is Donnded find" , "")
    }
    return{
      success: true , 
      message: "successfully  completed"
    }

  }
  catch (error) {
    throw catchError(error);
  }
}

const deleteBloodRequestIntoDb = async (id: string) => {
  
  try {
    const result = await blood_requests.findByIdAndDelete(id);

    if (!result) {
      throw new Error("Blood request not found");
    }

    return result;
  } catch (error) {
    throw catchError(error);
  }
};



const BloodRequestServices = {
  findMyLocationNearestBloodRequestIntoDb,
  clearBloodRequestCache,
  clearAllCache,
  destroyCacheTimer,
  findByRequestHistoryIntoDb,
  IsBloodDonorFindIntoDb,
  deleteBloodRequestIntoDb
  
};

export default BloodRequestServices;