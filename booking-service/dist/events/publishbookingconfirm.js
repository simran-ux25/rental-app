"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishBookingConfirmed = publishBookingConfirmed;
const kafka_1 = require("../config/kafka");
async function publishBookingConfirmed(event) {
    console.log("Publishing booking.confirmed:", event);
    await kafka_1.producer.send({
        topic: "booking.confirmed",
        messages: [
            {
                key: event.bookingId,
                value: JSON.stringify(event),
            },
        ],
    });
}
