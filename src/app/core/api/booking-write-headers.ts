import { ServiceRequest } from '../models/marketplace.models';

/** Required on all Bookings writes; retries must keep the same key and payload. */
export function newBookingOperationId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Secure idempotency keys require a secure browser context.');
  }
  return crypto.randomUUID();
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
