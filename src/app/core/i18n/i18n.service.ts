import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppLanguage = 'en' | 'fa' | 'fr' | 'es';

export interface AppLanguageOption {
  code: AppLanguage;
  labelKey: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: readonly AppLanguageOption[] = [
  { code: 'en', labelKey: 'language.english', direction: 'ltr' },
  { code: 'fa', labelKey: 'language.persian', direction: 'rtl' },
  { code: 'fr', labelKey: 'language.french', direction: 'ltr' },
  { code: 'es', labelKey: 'language.spanish', direction: 'ltr' }
];

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
        this.loadEnglishFallback();
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
    return SUPPORTED_LANGUAGES.some((option) => option.code === language)
      ? language as AppLanguage
      : 'en';
  }

  private applyDocumentLanguage(language: AppLanguage): void {
    const direction = SUPPORTED_LANGUAGES.find((option) => option.code === language)?.direction || 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }

  private loadEnglishFallback(): void {
    const fallbackLanguage: AppLanguage = 'en';
    localStorage.setItem(this.storageKey, fallbackLanguage);
    this.applyDocumentLanguage(fallbackLanguage);

    this.http.get<Record<string, string>>('assets/i18n/en.json').subscribe({
      next: (translations) => {
        this.translations = translations || {};
        this.languageSubject.next(fallbackLanguage);
      },
      error: () => {
        this.translations = {};
        this.languageSubject.next(fallbackLanguage);
      }
    });
  }
}
