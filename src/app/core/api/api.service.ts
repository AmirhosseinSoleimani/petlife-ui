import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

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
    return this.http.post<T>(this.buildUrl(endpoint), formData);
  }

  private buildUrl(endpoint: string): string {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${normalizedEndpoint}`;
  }
}
