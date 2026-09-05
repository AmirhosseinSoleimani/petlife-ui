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
  private readonly token = this.route.snapshot.paramMap.get('token') || '';
  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {}
  ngOnInit(): void {
    this.apiService.get<ApiResponse<ScopedPetShare>>(`/pet-shares/public/${encodeURIComponent(this.token)}`).subscribe({
      next: response => { this.data = response.data; this.isLoading = false; },
      error: () => { this.unavailable = true; this.isLoading = false; }
    });
  }
}
