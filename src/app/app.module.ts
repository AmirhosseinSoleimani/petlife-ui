import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { TranslatePipe } from './core/i18n/translate.pipe';
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
import { AppBadgeComponent } from './shared/components/app-badge/app-badge.component';
import { AppButtonComponent } from './shared/components/app-button/app-button.component';
import { AppCardComponent } from './shared/components/app-card/app-card.component';
import { AppInputComponent } from './shared/components/app-input/app-input.component';
import { AppPageHeaderComponent } from './shared/components/app-page-header/app-page-header.component';
import { AppShellComponent } from './shared/layout/app-shell/app-shell.component';

@NgModule({
  declarations: [
    AppComponent,
    AppShellComponent,
    LoginComponent,
    DashboardComponent,
    PetsPageComponent,
    PetHealthRecordsComponent,
    PetExpensesComponent,
    RemindersPageComponent,
    EmergencyVetsPageComponent,
    ProvidersPageComponent,
    ProviderProfileComponent,
    ProviderServicesManagementComponent,
    ProviderServiceAreasComponent,
    ProviderRequestsComponent,
    ProviderServicesPageComponent,
    CreateServiceRequestComponent,
    MyRequestsComponent,
    AppButtonComponent,
    AppCardComponent,
    AppInputComponent,
    AppBadgeComponent,
    AppPageHeaderComponent,
    TranslatePipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
