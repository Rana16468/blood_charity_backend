import NodeCache from "node-cache";
import QueryBuilder from "../../app/builder/QueryBuilder";
import catchError from "../../app/error/catchError";
import notifications from "./notification.model";

const notificationCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

const findByAllNotificationIntoDb = async (
  userId: string,
  query: Record<string, unknown>
) => {
  try {
    const cacheKey = `notifications:${userId}:${JSON.stringify(query)}`;

    const cached = notificationCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const queryBuilder = new QueryBuilder(
      notifications.find({ userId }),
      query
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();

    const [result, meta] = await Promise.all([
      queryBuilder.modelQuery,
      queryBuilder.countTotal(),
    ]);

    const data = {
      meta,
      result,
    };

    notificationCache.set(cacheKey, data);

    return data;
  } catch (error) {
    throw catchError(error);
  }
};

const NotificationServices = {
  findByAllNotificationIntoDb,
};

export default NotificationServices;