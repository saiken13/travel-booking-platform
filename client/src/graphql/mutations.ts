import { gql } from '@apollo/client';

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: BookingInput!) {
    createBooking(input: $input) {
      success
      error
      booking {
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
  }
`;

export const TRACK_EVENT = gql`
  mutation TrackEvent(
    $experimentId: String!
    $variant: String!
    $userId: String
    $eventType: String!
    $metadata: String
  ) {
    trackEvent(
      experimentId: $experimentId
      variant: $variant
      userId: $userId
      eventType: $eventType
      metadata: $metadata
    ) {
      success
      eventId
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($email: String!, $name: String!) {
    createUser(email: $email, name: $name) {
      id
      email
      name
      createdAt
    }
  }
`;

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($userId: String!, $input: UserProfileInput!) {
    updateUserProfile(userId: $userId, input: $input) {
      userId
      name
      email
      preferences {
        currency
        class
        notifications
      }
    }
  }
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($bookingId: String!, $userId: String!) {
    cancelBooking(bookingId: $bookingId, userId: $userId) {
      success
      error
      booking {
        id
        status
      }
    }
  }
`;
