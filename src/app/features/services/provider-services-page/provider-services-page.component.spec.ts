import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProviderService } from '../../../core/models/marketplace.models';
import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';
import { ProviderServicesPageComponent, sortDiscoveryResults, ProviderReviewView } from './provider-services-page.component';

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
  it('sorts unknown distances last and never treats missing ratings as zero stars', () => {
    const services: ProviderService[] = [
      { id: 'missing', providerProfileId: 'missing' },
      { id: 'far', providerProfileId: 'far', distanceKm: 20 },
      { id: 'near', providerProfileId: 'near', distanceKm: 2 }
    ];
    const reviews: Record<string, ProviderReviewView> = {
      far: { source: 'demo', averageRating: 4.5, ratingCount: 10, reviews: [], reviewsAvailable: true }
    };
    expect(sortDiscoveryResults(services, reviews, 'nearest').map(item => item.id))
      .toEqual(['near', 'far', 'missing']);
    expect(sortDiscoveryResults(services, reviews, 'rating')[0].id).toBe('far');
    expect(sortDiscoveryResults(services, reviews, 'rating')[2].id).toBe('missing');
  });

  it('only sends supported provider discovery filters', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({ success: true, data: [] }));
    const route = { snapshot: { data: { requestKind: 'care' }, paramMap: { get: () => null } } } as unknown as ActivatedRoute;
    const component = new ProviderServicesPageComponent(
      api, route, jasmine.createSpyObj<I18nService>('I18nService', ['translate']),
      {} as UserPreferencesService);
    component.selectedPetId = 'pet-guid';
    component.categories = [{ id: 'category-guid', name: 'Vet' }];
    component.originPostcode = '2000';
    component.originState = 'NSW';
    component.locationState = 'VIC';
    component.selectCategory('category-guid');
    const url = api.get.calls.mostRecent().args[0];
    expect(url).toContain('originPostcode=2000');
    expect(url).toContain('state=VIC');
    for (const unsupported of ['deliveryMode', 'openNow', 'afterHours', 'latitude', 'longitude', 'radiusKm']) {
      expect(url).not.toContain(unsupported);
    }
  });

  it('uses the selected origin separately from result filters', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({ success: true, data: [] }));
    const route = { snapshot: { data: { requestKind: 'care' }, paramMap: { get: () => null } } } as unknown as ActivatedRoute;
    const component = new ProviderServicesPageComponent(
      api, route, jasmine.createSpyObj<I18nService>('I18nService', ['translate']),
      {} as UserPreferencesService);
    component.selectedPetId = 'pet-guid';
    component.categories = [{ id: 'category-guid', name: 'Vet' }];
    component.selectCategory('category-guid');
    component.onGeographySelected({ id: 'location', city: 'Sydney', suburb: 'Sydney',
      state: 'NSW', postcode: '2000', country: 'Australia', sortOrder: 0, isActive: true });
    const url = api.get.calls.mostRecent().args[0];
    expect(url).toContain('originPostcode=2000');
    expect(url).not.toContain('&postcode=2000');
  });

});
