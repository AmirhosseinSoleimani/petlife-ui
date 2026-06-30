import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EmergencyVetsPageComponent } from './features/emergency-vets/emergency-vets-page/emergency-vets-page.component';
import { PetExpensesComponent } from './features/pets/pet-expenses/pet-expenses.component';
import { PetHealthRecordsComponent } from './features/pets/pet-health-records/pet-health-records.component';
import { PetsPageComponent } from './features/pets/pets-page/pets-page.component';
import { ProviderProfileComponent } from './features/provider-panel/provider-profile/provider-profile.component';
import { ProviderRequestsComponent } from './features/provider-panel/provider-requests/provider-requests.component';
import { ProviderServiceAreasComponent } from './features/provider-panel/provider-service-areas/provider-service-areas.component';
import { ProviderServicesManagementComponent } from './features/provider-panel/provider-services-management/provider-services-management.component';
import { ProvidersPageComponent } from './features/providers/providers-page/providers-page.component';
import { CreateServiceRequestComponent } from './features/requests/create-service-request/create-service-request.component';
import { MyRequestsComponent } from './features/requests/my-requests/my-requests.component';
import { RemindersPageComponent } from './features/reminders/reminders-page/reminders-page.component';
import { ProviderServicesPageComponent } from './features/services/provider-services-page/provider-services-page.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: AppShellComponent,
    canActivateChild: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'pets',
        component: PetsPageComponent
      },
      {
        path: 'pets/:petId/health-records',
        component: PetHealthRecordsComponent
      },
      {
        path: 'pets/:petId/expenses',
        component: PetExpensesComponent
      },
      {
        path: 'reminders',
        component: RemindersPageComponent
      },
      {
        path: 'emergency-vets',
        component: EmergencyVetsPageComponent
      },
      {
        path: 'providers',
        component: ProvidersPageComponent
      },
      {
        path: 'provider/profile',
        component: ProviderProfileComponent
      },
      {
        path: 'provider/services',
        component: ProviderServicesManagementComponent
      },
      {
        path: 'provider/service-areas',
        component: ProviderServiceAreasComponent
      },
      {
        path: 'provider/requests',
        component: ProviderRequestsComponent
      },
      {
        path: 'providers/:providerId/services',
        component: ProviderServicesPageComponent
      },
      {
        path: 'services',
        component: ProviderServicesPageComponent
      },
      {
        path: 'service-requests/new',
        component: CreateServiceRequestComponent
      },
      {
        path: 'service-requests/my',
        component: MyRequestsComponent
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
