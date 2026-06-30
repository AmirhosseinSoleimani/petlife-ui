import { Component } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  readonly userRole = this.authService.getCurrentUser()?.role;
  readonly kpiCards = [
    {
      title: 'Pets under care',
      value: 'Unified profiles',
      text: 'Every pet becomes a durable care identity across records, costs, and services.',
      accent: 'teal'
    },
    {
      title: 'Health activity',
      value: 'Trackable history',
      text: 'Visits, due dates, and care notes create continuity for families and providers.',
      accent: 'amber'
    },
    {
      title: 'Reminders status',
      value: 'Operational clarity',
      text: 'Due, upcoming, and completed care tasks stay visible before they become urgent.',
      accent: 'blue'
    },
    {
      title: 'Marketplace activity',
      value: 'Closed loop',
      text: 'Customers request services while providers manage acceptance and completion.',
      accent: 'rose'
    }
  ];
  readonly workflowSteps = ['Profile', 'Health signal', 'Service match', 'Provider action'];

  constructor(private readonly authService: AuthService) {}
}
