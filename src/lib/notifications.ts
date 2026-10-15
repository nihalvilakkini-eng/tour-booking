import Notification, { type INotification } from "@/models/Notification";

type CreateNotificationInput = Pick<
  INotification,
  "user" | "type" | "title" | "message"
> &
  Partial<Pick<INotification, "booking" | "tour">>;

export async function createNotification(input: CreateNotificationInput) {
  return Notification.create(input);
}