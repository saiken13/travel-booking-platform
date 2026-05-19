/**
 * End-to-end booking flow tests
 * These tests verify the full booking funnel from search → selection → confirmation
 */

jest.mock('../db/postgres', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('../db/mongodb', () => ({
  UserSession: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
  SearchHistory: { findOne: jest.fn(), findOneAndUpdate: jest.fn() },
}));

jest.mock('../db/redis', () => ({
  safeGet: jest.fn().mockResolvedValue(null),
  safeSetex: jest.fn(),
  CACHE_TTL: { FLIGHT_SEARCH: 300, HOTEL_SEARCH: 300 },
}));

jest.mock('../services/amadeusService', () => ({
  searchFlights: jest.fn().mockResolvedValue([
    {
      id: 'f1', airline: 'AA', airlineName: 'American Airlines',
      origin: 'SFO', destination: 'NYC', departure: '2024-07-15T09:00:00Z',
      arrival: '2024-07-15T17:30:00Z', duration: 'PT8H30M',
      price: 450, currency: 'USD', stops: 0, cabinClass: 'ECONOMY', seatsAvailable: 4,
    },
    {
      id: 'f2', airline: 'UA', airlineName: 'United Airlines',
      origin: 'SFO', destination: 'NYC', departure: '2024-07-15T14:00:00Z',
      arrival: '2024-07-15T22:45:00Z', duration: 'PT8H45M',
      price: 385, currency: 'USD', stops: 1, cabinClass: 'ECONOMY', seatsAvailable: 12,
    },
  ]),
}));

jest.mock('../services/hotelsService', () => ({
  searchHotels: jest.fn().mockResolvedValue([
    {
      id: 'h1', name: 'NYC Marriott', location: 'New York',
      checkIn: '2024-07-15', checkOut: '2024-07-20',
      pricePerNight: 220, totalPrice: 1100, currency: 'USD',
      rating: 4.6, stars: 4, amenities: ['WiFi', 'Gym'],
      imageUrl: 'https://example.com/hotel.jpg', reviewCount: 900, available: true,
    },
  ]),
}));

import { resolvers } from '../resolvers';
import { pool } from '../db/postgres';
import { SearchHistory } from '../db/mongodb';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockSearchHistory = SearchHistory as jest.Mocked<typeof SearchHistory>;

describe('Full Booking Flow', () => {
  describe('Step 1: Search', () => {
    it('searches flights with multiple results', async () => {
      const flights = await resolvers.Query.searchFlights(undefined, {
        origin: 'SFO', destination: 'NYC', date: '2024-07-15', passengers: 1,
      });
      expect(flights).toHaveLength(2);
      expect(flights[0].stops).toBe(0);
      expect(flights[1].stops).toBe(1);
    });

    it('searches hotels with valid dates', async () => {
      const hotels = await resolvers.Query.searchHotels(undefined, {
        location: 'New York', checkIn: '2024-07-15', checkOut: '2024-07-20', guests: 2,
      });
      expect(hotels).toHaveLength(1);
      expect(hotels[0].totalPrice).toBe(1100);
    });
  });

  describe('Step 2: Selection + Booking Creation', () => {
    beforeEach(() => {
      const mockDate = new Date('2024-07-01T00:00:00Z');
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{
          id: 'booking_flow_test',
          userId: 'user_test',
          type: 'flight',
          origin: 'SFO',
          destination: 'NYC',
          dates: { departure: '2024-07-15' },
          price: '450.00',
          status: 'confirmed',
          bookingData: '{"flightId":"f1","passengers":[{"name":"John Doe"}]}',
          createdAt: mockDate,
        }],
      });

      mockSearchHistory.findOneAndUpdate = jest.fn().mockResolvedValue(null);
    });

    it('creates a flight booking with traveler details', async () => {
      const result = await resolvers.Mutation.createBooking(undefined, {
        input: {
          userId: 'user_test',
          type: 'flight',
          origin: 'SFO',
          destination: 'NYC',
          departureDate: '2024-07-15',
          price: 450,
          passengerCount: 1,
          bookingData: JSON.stringify({ flightId: 'f1', passengers: [{ name: 'John Doe' }] }),
        },
      });

      expect(result.success).toBe(true);
      expect(result.booking?.status).toBe('confirmed');
      expect(result.booking?.type).toBe('flight');
    });

    it('saves search history to MongoDB when userId provided', async () => {
      await resolvers.Mutation.createBooking(undefined, {
        input: {
          userId: 'user_test',
          type: 'flight',
          origin: 'SFO',
          destination: 'NYC',
          departureDate: '2024-07-15',
          price: 450,
        },
      });

      expect(mockSearchHistory.findOneAndUpdate).toHaveBeenCalledWith(
        { user_id: 'user_test' },
        expect.objectContaining({ $push: expect.any(Object) }),
        expect.any(Object)
      );
    });
  });

  describe('Step 3: Review + Cancellation', () => {
    it('retrieves booking history after booking', async () => {
      const mockDate = new Date('2024-07-01T00:00:00Z');
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{
          id: 'booking_flow_test',
          userId: 'user_test',
          type: 'flight',
          origin: 'SFO',
          destination: 'NYC',
          dates: { departure: '2024-07-15' },
          price: '450.00',
          status: 'confirmed',
          bookingData: null,
          createdAt: mockDate,
        }],
      });

      const history = await resolvers.Query.getBookingHistory(undefined, { userId: 'user_test' });
      expect(history).toHaveLength(1);
      expect(history[0].destination).toBe('NYC');
    });

    it('cancels a booking and returns cancelled status', async () => {
      const mockDate = new Date();
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{
          id: 'booking_flow_test',
          userId: 'user_test',
          type: 'flight',
          origin: 'SFO',
          destination: 'NYC',
          dates: { departure: '2024-07-15' },
          price: '450.00',
          status: 'cancelled',
          bookingData: null,
          createdAt: mockDate,
        }],
      });

      const result = await resolvers.Mutation.cancelBooking(undefined, {
        bookingId: 'booking_flow_test',
        userId: 'user_test',
      });

      expect(result.success).toBe(true);
      expect(result.booking?.status).toBe('cancelled');
    });

    it('fails to cancel booking for wrong user', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      const result = await resolvers.Mutation.cancelBooking(undefined, {
        bookingId: 'booking_flow_test',
        userId: 'wrong_user',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('A/B Testing: Experiment Events', () => {
    it('tracks all 12 defined event types', async () => {
      const eventTypes = [
        'search_initiated', 'results_loaded', 'result_clicked',
        'details_viewed', 'form_started', 'form_completed',
        'price_expanded', 'sort_changed', 'filter_applied',
        'booking_started', 'booking_completed', 'booking_abandoned',
      ];

      for (const eventType of eventTypes) {
        mockPool.query = jest.fn().mockResolvedValue({ rows: [{ id: `evt_${eventType}` }] });

        const result = await resolvers.Mutation.trackEvent(undefined, {
          experimentId: 'exp_1',
          variant: 'control',
          userId: 'user_test',
          eventType,
        });

        expect(result.success).toBe(true);
      }
    });

    it('rejects tracking for unknown event types', async () => {
      await expect(
        resolvers.Mutation.trackEvent(undefined, {
          experimentId: 'exp_1',
          variant: 'control',
          eventType: 'unknown_event',
        })
      ).rejects.toThrow('Invalid event_type');
    });
  });
});
