import catchError from "../../app/error/catchError"
import blood_donor from "../donor_register/donor_register.model";



const findMyLocationNearestBloodRequestIntoDb = async (
  query: Record<string, unknown>,
  generate_secret_key: string
) => {
  try {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const radius = Number(query.radius) || 10; // km
    const blood = query.blood as string;

    const donors = await blood_donor.aggregate([
      {
        $match: {
          blood,
          isDelete: false
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
          name: 1,
          phone: 1,
          blood: 1,
          locationData: 1,
          distance: { $round: ["$distance", 2] },
        },
      },

      {
        $sort: { distance: 1 },
      },
    ]);

    return donors;
  } catch (error) {
    throw catchError(error);
  }
};

//http://localhost:3052/api/v1/blood_request/find_my_location_nearest_blood_request?lat=23.780546&lng=90.407469&radius=30&blood=A%2B


 const BloodRequestServices={
    findMyLocationNearestBloodRequestIntoDb
 }

 export default BloodRequestServices;



 