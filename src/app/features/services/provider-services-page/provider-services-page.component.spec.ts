import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';
import { ProviderServicesPageComponent } from './provider-services-page.component';

describe('Request type service discovery', () => {
  function create(kind: 'emergency' | 'care') {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    const route = { snapshot: { data: { requestKind: kind }, paramMap: { get: () => null } } } as unknown as ActivatedRoute;
    const i18n = jasmine.createSpyObj<I18nService>('I18nService', ['translate']);
    return new ProviderServicesPageComponent(api, route, i18n, {} as UserPreferencesService);
  }

  it('shows only veterinary-related categories for emergency selection', () => {
    const component = create('emergency');
    component.categories = [
      { id: 'vet', name: 'Veterinary care' },
      { id: 'groom', name: 'Grooming' }
    ];
    expect(component.visibleCategories.map(x => x.id)).toEqual(['vet']);
    component.selectedPetId = 'pet';
    component.selectCategory('groom');
    expect(component.selectedCategoryId).toBeNull();
  });

  it('does not market non-vet listings as emergency care', () => {
    const component = create('emergency');
    component.services = [
      { id: 'vet', name: 'Emergency veterinary care', providerAcceptingRequests: true },
      { id: 'groom', name: 'Grooming', providerAcceptingRequests: true },
      { id: 'closed', name: 'Emergency veterinary care', providerAcceptingRequests: false }
    ];
    expect(component.visibleServices.map(x => x.id)).toEqual(['vet']);
  });

  it('shows normal categories on a regular care request', () => {
    const component = create('care');
    component.categories = [{ id: 'groom', name: 'Grooming' }];
    expect(component.visibleCategories.length).toBe(1);
  });
});
