# AgriConnect Platform — Feature & Technology Overview

## What is AgriConnect?

AgriConnect is a full-stack agricultural services platform that connects farmers with service providers (transport, irrigation, labour, equipment rental, soil testing, fertilizer supply). It includes an AI chatbot, crop disease diagnosis, real-time alerts, multilingual support, and a mobile app.

---

## Architecture

| Layer | Technology |
|---|---|
| Backend API | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose ODM) |
| Frontend Web | React + TypeScript (Vite) |
| Mobile App | React Native + TypeScript |
| Job Queue | BullMQ + Redis |
| Deployment | Render.com (Node runtime) |
| Auth | JWT (jsonwebtoken) |
| OTP / SMS | Twilio (SMS) |
| AI / LLM | OpenAI GPT-4 |
| Vector Search | Pinecone |
| Reverse Geocoding | OpenStreetMap Nominatim |

---

## Features

### 1. User Authentication
**Technology**: JWT, bcrypt, Twilio SMS, MongoDB

- Farmers and service providers register with name, phone, role
- Passwords are hashed with bcrypt before storage
- Login returns a signed JWT stored in localStorage
- **Forgot Password via OTP**: User enters phone → 6-digit OTP sent via Twilio SMS → OTP verified (5-attempt limit, 10-min expiry) → new password set
- Role-based access control (RBAC) middleware restricts routes by role (farmer / provider / admin)

---

### 2. Service Booking
**Technology**: MongoDB, Express REST API, React

- Farmers browse available services filtered by type, price, location
- Booking requires selecting a date and time slot
- Duplicate booking prevention: same service + time slot + date cannot be double-booked
- Booking statuses: Pending → Accepted → InProgress → Completed / Cancelled
- Auto-cancel job (BullMQ) cancels bookings that remain Pending for too long

---

### 3. Provider Dashboard
**Technology**: React, MongoDB populated queries

- Service providers see all bookings made for their services
- Can Accept, mark InProgress, or Complete bookings
- Booking history tab shows past completed/cancelled bookings
- All MongoDB `_id` fields handled correctly for frontend compatibility

---

### 4. Farmer Dashboard
**Technology**: React, UPI deep links, WhatsApp API

- Overview stats: total bookings, pending, in-progress, completed, total spent
- **Provider Contact Card**: After booking, farmer sees provider name, phone number, trust score, and a direct Call button (`tel:` link)
- **Pay Now**: For Accepted/InProgress bookings, opens UPI payment deep link (`upi://pay`) with provider name and amount; falls back to WhatsApp message if no UPI app is installed
- Feedback/rating system for completed bookings
- Real-time alerts panel

---

### 5. Admin Panel
**Technology**: React, Express, MongoDB

- Admins can create, edit, and delete services
- View all registered users and providers
- Manage Krishi Centers (government agricultural offices)
- All CRUD operations via REST API with admin-role JWT guard

---

### 6. AI Chatbot
**Technology**: OpenAI GPT-4, Pinecone (vector DB), RAG (Retrieval-Augmented Generation)

- Farmers ask questions in natural language (text or voice)
- Backend embeds the query using OpenAI embeddings
- Pinecone vector search retrieves relevant farming knowledge chunks
- GPT-4 generates a contextual answer using retrieved knowledge
- Falls back to local JSON knowledge base if Pinecone is unavailable
- Supports multilingual queries (translated before embedding)

---

### 7. Crop Doctor (Disease Diagnosis)
**Technology**: OpenAI GPT-4 Vision, OpenStreetMap, React

- Farmer uploads a photo of a diseased crop (camera capture or gallery)
- Image sent to GPT-4 Vision API for diagnosis
- Returns: disease name, symptoms, treatment, prevention steps
- **GPS Location Detection**: Uses browser `navigator.geolocation` + OpenStreetMap Nominatim reverse geocoding to detect the farmer's state
- **Krishi Vibhag Helplines**: Shows state-specific government agricultural helpline number with a direct Call button
- National Kisan Call Centre (1800-180-1551) shown as fallback
- WhatsApp share button to share diagnosis with others

---

### 8. Real-Time Alerts
**Technology**: MongoDB, Express, React

- Admins publish alerts (weather, market price, government scheme, emergency)
- Alerts are targeted by location
- Farmers see alerts relevant to their area on the dashboard
- Alert types have distinct color coding and icons

