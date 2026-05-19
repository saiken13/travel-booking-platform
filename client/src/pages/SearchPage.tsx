import { useState, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SearchForm } from '../components/search/SearchForm';
import { FlightResults } from '../components/search/FlightResults';
import { HotelResults } from '../components/search/HotelResults';
import { BookingFunnel } from '../components/booking/BookingFunnel';
import { ErrorMessage, LoadingSpinner } from '../components/common/ErrorMessage';
import { SEARCH_FLIGHTS, SEARCH_HOTELS } from '../graphql/queries';
import { useExperiment, useTracking } from '../hooks/useExperiment';
import type { FlightOffer, HotelOffer, SearchParams } from '../types';

// Active experiments
const EXPERIMENTS = {
  CHECKOUT_BUTTON: { id: '', name: 'checkout_button_color', variants: ['control', 'variant_blue', 'variant_green'] },
  PRICING_FORMAT: { id: '', name: 'pricing_display_format', variants: ['total_price', 'nightly_price'] },
};

export const SearchPage = () => {
  const [view, setView] = useState<'search' | 'results' | 'booking' | 'confirmed'>('search');
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelOffer | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  // Experiment variants
  const { variant: pricingVariant, userId } = useExperiment(
    EXPERIMENTS.PRICING_FORMAT.name,
    EXPERIMENTS.PRICING_FORMAT.variants
  );
  const { track } = useTracking();

  const [searchFlightsQuery, { data: flightsData, loading: flightsLoading, error: flightsError }] =
    useLazyQuery(SEARCH_FLIGHTS, {
      fetchPolicy: 'cache-first',
      onCompleted: () => {
        track(EXPERIMENTS.PRICING_FORMAT.name, pricingVariant, 'results_loaded', userId);
      },
    });

  const [searchHotelsQuery, { data: hotelsData, loading: hotelsLoading, error: hotelsError }] =
    useLazyQuery(SEARCH_HOTELS, {
      fetchPolicy: 'cache-first',
      onCompleted: () => {
        track(EXPERIMENTS.PRICING_FORMAT.name, pricingVariant, 'results_loaded', userId);
      },
    });

  const handleSearch = async (params: SearchParams) => {
    setSearchParams(params);
    track(EXPERIMENTS.PRICING_FORMAT.name, pricingVariant, 'search_initiated', userId);

    if (params.type === 'flight') {
      await searchFlightsQuery({
        variables: {
          origin: params.origin,
          destination: params.destination,
          date: params.departureDate,
          passengers: params.passengers,
          returnDate: params.returnDate,
        },
      });
    } else {
      await searchHotelsQuery({
        variables: {
          location: params.destination,
          checkIn: params.checkIn || params.departureDate,
          checkOut: params.checkOut || '',
          guests: params.guests || 2,
        },
      });
    }

    setView('results');
  };

  const handleFlightSelect = (flight: FlightOffer) => {
    setSelectedFlight(flight);
    setSelectedHotel(null);
    track(EXPERIMENTS.PRICING_FORMAT.name, pricingVariant, 'result_clicked', userId, { flightId: flight.id });
    setView('booking');
  };

  const handleHotelSelect = (hotel: HotelOffer) => {
    setSelectedHotel(hotel);
    setSelectedFlight(null);
    track(EXPERIMENTS.PRICING_FORMAT.name, pricingVariant, 'result_clicked', userId, { hotelId: hotel.id });
    setView('booking');
  };

  const handleBookingComplete = (bookingId: string) => {
    setConfirmedBookingId(bookingId);
    setView('confirmed');
  };

  const resetToSearch = () => {
    setView('search');
    setSelectedFlight(null);
    setSelectedHotel(null);
    setSearchParams(null);
    setConfirmedBookingId(null);
  };

  const flights: FlightOffer[] = flightsData?.searchFlights || [];
  const hotels: HotelOffer[] = hotelsData?.searchHotels || [];
  const isLoading = flightsLoading || hotelsLoading;
  const searchError = flightsError || hotelsError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      {view === 'search' && (
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white pt-16 pb-24 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
              Find Your Perfect Trip
            </h1>
            <p className="text-blue-100 text-lg mb-0">
              Real-time flights and hotels. Book in minutes.
            </p>
          </div>
        </div>
      )}

      <div
        className={`max-w-5xl mx-auto px-4 ${
          view === 'search' ? '-mt-12 pb-16' : 'pt-8 pb-16'
        }`}
      >
        {/* Search form always visible in search mode */}
        {view === 'search' && (
          <SearchForm onSearch={handleSearch} loading={isLoading} />
        )}

        {/* Results */}
        {view === 'results' && (
          <div className="animate-fade-in space-y-6">
            {/* Back + inline search refresh */}
            <div className="flex items-center justify-between">
              <button
                onClick={resetToSearch}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← New Search
              </button>
              {searchParams && (
                <div className="text-sm text-gray-500">
                  {searchParams.type === 'flight' ? (
                    <span>
                      {searchParams.origin} → {searchParams.destination} ·{' '}
                      {searchParams.departureDate} · {searchParams.passengers}{' '}
                      {searchParams.passengers === 1 ? 'adult' : 'adults'}
                    </span>
                  ) : (
                    <span>
                      {searchParams.destination} · {searchParams.checkIn} → {searchParams.checkOut}
                    </span>
                  )}
                </div>
              )}
            </div>

            {isLoading && <LoadingSpinner label="Searching for the best deals..." />}
            {searchError && (
              <ErrorMessage
                message="Failed to load results. Please check your connection."
                onRetry={() => searchParams && handleSearch(searchParams)}
              />
            )}

            {!isLoading && !searchError && searchParams?.type === 'flight' && (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  {flights.length} Flights Found
                </h2>
                <FlightResults
                  flights={flights}
                  onSelect={handleFlightSelect}
                  pricingVariant={pricingVariant === 'total_price' ? 'total' : 'perPerson'}
                />
              </>
            )}

            {!isLoading && !searchError && searchParams?.type === 'hotel' && (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  {hotels.length} Hotels Found
                </h2>
                <HotelResults
                  hotels={hotels}
                  onSelect={handleHotelSelect}
                  pricingVariant={pricingVariant === 'nightly_price' ? 'nightly' : 'total'}
                />
              </>
            )}
          </div>
        )}

        {/* Booking funnel */}
        {(view === 'booking' || view === 'confirmed') && searchParams && (
          <div className="animate-fade-in">
            <BookingFunnel
              searchParams={searchParams}
              selectedFlight={selectedFlight || undefined}
              selectedHotel={selectedHotel || undefined}
              experimentId={EXPERIMENTS.PRICING_FORMAT.name}
              variant={pricingVariant}
              onComplete={handleBookingComplete}
              onBack={view === 'confirmed' ? resetToSearch : () => setView('results')}
            />
          </div>
        )}
      </div>
    </div>
  );
};
