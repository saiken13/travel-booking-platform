import axios from 'axios';
import { safeGet, safeSetex, CACHE_TTL } from '../db/redis';

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

const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&q=80',
  'https://images.unsplash.com/photo-1455587734955-081b22074882?w=400&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80',
];

const calculateNights = (checkIn: string, checkOut: string): number => {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const generateMockHotels = (
  location: string,
  checkIn: string,
  checkOut: string
): HotelOffer[] => {
  const nights = calculateNights(checkIn, checkOut);
  const hotels = [
    { name: 'Grand Plaza Hotel', stars: 5, pricePerNight: 289, rating: 4.8, reviews: 2341 },
    { name: 'Comfort Inn & Suites', stars: 3, pricePerNight: 129, rating: 4.2, reviews: 876 },
    { name: 'Boutique City Hotel', stars: 4, pricePerNight: 199, rating: 4.5, reviews: 1203 },
    { name: 'Budget Express', stars: 2, pricePerNight: 79, rating: 3.8, reviews: 412 },
    { name: 'Luxury Collection Resort', stars: 5, pricePerNight: 459, rating: 4.9, reviews: 3102 },
    { name: 'Downtown Marriott', stars: 4, pricePerNight: 249, rating: 4.6, reviews: 1876 },
    { name: 'Holiday Inn Express', stars: 3, pricePerNight: 149, rating: 4.1, reviews: 944 },
    { name: 'The Westin City Center', stars: 5, pricePerNight: 329, rating: 4.7, reviews: 2104 },
  ];

  const amenityPools = [
    ['Free WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Bar', 'Room Service'],
    ['Free WiFi', 'Gym', 'Business Center', 'Restaurant'],
    ['Free WiFi', 'Pool', 'Restaurant', 'Parking'],
    ['Free WiFi', 'Parking'],
    ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Concierge'],
  ];

  return hotels.map((h, i) => ({
    id: `hotel_${location}_${i + 1}`,
    name: h.name,
    location,
    checkIn,
    checkOut,
    pricePerNight: h.pricePerNight,
    totalPrice: h.pricePerNight * nights,
    currency: 'USD',
    rating: h.rating,
    stars: h.stars,
    amenities: amenityPools[i % amenityPools.length],
    imageUrl: HOTEL_IMAGES[i % HOTEL_IMAGES.length],
    reviewCount: h.reviews,
    available: true,
  }));
};

export const searchHotels = async (
  location: string,
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<HotelOffer[]> => {
  const cacheKey = `hotel_search:${location}:${checkIn}:${checkOut}:${guests}`;

  const cached = await safeGet(cacheKey);
  if (cached) {
    console.log('🚀 Cache HIT — hotels:', cacheKey);
    return JSON.parse(cached);
  }
  console.log('💨 Cache MISS — fetching hotels:', cacheKey);

  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey || rapidApiKey === 'your_rapidapi_key_here') {
    console.log('ℹ️  RapidAPI key not set — returning mock hotels');
    const mock = generateMockHotels(location, checkIn, checkOut);
    await safeSetex(cacheKey, CACHE_TTL.HOTEL_SEARCH, JSON.stringify(mock));
    return mock;
  }

  try {
    const nights = calculateNights(checkIn, checkOut);
    const [inYear, inMonth, inDay] = checkIn.split('-').map(Number);
    const [outYear, outMonth, outDay] = checkOut.split('-').map(Number);

    const response = await axios.post(
      'https://hotels4.p.rapidapi.com/properties/v2/list',
      {
        currency: 'USD',
        eapid: 1,
        locale: 'en_US',
        siteId: 300000001,
        destination: { regionId: location },
        checkInDate: { day: inDay, month: inMonth, year: inYear },
        checkOutDate: { day: outDay, month: outMonth, year: outYear },
        rooms: [{ adults: guests }],
        resultsStartingIndex: 0,
        resultsSize: 20,
        sort: 'REVIEW',
      },
      {
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'hotels4.p.rapidapi.com',
        },
        timeout: 10000,
      }
    );

    const properties = response.data?.data?.propertySearch?.properties || [];

    if (!properties.length) {
      const mock = generateMockHotels(location, checkIn, checkOut);
      await safeSetex(cacheKey, CACHE_TTL.HOTEL_SEARCH, JSON.stringify(mock));
      return mock;
    }

    const hotels: HotelOffer[] = properties.map((prop: Record<string, unknown>, i: number) => {
      const price = prop.price as Record<string, unknown>;
      const reviews = prop.reviews as Record<string, unknown>;
      const propImage = prop.propertyImage as Record<string, unknown>;
      const image = propImage?.image as Record<string, unknown>;
      const pricePerNight = ((price?.lead as Record<string, unknown>)?.amount as number) || 0;

      return {
        id: String(prop.id),
        name: String(prop.name),
        location,
        checkIn,
        checkOut,
        pricePerNight,
        totalPrice: pricePerNight * nights,
        currency: 'USD',
        rating: Number(reviews?.score) || 0,
        stars: Number(prop.star) || 3,
        amenities: ((prop.amenities as Array<Record<string, unknown>>) || []).map((a) => String(a.text)),
        imageUrl: String(image?.url || HOTEL_IMAGES[i % HOTEL_IMAGES.length]),
        reviewCount: Number(reviews?.total) || 0,
        available: true,
      };
    });

    await safeSetex(cacheKey, CACHE_TTL.HOTEL_SEARCH, JSON.stringify(hotels));
    return hotels;
  } catch (error) {
    console.error('Hotels API error — falling back to mock data:', error);
    const mock = generateMockHotels(location, checkIn, checkOut);
    await safeSetex(cacheKey, CACHE_TTL.HOTEL_SEARCH, JSON.stringify(mock));
    return mock;
  }
};
