import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminGuard } from './core/guards/admin.guard';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminPetsComponent } from './features/admin/admin-pets/admin-pets.component';
import { AdminReminderTemplatesComponent } from './features/admin/admin-reminder-templates/admin-reminder-templates.component';
import { AdminExpenseCategoriesComponent } from './features/admin/admin-expense-categories/admin-expense-categories.component';
import { AdminGeographyComponent } from './features/admin/admin-geography/admin-geography.component';
import { AdminServiceCatalogComponent } from './features/admin/admin-service-catalog/admin-service-catalog.component';
import { AdminTaxonomyComponent } from './features/admin/admin-taxonomy/admin-taxonomy.component';
import { AdminUsersComponent } from './features/admin/admin-users/admin-users.component';
import { AdminProviderVerificationComponent } from './features/admin/admin-provider-verification/admin-provider-verification.component';
import { AdminOperationsComponent } from './features/admin/admin-operations/admin-operations.component';
import { AiAssistantComponent } from './features/ai/ai-assistant/ai-assistant.component';
import { ContactVerificationComponent } from './features/auth/contact-verification/contact-verification.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { EmergencyVetsPageComponent } from './features/emergency-vets/emergency-vets-page/emergency-vets-page.component';
import { FeedbackPageComponent } from './features/feedback/feedback-page/feedback-page.component';
import { PetExpensesComponent } from './features/pets/pet-expenses/pet-expenses.component';
import { PetHealthRecordsComponent } from './features/pets/pet-health-records/pet-health-records.component';
import { PetHealthTimelineComponent } from './features/pets/pet-health-timeline/pet-health-timeline.component';
import { PetSharingComponent } from './features/pets/pet-sharing/pet-sharing.component';
import { PublicPetShareComponent } from './features/sharing/public-pet-share/public-pet-share.component';
import { PetsPageComponent } from './features/pets/pets-page/pets-page.component';
import { CustomerProfileComponent } from './features/profile/customer-profile/customer-profile.component';
import { ProviderProfileComponent } from './features/provider-panel/provider-profile/provider-profile.component';
import { ProviderDocumentsComponent } from './features/provider-panel/provider-documents/provider-documents.component';
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
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-contact', component: ContactVerificationComponent, canActivate: [AuthGuard] },
  { path: 'shared/pet/:token', component: PublicPetShareComponent },
  {
    path: '', component: AppShellComponent, canActivateChild: [AuthGuard], children: [
      { path: 'ai', component: AiAssistantComponent },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: CustomerProfileComponent },
      { path: 'pets', component: PetsPageComponent },
      { path: 'pets/:petId/health-records', component: PetHealthRecordsComponent },
      { path: 'pets/:petId/health-timeline', component: PetHealthTimelineComponent },
      { path: 'pets/:petId/share', component: PetSharingComponent },
      { path: 'pets/:petId/expenses', component: PetExpensesComponent },
      { path: 'reminders', component: RemindersPageComponent },
      { path: 'emergency-vets', component: EmergencyVetsPageComponent },
      { path: 'feedback', component: FeedbackPageComponent },
      { path: 'providers', component: ProvidersPageComponent },
      { path: 'provider/profile', component: ProviderProfileComponent },
      { path: 'provider/documents', component: ProviderDocumentsComponent },
      { path: 'provider/services', component: ProviderServicesManagementComponent },
      { path: 'provider/service-areas', component: ProviderServiceAreasComponent },
      { path: 'provider/requests', component: ProviderRequestsComponent },
      { path: 'providers/:providerId/services', component: ProviderServicesPageComponent },
      { path: 'services', component: ProviderServicesPageComponent },
      { path: 'service-requests/new/:serviceId', component: CreateServiceRequestComponent },
      { path: 'service-requests/new', pathMatch: 'full', redirectTo: 'services' },
      { path: 'service-requests/my', component: MyRequestsComponent },
      { path: 'admin/users', component: AdminUsersComponent, canActivate: [AdminGuard] },
      { path: 'admin/provider-verification', component: AdminProviderVerificationComponent, canActivate: [AdminGuard] },
      { path: 'admin/operations', component: AdminOperationsComponent, canActivate: [AdminGuard] },
      { path: 'admin/pets', component: AdminPetsComponent, canActivate: [AdminGuard] },
      { path: 'admin/taxonomy', component: AdminTaxonomyComponent, canActivate: [AdminGuard] },
      { path: 'admin/geography', component: AdminGeographyComponent, canActivate: [AdminGuard] },
      { path: 'admin/service-catalog', component: AdminServiceCatalogComponent, canActivate: [AdminGuard] },
      { path: 'admin/reminder-templates', component: AdminReminderTemplatesComponent, canActivate: [AdminGuard] },
      { path: 'admin/expense-categories', component: AdminExpenseCategoriesComponent, canActivate: [AdminGuard] },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule { }
