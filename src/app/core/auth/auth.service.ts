import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { ApiService } from '../api/api.service';
import { AUTH_TOKEN_KEY } from './auth.constants';
import { AuthUser, LoginRequest, LoginResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private readonly apiService: ApiService,
    private readonly router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/auth/login', credentials).pipe(
      tap((response) => {
        const token = response.data?.token;

        if (token) {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
        }
      })
    );
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

    if (!token) {
      return null;
    }

    const payload = this.decodeToken(token);
    const role = payload?.['role'] || payload?.['roles'] || payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const firstName = payload?.['firstName'] || payload?.['given_name'];
    const lastName = payload?.['lastName'] || payload?.['family_name'];
    const fullName = payload?.['name'] || [firstName, lastName].filter(Boolean).join(' ');
    const email = payload?.['email'] || payload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

    return {
      name: fullName || email,
      email,
      role: Array.isArray(role) ? role[0] : role
    };
  }

  private decodeToken(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1];
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      return JSON.parse(atob(paddedPayload));
    } catch {
      return null;
    }
  }
}

