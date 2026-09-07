import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { TranslatePipe } from './core/i18n/translate.pipe';
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
import { AppConfirmDialogComponent } from './shared/components/app-confirm-dialog/app-confirm-dialog.component';
import { AppBadgeComponent } from './shared/components/app-badge/app-badge.component';
import { AppButtonComponent } from './shared/components/app-button/app-button.component';
import { AppCardComponent } from './shared/components/app-card/app-card.component';
import { AppInputComponent } from './shared/components/app-input/app-input.component';
import { AppModalComponent } from './shared/components/app-modal/app-modal.component';
import { AppFileUploadComponent } from './shared/components/app-file-upload/app-file-upload.component';
import { AppPageHeaderComponent } from './shared/components/app-page-header/app-page-header.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';
import { WorkspacePreferencesComponent } from './shared/components/workspace-preferences/workspace-preferences.component';

@NgModule({
  declarations: [
    AppComponent, AiAssistantComponent, AppShellComponent, LoginComponent, RegisterComponent, ContactVerificationComponent,
    DashboardComponent, CustomerProfileComponent, PetsPageComponent, PetHealthRecordsComponent, PetHealthTimelineComponent, PetSharingComponent, PetExpensesComponent, PublicPetShareComponent,
    RemindersPageComponent, EmergencyVetsPageComponent, ProvidersPageComponent, ProviderProfileComponent,
    ProviderServicesManagementComponent, ProviderServiceAreasComponent, ProviderDocumentsComponent, ProviderRequestsComponent, ProviderServicesPageComponent,
    CreateServiceRequestComponent, MyRequestsComponent, FeedbackPageComponent, AdminUsersComponent, AdminProviderVerificationComponent, AdminOperationsComponent, AdminPetsComponent, AdminTaxonomyComponent, AdminGeographyComponent, AdminServiceCatalogComponent, AdminReminderTemplatesComponent, AdminExpenseCategoriesComponent,
    AppButtonComponent, AppCardComponent, AppInputComponent, AppModalComponent, AppConfirmDialogComponent, AppFileUploadComponent, AppBadgeComponent,
    AppPageHeaderComponent, WorkspacePreferencesComponent, TranslatePipe
  ],
  imports: [BrowserModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule { }
