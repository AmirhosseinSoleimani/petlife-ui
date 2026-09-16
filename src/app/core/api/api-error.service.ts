import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ApiErrorBody } from '../models/api-response.model';

export interface ApiErrorNotice {
  message: string;
  status: number;
  traceId?: string;
  fieldErrors: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly noticeSubject = new BehaviorSubject<ApiErrorNotice | null>(null);
  readonly notice$ = this.noticeSubject.asObservable();

  normalize(error: HttpErrorResponse): HttpErrorResponse {
    const body = this.body(error);
    if (!body) return error;

    const fieldErrors = this.normalizeFieldErrors(body.fieldErrors);
    const flattened = Object.entries(fieldErrors)
      .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`));
    const errors = flattened.length
      ? flattened
      : (body.errors || []).filter((item): item is string => !!item?.trim());

    return new HttpErrorResponse({
      error: { ...body, fieldErrors, errors },
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url || undefined
    });
  }

  notify(error: HttpErrorResponse): void {
    const normalized = this.normalize(error);
    const body = this.body(normalized);
    const fieldErrors = this.normalizeFieldErrors(body?.fieldErrors);
    const message = this.resolveMessage(normalized.status, body, fieldErrors);
    const traceId = normalized.headers.get('X-Trace-Id') || undefined;

    this.noticeSubject.next({
      message,
      status: normalized.status,
      traceId,
      fieldErrors
    });
  }

  clear(): void {
    this.noticeSubject.next(null);
  }

  private resolveMessage(
    status: number,
    body: ApiErrorBody | null,
    fieldErrors: Record<string, string[]>
  ): string {
    const fieldMessages = Object.entries(fieldErrors)
      .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`));
    if (fieldMessages.length) return fieldMessages.join(' | ');

    const errors = (body?.errors || []).filter((item): item is string => !!item?.trim());
    if (errors.length) return errors.join(' | ');
    if (body?.message?.trim()) return body.message.trim();

    switch (status) {
      case 0: return 'errors.network';
      case 400: return 'errors.validation';
      case 401: return 'errors.sessionExpired';
      case 403: return 'errors.forbidden';
      case 404: return 'errors.notFound';
      case 409: return 'errors.conflict';
      case 413: return 'errors.payloadTooLarge';
      case 503: return 'errors.unavailable';
      default: return status >= 500 ? 'errors.server' : 'errors.generic';
    }
  }

  private body(error: HttpErrorResponse): ApiErrorBody | null {
    return error.error && typeof error.error === 'object'
      ? error.error as ApiErrorBody
      : null;
  }

  private normalizeFieldErrors(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== 'object') return {};

    return Object.entries(value as Record<string, unknown>)
      .reduce<Record<string, string[]>>((result, [field, messages]) => {
        const normalized = Array.isArray(messages)
          ? messages.filter((item): item is string => typeof item === 'string' && !!item.trim())
          : typeof messages === 'string' && messages.trim() ? [messages] : [];
        if (normalized.length) result[field] = normalized;
        return result;
      }, {});
  }
}
