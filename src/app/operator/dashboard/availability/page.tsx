
import OperatorResourcePage from "@/components/operator/OperatorResourcePage";

export default function OperatorAvailabilityPage() {
  return (
    <OperatorResourcePage
      title="Availability"
      description="Review tour dates, time slots and available capacity."
      endpoint="/api/operator/availability"
      fields={[
        { key: "tourName", label: "Tour" },
        { key: "date", label: "Date" },
        { key: "startTime", label: "Start time" },
        { key: "availableSlots", label: "Available slots" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
