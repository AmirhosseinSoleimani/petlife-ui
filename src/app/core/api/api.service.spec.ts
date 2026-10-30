import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService URL routing', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  [
    ['/v1/identity/profile', '/v1/identity/profile'],
    ['/v1/reminders/upcoming', '/v1/reminders/upcoming'],
    ['/v1/service-requests/my', '/v1/service-requests/my'],
    ['/v1/notifications/unread-count', '/v1/notifications/unread-count'],
    ['/v1/identity/preferences/me', '/v1/identity/preferences/me'],
    ['/api/reminders/upcoming', '/api/reminders/upcoming'],
    ['/pets', '/v1/pets']
  ].forEach(([endpoint, expected]) => {
    it('maps ' + endpoint + ' to ' + expected + ' without extra prefixes', () => {
      api.get<unknown>(endpoint).subscribe();
      http.expectOne(expected).flush({ success: true, data: null });
    });
  });
});


describe('ApiService protected Pet images', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the versioned API and reports upload percentages only before a successful response', () => {
    const progress: number[] = [];
    const file = new File(['photo'], 'pet.png', { type: 'image/png' });
    let result: unknown;
    api.uploadPetProfileImage('123e4567-e89b-12d3-a456-426614174000', file, percent => progress.push(percent))
      .subscribe(response => result = response);

    const req = http.expectOne('/v1/pets/123e4567-e89b-12d3-a456-426614174000/profile-image');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.event({ type: 1, loaded: 50, total: 100 });
    expect(progress).toEqual([50]);
    req.flush({ success: true, data: { profileImageUrl: '/v1/pets/123e4567-e89b-12d3-a456-426614174000/profile-image' } });
    expect(result).toEqual(jasmine.objectContaining({ success: true }));
  });

  it('retrieves protected images through HttpClient and deletes them through v1', () => {
    api.getPetProfileImage('123e4567-e89b-12d3-a456-426614174000').subscribe();
    const get = http.expectOne('/v1/pets/123e4567-e89b-12d3-a456-426614174000/profile-image');
    expect(get.request.responseType).toBe('blob');
    get.flush(new Blob(['image'], { type: 'image/png' }));
    api.deletePetProfileImage('123e4567-e89b-12d3-a456-426614174000').subscribe();
    const del = http.expectOne('/v1/pets/123e4567-e89b-12d3-a456-426614174000/profile-image');
    expect(del.request.method).toBe('DELETE');
    del.flush({ success: true, data: null });
  });
});
