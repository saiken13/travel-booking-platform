import { gql } from '@apollo/client';

export const SEARCH_FLIGHTS = gql`
  query SearchFlights(
    $origin: String!
    $destination: String!
    $date: String!
    $passengers: Int!
    $returnDate: String
  ) {
    searchFlights(
      origin: $origin
      destination: $destination
      date: $date
      passengers: $passengers
      returnDate: $returnDate
    ) {
      id
      airline
      airlineName
      origin
      destination
      departure
      arrival
      duration
      price
      currency
      stops
      cabinClass
      seatsAvailable
    }
  }
`;

export const SEARCH_HOTELS = gql`
  query SearchHotels(
    $location: String!
    $checkIn: String!
    $checkOut: String!
    $guests: Int!
  ) {
    searchHotels(
      location: $location
      checkIn: $checkIn
      checkOut: $checkOut
      guests: $guests
    ) {
      id
      name
      location
      checkIn
      checkOut
      pricePerNight
      totalPrice
      currency
      rating
      stars
      amenities
      imageUrl
      reviewCount
      available
    }
  }
`;

export const GET_BOOKING_HISTORY = gql`
  query GetBookingHistory($userId: String!) {
    getBookingHistory(userId: $userId) {
      id
      userId
      type
      origin
      destination
      dates {
        departure
        return
        checkIn
        checkOut
      }
      price
      status
      createdAt
    }
  }
`;

export const LIST_EXPERIMENTS = gql`
  query ListExperiments {
    listExperiments {
      id
      name
      variants
      startDate
      endDate
      status
      createdAt
    }
  }
`;

export const GET_EXPERIMENT_RESULTS = gql`
  query GetExperimentResults($experimentId: String!) {
    getExperimentResults(experimentId: $experimentId) {
      experimentId
      experimentName
      variants {
        variant
        totalEvents
        bookingStarted
        bookingCompleted
        conversionRate
      }
      winningVariant
      improvement
    }
  }
`;

export const HEALTH_CHECK = gql`
  query HealthCheck {
    health
  }
`;
