import { useState } from 'react';
import type { SearchParams } from '../../types';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

const POPULAR_ROUTES = [
  { origin: 'JFK', destination: 'LAX', label: 'NYC → LA' },
  { origin: 'SFO', destination: 'ORD', label: 'SF → Chicago' },
  { origin: 'MIA', destination: 'JFK', label: 'Miami → NYC' },
  { origin: 'SEA', destination: 'DFW', label: 'Seattle → Dallas' },
];

export const SearchForm = ({ onSearch, loading }: SearchFormProps) => {
  const [type, setType] = useState<'flight' | 'hotel'>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [guests, setGuests] = useState(2);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const params: SearchParams = {
      type,
      destination: type === 'flight' ? destination : destination,
      passengers,
      departureDate: type === 'flight' ? departureDate : checkIn,
    };

    if (type === 'flight') {
      params.origin = origin;
      if (tripType === 'round-trip') params.returnDate = returnDate;
    } else {
      params.checkIn = checkIn;
      params.checkOut = checkOut;
      params.guests = guests;
    }

    onSearch(params);
  };

  const fillRoute = (r: { origin: string; destination: string }) => {
    setOrigin(r.origin);
    setDestination(r.destination);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-gray-100">
        {(['flight', 'hotel'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-4 text-sm font-semibold transition-all capitalize flex items-center justify-center gap-2 ${
              type === t
                ? 'text-blue-700 border-b-2 border-blue-700 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{t === 'flight' ? '✈️' : '🏨'}</span>
            {t === 'flight' ? 'Flights' : 'Hotels'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Flight type selector */}
        {type === 'flight' && (
          <div className="flex gap-4 mb-5">
            {(['one-way', 'round-trip'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={tripType === t}
                  onChange={() => setTripType(t)}
                  className="accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {t.replace('-', ' ')}
                </span>
              </label>
            ))}
          </div>
        )}

        {type === 'flight' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                From
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="JFK, LAX..."
                required
                maxLength={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                To
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="Destination"
                required
                maxLength={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Depart
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={today}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            {tripType === 'round-trip' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Return
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={departureDate || today}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Passengers
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Adult' : 'Adults'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="New York, Paris, Tokyo..."
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Check In
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={today}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Check Out
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || today}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Guests
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Guest' : 'Guests'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Popular routes (flights only) */}
        {type === 'flight' && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs text-gray-400 self-center">Popular:</span>
            {POPULAR_ROUTES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => fillRoute(r)}
                className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700 transition-colors font-medium"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Searching...
            </span>
          ) : (
            `Search ${type === 'flight' ? 'Flights' : 'Hotels'}`
          )}
        </button>
      </form>
    </div>
  );
};
