import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable, InjectionToken } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  OwnProviderReview,
  PrivateModerationReview,
  ProviderRatingSummary,
  ProviderReviewsFlags,
  PublicProviderReview,
  ReviewAppealResolution,
  ReviewEligibilityStatus,
  ReviewModerationAction,
  ReviewMutationResult,
  ReviewPage,
  ReviewReportReason
} from '../models/provider-reviews.models';

export const PROVIDER_REVIEWS_FLAGS = new InjectionToken<ProviderReviewsFlags>(
  'PROVIDER_REVIEWS_FLAGS',
  { providedIn: 'root', factory: () => environment.providerReviews }
);

export class ProviderReviewsDisabledError extends Error {
  constructor() { super('Provider reviews are not available.'); }
}

export class ProviderReviewsContractError extends Error {
  constructor() { super('Provider reviews API returned an unsupported response.'); }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Generate a UUIDv4 idempotency identity; reuse the value for retries of the SAME payload. */
export function newReviewOperationKey(): string {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new ProviderReviewsDisabledError();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes).map(n => n.toString(16).padStart(2, '0')).join('');
  return [value.slice(0, 8), value.slice(8, 12), value.slice(12, 16),
    value.slice(16, 20), value.slice(20)].join('-');
}

/**
 * Typed BFF-facade client. Never calls the internal ProviderReviews Host or
 * derives CustomerUserId / ProviderUserId from untrusted form inputs.
 * Flags default to false in BOTH environment configurations.
 */
@Injectable({ providedIn: 'root' })
export class ProviderReviewsApiService {
  private readonly root = environment.apiBaseUrl.replace(/\/$/, '') + '/provider-reviews/v1';

  constructor(
    private readonly http: HttpClient,
    @Inject(PROVIDER_REVIEWS_FLAGS) readonly flags: ProviderReviewsFlags
  ) {}

  publicReviews(profileId: string, rating: number | null = null, cursor: string | null = null,
    size = 20): Observable<ReviewPage<PublicProviderReview>> {
    return this.read(() => {
      let params = new HttpParams().set('size', String(this.size(size)));
      if (rating !== null) {
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Invalid rating filter.');
        params = params.set('rating', String(rating));
      }
      if (cursor) params = params.set('cursor', cursor);
      return this.get<ReviewPage<PublicProviderReview>>(
        '/providers/' + this.id(profileId) + '/reviews', params);
    });
  }

  rating(profileId: string): Observable<ProviderRatingSummary | null> {
    return this.read(() => this.get<ProviderRatingSummary | null>(
      '/providers/' + this.id(profileId) + '/rating'));
  }

  myReviews(cursor: string | null = null, size = 20): Observable<ReviewPage<OwnProviderReview>> {
    return this.customerRead(() => {
      let params = new HttpParams().set('size', String(this.size(size)));
      if (cursor) params = params.set('cursor', cursor);
      return this.get<ReviewPage<OwnProviderReview>>('/me/reviews', params);
    });
  }

  eligibility(serviceRequestId: string): Observable<ReviewEligibilityStatus> {
    return this.customerRead(() => this.get<ReviewEligibilityStatus>(
      '/me/eligibility/' + this.id(serviceRequestId)));
  }

  create(serviceRequestId: string, rating: number | null, comment: string | null,
    operationId: string): Observable<ReviewMutationResult> {
    return this.customerWrite(() => this.mutate('POST', '/reviews',
      { serviceRequestId: this.id(serviceRequestId), rating, comment }, operationId));
  }

  edit(reviewId: string, version: number, rating: number | null, comment: string | null,
    operationId: string): Observable<ReviewMutationResult> {
    return this.customerWrite(() => this.mutate('PUT', '/reviews/' + this.id(reviewId),
      { rating, comment }, operationId, version));
  }

  withdraw(reviewId: string, version: number, operationId: string): Observable<ReviewMutationResult> {
    return this.customerWrite(() => this.mutate('DELETE', '/reviews/' + this.id(reviewId),
      null, operationId, version));
  }

  reply(reviewId: string, version: number, text: string, operationId: string):
    Observable<ReviewMutationResult> {
    return this.providerWrite(() => this.mutate('POST', '/reviews/' + this.id(reviewId)
      + '/official-reply', { text }, operationId, version));
  }

  editReply(reviewId: string, version: number, replyVersion: number, text: string,
    operationId: string): Observable<ReviewMutationResult> {
    return this.providerWrite(() => this.mutate('PUT', '/reviews/' + this.id(reviewId)
      + '/official-reply', { text }, operationId, version, replyVersion));
  }

  report(reviewId: string, reason: ReviewReportReason, details: string | null,
    operationId: string): Observable<ReviewMutationResult> {
    return this.customerOrProviderWrite(() => this.mutate('POST', '/reviews/' + this.id(reviewId)
      + '/reports', { reason, details }, operationId));
  }

