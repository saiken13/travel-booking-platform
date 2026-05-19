import { useState } from 'react';
import type { FlightOffer } from '../../types';
import { formatTime, formatDuration, formatPrice, formatStops } from '../../utils/formatters';

interface FlightResultsProps {
  flights: FlightOffer[];
  onSelect: (flight: FlightOffer) => void;
  pricingVariant?: 'total' | 'perPerson';
}

type SortKey = 'price' | 'duration' | 'departure';

export const FlightResults = ({ flights, onSelect, pricingVariant = 'total' }: FlightResultsProps) => {
  const [sortBy, setSortBy] = useState<SortKey>('price');
  const [filterStops, setFilterStops] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...flights]
    .filter((f) => filterStops === null || f.stops === filterStops)
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'departure') return new Date(a.departure).getTime() - new Date(b.departure).getTime();
      return 0; // duration sort is approximate
    });

  const minPrice = Math.min(...flights.map((f) => f.price));

  return (
    <div className="space-y-4">
      {/* Filters & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stops:</span>
          {[null, 0, 1].map((stops) => (
            <button
              key={String(stops)}
              onClick={() => setFilterStops(stops)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStops === stops
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stops === null ? 'All' : stops === 0 ? 'Nonstop' : '1 Stop'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</span>
          {(['price', 'departure'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                sortBy === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400">{sorted.length} results</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No flights match your filters.
        </div>
      )}

      {sorted.map((flight) => {
        const isExpanded = expandedId === flight.id;
        const isBestPrice = flight.price === minPrice;

        return (
          <div
            key={flight.id}
            className={`bg-white rounded-xl border transition-all hover:shadow-md ${
              isBestPrice ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            {isBestPrice && (
              <div className="px-4 pt-2">
                <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Best price
                </span>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Airline */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{flight.airline}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{flight.airlineName}</p>
                    <p className="text-xs text-gray-400 capitalize">{flight.cabinClass.toLowerCase()}</p>
                  </div>
                </div>

                {/* Route + Time */}
                <div className="flex items-center gap-4 flex-1 justify-center">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{formatTime(flight.departure)}</p>
                    <p className="text-xs font-mono font-semibold text-gray-500">{flight.origin}</p>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs text-gray-400">{formatDuration(flight.duration)}</p>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-px bg-gray-300" />
                      <span className="text-xs">✈</span>
                      <div className="w-12 h-px bg-gray-300" />
                    </div>
                    <p className={`text-xs font-medium ${flight.stops === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                      {formatStops(flight.stops)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{formatTime(flight.arrival)}</p>
                    <p className="text-xs font-mono font-semibold text-gray-500">{flight.destination}</p>
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    {pricingVariant === 'perPerson' ? (
                      <>
                        <p className="text-2xl font-bold text-gray-900">{formatPrice(flight.price)}</p>
                        <p className="text-xs text-gray-400">per person</p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(flight.price)}</p>
                    )}
                    <p className="text-xs text-gray-400">{flight.seatsAvailable} seats left</p>
                  </div>

                  <button
                    onClick={() => onSelect(flight)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Select
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : flight.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? '▲ Hide details' : '▼ Flight details'}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-gray-400 font-medium">Flight ID</dt>
                      <dd className="font-mono text-xs text-gray-700 mt-1">{flight.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 font-medium">Cabin</dt>
                      <dd className="text-gray-700 mt-1 capitalize">{flight.cabinClass.toLowerCase()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 font-medium">Duration</dt>
                      <dd className="text-gray-700 mt-1">{formatDuration(flight.duration)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-400 font-medium">Currency</dt>
                      <dd className="text-gray-700 mt-1">{flight.currency}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
