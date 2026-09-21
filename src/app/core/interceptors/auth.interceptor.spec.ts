import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AUTH_TOKEN_KEY } from '../auth/auth.constants';
import { AuthResultCode } from '../models/auth.models';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let router: { url: string; navigate: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    router = { url: '/dashboard', navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
      ]
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('does not treat an ordinary login 401 RC1 response as session expiration', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'existing-token');
    client.post('/api/auth/login', {}).subscribe({ error: () => undefined });

    http.expectOne('/api/auth/login').flush({
      success: false,
      resultCode: AuthResultCode.BusinessOrValidationError,
      data: {},
      error: { message: 'Invalid login identifier or password.', fieldErrors: {} }
    }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('existing-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('still expires the session for a protected API 401 response', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'expired-token');
    client.get('/api/pets').subscribe({ error: () => undefined });

    http.expectOne('/api/pets').flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
