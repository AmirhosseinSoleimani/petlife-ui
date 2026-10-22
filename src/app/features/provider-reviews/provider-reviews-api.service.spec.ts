import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PROVIDER_REVIEWS_FLAGS, ProviderReviewsApiService, ProviderReviewsDisabledError } from '../../core/api/provider-reviews-api.service';
import { ProviderReviewsFlags } from '../../core/models/provider-reviews.models';

describe('ProviderReviews BFF client', () => {
  let service: ProviderReviewsApiService;
  let http: HttpTestingController;
  let flags: ProviderReviewsFlags;

  beforeEach(() => {
    flags = { readEnabled: false, customerEnabled: false, providerEnabled: false,
      moderationEnabled: false, commentOnlyApproved: false };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: PROVIDER_REVIEWS_FLAGS, useValue: flags }]
    });
    service = TestBed.inject(ProviderReviewsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('never sends a disabled public request', () => {
    let blocked = false;
    service.rating('11111111-1111-4111-8111-111111111111').subscribe({
      error: error => blocked = error instanceof ProviderReviewsDisabledError
    });
    expect(blocked).toBeTrue();
    http.expectNone(() => true);
  });

  it('never sends a disabled mutation, even with a valid operation key', () => {
    let blocked = false;
    service.create('11111111-1111-4111-8111-111111111111', 5, null,
      '22222222-2222-4222-8222-222222222222').subscribe({ error: () => blocked = true });
    expect(blocked).toBeTrue();
    http.expectNone(() => true);
  });

  it('uses the configured same-origin API facade for a public read', () => {
    flags.readEnabled = true;
    service.rating('11111111-1111-4111-8111-111111111111').subscribe(value => {
      expect(value?.ratingCount).toBe(0);
      expect(value?.averageRating).toBeNull();
    });
    const request = http.expectOne(req => req.url.endsWith(
      '/provider-reviews/v1/providers/11111111-1111-4111-8111-111111111111/rating'));
    expect(request.request.method).toBe('GET');
    request.flush({success: true, data: {providerProfileId: '11111111-1111-4111-8111-111111111111',
      ratingCount: 0, averageRating: null, starCounts: [0, 0, 0, 0, 0]}});
  });

  it('uses idempotency and conditional version headers for writes', () => {
    flags.readEnabled = true;
    flags.customerEnabled = true;
    service.edit('11111111-1111-4111-8111-111111111111', 7, 2, 'Revised',
      '22222222-2222-4222-8222-222222222222').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/provider-reviews/v1/reviews/11111111-1111-4111-8111-111111111111'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-Match')).toBe('"7"');
    expect(request.request.headers.get('Idempotency-Key')).toBe('22222222-2222-4222-8222-222222222222');
    expect(Object.keys(request.request.body).sort()).toEqual(['comment', 'rating']);
    request.flush({success:true, data:{reviewId:'11111111-1111-4111-8111-111111111111', version:8, replayed:false}});
  });
});
