import httpStatus from "http-status";
import catchError from "../../app/error/catchError";
import blood_donor from "./donor_register.model";
import { PipelineStage } from "mongoose";
import NodeCache from "node-cache";
import ApiError from "../../app/error/ApiError";
import { TLocationData } from "./donor_register.interface";

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

//{{baseUrl}}/api/v1/blood_donor/change_location
/* {
    "lat": 23.780586,
    "lng": 90.407394,
    "accuracy": 185,
    "address": "Beta One Investor LTD, 50, Bir Uttam A. K. Khandakar Road, Gulshan 1, Gulshan, Dhaka, Dhaka Metropolitan, Dhaka District, Dhaka Division, 1212, Bangladesh"
}*/
const DonorRegisterServices = {
  findMyLocationNearestBloodDonorIntoDb,
  clearDonorCache,
  clearAllDonorCache,
  destroyDonorCacheTimer,
  changeLocationIntoDb
};

export default DonorRegisterServices;