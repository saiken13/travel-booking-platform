import { useQuery } from '@apollo/client';
import { GET_BOOKING_HISTORY } from '../graphql/queries';
import { LoadingSpinner, ErrorMessage } from '../components/common/ErrorMessage';
import { useTracking } from '../hooks/useExperiment';
import { formatPrice, formatDate } from '../utils/formatters';
import type { Booking } from '../types';
import { useEffect } from 'react';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const BookingsPage = () => {
  const { getUserId } = useTracking();
  const userId = getUserId();

  const { data, loading, error, refetch } = useQuery<{ getBookingHistory: Booking[] }>(
    GET_BOOKING_HISTORY,
    { variables: { userId }, fetchPolicy: 'network-only' }
  );

  const bookings = data?.getBookingHistory || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Bookings</h1>
          <p className="text-gray-500 text-sm">Your travel booking history</p>
        </div>

        {loading && <LoadingSpinner label="Loading bookings..." />}
        {error && (
          <ErrorMessage
            message="Could not load bookings. Make sure you've made a booking first."
            onRetry={() => refetch()}
          />
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🧳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-500 mb-6">Your future adventures will appear here</p>
            <a
              href="/"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              Search Trips
            </a>
          </div>
        )}

        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">{booking.type === 'flight' ? '✈' : '🏨'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 capitalize">
                      {booking.type}{' '}
                      {booking.origin ? `${booking.origin} → ` : ''}
                      {booking.destination}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {booking.type === 'flight'
                        ? `Departs ${booking.dates?.departure ? formatDate(booking.dates.departure) : '—'}`
                        : `${booking.dates?.checkIn ? formatDate(booking.dates.checkIn) : '—'} → ${booking.dates?.checkOut ? formatDate(booking.dates.checkOut) : '—'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {booking.status}
                  </span>
                  <span className="text-lg font-bold text-gray-900">{formatPrice(booking.price)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span className="font-mono">{booking.id}</span>
                <span>Booked {booking.createdAt ? formatDate(booking.createdAt) : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
