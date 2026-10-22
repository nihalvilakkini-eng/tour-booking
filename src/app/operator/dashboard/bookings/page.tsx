
import OperatorResourcePage from "@/components/operator/OperatorResourcePage";

export default function OperatorBookingsPage() {
  return (
    <OperatorResourcePage
      title="Bookings"
      description="Review customer reservations for your tours and activities."
      endpoint="/api/operator/bookings"
      fields={[
        { key: "_id", label: "Booking ID" },
        { key: "tourName", label: "Tour" },
        { key: "customerName", label: "Customer" },
        { key: "numberOfGuests", label: "Guests" },
        { key: "status", label: "Booking status" },
      ]}
    />
  );
}
