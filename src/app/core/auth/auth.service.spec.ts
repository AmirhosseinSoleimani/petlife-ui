import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { AUTH_TOKEN_KEY } from './auth.constants';
import { AuthService } from './auth.service';
import {
  AuthApiResponse,
  AuthResponseData,
  AuthResultCode,
  LoginResponse,
  RegisterRequest
} from '../models/auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const authData = (overrides: Partial<AuthResponseData> = {}): AuthResponseData => ({
    token: 'header.payload.signature',
    userId: 'user-1',
    firstName: 'Ari',
    lastName: 'Taylor',
    email: 'ari@example.com',
    mobileNumber: '+61412345678',
    role: 'Customer',
    status: 'Active',
    isEmailVerified: false,
    isMobileVerified: false,
    ...overrides
  });

  const response = (
    resultCode: AuthResultCode,
    overrides: Partial<LoginResponse> = {}
  ): LoginResponse => ({
    success: resultCode === AuthResultCode.Success,
    resultCode,
    data: authData(),
    error: {},
    ...overrides
  });

  const registration: RegisterRequest = {
    firstName: 'Ari',
    lastName: 'Taylor',
    mobileNumber: '+61412345678',
    email: 'ari@example.com',
    password: 'Strong#123',
    confirmPassword: 'Strong#123'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('stores the token only for a successful RC0 login', () => {
    service.login({ identifier: ' ari@example.com ', password: 'Strong#123' }).subscribe();

    const request = http.expectOne((item) => item.url.endsWith('/auth/login'));
    expect(request.request.body).toEqual({ identifier: 'ari@example.com', password: 'Strong#123' });
    request.flush(response(AuthResultCode.Success));

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('header.payload.signature');
    expect(service.getPostAuthRoute(authData())).toEqual(['/dashboard']);
  });

  it('does not store a token when success is true but the result code is not RC0', () => {
    service.login({ identifier: 'ari@example.com', password: 'wrong' }).subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/auth/login'));
    request.flush(response(AuthResultCode.BusinessOrValidationError, { success: true }));

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('maps an HTTP RC1 response and preserves fieldErrors without storing a token', () => {
    let actual: LoginResponse | undefined;
    service.registerCustomer(registration).subscribe((value) => actual = value);

    const request = http.expectOne((item) => item.url.endsWith('/auth/register/customer'));
    const failure = response(AuthResultCode.BusinessOrValidationError, {
      success: false,
      data: {} as AuthResponseData,
      error: {
        message: 'Validation failed.',
        traceId: 'trace-1',
        fieldErrors: { email: ['Email is already registered.'] }
      }
    });
    request.flush(failure, { status: 400, statusText: 'Bad Request' });

    expect(actual).toEqual(failure);
    expect(actual?.error.fieldErrors?.email).toEqual(['Email is already registered.']);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('maps an HTTP RC4 response with its trace ID and never stores a token', () => {
    let actual: AuthApiResponse<AuthResponseData> | undefined;
    service.login({ identifier: 'ari@example.com', password: 'Strong#123' }).subscribe((value) => actual = value);

    const request = http.expectOne((item) => item.url.endsWith('/auth/login'));
    const failure = response(AuthResultCode.UnhandledError, {
      success: false,
      data: {} as AuthResponseData,
      error: { message: 'An unexpected error occurred.', traceId: 'trace-4', fieldErrors: {} }
    });
    request.flush(failure, { status: 500, statusText: 'Server Error' });

    expect(actual?.resultCode).toBe(AuthResultCode.UnhandledError);
    expect(actual?.error.traceId).toBe('trace-4');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('uses the Provider endpoint and routes a Pending Provider to approval', () => {
    service.registerProvider(registration).subscribe();

    const request = http.expectOne((item) => item.url.endsWith('/auth/register/provider'));
    expect(request.request.body).toEqual(registration);
    request.flush(response(AuthResultCode.Success, {
      data: authData({ role: 'Provider', status: 'Pending' })
    }));

    expect(service.getPostAuthRoute(authData({ role: 'Provider', status: 'Pending' })))
      .toEqual(['/provider/pending-approval']);
  });

  it('refreshes status through the legacy ApiResponse contract and updates the in-memory user', () => {
    service.login({ identifier: 'ari@example.com', password: 'Strong#123' }).subscribe();
    http.expectOne((item) => item.url.endsWith('/auth/login')).flush(response(AuthResultCode.Success, {
      data: authData({ role: 'Provider', status: 'Pending' })
    }));

    service.refreshCurrentUser().subscribe();
    const request = http.expectOne((item) => item.url.endsWith('/auth/me'));
    request.flush({ success: true, data: { role: 'Provider', status: 'Active' } });

    expect(service.getCurrentUser()?.status).toBe('Active');
    expect(service.isPendingProvider()).toBeFalse();
  });
});
