import { format, parseISO, differenceInMinutes } from 'date-fns';

export const formatDateTime = (isoString: string): string => {
  try {
    return format(parseISO(isoString), 'MMM d, h:mm a');
  } catch {
    return isoString;
  }
};

export const formatDate = (isoString: string): string => {
  try {
    return format(parseISO(isoString), 'MMM d, yyyy');
  } catch {
    return isoString;
  }
};

export const formatTime = (isoString: string): string => {
  try {
    return format(parseISO(isoString), 'h:mm a');
  } catch {
    return isoString;
  }
};

export const formatDuration = (isoDuration: string): string => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return isoDuration;
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

export const formatPrice = (price: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatStops = (stops: number): string => {
  if (stops === 0) return 'Nonstop';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
};

export const getFlightDurationMinutes = (departure: string, arrival: string): number => {
  try {
    return differenceInMinutes(parseISO(arrival), parseISO(departure));
  } catch {
    return 0;
  }
};

export const truncate = (str: string, maxLen: number): string =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
