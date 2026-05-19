import Amadeus from 'amadeus';
import { safeGet, safeSetex, CACHE_TTL } from '../db/redis';

let amadeusClient: Amadeus | null = null;

const getAmadeusClient = (): Amadeus => {
  if (!amadeusClient) {
    amadeusClient = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID || '',
      clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
      hostname: 'test', // Use test environment
    });
  }
  return amadeusClient;
};

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

const AIRLINE_NAMES: Record<string, string> = {
  AA: 'American Airlines', UA: 'United Airlines', DL: 'Delta Air Lines',
  SW: 'Southwest Airlines', BA: 'British Airways', LH: 'Lufthansa',
  AF: 'Air France', EK: 'Emirates', QR: 'Qatar Airways', SQ: 'Singapore Airlines',
  AC: 'Air Canada', WN: 'Southwest Airlines', B6: 'JetBlue',
  AS: 'Alaska Airlines', F9: 'Frontier Airlines', NK: 'Spirit Airlines',
};

const formatFlightOffer = (offer: Record<string, unknown>): FlightOffer => {
  const itineraries = offer.itineraries as Array<Record<string, unknown>>;
  const itinerary = itineraries[0] as Record<string, unknown>;
  const segments = itinerary.segments as Array<Record<string, unknown>>;
  const segment = segments[0] as Record<string, unknown>;
  const lastSegment = segments[segments.length - 1] as Record<string, unknown>;
  const departure = segment.departure as Record<string, unknown>;
  const arrival = lastSegment.arrival as Record<string, unknown>;
  const price = offer.price as Record<string, unknown>;
  const travelerPricings = offer.travelerPricings as Array<Record<string, unknown>>;
  const fareDetails = (travelerPricings[0].fareDetailsBySegment as Array<Record<string, unknown>>)[0];
  const airline = segment.carrierCode as string;

  return {
    id: offer.id as string,
    airline,
    airlineName: AIRLINE_NAMES[airline] || airline,
    origin: departure.iataCode as string,
    destination: arrival.iataCode as string,
    departure: departure.at as string,
    arrival: arrival.at as string,
    duration: itinerary.duration as string,
    price: parseFloat(price.total as string),
    currency: price.currency as string,
    stops: segments.length - 1,
    cabinClass: fareDetails.cabin as string,
    seatsAvailable: (offer.numberOfBookableSeats as number) || 9,
  };
};

const generateMockFlights = (
  origin: string,
  destination: string,
  date: string,
  passengers: number
): FlightOffer[] => {
  const airlines = [
    { code: 'AA', name: 'American Airlines', price: 289 },
    { code: 'UA', name: 'United Airlines', price: 312 },
    { code: 'DL', name: 'Delta Air Lines', price: 275 },
    { code: 'B6', name: 'JetBlue', price: 198 },
    { code: 'SW', name: 'Southwest Airlines', price: 167 },
    { code: 'AS', name: 'Alaska Airlines', price: 241 },
  ];

  return airlines.map((a, i) => {
    const baseHour = 6 + i * 2;
    const flightDuration = 2 + Math.floor(Math.random() * 4);
    const depDate = new Date(`${date}T${String(baseHour).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}:00`);
    const arrDate = new Date(depDate.getTime() + flightDuration * 3600000);

    return {
      id: `mock_${a.code}_${date}_${i}`,
      airline: a.code,
      airlineName: a.name,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure: depDate.toISOString(),
      arrival: arrDate.toISOString(),
      duration: `PT${flightDuration}H${i % 2 === 0 ? '0' : '30'}M`,
      price: (a.price + Math.floor(Math.random() * 50)) * passengers,
      currency: 'USD',
      stops: i > 3 ? 1 : 0,
      cabinClass: i > 4 ? 'BUSINESS' : 'ECONOMY',
      seatsAvailable: Math.floor(Math.random() * 15) + 1,
    };
  });
};

export const searchFlights = async (
  origin: string,
  destination: string,
  date: string,
  passengers: number,
  returnDate?: string
): Promise<FlightOffer[]> => {
  const cacheKey = `flight_search:${origin.toUpperCase()}:${destination.toUpperCase()}:${date}:${passengers}`;

  const cached = await safeGet(cacheKey);
  if (cached) {
    console.log('🚀 Cache HIT — flights:', cacheKey);
    return JSON.parse(cached);
  }
  console.log('💨 Cache MISS — fetching flights:', cacheKey);

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || clientId === 'your_amadeus_client_id' || !clientSecret) {
    console.log('ℹ️  Amadeus credentials not set — returning mock flights');
    const mock = generateMockFlights(origin, destination, date, passengers);
    await safeSetex(cacheKey, CACHE_TTL.FLIGHT_SEARCH, JSON.stringify(mock));
    return mock;
  }

  try {
    const params: Record<string, unknown> = {
      originLocationCode: origin.toUpperCase(),
      destinationLocationCode: destination.toUpperCase(),
      departureDate: date,
      adults: passengers,
      max: 20,
      currencyCode: 'USD',
    };
    if (returnDate) params.returnDate = returnDate;

    const amadeus = getAmadeusClient();
    const response = await amadeus.shopping.flightOffersSearch.get(params);
    const flights = (response.data || []).map((o: Record<string, unknown>) => formatFlightOffer(o));
    await safeSetex(cacheKey, CACHE_TTL.FLIGHT_SEARCH, JSON.stringify(flights));
    return flights;
  } catch (error: unknown) {
    console.error('Amadeus API error — falling back to mock data:', error);
    const mock = generateMockFlights(origin, destination, date, passengers);
    await safeSetex(cacheKey, CACHE_TTL.FLIGHT_SEARCH, JSON.stringify(mock));
    return mock;
  }
};
