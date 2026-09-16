import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';

import { ApiErrorService } from '../api/api-error.service';
import { AUTH_TOKEN_KEY } from '../auth/auth.constants';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly router: Router,
    private readonly apiErrorService: ApiErrorService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const authRequest = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        const normalizedError = this.apiErrorService.normalize(error);
        const isTranslationAsset = request.url.includes('/assets/i18n/');

        if (normalizedError.status === 401 && !isTranslationAsset) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          this.apiErrorService.notify(normalizedError);
          if (!this.router.url.startsWith('/login')) {
            void this.router.navigate(['/login']);
          }
        } else if (!isTranslationAsset) {
          this.apiErrorService.notify(normalizedError);
        }

        return throwError(() => normalizedError);
      })
    );
  }
}
