import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HealthTimelineItem, VitalSummary } from '../../../core/models/phase1-care.models';

@Component({
  selector: 'app-pet-health-timeline',
  templateUrl: './pet-health-timeline.component.html',
  styleUrls: ['./pet-health-timeline.component.scss']
})
export class PetHealthTimelineComponent implements OnInit {
  readonly typeOptions = ['All', 'Vaccination', 'Medication', 'PreventiveCare', 'VetVisit', 'Measurement', 'General', 'Reminder'];
  petId = this.route.snapshot.paramMap.get('petId') || '';
  items: HealthTimelineItem[] = [];
  summary: VitalSummary | null = null;
  selectedType = 'All';
  fromDate = '';
  toDate = '';
  includeReminderActivity = true;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    let endpoint = `/pets/${this.petId}/health-timeline?includeReminderActivity=${this.includeReminderActivity}`;
    if (this.selectedType !== 'All') endpoint += `&types=${encodeURIComponent(this.selectedType)}`;
    if (this.fromDate) endpoint += `&fromDate=${this.fromDate}`;
    if (this.toDate) endpoint += `&toDate=${this.toDate}`;

    this.apiService.get<ApiResponse<HealthTimelineItem[]>>(endpoint).subscribe({
      next: (response) => {
        this.items = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'healthTimeline.loadError';
        this.isLoading = false;
      }
    });

    this.apiService.get<ApiResponse<VitalSummary>>(`/pets/${this.petId}/vital-summary`).subscribe({
      next: (response) => this.summary = response.data,
      error: () => this.summary = null
    });
  }

  clearFilters(): void {
    this.selectedType = 'All';
    this.fromDate = '';
    this.toDate = '';
    this.includeReminderActivity = true;
    this.load();
  }

  itemTone(item: HealthTimelineItem): 'success' | 'warning' | 'info' {
    if (item.itemKind.toLowerCase().includes('reminder')) return 'warning';
    if (item.type === 'Measurement') return 'info';
    return 'success';
  }
}
