import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'en' | 'fa' | 'fr';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storageKey = 'petlife.language';
  private translations: Record<string, string> = {};
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(this.getInitialLanguage());

  readonly language$ = this.languageSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.useLanguage(this.languageSubject.value);
  }

  get currentLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  useLanguage(language: AppLanguage): void {
    const nextLanguage = this.normalizeLanguage(language);
    localStorage.setItem(this.storageKey, nextLanguage);
    this.applyDocumentLanguage(nextLanguage);

    this.http.get<Record<string, string>>(`assets/i18n/${nextLanguage}.json`).subscribe({
      next: (translations) => {
        this.translations = translations || {};
        this.languageSubject.next(nextLanguage);
      },
      error: () => {
        this.translations = {};
        this.languageSubject.next(nextLanguage);
      }
    });
  }

  translate(key: string | null | undefined): string {
    if (!key) {
      return '';
    }

    return this.translations[key] || key;
  }

  private getInitialLanguage(): AppLanguage {
    const savedLanguage = localStorage.getItem(this.storageKey) as AppLanguage | null;
    return this.normalizeLanguage(savedLanguage || 'en');
  }

  private normalizeLanguage(language: string): AppLanguage {
    return language === 'fa' || language === 'fr' ? language : 'en';
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }
}
