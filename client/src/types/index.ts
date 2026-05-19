export interface FlightOffer {
  id: string;
  airline: string;
  airlineName: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  cabinClass: string;
  seatsAvailable: number;
}

export interface HotelOffer {
  id: string;
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
  rating: number;
  stars: number;
  amenities: string[];
  imageUrl: string;
  reviewCount: number;
  available: boolean;
}

export interface Booking {
  id: string;
  userId?: string;
  type: 'flight' | 'hotel' | 'package';
  origin?: string;
  destination: string;
  dates: {
    departure?: string;
    return?: string;
    checkIn?: string;
    checkOut?: string;
  };
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  bookingData?: string;
  createdAt: string;
}

export interface SearchParams {
  type: 'flight' | 'hotel';
  origin?: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  checkIn?: string;
  checkOut?: string;
  passengers: number;
  guests?: number;
}

export interface TravelerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
}

export interface BookingState {
  step: 1 | 2 | 3;
  searchParams: SearchParams | null;
  selectedFlight: FlightOffer | null;
  selectedHotel: HotelOffer | null;
  travelerDetails: TravelerDetails[];
  totalPrice: number;
}

export interface Experiment {
  id: string;
  name: string;
  variants: string[];
  startDate?: string;
  endDate?: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface ExperimentVariantResult {
  variant: string;
  totalEvents: number;
  bookingStarted: number;
  bookingCompleted: number;
  conversionRate: number;
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  variants: ExperimentVariantResult[];
  winningVariant?: string;
  improvement?: number;
}

export type EventType =
  | 'search_initiated'
  | 'results_loaded'
  | 'result_clicked'
  | 'details_viewed'
  | 'form_started'
  | 'form_completed'
  | 'price_expanded'
  | 'sort_changed'
  | 'filter_applied'
  | 'booking_started'
  | 'booking_completed'
  | 'booking_abandoned';
