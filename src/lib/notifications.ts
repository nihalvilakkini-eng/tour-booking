import mongoose from "mongoose";
import Notification, { type INotification } from "@/models/Notification";

type CreateNotificationInput = {
  user: mongoose.Types.ObjectId | string;
  type: INotification["type"];
  title: string;
  message: string;
  booking?: mongoose.Types.ObjectId | string;
  tour?: mongoose.Types.ObjectId | string;
};

export async function createNotification(input: CreateNotificationInput) {
  return Notification.create(input);
}
