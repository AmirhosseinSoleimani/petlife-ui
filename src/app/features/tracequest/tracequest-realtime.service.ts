import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { TraceSummary } from './tracequest.models';

export type RealtimeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class TraceQuestRealtimeService {
  private connection: signalR.HubConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private readonly traceCreatedSubject = new Subject<TraceSummary>();
  private readonly stateSubject = new BehaviorSubject<RealtimeState>('disconnected');

  readonly traceCreated$ = this.traceCreatedSubject.asObservable();
  readonly state$ = this.stateSubject.asObservable();

  constructor(private readonly authService: AuthService) {}

  async connect(): Promise<void> {
    this.stopped = false;
    if (this.connection && this.connection.state !== signalR.HubConnectionState.Disconnected) return;

    this.clearRetry();
    this.stateSubject.next('connecting');
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/tracequest/live`, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('trace.created', (trace: TraceSummary) => this.traceCreatedSubject.next(trace));
    this.connection.onreconnecting(() => this.stateSubject.next('reconnecting'));
    this.connection.onreconnected(() => this.stateSubject.next('connected'));
    this.connection.onclose(() => {
      this.stateSubject.next('disconnected');
      if (!this.stopped) this.scheduleRetry();
    });

    try {
      await this.connection.start();
      this.stateSubject.next('connected');
    } catch {
      this.stateSubject.next('disconnected');
      this.scheduleRetry();
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true;
    this.clearRetry();
    if (!this.connection) return;
    await this.connection.stop();
    this.connection = null;
    this.stateSubject.next('disconnected');
  }

  private scheduleRetry(): void {
    if (this.retryTimer || this.stopped) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connect();
    }, 5000);
  }

  private clearRetry(): void {
    if (!this.retryTimer) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
}
