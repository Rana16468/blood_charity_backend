import httpStatus from "http-status";
import catchError from "../../app/error/catchError";
import blood_donor from "./donor_register.model";
import { PipelineStage } from "mongoose";
import NodeCache from "node-cache";
import ApiError from "../../app/error/ApiError";
import { TLocationData } from "./donor_register.interface";
import { boolean } from "zod";
import users from "../user/user.model";
import { BloodRequestType } from "../blood_request/blood_request.constant";
import blood_requests from "../blood_request/blood_request.model";
import cache from "../../app/builder/cache/node-cache";

const CACHE_TTL_DEFAULT = 300;

const donorGeoCache = new NodeCache({
  stdTTL: CACHE_TTL_DEFAULT,
  checkperiod: 60,
  useClones: false,
  deleteOnExpire: true,
});

const FULL_FLUSH_INTERVAL_MS = 10 * 60 * 1000;
const fullFlushTimer = setInterval(() => {
  if (donorGeoCache.keys().length > 0) {
    donorGeoCache.flushAll();
  }
}, FULL_FLUSH_INTERVAL_MS);
fullFlushTimer.unref();

const findMyLocationNearestBloodDonorIntoDb = async (
  query: Record<string, unknown>,
) => {
  try {

    const lat = query.lat && !Number.isNaN(Number(query.lat)) ? Number(query.lat) : undefined;
    const lng = query.lng && !Number.isNaN(Number(query.lng)) ? Number(query.lng) : undefined;

  
    const radius = query.radius ? Number(query.radius) : 50; 
    
   
    const blood = query.blood as string | undefined; 
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;


    const cacheKey = `blood_donor:${blood ?? "all"}:${lat ? lat.toFixed(3) : "any"}:${lng ? lng.toFixed(3) : "any"}:${radius}:${page}:${limit}`;

    const cached = donorGeoCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const matchFilters: Record<string, any> = {
      isDelete: { $ne: true },
      isBloodDonated: { $ne: true },
    };

    if (blood) matchFilters.blood = blood;

    const basePipeline: PipelineStage[] = [
      { $match: matchFilters }
    ];

    
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
                            { $pow: [{ $sin: { $divide: ["$$deltaLat", 2] } }, 2] },
                            {
                              $multiply: [
                                { $cos: "$$lat1" },
                                { $cos: "$$lat2" },
                                { $pow: [{ $sin: { $divide: ["$$deltaLng", 2] } }, 2] },
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
        { $match: { distance: { $lte: radius } } }
      );
    }

   
    const sortStage: Record<string, 1 | -1> = {};
    if (lat !== undefined && lng !== undefined) {
      sortStage.distance = 1;
    }
    sortStage.createdAt = -1; 
    
    basePipeline.push({ $sort: sortStage });

   
    const [facetResult] = await blood_donor.aggregate([
      ...basePipeline,
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                name: 1,
                phone: 1,
                blood: 1,
                bloodRequestType: 1,
                locationData: 1,
                isBloodDonated: 1,
                createdAt: 1,
             
                distance: { 
                  $cond: [
                    { $ifNull: ["$distance", false] }, 
                    { $round: ["$distance", 2] }, 
                    null
                  ] 
                },
              },
            },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const total = facetResult?.totalCount?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const result = {
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        cachedUntil: new Date(Date.now() + (typeof CACHE_TTL_DEFAULT !== 'undefined' ? CACHE_TTL_DEFAULT : 300) * 1000).toISOString(),
      },
      data: facetResult?.data || [],
    };

    donorGeoCache.set(cacheKey, result);

    return result;
  } catch (error) {
    throw catchError(error);
  }
};

const clearDonorCache = (blood: string) => {
  const prefix = `blood_donor:${blood}`;
  const matchedKeys = donorGeoCache.keys().filter((key) => key.startsWith(prefix));
  if (matchedKeys.length > 0) {
    donorGeoCache.del(matchedKeys);
  }
};

const clearAllDonorCache = () => {
  donorGeoCache.flushAll();
};

const destroyDonorCacheTimer = () => {
  clearInterval(fullFlushTimer);
  donorGeoCache.close();
};


const changeLocationIntoDb = async (id: string, payload: TLocationData) => {
  try {


   
    const result = await blood_donor.findOneAndUpdate(
      {userId:id},
      { $set: { locationData: payload } },
      { new: true } 
    );

    if (!result) {
      throw new ApiError(httpStatus.NOT_FOUND, "Donor not found to update location", "");
    }

    return {
      success: true,
      message: "Successfully changed location",
    };
  } catch (error) {
    throw catchError(error);
  }
};

const findMyCurrentLocationIntoDb=async(id: string)=>{
     try{
         return await blood_donor.findOne({userId:id}).lean();
     }
  catch (error) {
    throw catchError(error);
  }
};

const IsBloodDonatedIntoDb = async (
  id: string,
  userId: string,
  payload: { isBloodDonated: boolean }
) => {

 
  try {
    const result = await blood_donor.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          isBloodDonated: !payload.isBloodDonated,
        },
        $inc: {
          donatedCount: !payload.isBloodDonated ? 1 : 1,
        },
      },
      {
        new: true,
        upsert:true
      }
    );

    if (!result) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "Blood donor not found",
        ""
      );
    }

    return {
      success: true,
      message: "Successfully updated blood donation status.",
     
    };
  } catch (error) {
    throw catchError(error);
  }
};




const OVERVIEW_CACHE_KEY = "dashboard-overview";

// Format Number (1000 => 1K, 1000000 => 1M)
const formatCount = (value: number): string => {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
};

const findByTotalOverViewIntoDb = async () => {
  try {
    // Check Cache
    const cachedOverview = cache.get(OVERVIEW_CACHE_KEY);

    if (cachedOverview) {
      return cachedOverview;
    }

    // Fetch all counts concurrently
    const [
      totalUser,
      totalDonor,
      totalRequest,
      totalRequestedDonorFind,
    ] = await Promise.all([
      users.countDocuments({
        isVerify: true,
      }),

      blood_donor.countDocuments({
        bloodRequestType: BloodRequestType.volunteer,
      }),

      blood_requests.countDocuments({
        bloodResuestType: BloodRequestType.request,
      }),

      blood_requests.countDocuments({
        bloodResuestType: BloodRequestType.request,
        isDonorFind: true,
      }),
    ]);

    const overview = {
      totalUser: {
        value: totalUser,
        display: formatCount(totalUser),
      },

      totalDonor: {
        value: totalDonor,
        display: formatCount(totalDonor),
      },

      totalRequest: {
        value: totalRequest,
        display: formatCount(totalRequest),
      },

      totalRequestedDonorFind: {
        value: totalRequestedDonorFind,
        display: formatCount(totalRequestedDonorFind),
      },
    };

    // Cache for 5 minutes
    cache.set(OVERVIEW_CACHE_KEY, overview, 300);

    return overview;
  } catch (error) {
    throw catchError(error);
  }
};


const DonorRegisterServices = {
  findMyLocationNearestBloodDonorIntoDb,
  clearDonorCache,
  clearAllDonorCache,
  destroyDonorCacheTimer,
  changeLocationIntoDb,
  findMyCurrentLocationIntoDb,
  IsBloodDonatedIntoDb,
  findByTotalOverViewIntoDb
};

export default DonorRegisterServices;