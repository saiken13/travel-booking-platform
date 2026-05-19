import { resolvers } from '../resolvers';

// Mock all external dependencies
jest.mock('../db/postgres', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../db/mongodb', () => ({
  UserSession: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  SearchHistory: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../db/redis', () => ({
  safeGet: jest.fn().mockResolvedValue(null),
  safeSetex: jest.fn().mockResolvedValue(undefined),
  CACHE_TTL: { FLIGHT_SEARCH: 300, HOTEL_SEARCH: 300 },
}));

jest.mock('../services/amadeusService', () => ({
  searchFlights: jest.fn().mockResolvedValue([
    {
      id: 'flight_1',
      airline: 'AA',
      airlineName: 'American Airlines',
      origin: 'JFK',
      destination: 'LAX',
      departure: '2024-06-01T08:00:00Z',
      arrival: '2024-06-01T11:30:00Z',
      duration: 'PT5H30M',
      price: 289,
      currency: 'USD',
      stops: 0,
      cabinClass: 'ECONOMY',
      seatsAvailable: 8,
    },
  ]),
}));

jest.mock('../services/hotelsService', () => ({
  searchHotels: jest.fn().mockResolvedValue([
    {
      id: 'hotel_1',
      name: 'Grand Plaza Hotel',
      location: 'New York',
      checkIn: '2024-06-01',
      checkOut: '2024-06-05',
      pricePerNight: 289,
      totalPrice: 1156,
      currency: 'USD',
      rating: 4.8,
      stars: 5,
      amenities: ['WiFi', 'Pool'],
      imageUrl: 'https://example.com/hotel.jpg',
      reviewCount: 1200,
      available: true,
    },
  ]),
}));

import { pool } from '../db/postgres';
import { UserSession } from '../db/mongodb';

const mockPool = pool as jest.Mocked<typeof pool>;

describe('Query.health', () => {
  it('returns OK with timestamp', () => {
    const result = resolvers.Query.health();
    expect(result).toMatch(/^OK — /);
  });
});

describe('Query.searchFlights', () => {
  it('returns flight offers for valid params', async () => {
    const result = await resolvers.Query.searchFlights(undefined, {
      origin: 'JFK',
      destination: 'LAX',
      date: '2024-06-01',
      passengers: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'flight_1',
      origin: 'JFK',
      destination: 'LAX',
      price: 289,
    });
  });

  it('throws if required params missing', async () => {
    await expect(
      resolvers.Query.searchFlights(undefined, {
        origin: '',
        destination: 'LAX',
        date: '2024-06-01',
        passengers: 1,
      })
    ).rejects.toThrow('required');
  });
});

describe('Query.searchHotels', () => {
  it('returns hotel offers for valid params', async () => {
    const result = await resolvers.Query.searchHotels(undefined, {
      location: 'New York',
      checkIn: '2024-06-01',
      checkOut: '2024-06-05',
      guests: 2,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'hotel_1',
      name: 'Grand Plaza Hotel',
      pricePerNight: 289,
    });
  });

  it('throws if required params missing', async () => {
    await expect(
      resolvers.Query.searchHotels(undefined, {
        location: '',
        checkIn: '2024-06-01',
        checkOut: '2024-06-05',
        guests: 2,
      })
    ).rejects.toThrow('required');
  });
});

describe('Query.getBookingHistory', () => {
  it('returns bookings for a user', async () => {
    const mockDate = new Date('2024-06-01T00:00:00Z');
    mockPool.query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'booking_1',
          userId: 'user_1',
          type: 'flight',
          origin: 'JFK',
          destination: 'LAX',
          dates: { departure: '2024-06-01' },
          price: '289.00',
          status: 'confirmed',
          bookingData: null,
          createdAt: mockDate,
        },
      ],
    });

    const result = await resolvers.Query.getBookingHistory(undefined, { userId: 'user_1' });

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(289);
    expect(result[0].createdAt).toBe(mockDate.toISOString());
  });
});

describe('Mutation.createBooking', () => {
  it('creates a flight booking and returns success', async () => {
    const mockDate = new Date();
    mockPool.query = jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'booking_new',
          userId: 'user_1',
          type: 'flight',
          origin: 'JFK',
          destination: 'LAX',
          dates: { departure: '2024-06-01' },
          price: '289.00',
          status: 'confirmed',
          bookingData: null,
          createdAt: mockDate,
        },
      ],
    });

    const result = await resolvers.Mutation.createBooking(undefined, {
      input: {
        userId: 'user_1',
        type: 'flight',
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-06-01',
        price: 289,
        passengerCount: 1,
      },
    });

    expect(result.success).toBe(true);
    expect(result.booking).toBeDefined();
    expect(result.booking?.price).toBe(289);
    expect(result.booking?.status).toBe('confirmed');
  });
});

describe('Mutation.trackEvent', () => {
  it('tracks a valid event', async () => {
    mockPool.query = jest.fn().mockResolvedValue({
      rows: [{ id: 'event_1' }],
    });

    const result = await resolvers.Mutation.trackEvent(undefined, {
      experimentId: 'exp_1',
      variant: 'control',
      userId: 'user_1',
      eventType: 'booking_completed',
    });

    expect(result.success).toBe(true);
    expect(result.eventId).toBe('event_1');
  });

  it('throws for invalid event type', async () => {
    await expect(
      resolvers.Mutation.trackEvent(undefined, {
        experimentId: 'exp_1',
        variant: 'control',
        eventType: 'invalid_event_type',
      })
    ).rejects.toThrow('Invalid event_type');
  });
});

describe('Mutation.createUser', () => {
  it('creates a new user', async () => {
    const mockDate = new Date();
    mockPool.query = jest.fn().mockResolvedValue({
      rows: [{ id: 'user_new', email: 'test@example.com', name: 'Test User', createdAt: mockDate }],
    });

    const result = await resolvers.Mutation.createUser(undefined, {
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
  });
});
