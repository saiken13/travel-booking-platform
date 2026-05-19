export const typeDefs = `#graphql
  type FlightOffer {
    id: String!
    airline: String!
    origin: String!
    destination: String!
    departure: String!
    arrival: String!
    duration: String!
    price: Float!
    currency: String!
    stops: Int!
    cabinClass: String!
    seatsAvailable: Int!
  }

  type HotelOffer {
    id: String!
    name: String!
    location: String!
    checkIn: String!
    checkOut: String!
    pricePerNight: Float!
    totalPrice: Float!
    currency: String!
    rating: Float!
    stars: Int!
    amenities: [String!]!
    imageUrl: String!
    reviewCount: Int!
    available: Boolean!
  }

  type Booking {
    id: String!
    userId: String
    type: String!
    origin: String
    destination: String!
    dates: BookingDates!
    price: Float!
    status: String!
    bookingData: String
    createdAt: String!
  }

  type BookingDates {
    departure: String
    return: String
    checkIn: String
    checkOut: String
  }

  type User {
    id: String!
    email: String!
    name: String!
    createdAt: String!
  }

  type UserProfile {
    userId: String!
    name: String
    email: String
    preferences: UserPreferences
    searchHistory: [SearchQuery!]
    lastActive: String
  }

  type UserPreferences {
    currency: String!
    class: String!
    notifications: Boolean!
  }

  type SearchQuery {
    type: String!
    params: String!
    timestamp: String!
  }

  type Experiment {
    id: String!
    name: String!
    variants: [String!]!
    startDate: String
    endDate: String
    status: String!
    createdAt: String!
  }

  type ExperimentVariantResult {
    variant: String!
    totalEvents: Int!
    bookingStarted: Int!
    bookingCompleted: Int!
    conversionRate: Float!
  }

  type ExperimentResults {
    experimentId: String!
    experimentName: String!
    variants: [ExperimentVariantResult!]!
    winningVariant: String
    improvement: Float
  }

  type TrackEventResult {
    success: Boolean!
    eventId: String
  }

  type BookingResult {
    success: Boolean!
    booking: Booking
    error: String
  }

  input BookingInput {
    userId: String
    type: String!
    origin: String
    destination: String!
    departureDate: String
    returnDate: String
    checkIn: String
    checkOut: String
    price: Float!
    passengerCount: Int
    guestCount: Int
    bookingData: String
  }

  input UserProfileInput {
    name: String
    email: String
    currency: String
    class: String
    notifications: Boolean
  }

  type Query {
    searchFlights(
      origin: String!
      destination: String!
      date: String!
      passengers: Int!
      returnDate: String
    ): [FlightOffer!]!

    searchHotels(
      location: String!
      checkIn: String!
      checkOut: String!
      guests: Int!
    ): [HotelOffer!]!

    getBookingHistory(userId: String!): [Booking!]!

    getUserProfile(userId: String!): UserProfile

    getExperimentResults(experimentId: String!): ExperimentResults!

    listExperiments: [Experiment!]!

    getUser(id: String!): User

    health: String!
  }

  type Mutation {
    createBooking(input: BookingInput!): BookingResult!

    trackEvent(
      experimentId: String!
      variant: String!
      userId: String
      eventType: String!
      metadata: String
    ): TrackEventResult!

    updateUserProfile(userId: String!, input: UserProfileInput!): UserProfile

    createUser(email: String!, name: String!): User!

    cancelBooking(bookingId: String!, userId: String!): BookingResult!
  }
`;
