import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, defer, Observable } from 'rxjs';
import { filter, finalize, map, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface UploadProgressState {
  active: boolean;
  progress: number;
  completed: boolean;
  failed: boolean;
  estimatedSecondsRemaining: number | null;
}

interface TrackedUpload {
  progress: number;
  done: boolean;
  failed: boolean;
}

const INITIAL_UPLOAD_PROGRESS: UploadProgressState = {
  active: false,
  progress: 0,
  completed: false,
  failed: false,
  estimatedSecondsRemaining: null
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly uploadProgressSubject = new BehaviorSubject<UploadProgressState>(INITIAL_UPLOAD_PROGRESS);
  private readonly trackedUploads = new Map<number, TrackedUpload>();
  private nextUploadId = 1;
  private uploadBatchStartedAt: number | null = null;
  private uploadResetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly uploadProgress$ = this.uploadProgressSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(this.buildUrl(endpoint));
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(endpoint), body);
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(endpoint), body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(endpoint));
  }

  postForm<T>(endpoint: string, formData: FormData): Observable<T> {
    return this.postFormWithProgress<T>(endpoint, formData);
  }

  download(endpoint: string): Observable<Blob> {
    return this.http.get(this.buildUrl(endpoint), { responseType: 'blob' });
  }

  uploadProviderGalleryImage<T>(file: File, caption = '', sortOrder = 0): Observable<T> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('caption', caption);
    formData.append('sortOrder', String(sortOrder));
    return this.postFormWithProgress<T>('/provider-media', formData);
  }

  uploadPetProfileImage<T>(petId: string, file: File): Observable<T> {
    return this.postFile<T>(`/pets/${petId}/profile-image`, file);
  }

  deletePetProfileImage<T>(petId: string): Observable<T> {
    return this.delete<T>(`/pets/${petId}/profile-image`);
  }

  getHealthRecordAttachments<T>(recordId: string): Observable<T> {
    return this.get<T>(`/health-records/${recordId}/attachments`);
  }

  uploadHealthRecordAttachment<T>(recordId: string, file: File): Observable<T> {
    return this.postFile<T>(`/health-records/${recordId}/attachments`, file);
  }

  deleteHealthRecordAttachment<T>(recordId: string, attachmentId: string): Observable<T> {
    return this.delete<T>(`/health-records/${recordId}/attachments/${attachmentId}`);
  }

  downloadHealthRecordAttachment(recordId: string, attachmentId: string): Observable<Blob> {
    return this.http.get(
      this.buildUrl(`/health-records/${recordId}/attachments/${attachmentId}/download`),
      { responseType: 'blob' }
    );
  }

  uploadExpenseReceipt<T>(expenseId: string, file: File): Observable<T> {
    return this.postFile<T>(`/expenses/${expenseId}/receipt`, file);
  }

  downloadExpenseReceipt(expenseId: string): Observable<Blob> {
    return this.http.get(this.buildUrl(`/expenses/${expenseId}/receipt`), { responseType: 'blob' });
  }

  deleteExpenseReceipt<T>(expenseId: string): Observable<T> {
    return this.delete<T>(`/expenses/${expenseId}/receipt`);
  }

  resolvePublicUrl(url: string | null | undefined): string | null {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiOrigin = this.baseUrl.replace(/\/api\/?$/i, '');
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${apiOrigin}${normalizedUrl}`;
  }

  private postFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.postFormWithProgress<T>(endpoint, formData);
  }

  private postFormWithProgress<T>(endpoint: string, formData: FormData): Observable<T> {
    return defer(() => {
      const uploadId = this.beginTrackedUpload();

      return this.http.post<T>(this.buildUrl(endpoint), formData, {
        observe: 'events',
        reportProgress: true
      }).pipe(
        tap({
          next: (event) => this.handleUploadEvent(uploadId, event),
          error: () => this.markUploadFailed(uploadId)
        }),
        filter((event): event is HttpResponse<T> => event.type === HttpEventType.Response),
        map((event) => event.body as T),
        finalize(() => this.finalizeTrackedUpload(uploadId))
      );
    });
  }

  private beginTrackedUpload(): number {
    if (this.uploadResetTimer) {
      clearTimeout(this.uploadResetTimer);
      this.uploadResetTimer = null;
    }

    if (!this.trackedUploads.size || Array.from(this.trackedUploads.values()).every((item) => item.done)) {
      this.trackedUploads.clear();
      this.uploadBatchStartedAt = Date.now();
    }

    const uploadId = this.nextUploadId++;
    this.trackedUploads.set(uploadId, { progress: 0, done: false, failed: false });
    this.emitUploadProgress();
    return uploadId;
  }

  private handleUploadEvent(uploadId: number, event: HttpEvent<unknown>): void {
    const upload = this.trackedUploads.get(uploadId);
    if (!upload) return;

    if (event.type === HttpEventType.UploadProgress) {
      upload.progress = event.total && event.total > 0
        ? Math.min(99, Math.round((event.loaded / event.total) * 100))
        : Math.max(upload.progress, 1);
    } else if (event.type === HttpEventType.Response) {
      upload.progress = 100;
      upload.done = true;
    }

    this.emitUploadProgress();
  }

  private markUploadFailed(uploadId: number): void {
    const upload = this.trackedUploads.get(uploadId);
    if (!upload) return;

    upload.done = true;
    upload.failed = true;
    this.emitUploadProgress();
  }

  private finalizeTrackedUpload(uploadId: number): void {
    const upload = this.trackedUploads.get(uploadId);
    if (!upload) return;

    if (!upload.done) {
      upload.done = true;
      upload.failed = true;
    }

    this.emitUploadProgress();

    if (Array.from(this.trackedUploads.values()).every((item) => item.done)) {
      this.uploadResetTimer = setTimeout(() => {
        if (Array.from(this.trackedUploads.values()).every((item) => item.done)) {
          this.trackedUploads.clear();
          this.uploadBatchStartedAt = null;
          this.uploadProgressSubject.next(INITIAL_UPLOAD_PROGRESS);
        }
        this.uploadResetTimer = null;
      }, 2200);
    }
  }

  private emitUploadProgress(): void {
    const uploads = Array.from(this.trackedUploads.values());
    if (!uploads.length) {
      this.uploadProgressSubject.next(INITIAL_UPLOAD_PROGRESS);
      return;
    }

    const progress = Math.round(uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length);
    const active = uploads.some((upload) => !upload.done);
    const failed = uploads.some((upload) => upload.failed);
    const completed = uploads.every((upload) => upload.done) && !failed;
    let estimatedSecondsRemaining: number | null = null;

    if (active && progress > 0 && progress < 100 && this.uploadBatchStartedAt) {
      const elapsedSeconds = Math.max(0.25, (Date.now() - this.uploadBatchStartedAt) / 1000);
      estimatedSecondsRemaining = Math.max(1, Math.round((elapsedSeconds / progress) * (100 - progress)));
    } else if (completed) {
      estimatedSecondsRemaining = 0;
    }

    this.uploadProgressSubject.next({ active, progress, completed, failed, estimatedSecondsRemaining });
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }
}
