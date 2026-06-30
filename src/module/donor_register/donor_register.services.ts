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
    const lat = Number(query.lat);
    const lng = Number(query.lng);

  

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new ApiError(
        httpStatus.NOT_EXTENDED,
        "lat and lng are required and must be valid numbers",
        ""
      );
    }

    const radius = Number(query.radius) || 10;
    const blood = (query.blood as string) || "A+";
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

      

    const cacheKey = `blood_donor:${blood}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${page}:${limit}`;

    const cached = donorGeoCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          blood,
          isDelete: { $ne: true },
          isBloodDonated: { $ne: true },
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
      { $match: { distance: { $lte: radius } } },
      { $sort: { distance: 1 as const, createdAt: -1 as const } },
    ];

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
                distance: { $round: ["$distance", 2] },
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
        cachedUntil: new Date(Date.now() + CACHE_TTL_DEFAULT * 1000).toISOString(),
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