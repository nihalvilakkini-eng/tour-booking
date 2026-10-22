
import OperatorResourcePage from "@/components/operator/OperatorResourcePage";

export default function OperatorNotificationsPage() {
  return (
    <OperatorResourcePage
      title="Notifications"
      description="View booking updates and important activity alerts."
      endpoint="/api/notifications"
      fields={[
        { key: "title", label: "Notification" },
        { key: "message", label: "Message" },
        { key: "type", label: "Type" },
        { key: "read", label: "Read" },
        { key: "createdAt", label: "Date" },
      ]}
    />
  );
}