  moderatorQueue(cursor: string | null = null, size = 20):
    Observable<ReviewPage<PrivateModerationReview>> {
    return this.moderatorRead(() => {
      let params = new HttpParams().set('size', String(this.size(size)));
      if (cursor) params = params.set('cursor', cursor);
      return this.get<ReviewPage<PrivateModerationReview>>('/admin/moderation', params);
    });
  }

  moderationDetail(reviewId: string): Observable<PrivateModerationReview | null> {
    return this.moderatorRead(() => this.get<PrivateModerationReview | null>(
      '/admin/moderation/' + this.id(reviewId)));
  }

  moderate(reviewId: string, version: number, action: ReviewModerationAction,
    reason: string, operationId: string): Observable<ReviewMutationResult> {
    return this.moderatorWrite(() => this.mutate('POST',
      '/admin/moderation/' + this.id(reviewId) + '/decisions',
      { action, reason }, operationId, version));
  }

  customerAppeal(reviewId: string, version: number, reason: string, operationId: string):
    Observable<ReviewMutationResult> {
    return this.customerWrite(() => this.mutate('POST',
      '/reviews/' + this.id(reviewId) + '/appeals/customer', { reason }, operationId, version));
  }

  providerAppeal(reviewId: string, version: number, reason: string, operationId: string):
    Observable<ReviewMutationResult> {
    return this.providerWrite(() => this.mutate('POST',
      '/reviews/' + this.id(reviewId) + '/appeals/provider', { reason }, operationId, version));
  }

  resolveAppeal(reviewId: string, appealId: string, version: number,
    resolution: ReviewAppealResolution, reason: string, operationId: string):
    Observable<ReviewMutationResult> {
    return this.moderatorWrite(() => this.mutate('POST',
      '/admin/moderation/' + this.id(reviewId) + '/appeals/' + this.id(appealId) + '/resolve',
      { resolution, reason }, operationId, version));
  }

  moderateReply(reviewId: string, version: number, replyVersion: number,
    action: 'Publish' | 'Hide' | 'Reject', reason: string, operationId: string):
    Observable<ReviewMutationResult> {
    return this.moderatorWrite(() => this.mutate('POST',
      '/admin/moderation/' + this.id(reviewId) + '/reply',
      { action, reason }, operationId, version, replyVersion));
  }

  private read<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => this.flags.readEnabled ? request() :
      throwError(() => new ProviderReviewsDisabledError()));
  }

  private customerRead<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => this.flags.readEnabled && this.flags.customerEnabled ? request() :
      throwError(() => new ProviderReviewsDisabledError()));
  }

  private customerWrite<T>(request: () => Observable<T>): Observable<T> {
    return this.customerRead(request);
  }

  private providerWrite<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => this.flags.readEnabled && this.flags.providerEnabled ? request() :
      throwError(() => new ProviderReviewsDisabledError()));
  }

  private customerOrProviderWrite<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => this.flags.readEnabled &&
      (this.flags.customerEnabled || this.flags.providerEnabled) ? request() :
      throwError(() => new ProviderReviewsDisabledError()));
  }

  private moderatorRead<T>(request: () => Observable<T>): Observable<T> {
    return defer(() => this.flags.readEnabled && this.flags.moderationEnabled ? request() :
      throwError(() => new ProviderReviewsDisabledError()));
  }

  private moderatorWrite<T>(request: () => Observable<T>): Observable<T> {
    return this.moderatorRead(request);
  }

  private get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<ApiResponse<T>>(this.root + path, { params }).pipe(map(v => this.unwrap(v)));
  }

  private mutate(method: 'POST' | 'PUT' | 'DELETE', path: string, body: unknown,
    operationId: string, version?: number, replyVersion?: number): Observable<ReviewMutationResult> {
    let headers = new HttpHeaders({ 'Idempotency-Key': this.id(operationId) });
    if (version !== undefined) headers = headers.set('If-Match', '"' + this.version(version) + '"');
    if (replyVersion !== undefined) headers = headers.set('X-Reply-Version', String(this.version(replyVersion)));
    return this.http.request<ApiResponse<ReviewMutationResult>>(method, this.root + path,
      { body, headers }).pipe(map(v => this.unwrap(v)));
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (!response || response.success !== true || !('data' in response)) {
      throw new ProviderReviewsContractError();
    }
    return response.data;
  }

  private id(value: string): string {
    if (!UUID_PATTERN.test(value)) throw new Error('Invalid review identifier.');
    return value;
  }

  private size(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > 50) throw new Error('Invalid review page size.');
    return value;
  }

  private version(value: number): number {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid review version.');
    return value;
  }
}

