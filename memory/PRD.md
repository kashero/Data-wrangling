# SwiftCare - Ambulance Booking Platform PRD

## Original Problem Statement
Build a website that functions like Uber but for ordering ambulances. Patients can request ambulances, drivers/hospitals can accept requests.

## User Personas
1. **Patients** - General public needing emergency medical transport
2. **Ambulance Drivers** - Emergency medical responders with registered vehicles
3. **Hospital Staff** - Can manage ambulance fleet

## Core Requirements
- Patient registration and authentication (JWT)
- Driver registration with vehicle and ambulance type
- Emergency SOS button (press and hold 3 seconds)
- Book ambulance with pickup location and destination
- Multiple ambulance types: Basic ($50 base), ICU ($150 base), Neonatal ($200 base)
- Real-time tracking with OpenStreetMap/Leaflet
- Driver accepts/rejects requests
- Booking status flow: Pending → Accepted → En Route → Arrived → In Progress → Completed
- Rating and review system
- Display fare estimation (no payment processing - pay driver directly)

## Technology Stack
- Backend: FastAPI (Python) with MongoDB
- Frontend: React with Tailwind CSS, Shadcn UI
- Maps: OpenStreetMap with React-Leaflet
- Authentication: JWT-based custom auth
- Real-time updates: Polling (5-second intervals)

## What's Been Implemented (December 2024)

### Backend APIs
- [x] User registration/login (patients and drivers)
- [x] JWT authentication with protected routes
- [x] Create/read/update bookings
- [x] SOS emergency booking endpoint
- [x] Driver availability toggle
- [x] Driver location updates
- [x] Booking status management (accept, update status, cancel)
- [x] Rating system for completed trips
- [x] Fare calculation based on ambulance type

### Frontend Pages
- [x] Landing page with hero, features, ambulance types
- [x] Patient login/register
- [x] Driver login/register with ambulance type selection
- [x] Patient dashboard with SOS button, booking form, history
- [x] Driver dashboard with availability toggle, pending requests, active trip management
- [x] Booking details page
- [x] Map component with patient/driver/destination markers
- [x] Rating modal after trip completion

### Features Working
- Complete authentication flow
- SOS emergency booking (press and hold)
- Regular ambulance booking
- Driver can accept requests
- Status updates: en_route → arrived → in_progress → completed
- Real-time location updates on map
- Rating after trip completion
- Booking history

## Prioritized Backlog

### P0 (Critical - Next Phase)
- [ ] Push notifications for new requests
- [ ] WebSocket for real-time updates (replace polling)
- [ ] SMS/call integration for emergencies

### P1 (Important)
- [ ] Admin dashboard
- [ ] Driver verification workflow
- [ ] Estimated time of arrival (ETA)
- [ ] Route display on map
- [ ] Multiple simultaneous booking support for hospitals

### P2 (Nice to Have)
- [ ] Payment integration (Stripe/PayPal)
- [ ] Driver earnings dashboard
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Offline support

## API Endpoints
- POST /api/auth/register - Register user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user
- PUT /api/driver/profile - Update driver profile
- PUT /api/driver/location - Update driver location
- GET /api/driver/available - Get available drivers
- POST /api/bookings - Create booking
- POST /api/bookings/sos - Create SOS emergency booking
- GET /api/bookings - Get user's bookings
- GET /api/bookings/pending - Get pending bookings (drivers)
- GET /api/bookings/active - Get active booking
- GET /api/bookings/{id} - Get booking details
- PUT /api/bookings/{id}/accept - Accept booking
- PUT /api/bookings/{id}/status - Update booking status
- POST /api/bookings/{id}/rate - Rate completed booking

## Database Collections
- users (id, email, password, name, phone, role, is_available, vehicle_number, ambulance_type, rating, total_trips)
- bookings (id, patient_id, driver_id, pickup_location, destination, ambulance_type, status, estimated_fare, notes, is_emergency, rating, review, timestamps)

## Next Tasks
1. Implement WebSocket for real-time updates
2. Add push notifications
3. Build admin dashboard for fleet management
4. Add route visualization on map
5. Integrate SMS notifications

---

## Update: December 30, 2024

### New Features Added
1. **Nearby Ambulances Map** - Patients can see available ambulances on the map before booking
2. **ETA Estimation** - Shows estimated arrival time based on distance (Haversine formula)
3. **Currency Changed to KES** (Kenyan Shillings):
   - Basic: KES 2,000 base + KES 150/km
   - ICU: KES 5,000 base + KES 300/km  
   - Neonatal: KES 8,000 base + KES 400/km

### New API Endpoint
- POST /api/driver/nearby - Returns nearby ambulances with distance_km and eta_minutes

### Technical Details
- Haversine formula for distance calculation
- Average ambulance speed: 40 km/h for ETA
- Map markers color-coded by ambulance type (green=basic, blue=ICU, purple=neonatal)
