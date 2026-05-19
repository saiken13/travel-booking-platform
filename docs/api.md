# API Documentation

## GraphQL Endpoint

```
POST http://localhost:4000/graphql
Content-Type: application/json
```

## Example Queries

### Search Flights
```graphql
query SearchFlights {
  searchFlights(
    origin: "JFK"
    destination: "LAX"
    date: "2024-07-15"
    passengers: 2
  ) {
    id
    airlineName
    origin
    destination
    departure
    arrival
    duration
    price
    stops
    cabinClass
    seatsAvailable
  }
}
```

### Search Hotels
```graphql
query SearchHotels {
  searchHotels(
    location: "New York"
    checkIn: "2024-07-15"
    checkOut: "2024-07-20"
    guests: 2
  ) {
    id
    name
    pricePerNight
    totalPrice
    rating
    stars
    amenities
  }
}
```

### Create Booking
```graphql
mutation CreateBooking {
  createBooking(input: {
    userId: "user-uuid"
    type: "flight"
    origin: "JFK"
    destination: "LAX"
    departureDate: "2024-07-15"
    price: 289.00
    passengerCount: 1
    bookingData: "{\"flightId\":\"f1\"}"
  }) {
    success
    booking {
      id
      status
      price
    }
  }
}
```

### Track A/B Event
```graphql
mutation TrackEvent {
  trackEvent(
    experimentId: "exp-uuid"
    variant: "variant_blue"
    userId: "user-uuid"
    eventType: "booking_completed"
  ) {
    success
    eventId
  }
}
```

### Get Experiment Results
```graphql
query ExperimentResults {
  getExperimentResults(experimentId: "exp-uuid") {
    experimentName
    winningVariant
    improvement
    variants {
      variant
      totalEvents
      bookingStarted
      bookingCompleted
      conversionRate
    }
  }
}
```

## REST Endpoints

### Health Check
```
GET /health
→ { status: "ok", timestamp: "...", services: { postgres: "up" } }
```
