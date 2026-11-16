import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Availability from '@/models/Availability';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '',
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id: bookingId } = await params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }
    if (booking.status === 'completed' || booking.status === 'rejected') {
      return NextResponse.json({ error: `Cannot cancel a ${booking.status} booking.` }, { status: 400 });
    }

    const tourDateStr = booking.bookingDate.toISOString().split('T')[0];
    const tourDateTime = new Date(`${tourDateStr}T${booking.startTime}:00`);
    const now = new Date();
    
    const hoursDifference = (tourDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const CANCELLATION_LIMIT_HOURS = 48;
    if (hoursDifference < CANCELLATION_LIMIT_HOURS) {
      return NextResponse.json(
        { error: 'Cancellation window closed (Less than 48 hours left). Please contact Wayora support for assistance.' },
        { status: 400 }
      );
    }

    let refundDetails = null;

    if (booking.paymentStatus === 'paid' && booking.razorpayPaymentId) {
      try {
        const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
          amount: Math.round(booking.totalAmount * 100),
          speed: 'optimum',
          notes: {
            reason: 'User requested cancellation within allowed time window',
            bookingId: booking._id.toString(),
          },
        });
        refundDetails = refund;
        booking.paymentStatus = 'refunded';
      } catch (razorpayErr: any) {
        console.error('Razorpay Refund Error:', razorpayErr);
        return NextResponse.json(
          { error: 'Failed to process refund through payment gateway. Please contact support.' },
          { status: 500 }
        );
      }
    } else {
      booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : 'unpaid';
    }

    booking.status = 'cancelled';
    await booking.save();

    if (booking.availability) {
      await Availability.findByIdAndUpdate(booking.availability, {
        $inc: { availableSlots: booking.participants }
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Booking cancelled successfully and refund initiated.',
        booking,
        refund: refundDetails,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Cancellation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}