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
