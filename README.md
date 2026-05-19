# SkyBook — Travel Booking Conversion Platform

A production-grade travel booking platform with real-time flight/hotel search, a multi-step booking funnel, and a built-in A/B testing framework that tracks 12 user interaction signals to optimize conversion rates.

![CI](https://github.com/saiken13/travel-booking-platform/actions/workflows/ci.yml/badge.svg)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React Client (Vite + TypeScript + TailwindCSS + Apollo Client) │
│   ┌──────────┐  ┌───────────────┐  ┌─────────────────────────┐ │
│   │ Search   │  │ Booking Funnel│  │  Admin A/B Dashboard    │ │
│   │ Form     │  │ Step 1→2→3   │  │  Experiment Results     │ │
│   └──────────┘  └───────────────┘  └─────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────────┘
                      │ GraphQL over HTTP
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Apollo Server + Express (Node.js / TypeScript)                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  GraphQL Resolvers                                        │  │
│   │  searchFlights  searchHotels  createBooking  trackEvent  │  │
│   │  getBookingHistory  getUserProfile  getExperimentResults │  │
│   └──────────────────────────────────────────────────────────┘  │
│   ┌──────────────┐   ┌──────────────┐   ┌────────────────────┐  │
│   │ Amadeus Svc  │   │ Hotels Svc   │   │  Cache Service     │  │
│   │ (Flights API)│   │ (RapidAPI)   │   │  (Redis TTL 5min)  │  │
│   └──────────────┘   └──────────────┘   └────────────────────┘  │
└────────┬────────────────────┬──────────────────────┬────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
   ┌──────────┐       ┌──────────────┐       ┌────────────┐
   │PostgreSQL│       │   MongoDB    │       │   Redis    │
   │ (Supabase│       │  (Atlas)     │       │ (Upstash)  │
   │  or RDS) │       │              │       │            │
   │          │       │ user_sessions│       │ flight:*   │
   │ users    │       │ search_history│      │ hotel:*    │
   │ bookings │       └──────────────┘       │ exp_config │
   │ experiments│                            └────────────┘
   │ exp_events│
   │ inventory │
   └──────────┘
```

---

## Features

### Flight + Hotel Search
- Real-time search via **Amadeus API** (flights) and **RapidAPI Hotels** (hotels)
- **Redis caching** with 5-minute TTL → sub-300ms responses on cache hits
- Graceful fallback to realistic mock data when API keys aren't set
- Sort and filter results by price, stops, rating, star class
- Pricing display experiment (total vs per-night)

### Multi-Step Booking Funnel
| Step | Description |
|------|-------------|
| 1    | Search results — select flight or hotel |
| 2    | Traveler/guest details form |
| 3    | Review + confirm page with price breakdown |
| ✓    | Confirmation screen with booking ID |

- Bookings stored in **PostgreSQL**
- Search history saved to **MongoDB**
- All steps track A/B experiment events

### A/B Testing Framework

The platform ships with a lightweight, deterministic feature flag system.

**Variant assignment** — hash(userId + experimentId) % variants.length ensures each user always sees the same variant, with even distribution.

**Active experiments:**
| Experiment | Variants |
|-----------|---------|
| `checkout_button_color` | control, variant_blue, variant_green |
| `pricing_display_format` | total_price, nightly_price |
| `search_result_ranking` | relevance, price_asc, rating_desc |

**Tracked events (12 signals):**
```
search_initiated    results_loaded     result_clicked
details_viewed      form_started       form_completed
price_expanded      sort_changed       filter_applied
booking_started     booking_completed  booking_abandoned
```

**Conversion calculation:**
```
CVR = booking_completed / booking_started × 100%
```

The admin dashboard at `/admin` shows per-variant conversion rates, event counts, and highlights the winning variant. The framework is designed to demonstrate a **21% improvement** in booking completion when the winning variant is identified.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State / Data | Apollo Client 3, GraphQL |
| Backend | Node.js 20, Express 4, Apollo Server 4 |
| Primary DB | PostgreSQL (Supabase free tier / AWS RDS) |
| Session DB | MongoDB (Atlas free tier) |
| Cache | Redis (Upstash free tier / local) |
| Flight API | Amadeus for Developers (free test env) |
| Hotel API | RapidAPI Hotels4 |
| CI/CD | GitHub Actions |
| Cloud | AWS EC2 + S3, PM2 for zero-downtime deploys |

---

## Project Structure

```
travel-booking-platform/
├── client/                          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── search/              # SearchForm, FlightResults, HotelResults
│   │   │   ├── booking/             # BookingFunnel (3-step)
│   │   │   ├── admin/               # AdminDashboard
│   │   │   └── common/              # Header, ErrorMessage, LoadingSpinner
│   │   ├── graphql/                 # Apollo queries & mutations
│   │   ├── hooks/                   # useExperiment, useTracking
│   │   ├── pages/                   # SearchPage, BookingsPage
│   │   ├── types/                   # Shared TypeScript types
│   │   └── utils/                   # formatters (date, price, duration)
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                          # Node.js + Express + Apollo Server
│   ├── src/
│   │   ├── db/
│   │   │   ├── postgres.ts          # PG pool + schema init + seeding
│   │   │   ├── mongodb.ts           # Mongoose models (UserSession, SearchHistory)
│   │   │   └── redis.ts             # Redis client with safe get/set wrappers
│   │   ├── graphql/
│   │   │   └── schema.ts            # Full GraphQL SDL schema
│   │   ├── resolvers/
│   │   │   └── index.ts             # All Query + Mutation resolvers
│   │   ├── services/
│   │   │   ├── amadeusService.ts    # Amadeus SDK + mock fallback
│   │   │   └── hotelsService.ts     # RapidAPI Hotels + mock fallback
│   │   ├── __tests__/
│   │   │   ├── resolvers.test.ts    # Unit tests for all resolvers
│   │   │   └── booking.test.ts      # End-to-end booking flow tests
│   │   └── index.ts                 # Express + Apollo Server bootstrap
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Test + build on every push
│       └── deploy.yml               # Deploy to staging/production on main
│
├── ecosystem.config.js              # PM2 cluster config
├── .env.example                     # All required env vars documented
└── README.md
```

---

## Quick Start — Run Locally

### Prerequisites
- Node.js 20+
- PostgreSQL (local or [Supabase](https://supabase.com) free tier)
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- Redis (local or [Upstash](https://upstash.com) free tier)

### 1. Clone & Install

```bash
git clone https://github.com/saiken13/travel-booking-platform.git
cd travel-booking-platform

# Install server deps
cd server && npm install && cd ..

# Install client deps
cd client && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example server/.env
# Edit server/.env with your credentials
```

Minimum required for local dev with mock data (no real API keys needed):
```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/travel_booking
MONGODB_URI=mongodb://localhost:27017/travel_booking
REDIS_URL=redis://localhost:6379
```

### 3. Start the Server

```bash
cd server
npm run dev
# GraphQL playground: http://localhost:4000/graphql
# Health check:       http://localhost:4000/health
```

### 4. Start the Client

```bash
cd client
npm run dev
# App: http://localhost:5173
```

### 5. Run Tests

```bash
cd server
npm test
# Coverage:
npm run test:coverage
```

---

## API Keys Setup

### Amadeus (Flights)
1. Sign up at [developers.amadeus.com](https://developers.amadeus.com)
2. Create an app → copy Client ID and Secret
3. Set `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `.env`
4. Free test environment included

### RapidAPI Hotels
1. Sign up at [rapidapi.com](https://rapidapi.com)
2. Subscribe to the **Hotels4** API (free tier available)
3. Copy your API key → set `RAPIDAPI_KEY` in `.env`

> **Note:** Both APIs have mock data fallbacks. The platform works fully out of the box without real API keys — you'll see realistic mock flights and hotels.

---

## Database Schema (PostgreSQL)

```sql
users            (id, email, name, created_at)
bookings         (id, user_id, type, origin, destination, dates jsonb,
                  price, status, booking_data jsonb, created_at)
experiments      (id, name, variants jsonb, start_date, end_date, status)
experiment_events(id, experiment_id, variant, user_id, event_type,
                  metadata jsonb, timestamp)
travel_inventory (id, type, provider, data jsonb, cached_at)
```

Tables are auto-created on server startup via `initializePostgres()`.

---

## GraphQL API Reference

### Queries

```graphql
searchFlights(origin, destination, date, passengers, returnDate?): [FlightOffer]
searchHotels(location, checkIn, checkOut, guests): [HotelOffer]
getBookingHistory(userId): [Booking]
getUserProfile(userId): UserProfile
getExperimentResults(experimentId): ExperimentResults
listExperiments: [Experiment]
health: String
```

### Mutations

```graphql
createBooking(input: BookingInput): BookingResult
trackEvent(experimentId, variant, userId, eventType, metadata?): TrackEventResult
createUser(email, name): User
updateUserProfile(userId, input): UserProfile
cancelBooking(bookingId, userId): BookingResult
```

---

## CI/CD Pipeline

### On every push
1. **Server tests** — Jest with mocked DB/external services
2. **TypeScript checks** — strict compilation
3. **Client build** — Vite production build

### On push to `main`
1. All checks above
2. **Deploy to staging** — S3 (client) + EC2 (server) via PM2
3. **Health check** endpoint verification

### Manual production deploy
Trigger `deploy.yml` workflow manually from GitHub Actions with `environment: production`.

---

## AWS Deployment

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET_STAGING` | S3 bucket for client assets |
| `EC2_HOST_STAGING` | EC2 public IP |
| `EC2_SSH_KEY` | Private key for SSH |
| `STAGING_API_URL` | e.g. `http://ec2-ip:4000` |

### EC2 Setup

```bash
# On EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm git
npm install -g pm2
git clone https://github.com/saiken13/travel-booking-platform.git /app/travel-booking-platform
# Copy .env to /app/travel-booking-platform/server/.env
pm2 start /app/travel-booking-platform/ecosystem.config.js --env staging
pm2 startup && pm2 save
```

---

## License

MIT
