import { ServiceRequest } from '../models/marketplace.models';

/** Required on all Bookings writes; retries must keep the same key and payload. */
export function newBookingOperationId(): string {
  // getRandomValues is available on private-network HTTP as well as HTTPS.
  // Math.random is not suitable for Bookings idempotency keys.
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Secure random idempotency keys are unavailable.');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20)].join('-');
}

export function bookingWriteHeaders(request?: ServiceRequest, key: string = newBookingOperationId()):
  Record<string, string> {
  if (request && (!Number.isSafeInteger(request.version) || (request.version ?? 0) < 1 ||
    !Number.isSafeInteger(request.bookingVersion) || (request.bookingVersion ?? -1) < 0)) {
    throw new Error('Refresh the request to obtain its current versions before updating.');
  }
  return {
    'X-Idempotency-Key': key,
    'If-Match': String(request?.version ?? 0),
    'X-Booking-Version': String(request?.bookingVersion ?? 0)
  };
}
