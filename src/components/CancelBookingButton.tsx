'use client';
import { useState } from 'react';

interface CancelBookingProps {
  bookingId: string;
  bookingDate: string;
  startTime: string;
}

export default function CancelBookingButton({ bookingId, bookingDate, startTime }: CancelBookingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCancelBooking = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      alert('Booking cancelled successfully! Full refund initiated.');
      window.location.reload(); // Page refresh to update status
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. Cancel Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
      >
        Cancel Booking
      </button>

      {/* 2. Notice / Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-white shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-400 mb-3">Cancel Booking Confirmation</h3>
            
            {/* Notice Message requested by you */}
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl mb-4 text-sm space-y-2 text-slate-300">
              <p className="font-medium text-amber-300">⚠️ Important Notice:</p>
              <p>
                Tour date-nu <strong>48 hours mumbokke</strong> cancel cheythal mathrame **full payment refund** kittullu.
              </p>
              <p className="text-slate-400 text-xs">
                Time limit kazhinjittundengil (less than 48 hours), please contact Wayora support directly.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/50 p-2 rounded border border-red-800 mb-4">
                {error}
              </p>
            )}

            <p className="text-sm text-slate-300 mb-6">
              Ningal anuchithamayi ee booking cancel cheyyan aagrahikkunundo?
            </p>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError('');
                }}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 transition"
              >
                Close / Keep Booking
              </button>

              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}