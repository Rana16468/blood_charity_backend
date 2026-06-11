import { model, Schema } from "mongoose";
import { NotificationModel, TNotification } from "./notification.interface";
import { notificationStatus } from "./notification.constant";

const notificationSchema = new Schema<TNotification,NotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [notificationStatus.unread, notificationStatus.read],
      default: notificationStatus.unread,
    },
    route: {
      type: String,
      default: null,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.pre("find", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

notificationSchema.pre("findOne", function (next) {
  this.where({
    isDelete: { $ne: true },
  });

  next();
});

notificationSchema.pre("aggregate", function (next) {
  this.pipeline().unshift({
    $match: {
      isDelete: { $ne: true },
    },
  });

  next();
});


notificationSchema.statics.isNotification = async function (
  id: string
) {
  return this.findById(id);
};


 const notifications = model<TNotification, NotificationModel>(
  "notifications",
  notificationSchema
);

export  default notifications;
