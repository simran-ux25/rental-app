import { producer } from "../config/kafka";

export interface BookingConfirmedEvent {
  bookingId: string;
  vehicleId: string;
  userId:    number;
  starttime: string;
  endtime:   string;
}

export async function publishBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
  console.log("Publishing booking.confirmed:", event);

  await producer.send({
    topic: "booking.confirmed",
    messages: [
      {
        key:   event.bookingId,  // bookingId as key, not vehicleId
        value: JSON.stringify(event),
      },
    ],
  });
}