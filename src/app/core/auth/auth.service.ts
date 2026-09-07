import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AUTH_TOKEN_KEY } from './auth.constants';
import {
  AuthUser,
  ContactVerificationChannel,
  ContactVerificationStatus,
  LoginRequest,
  LoginResponse,
  RegisterCustomerMobileRequest,
  RegisterCustomerRequest
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
      email: credentials.identifier || credentials.email,
      identifier: credentials.identifier || credentials.email,
      password: credentials.password
    };
    return this.apiService.post<LoginResponse>('/auth/login', request).pipe(
      tap((response) => this.storeToken(response))
    );
  }

  registerCustomer(request: RegisterCustomerRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/auth/register/customer', request).pipe(
      tap((response) => this.storeToken(response))
    );
  }

  registerCustomerMobile(request: RegisterCustomerMobileRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/auth/register/customer/mobile', request).pipe(
      tap((response) => this.storeToken(response))
    );
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

  private storeToken(response: LoginResponse): void {
    const token = response.data?.token;
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
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
