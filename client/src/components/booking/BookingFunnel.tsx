import { useState } from 'react';
import { useMutation } from '@apollo/client';
import type { FlightOffer, HotelOffer, SearchParams, TravelerDetails } from '../../types';
import { CREATE_BOOKING } from '../../graphql/mutations';
import { formatPrice, formatTime, formatDuration, formatDate } from '../../utils/formatters';
import { useTracking } from '../../hooks/useExperiment';

interface BookingFunnelProps {
  searchParams: SearchParams;
  selectedFlight?: FlightOffer;
  selectedHotel?: HotelOffer;
  experimentId: string;
  variant: string;
  onComplete: (bookingId: string) => void;
  onBack: () => void;
}

const STEPS = ['Traveler Details', 'Review & Confirm', 'Confirmation'];

const emptyTraveler = (): TravelerDetails => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
});

export const BookingFunnel = ({
  searchParams,
  selectedFlight,
  selectedHotel,
  experimentId,
  variant,
  onComplete,
  onBack,
}: BookingFunnelProps) => {
  const [step, setStep] = useState(0); // 0=details, 1=review, 2=confirmed
  const [travelers, setTravelers] = useState<TravelerDetails[]>([emptyTraveler()]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const { track, getUserId } = useTracking();
  const [createBooking, { loading: bookingLoading }] = useMutation(CREATE_BOOKING);

  const totalPrice = selectedFlight
    ? selectedFlight.price
    : selectedHotel
    ? selectedHotel.totalPrice
    : 0;

  const updateTraveler = (index: number, field: keyof TravelerDetails, value: string) => {
    setTravelers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    track(experimentId, variant, 'form_completed', getUserId());
    setStep(1);
    track(experimentId, variant, 'booking_started', getUserId());
  };

  const handleConfirm = async () => {
    const userId = getUserId();
    try {
      const input: Record<string, unknown> = {
        userId,
        type: selectedFlight ? 'flight' : 'hotel',
        price: totalPrice,
        bookingData: JSON.stringify({
          flight: selectedFlight,
          hotel: selectedHotel,
          travelers,
        }),
      };

      if (selectedFlight) {
        input.origin = selectedFlight.origin;
        input.destination = selectedFlight.destination;
        input.departureDate = selectedFlight.departure.split('T')[0];
        input.passengerCount = searchParams.passengers;
      } else if (selectedHotel) {
        input.destination = selectedHotel.location;
        input.checkIn = selectedHotel.checkIn;
        input.checkOut = selectedHotel.checkOut;
        input.guestCount = searchParams.guests;
      }

      const { data } = await createBooking({ variables: { input } });

      if (data?.createBooking?.success) {
        track(experimentId, variant, 'booking_completed', userId);
        setConfirmedBookingId(data.createBooking.booking.id);
        setStep(2);
        onComplete(data.createBooking.booking.id);
      }
    } catch (error) {
      track(experimentId, variant, 'booking_abandoned', userId);
      console.error('Booking failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  i === step ? 'text-blue-700' : i < step ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-green-400' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Selected Item Summary */}
      {step < 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          {selectedFlight && (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-blue-900 text-sm">
                  {selectedFlight.airlineName} · {selectedFlight.origin} → {selectedFlight.destination}
                </p>
                <p className="text-blue-700 text-xs mt-0.5">
                  {formatTime(selectedFlight.departure)} · {formatDuration(selectedFlight.duration)} ·{' '}
                  {selectedFlight.stops === 0 ? 'Nonstop' : `${selectedFlight.stops} stop`}
                </p>
              </div>
              <p className="text-xl font-bold text-blue-900">{formatPrice(selectedFlight.price)}</p>
            </div>
          )}
          {selectedHotel && (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-blue-900 text-sm">{selectedHotel.name}</p>
                <p className="text-blue-700 text-xs mt-0.5">
                  {formatDate(selectedHotel.checkIn)} → {formatDate(selectedHotel.checkOut)} ·{' '}
                  {formatPrice(selectedHotel.pricePerNight)}/night
                </p>
              </div>
              <p className="text-xl font-bold text-blue-900">{formatPrice(selectedHotel.totalPrice)}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 0: Traveler Details */}
      {step === 0 && (
        <form onSubmit={handleDetailsSubmit} className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900">Traveler Details</h2>
          {travelers.map((t, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {selectedFlight ? `Passenger ${idx + 1}` : `Guest ${idx + 1}`}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">First Name</label>
                  <input
                    required
                    value={t.firstName}
                    onChange={(e) => updateTraveler(idx, 'firstName', e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Last Name</label>
                  <input
                    required
                    value={t.lastName}
                    onChange={(e) => updateTraveler(idx, 'lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                  <input
                    required
                    type="email"
                    value={t.email}
                    onChange={(e) => updateTraveler(idx, 'email', e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone</label>
                  <input
                    required
                    type="tel"
                    value={t.phone}
                    onChange={(e) => updateTraveler(idx, 'phone', e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              ← Back to Results
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Review Booking →
            </button>
          </div>
        </form>
      )}

      {/* Step 1: Review */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="text-xl font-bold text-gray-900">Review & Confirm</h2>

          {/* Traveler summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Travelers</h3>
            {travelers.map((t, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b last:border-0 border-gray-100">
                <span className="text-gray-700">{t.firstName} {t.lastName}</span>
                <span className="text-gray-400">{t.email}</span>
              </div>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Price Breakdown
            </h3>
            {selectedFlight && (
              <div className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                <span className="text-gray-700">
                  {selectedFlight.airlineName} · {selectedFlight.origin} → {selectedFlight.destination}
                </span>
                <span className="font-semibold">{formatPrice(selectedFlight.price)}</span>
              </div>
            )}
            {selectedHotel && (
              <div className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                <span className="text-gray-700">{selectedHotel.name}</span>
                <span className="font-semibold">{formatPrice(selectedHotel.totalPrice)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-3">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-700">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 accent-blue-600 w-4 h-4"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> and{' '}
              <a href="#" className="text-blue-600 hover:underline">Cancellation Policy</a>
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              ← Edit Details
            </button>
            <button
              onClick={handleConfirm}
              disabled={!agreedToTerms || bookingLoading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {bookingLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm Booking · ${formatPrice(totalPrice)}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="text-center py-8 animate-slide-up">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-1">Your booking has been confirmed successfully.</p>
          {confirmedBookingId && (
            <p className="text-xs text-gray-400 font-mono mb-6">
              Booking ID: {confirmedBookingId}
            </p>
          )}
          <p className="text-sm text-gray-600 mb-8">
            A confirmation has been sent to{' '}
            <strong>{travelers[0]?.email}</strong>
          </p>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Book Another Trip
          </button>
        </div>
      )}
    </div>
  );
};