---

### 9. Price Prediction
**Technology**: BullMQ, Redis, custom ML-style heuristics

- Background worker processes price prediction jobs
- Predicts commodity prices based on historical patterns
- Results stored in MongoDB and surfaced via API

---

### 10. Trust Score System
**Technology**: BullMQ, Redis, MongoDB

- Background worker recalculates provider trust scores periodically
- Score based on: completed bookings, ratings received, cancellation rate
- Trust score displayed on provider profiles and booking cards

---

### 11. Farming Calendar
**Technology**: BullMQ, Redis, MongoDB, Express

- Farmers can log farming activities (sowing, irrigation, harvest)
- Calendar worker processes reminders and scheduling jobs
- REST API for CRUD on calendar entries

---

### 12. Multilingual Support
**Technology**: i18next, React i18next, custom translation middleware

- Web and mobile apps support: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi
- Language switcher component in both web and mobile
- Backend translation middleware auto-translates API responses when `Accept-Language` header is set
- Translation service uses a dictionary + optional external translation API

---

### 13. Voice Input & Text-to-Speech (Mobile)
**Technology**: React Native, device speech APIs

- `useVoiceInput` hook captures voice input from the microphone
- `useTextToSpeech` hook reads out responses aloud
- `VoiceInputButton` component provides a tap-to-speak UI
- Useful for low-literacy farmers who prefer voice interaction

---

### 14. GPS Tracker
**Technology**: Browser Geolocation API, OpenStreetMap

- Tracks farmer's current location
- Used in Crop Doctor for state detection
- Used in service discovery to show nearby providers

---

### 15. Fraud Detection
**Technology**: Custom rule-based service (Node.js)

- Monitors booking patterns for anomalies
- Flags suspicious activity (e.g., mass bookings from one account, rapid cancellations)
- Results logged and surfaced to admin

---

### 16. Offline Support
**Technology**: Zustand (state management), localStorage

- `offlineStore` tracks connectivity status
- `OfflineIndicator` component shows a banner when offline
- `OfflinePage` shown for routes that require connectivity
- Key data cached locally for offline viewing

---

### 17. Notifications
**Technology**: Twilio SMS, custom notification service

- SMS notifications sent on booking status changes
- OTP delivery for password reset
- Notification service abstracted so email/push can be added later

---

## Deployment

| Service | Platform | URL |
|---|---|---|
| Backend API | Render.com (Node) | https://agriconnect-backend-x9k9.onrender.com |
| Frontend Web | Render.com (Static) | https://agriconnect-web.onrender.com |
| Database | MongoDB Atlas | cluster0.knxdime.mongodb.net |
| Job Queue | Redis (Render) | via REDIS_URL env var |

### Environment Variables (Backend)
```
MONGODB_URI        — MongoDB Atlas connection string
JWT_SECRET         — Secret for signing JWTs
TWILIO_ACCOUNT_SID — Twilio account SID (SMS/OTP)
TWILIO_AUTH_TOKEN  — Twilio auth token
TWILIO_PHONE       — Twilio sender phone number
OPENAI_API_KEY     — OpenAI API key (chatbot + crop doctor)
PINECONE_API_KEY   — Pinecone vector DB key
PINECONE_INDEX     — Pinecone index name
REDIS_URL          — Redis connection URL (BullMQ)
CORS_ORIGIN        — Allowed frontend origin (optional, defaults to *)
PORT               — Server port (default 5000)
```

---

## Project Structure

```
/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── controllers/   Route handlers
│   │   ├── models/        Mongoose schemas
│   │   ├── routes/        Express routers
│   │   ├── services/      Business logic
│   │   ├── middleware/     Auth, RBAC, rate limiting
│   │   ├── jobs/          BullMQ workers & schedulers
│   │   └── config/        DB, Redis, queue setup
├── web/              React web app
│   └── src/
│       ├── pages/         Route-level components
│       ├── components/    Shared UI components
│       ├── api/           Axios client
│       └── i18n/          Translation files
├── mobile/           React Native app
│   └── src/
│       ├── hooks/         Voice, TTS hooks
│       ├── components/    Mobile UI components
│       └── i18n/          Mobile translations
└── render.yaml       Render.com deployment config
```
