import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea } from '../../../core/models/marketplace.models';

@Component({
  selector: 'app-geography-selector',
  templateUrl: './geography-selector.component.html',
  styleUrls: ['./geography-selector.component.scss']
})
export class GeographySelectorComponent implements OnInit, OnDestroy {
  @Input() endpoint = '/geography';
  @Input() label = 'Managed geography';
  @Input() placeholder = 'geographySelector.postcodeFirst';
  @Input() helper = 'geographySelector.postcodeHint';
  @Input() selectedId: string | null = null;
  @Input() disabledIds: readonly string[] = [];
  @Input() state = '';
  @Input() required = false;
  @Input() disabled = false;

  @Output() selectedIdChange = new EventEmitter<string | null>();
  @Output() selectedAreaChange = new EventEmitter<GeographyArea | null>();

  options: GeographyArea[] = [];
  searchTerm = '';
  isOpen = false;
  isLoading = false;
  loadFailed = false;
  lookupMessage = '';
  selectedArea: GeographyArea | null = null;

  private readonly search$ = new Subject<string>();
  private subscription?: Subscription;

  constructor(
    private readonly apiService: ApiService,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.subscription = this.search$.pipe(
      debounceTime(220),
      distinctUntilChanged(),
      tap(() => {
        this.isLoading = true;
        this.loadFailed = false;
        this.lookupMessage = '';
      }),
      switchMap((term: string) => this.apiService
        .get<ApiResponse<GeographyArea[]> | GeographyArea[]>(this.buildUrl(term))
        .pipe(catchError(() => {
          this.loadFailed = true;
          return of([] as GeographyArea[]);
        })))
    ).subscribe((response: ApiResponse<GeographyArea[]> | GeographyArea[]) => {
      const items = Array.isArray(response) ? response : (response.data || []);
      this.options = items
        .filter((area: GeographyArea) => area.isActive !== false)
        .sort((a, b) => (a.postcode || '').localeCompare(b.postcode || '') || (a.suburb || '').localeCompare(b.suburb || ''));
      this.syncSelectedArea();
      this.isLoading = false;
      this.handlePostcodeResult();
    });

    this.search$.next('');
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get selectedLabel(): string {
    return this.selectedArea ? this.displayName(this.selectedArea) : '';
  }

  get availableOptions(): GeographyArea[] {
    const disabled = new Set(this.disabledIds);
    return this.options.filter((area) => area.id === this.selectedId || !disabled.has(area.id));
  }

  get isPostcodeSearch(): boolean {
    return /^\d{4}$/.test(this.searchTerm.trim());
  }

  open(): void {
    if (this.disabled) return;
    this.isOpen = true;
    this.search$.next(this.searchTerm.trim());
  }

  onSearch(value: string): void {
    this.searchTerm = value.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 120);
    this.isOpen = true;
    this.search$.next(this.searchTerm.trim());
  }

  select(area: GeographyArea): void {
    if (this.disabledIds.includes(area.id) && area.id !== this.selectedId) return;
    this.selectedId = area.id;
    this.selectedArea = area;
    this.searchTerm = '';
    this.isOpen = false;
    this.lookupMessage = '';
    this.selectedIdChange.emit(area.id);
    this.selectedAreaChange.emit(area);
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.disabled) return;
    this.selectedId = null;
    this.selectedArea = null;
    this.searchTerm = '';
    this.lookupMessage = '';
    this.selectedIdChange.emit(null);
    this.selectedAreaChange.emit(null);
    this.search$.next('');
  }

  displayName(area: GeographyArea): string {
    const locality = [area.suburb, area.city, area.state].filter(Boolean).join(', ');
    return area.postcode ? `${area.postcode} · ${locality}` : (area.displayName?.trim() || locality || area.country);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen = false;
    }
  }

  private buildUrl(search: string): string {
    const normalized = search.trim();
    if (/^\d{4}$/.test(normalized)) {
      return `/geography/by-postcode/${encodeURIComponent(normalized)}`;
    }

    const params = new URLSearchParams();
    if (normalized) params.set('search', normalized);
    if (this.state.trim()) params.set('state', this.state.trim());
    const query = params.toString();
    return query ? `${this.endpoint}?${query}` : this.endpoint;
  }

  private handlePostcodeResult(): void {
    if (!this.isPostcodeSearch) return;
    const candidates = this.availableOptions;
    if (candidates.length === 1) {
      this.lookupMessage = 'geographySelector.autoSelected';
      this.select(candidates[0]);
      return;
    }
    if (candidates.length > 1) {
      this.lookupMessage = 'geographySelector.multipleSuburbs';
      this.isOpen = true;
    }
  }

  private syncSelectedArea(): void {
    if (!this.selectedId) {
      this.selectedArea = null;
      return;
    }
    this.selectedArea = this.options.find((area) => area.id === this.selectedId) || this.selectedArea;
  }
}
