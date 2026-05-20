import { pool } from '../db/postgres';
import { UserSession, SearchHistory } from '../db/mongodb';
import { searchFlights } from '../services/amadeusService';
import { searchHotels } from '../services/hotelsService';
import { safeGet, safeSetex, CACHE_TTL } from '../db/redis';

interface TrackEventArgs {
  experimentId: string;
  variant: string;
  userId?: string;
  eventType: string;
  metadata?: string;
}

interface BookingInput {
  userId?: string;
  type: string;
  origin?: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  price: number;
  passengerCount?: number;
  guestCount?: number;
  bookingData?: string;
}

interface UserProfileInput {
  name?: string;
  email?: string;
  currency?: string;
  class?: string;
  notifications?: boolean;
}

export const resolvers = {
  Query: {
    health: () => `OK — ${new Date().toISOString()}`,

    searchFlights: async (
      _: unknown,
      args: { origin: string; destination: string; date: string; passengers: number; returnDate?: string }
    ) => {
      const { origin, destination, date, passengers, returnDate } = args;
      if (!origin || !destination || !date || !passengers) {
        throw new Error('origin, destination, date, and passengers are required');
      }
      return searchFlights(origin, destination, date, passengers, returnDate);
    },

    searchHotels: async (
      _: unknown,
      args: { location: string; checkIn: string; checkOut: string; guests: number }
    ) => {
      const { location, checkIn, checkOut, guests } = args;
      if (!location || !checkIn || !checkOut || !guests) {
        throw new Error('location, checkIn, checkOut, and guests are required');
      }
      return searchHotels(location, checkIn, checkOut, guests);
    },

    getBookingHistory: async (_: unknown, { userId }: { userId: string }) => {
      const result = await pool.query(
        `SELECT id, user_id as "userId", type, origin, destination,
                dates, price, status, booking_data as "bookingData",
                created_at as "createdAt"
         FROM bookings
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );
      return result.rows.map((row) => ({
        ...row,
        dates: row.dates,
        price: parseFloat(row.price),
        createdAt: row.createdAt.toISOString(),
      }));
    },

    getUserProfile: async (_: unknown, { userId }: { userId: string }) => {
      const session = await UserSession.findOne({ user_id: userId });
      const history = await SearchHistory.findOne({ user_id: userId });

      if (!session) return null;

      return {
        userId,
        name: session.profile_data?.name,
        email: session.profile_data?.email,
        preferences: session.profile_data?.preferences || {
          currency: 'USD',
          class: 'economy',
          notifications: true,
        },
        searchHistory: (history?.queries || []).slice(-10).map((q) => ({
          type: q.type,
          params: JSON.stringify(q.params),
          timestamp: q.timestamp.toISOString(),
        })),
        lastActive: session.last_active?.toISOString(),
      };
    },

    listExperiments: async () => {
      const result = await pool.query(
        `SELECT id, name, variants, start_date as "startDate",
                end_date as "endDate", status, created_at as "createdAt"
         FROM experiments
         ORDER BY created_at DESC`
      );
      return result.rows.map((row) => ({
        ...row,
        variants: Array.isArray(row.variants) ? row.variants : JSON.parse(row.variants),
        startDate: row.startDate?.toISOString(),
        endDate: row.endDate?.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }));
    },

    getExperimentResults: async (_: unknown, { experimentId }: { experimentId: string }) => {
      const expResult = await pool.query(
        `SELECT id, name, variants FROM experiments WHERE id = $1`,
        [experimentId]
      );

      if (!expResult.rows.length) {
        throw new Error(`Experiment ${experimentId} not found`);
      }

      const experiment = expResult.rows[0];
      const variants: string[] = Array.isArray(experiment.variants)
        ? experiment.variants
        : JSON.parse(experiment.variants);

      const eventResult = await pool.query(
        `SELECT variant,
                COUNT(*) as total_events,
                COUNT(CASE WHEN event_type = 'booking_started' THEN 1 END) as booking_started,
                COUNT(CASE WHEN event_type = 'booking_completed' THEN 1 END) as booking_completed
         FROM experiment_events
         WHERE experiment_id = $1
         GROUP BY variant`,
        [experimentId]
      );

      const eventMap = new Map(eventResult.rows.map((r) => [r.variant, r]));

      const variantResults = variants.map((variant) => {
        const data = eventMap.get(variant);
        const totalEvents = parseInt(data?.total_events || '0');
        const bookingStarted = parseInt(data?.booking_started || '0');
        const bookingCompleted = parseInt(data?.booking_completed || '0');
        const conversionRate = bookingStarted > 0 ? bookingCompleted / bookingStarted : 0;
        return { variant, totalEvents, bookingStarted, bookingCompleted, conversionRate };
      });

      // Find the winning variant by conversion rate
      const sorted = [...variantResults].sort((a, b) => b.conversionRate - a.conversionRate);
      const winner = sorted[0];
      const control = variantResults.find((v) => v.variant === 'control') || variantResults[0];
      const improvement =
        control && control.conversionRate > 0
          ? ((winner.conversionRate - control.conversionRate) / control.conversionRate) * 100
          : null;

      return {
        experimentId,
        experimentName: experiment.name,
        variants: variantResults,
        winningVariant: winner?.variant,
        improvement,
      };
    },

    getUser: async (_: unknown, { id }: { id: string }) => {
      const result = await pool.query(
        `SELECT id, email, name, created_at as "createdAt" FROM users WHERE id = $1`,
        [id]
      );
      if (!result.rows.length) return null;
      const row = result.rows[0];
      return { ...row, createdAt: row.createdAt.toISOString() };
    },
  },

  Mutation: {
    createUser: async (_: unknown, { email, name }: { email: string; name: string }) => {
      const result = await pool.query(
        `INSERT INTO users (email, name) VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, email, name, created_at as "createdAt"`,
        [email, name]
      );
      const row = result.rows[0];
      return { ...row, createdAt: row.createdAt.toISOString() };
    },

    createBooking: async (_: unknown, { input }: { input: BookingInput }) => {
      const {
        userId, type, origin, destination,
        departureDate, returnDate, checkIn, checkOut,
        price, passengerCount, guestCount, bookingData,
      } = input;

      const dates = type === 'flight'
        ? { departure: departureDate, return: returnDate }
        : { checkIn, checkOut };

      // The frontend sends a localStorage UUID as userId — auto-create the user
      // from traveler details so the FK constraint is satisfied.
      let resolvedUserId: string | null = null;
      if (userId) {
        const exists = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (exists.rows.length > 0) {
          resolvedUserId = userId;
        } else {
          try {
            const parsed = bookingData ? JSON.parse(bookingData) : null;
            const t = parsed?.travelers?.[0];
            const email = t?.email || `guest_${userId.slice(0, 8)}@skybook.app`;
            const name = t ? `${t.firstName} ${t.lastName}`.trim() : 'Guest';
            const upsert = await pool.query(
              `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
               ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [userId, email, name]
            );
            resolvedUserId = upsert.rows[0].id;
          } catch {
            resolvedUserId = null;
          }
        }
      }

      const result = await pool.query(
        `INSERT INTO bookings (user_id, type, origin, destination, dates, price, status, booking_data)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7)
         RETURNING id, user_id as "userId", type, origin, destination,
                   dates, price, status, booking_data as "bookingData",
                   created_at as "createdAt"`,
        [
          resolvedUserId,
          type,
          origin || null,
          destination,
          JSON.stringify(dates),
          price,
          bookingData || null,
        ]
      );

      const row = result.rows[0];

      // Persist search history to MongoDB if userId provided
      if (userId) {
        await SearchHistory.findOneAndUpdate(
          { user_id: userId },
          {
            $push: {
              queries: {
                $each: [{
                  type: type as 'flight' | 'hotel',
                  params: { origin, destination, departureDate, checkIn, checkOut, passengerCount, guestCount },
                  timestamp: new Date(),
                }],
                $slice: -50,
              },
            },
          },
          { upsert: true }
        );
      }

      return {
        success: true,
        booking: {
          ...row,
          price: parseFloat(row.price),
          createdAt: row.createdAt.toISOString(),
        },
      };
    },

    cancelBooking: async (_: unknown, { bookingId, userId }: { bookingId: string; userId: string }) => {
      const result = await pool.query(
        `UPDATE bookings SET status = 'cancelled'
         WHERE id = $1 AND user_id = $2
         RETURNING id, user_id as "userId", type, origin, destination,
                   dates, price, status, booking_data as "bookingData",
                   created_at as "createdAt"`,
        [bookingId, userId]
      );

      if (!result.rows.length) {
        return { success: false, error: 'Booking not found or unauthorized' };
      }

      const row = result.rows[0];
      return {
        success: true,
        booking: { ...row, price: parseFloat(row.price), createdAt: row.createdAt.toISOString() },
      };
    },

    trackEvent: async (_: unknown, args: TrackEventArgs) => {
      const { experimentId, variant, userId, eventType, metadata } = args;

      const validEventTypes = [
        'search_initiated', 'results_loaded', 'result_clicked',
        'details_viewed', 'form_started', 'form_completed',
        'price_expanded', 'sort_changed', 'filter_applied',
        'booking_started', 'booking_completed', 'booking_abandoned',
      ];

      if (!validEventTypes.includes(eventType)) {
        throw new Error(`Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`);
      }

      // Accept either a UUID or an experiment name — look up by name if not a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let resolvedId: string | null = null;
      if (uuidRegex.test(experimentId)) {
        resolvedId = experimentId;
      } else {
        const lookup = await pool.query(
          'SELECT id FROM experiments WHERE name = $1 LIMIT 1',
          [experimentId]
        );
        resolvedId = lookup.rows[0]?.id ?? null;
      }

      const result = await pool.query(
        `INSERT INTO experiment_events (experiment_id, variant, user_id, event_type, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [resolvedId, variant, userId || null, eventType, metadata ? JSON.parse(metadata) : null]
      );

      return { success: true, eventId: result.rows[0].id };
    },

    updateUserProfile: async (
      _: unknown,
      { userId, input }: { userId: string; input: UserProfileInput }
    ) => {
      const updateFields: Record<string, unknown> = {};
      if (input.name !== undefined) updateFields['profile_data.name'] = input.name;
      if (input.email !== undefined) updateFields['profile_data.email'] = input.email;
      if (input.currency !== undefined) updateFields['profile_data.preferences.currency'] = input.currency;
      if (input.class !== undefined) updateFields['profile_data.preferences.class'] = input.class;
      if (input.notifications !== undefined) updateFields['profile_data.preferences.notifications'] = input.notifications;
      updateFields.last_active = new Date();

      const session = await UserSession.findOneAndUpdate(
        { user_id: userId },
        { $set: updateFields },
        { upsert: true, new: true }
      );

      if (!session) return null;

      return {
        userId,
        name: session.profile_data?.name,
        email: session.profile_data?.email,
        preferences: session.profile_data?.preferences || {
          currency: 'USD',
          class: 'economy',
          notifications: true,
        },
        searchHistory: [],
        lastActive: session.last_active?.toISOString(),
      };
    },
  },
};
