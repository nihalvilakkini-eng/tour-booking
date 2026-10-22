
import OperatorResourcePage from "@/components/operator/OperatorResourcePage";

export default function OperatorToursPage() {
  return (
    <OperatorResourcePage
      title="My Tours"
      description="View your tour listings and monitor their details."
      endpoint="/api/operator/tours"
      fields={[
        { key: "title", label: "Tour" },
        { key: "destination", label: "Destination" },
        { key: "price", label: "Price" },
        { key: "duration", label: "Duration" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
