import { useState } from 'react';
import type { HotelOffer } from '../../types';
import { formatPrice, formatDate } from '../../utils/formatters';

interface HotelResultsProps {
  hotels: HotelOffer[];
  onSelect: (hotel: HotelOffer) => void;
  pricingVariant?: 'total' | 'nightly';
}

export const HotelResults = ({ hotels, onSelect, pricingVariant = 'total' }: HotelResultsProps) => {
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'stars'>('rating');
  const [filterStars, setFilterStars] = useState<number | null>(null);

  const sorted = [...hotels]
    .filter((h) => filterStars === null || h.stars === filterStars)
    .sort((a, b) => {
      if (sortBy === 'price') return a.pricePerNight - b.pricePerNight;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'stars') return b.stars - a.stars;
      return 0;
    });

  const renderStars = (count: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < count ? 'text-yellow-400' : 'text-gray-200'}>★</span>
    ));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stars:</span>
          {[null, 5, 4, 3].map((stars) => (
            <button
              key={String(stars)}
              onClick={() => setFilterStars(stars)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterStars === stars
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stars === null ? 'All' : `${stars}★`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort:</span>
          {(['rating', 'price', 'stars'] as const).map((key) => (
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

        <span className="text-xs text-gray-400">{sorted.length} properties</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-gray-500">No hotels match your filters.</div>
      )}

      {sorted.map((hotel) => (
        <div
          key={hotel.id}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Hotel image */}
            <div className="sm:w-56 flex-shrink-0 h-44 sm:h-auto relative overflow-hidden">
              <img
                src={hotel.imageUrl}
                alt={hotel.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80';
                }}
              />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-semibold text-gray-700">
                {renderStars(hotel.stars)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{hotel.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">📍 {hotel.location}</p>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-900">
                      {hotel.rating.toFixed(1)}
                    </span>
                    <div className="flex">{renderStars(Math.round(hotel.rating))}</div>
                    <span className="text-xs text-gray-400">({hotel.reviewCount.toLocaleString()})</span>
                  </div>
                </div>

                {hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hotel.amenities.slice(0, 5).map((a) => (
                      <span
                        key={a}
                        className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 rounded-full font-medium border border-sky-100"
                      >
                        {a}
                      </span>
                    ))}
                    {hotel.amenities.length > 5 && (
                      <span className="text-xs text-gray-400">
                        +{hotel.amenities.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  <p>{formatDate(hotel.checkIn)} → {formatDate(hotel.checkOut)}</p>
                </div>

                <div className="flex items-end gap-3">
                  <div className="text-right">
                    {pricingVariant === 'nightly' ? (
                      <>
                        <p className="text-xl font-bold text-gray-900">
                          {formatPrice(hotel.pricePerNight)}
                        </p>
                        <p className="text-xs text-gray-400">/ night</p>
                        <p className="text-xs text-gray-500">
                          {formatPrice(hotel.totalPrice)} total
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-900">
                          {formatPrice(hotel.totalPrice)}
                        </p>
                        <p className="text-xs text-gray-400">total stay</p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => onSelect(hotel)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
