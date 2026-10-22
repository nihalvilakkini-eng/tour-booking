
import OperatorResourcePage from "@/components/operator/OperatorResourcePage";

export default function OperatorReviewsPage() {
  return (
    <OperatorResourcePage
      title="Customer Reviews"
      description="Read ratings and feedback from customers."
      endpoint="/api/operator/reviews"
      fields={[
        { key: "customerName", label: "Customer" },
        { key: "tourName", label: "Tour" },
        { key: "rating", label: "Rating" },
        { key: "comment", label: "Feedback" },
        { key: "createdAt", label: "Date" },
      ]}
    />
  );
}
