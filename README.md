# rental-app
A scalable microservices-based bike rental platform with API Gateway, booking, payments, real-time location tracking, and event-driven architecture using Kafka.


🚲 High-Level Overview

A user (bike owner or renter) interacts with the system through an API Gateway, which acts as the single entry point. The gateway routes requests to various backend services responsible for specific business functions.

🧩 Core Components
1. API Gateway
Central entry point for all client requests
Handles routing, authentication, and request aggregation
Communicates with all backend services

3. User Service
Manages user accounts and profiles
Stores data in user_db
Handles authentication/authorization

5. Vehicle Inventory Service
Maintains the list of available bikes
Stores vehicle data in a primary database
Publishes updates (like availability changes) to Kafka

7. Search Service
Provides fast lookup of available bikes
Uses a read replica of the vehicle inventory database for performance
Optimized for read-heavy operations

9. Booking Service
Handles reservation logic
Temporarily locks a bike (e.g., for 15 minutes) before confirmation
Stores booking data in PostgreSQL
Communicates with payment and inventory services

11. Payment Service
Processes transactions via external providers (e.g., Stripe, PayPal)
Confirms payment status back to booking service

13. Location Service
Tracks bike location in real time
Uses external map services (like Google Maps)
Stores live location data in Redis for fast access

15. Operator Service
Used by operators to upload bike images before and after rentals
Stores images in object storage

17. Notification Service
Sends alerts (booking confirmation, reminders, etc.) to users
Triggered via events from Kafka

19. Kafka (Event Streaming)
Acts as the event backbone of the system
Enables asynchronous communication between services
Used for:
Inventory updates
Booking events
Notifications
Decoupling services

🔄 Key Workflows
🔍 Searching for Bikes
User → API Gateway → Search Service
Search service queries read replica
Returns available bikes quickly

📅 Booking a Bike
User selects a bike → Booking Service
Booking service locks the bike temporarily
Payment service processes payment
On success:
Booking confirmed
Inventory updated
Event sent to Kafka

📍 Tracking Location
Location service collects bike GPS data
Stores in Redis
Provides real-time tracking to users

🔔 Notifications
Events (booking, payment, etc.) published to Kafka
Notification service consumes events
Sends messages to users

⚙️ Design Highlights
Microservices architecture → independent scaling and deployment
Event-driven (Kafka) → loose coupling and resilience
Read replica for search → high performance
Redis for location → low latency real-time tracking
External integrations → payments and maps
API Gateway → simplified client interaction

🧠 Summary
This system is designed for scalability, responsiveness, and real-time interaction. It separates concerns into specialized services while using Kafka to keep everything in sync asynchronously. This makes it suitable for a production-grade rental platform where reliability and performance are critical.






















