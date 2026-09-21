import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AUTH_TOKEN_KEY } from './auth.constants';
import {
  AuthUser,
  AuthApiResponse,
  AuthResponseData,
  AuthResultCode,
  ContactVerificationChannel,
  ContactVerificationStatus,
  LoginRequest,
  LoginResponse,
  RegisterCustomerRequest,
  RegisterProviderRequest
} from '../models/auth.models';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const request: LoginRequest = {
      identifier: credentials.identifier.trim(),
      password: credentials.password
    };
    return this.authRequest('/auth/login', request);
  }

  registerCustomer(request: RegisterCustomerRequest): Observable<LoginResponse> {
    return this.authRequest('/auth/register/customer', request);
  }

  registerProvider(request: RegisterProviderRequest): Observable<LoginResponse> {
    return this.authRequest('/auth/register/provider', request);
  }

  getVerificationStatus(): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.get<ApiResponse<ContactVerificationStatus>>('/auth/verification/status');
  }

  sendVerification(channel: ContactVerificationChannel): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.post<ApiResponse<ContactVerificationStatus>>('/auth/verification/send', { channel });
  }

  verifyContact(channel: ContactVerificationChannel, code: string): Observable<ApiResponse<ContactVerificationStatus>> {
    return this.apiService.post<ApiResponse<ContactVerificationStatus>>('/auth/verification/verify', { channel, code });
  }

  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    if (!payload) return null;

    const role = payload['role'] || payload['roles'] || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const firstName = payload['first_name'] || payload['firstName'] || payload['given_name'];
    const lastName = payload['last_name'] || payload['lastName'] || payload['family_name'];
    const fullName = payload['name'] || [firstName, lastName].filter(Boolean).join(' ');
    const email = payload['email'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
    const id = payload['nameid'] || payload['sub'] || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    const mobileNumber = payload['mobile_number'];

    return {
      id,
      name: fullName || email || mobileNumber,
      email,
      mobileNumber,
      role: Array.isArray(role) ? role[0] : role,
      status: payload['status'],
      isEmailVerified: payload['email_verified'] === true || payload['email_verified'] === 'true',
      isMobileVerified: payload['mobile_verified'] === true || payload['mobile_verified'] === 'true'
    };
  }

  hasRole(role: string): boolean {
    return (this.getCurrentUser()?.role || '').toLowerCase() === role.toLowerCase();
  }

  getPostAuthRoute(data: AuthResponseData): string[] {
    const role = (data.role || '').trim().toLowerCase();
    const status = (data.status || '').trim().toLowerCase();
    return role === 'provider' && status === 'pending'
      ? ['/provider/pending-approval']
      : ['/dashboard'];
  }

  private authRequest(endpoint: string, request: unknown): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>(endpoint, request).pipe(
      catchError((error: unknown) => {
        const response = this.authResponseFromError(error);
        return response ? of(response) : throwError(() => error);
      }),
      tap((response) => this.storeToken(response))
    );
  }

  private storeToken(response: AuthApiResponse<AuthResponseData>): void {
    const token = response.data?.token;
    if (response.success === true && response.resultCode === AuthResultCode.Success && token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  }

  private authResponseFromError(error: unknown): LoginResponse | null {
    if (!(error instanceof HttpErrorResponse) || !this.isAuthResponse(error.error)) return null;
    return error.error;
  }

  private isAuthResponse(value: unknown): value is LoginResponse {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<LoginResponse>;
    return typeof candidate.success === 'boolean'
      && typeof candidate.resultCode === 'number'
      && !!candidate.data
      && typeof candidate.data === 'object'
      && !!candidate.error
      && typeof candidate.error === 'object';
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      return JSON.parse(atob(paddedPayload)) as Record<string, any>;
    } catch {
      return null;
    }
  }
}
