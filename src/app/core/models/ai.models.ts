import { ApiResponse } from './api-response.model';

export interface AiChatRequest {
  conversationId: string | null;
  message: string;
}

export interface AiChatData {
  conversationId: string;
  message: string;
  intent: string;
  usedContexts: string[];
  requiresClarification: boolean;
  clarificationQuestion: string | null;
}

export type AiChatResponse = ApiResponse<AiChatData>;

export interface AiConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationMessage {
  id: string;
  role: 'User' | 'Assistant' | 'System';
  content: string;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiConversationMessage[];
}
