import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AiService } from '../../../core/api/ai.service';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss']
})
export class AiAssistantComponent {
  readonly isProvider: boolean;
  readonly customerExamples = [
    'ai.examples.customerHealth',
    'ai.examples.customerReminders',
    'ai.examples.customerServices',
    'ai.examples.customerExpenses'
  ];
  readonly providerExamples = [
    'ai.examples.providerRequests',
    'ai.examples.providerAttention',
    'ai.examples.providerRequestSummary',
    'ai.examples.providerServices'
  ];

  messages: ChatMessage[] = [];
  message = '';
  conversationId: string | null = null;
  isLoading = false;
  errorKey = '';

  constructor(
    private readonly aiService: AiService,
    private readonly authService: AuthService,
    private readonly i18nService: I18nService
  ) {
    this.isProvider = (this.authService.getCurrentUser()?.role || '')
      .toLowerCase()
      .includes('provider');
  }

  get examplePrompts(): string[] {
    return this.isProvider ? this.providerExamples : this.customerExamples;
  }

  useExample(promptKey: string): void {
    this.message = this.i18nService.translate(promptKey);
  }

  send(): void {
    const question = this.message.trim();
    if (!question || this.isLoading) {
      return;
    }

    this.messages.push({ role: 'user', content: question });
    this.message = '';
    this.errorKey = '';
    this.isLoading = true;

    this.aiService.chat({ conversationId: this.conversationId, message: question }).subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.errorKey = 'ai.responseError';
          return;
        }

        this.conversationId = response.data.conversationId;
        this.messages.push({ role: 'assistant', content: response.data.message });
      },
      error: (error: HttpErrorResponse) => {
        const backendMessage = error.error?.message || '';
        this.errorKey = error.status === 503 || backendMessage.toLowerCase().includes('not configured')
          ? 'ai.notConfigured'
          : 'ai.responseError';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
