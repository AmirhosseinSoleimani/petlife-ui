import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import {
  AiChatRequest,
  AiChatResponse,
  AiGeneralAskRequest,
  AiGeneralAskResponse,
  AiConversation,
  AiConversationSummary
} from '../models/ai.models';

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private readonly apiService: ApiService) {}

  /** The production Users JWT has no role claim; use the general-ask endpoint,
   * which verifies the current Users profile instead of requiring a JWT role. */
  ask(request: AiGeneralAskRequest): Observable<AiGeneralAskResponse> {
    return this.apiService.post<AiGeneralAskResponse>('/ai/ask', request);
  }

  // Keep the legacy helper for callers that explicitly depend on its contract.
  chat(request: AiChatRequest): Observable<AiChatResponse> {
    return this.apiService.post<AiChatResponse>('/ai/chat', request);
  }

  getConversations(): Observable<ApiResponse<AiConversationSummary[]>> {
    return this.apiService.get<ApiResponse<AiConversationSummary[]>>('/ai/conversations');
  }

  getConversation(id: string): Observable<ApiResponse<AiConversation>> {
    return this.apiService.get<ApiResponse<AiConversation>>(`/ai/conversations/${id}`);
  }

  deleteConversation(id: string): Observable<ApiResponse<null>> {
    return this.apiService.delete<ApiResponse<null>>(`/ai/conversations/${id}`);
  }
}
