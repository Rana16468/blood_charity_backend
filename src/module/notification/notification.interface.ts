import { Model, Types } from 'mongoose';

export interface TNotification {
  userId?: Types.ObjectId;
  title: String;
  content: String;
  icon?: String;
  status: 'unread' | 'read';
  route?: String;
  isDelete: Boolean
};

export interface NotificationModel extends Model<TNotification> {
  // eslint-disable-next-line no-unused-vars
  isNotification(id: string): Promise<TNotification>;
}



