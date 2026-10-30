import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ScopedPetShare } from '../../../core/models/phase1-care.models';

@Component({
  selector: 'app-public-pet-share',
  templateUrl: './public-pet-share.component.html',
  styleUrls: ['./public-pet-share.component.scss']
})
export class PublicPetShareComponent implements OnInit {
  data: ScopedPetShare | null = null;
  isLoading = true;
  unavailable = false;
  private readonly shareKey: string;
  readonly isPrivate: boolean;

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {
    this.isPrivate = this.route.snapshot.data['privateShare'] === true;
    this.shareKey = this.route.snapshot.paramMap.get(this.isPrivate ? 'shareId' : 'token') || '';
  }
  ngOnInit(): void {
    const endpoint = this.isPrivate
      ? `/v1/pet-shares/${encodeURIComponent(this.shareKey)}`
      : `/v1/pet-shares/public/${encodeURIComponent(this.shareKey)}`;
    this.apiService.get<ApiResponse<ScopedPetShare>>(endpoint).subscribe({
      next: response => { this.data = response.data; this.isLoading = false; },
      error: () => { this.unavailable = true; this.isLoading = false; }
    });
  }
}
