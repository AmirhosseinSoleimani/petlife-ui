import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from '../models/api-response.model';

export function apiErrorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return error.error as ApiErrorBody;
  }
  return null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const body = apiErrorBody(error);
  if (!body) return fallback;

  const fieldMessages = Object.entries(body.fieldErrors || {})
    .flatMap(([field, messages]) => (messages || []).filter(Boolean).map((message) => `${field}: ${message}`));

  if (fieldMessages.length) return fieldMessages.join(' | ');
  if (body.errors?.length) return body.errors.filter(Boolean).join(' ');
  return body.message || fallback;
}

export function apiFieldError(error: unknown, field: string): string {
  const body = apiErrorBody(error);
  if (!body?.fieldErrors) return '';
  const key = Object.keys(body.fieldErrors).find((item) => item.toLowerCase() === field.toLowerCase());
  return key ? (body.fieldErrors[key] || []).filter(Boolean).join(' ') : '';
}
