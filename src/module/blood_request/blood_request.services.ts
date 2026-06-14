import catchError from "../../app/error/catchError"
import blood_requests from "./blood_request.model";




const findMyLocationNearestBloodRequestIntoDb = async (
  query: Record<string, unknown>,
  generate_secret_key: string
) => {
  try {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const radius = Number(query.radius) || 10;
    const blood = query.blood as string;

    const requests = await blood_requests.aggregate([
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
                  $multiply: [
                    "$locationData.lat",
                    Math.PI / 180,
                  ],
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
                                  {
                                    $sin: {
                                      $divide: ["$$deltaLng", 2],
                                    },
                                  },
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
        $project: {
          userId: 1,
          blood: 1,
          phone: 1,
          hospital: 1,
          urgency: 1,
          bloodResuestType: 1,
          locationData: 1,
          distance: { $round: ["$distance", 2] },
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    return requests;
  } catch (error) {
    throw catchError(error);
  }
};

//http://localhost:3052/api/v1/blood_request/find_my_location_nearest_blood_request?lat=23.780546&lng=90.407469&radius=30&blood=A%2B


 const BloodRequestServices={
    findMyLocationNearestBloodRequestIntoDb
 }

 export default BloodRequestServices;



 