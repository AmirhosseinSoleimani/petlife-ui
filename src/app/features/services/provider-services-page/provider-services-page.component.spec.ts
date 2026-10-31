import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProviderService } from '../../../core/models/marketplace.models';
import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';
import {
  ProviderServicesPageComponent, groupProviderOfferings, sortDiscoveryResults, ProviderReviewView
} from './provider-services-page.component';

describe('Provider-first customer discovery', () => {
  function create(kind: 'care' | 'emergency' = 'care') {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({ success: true, data: [] }));
    const route = { snapshot: { data: { requestKind: kind }, paramMap: { get: () => null } } } as unknown as ActivatedRoute;
    const i18n = jasmine.createSpyObj<I18nService>('I18nService', ['translate']);
    return { component: new ProviderServicesPageComponent(api, route, i18n, {} as UserPreferencesService), api };
  }

  const offers: ProviderService[] = [
    { id: 'bath', providerProfileId: 'provider-1', providerBusinessName: 'Happy Paws',
      serviceDefinitionId: 'groom', serviceName: 'Bath', price: 65, durationMinutes: 60,
      pricingType: 'Fixed', providerState: 'NSW', providerSuburb: 'Bondi', providerAcceptingRequests: true },
    { id: 'walk', providerProfileId: 'provider-1', providerBusinessName: 'Happy Paws',
      serviceDefinitionId: 'walk', serviceName: 'Walking', price: 35, durationMinutes: 30,
      pricingType: 'Fixed', providerState: 'NSW', providerSuburb: 'Bondi', providerAcceptingRequests: true },
    { id: 'sit', providerProfileId: 'provider-2', providerBusinessName: 'Other Pet Care',
      serviceDefinitionId: 'sit', serviceName: 'Sitting', price: 80, durationMinutes: 120,
      pricingType: 'Fixed', providerState: 'VIC', providerAcceptingRequests: true }
  ];

  it('groups multiple service offerings under a single price-free provider card', () => {
    const grouped = groupProviderOfferings(offers);
    expect(grouped.length).toBe(2);
    expect(grouped[0].offerings.length).toBe(2);
    expect(grouped[0].categoryKeys).toEqual(['groom','walk']);
  });

  it('loads all offerings on pet selection without calling a separate categories API', () => {
    const { component, api } = create();
    component.selectPet('pet-guid');
    expect(api.get).toHaveBeenCalledTimes(1);
    const url = api.get.calls.mostRecent().args[0];
    expect(url).toContain('/provider-services?petId=pet-guid');
    expect(url).not.toContain('categoryId');
    expect(url).not.toContain('/service-categories');
  });

  it('filters category, name, suburb, state and rating locally without HTTP requests', () => {
    const { component, api } = create();
    component.selectedPetId = 'pet-guid';
    component.services = offers;
    component.ratings = {
      'provider-1': {source:'demo',averageRating:4.9,ratingCount:5,reviews:[],reviewsAvailable:true},
      'provider-2': {source:'verified',averageRating:3.5,ratingCount:2,reviews:[],reviewsAvailable:true}
    };
    component.selectCategory('walk');
    component.providerNameSearch = 'happy';
    component.providerAddressSearch = 'bondi';
    component.locationState = 'NSW';
    component.minimumRating = 4.5;
    expect(component.visibleProviders.map(p=>p.id)).toEqual(['provider-1']);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('calculates the sum and combined duration of selected offerings only as a UI quote', () => {
    const { component } = create();
    component.services = offers;
    component.openProviderDetails(groupProviderOfferings(offers)[0]);
    component.toggleOffering('bath', true);
    component.toggleOffering('walk', true);
    expect(component.estimatedTotal).toBe(100);
    expect(component.totalMinutes).toBe(90);
    expect(component.isExactTotal).toBeTrue();
    component.toggleOffering('walk', false);
    expect(component.estimatedTotal).toBe(65);
  });

  it('rejects a quote from the same provider when service order differs', () => {
    const { component } = create();
    component.selectedPetId = 'pet-1';
    component.services = offers;
    component.openProviderDetails(groupProviderOfferings(offers)[0]);
    component.toggleOffering('bath', true);
    component.toggleOffering('walk', true);
    component.serverQuote = {
      petId: 'pet-1',
      providerProfileId: 'provider-1',
      services: [
        { offeringId: 'walk' },
        { offeringId: 'bath' }
      ]
    } as any;
    expect(component.quoteMatchesSelection).toBeFalse();
    component.serverQuote = {
      petId: 'pet-1',
      providerProfileId: 'provider-1',
      services: [
        { offeringId: 'bath' },
        { offeringId: 'walk' }
      ]
    } as any;
    expect(component.quoteMatchesSelection).toBeTrue();
  });

  it('invalidates selected slot and stale availability on date change', () => {
    const { component } = create();
    component.availabilityResult = { slots: [] } as any;
    component.selectedSlotUtc = '2026-11-02T10:00:00Z';
    component.availabilityLoading = true;
    component.availabilityDate = '2026-11-03';
    component.onAvailabilityDateChanged();
    expect(component.availabilityResult).toBeNull();
    expect(component.selectedSlotUtc).toBeNull();
    expect(component.availabilityLoading).toBeFalse();
  });

  it('preserves emergency-only filtering', () => {
    const { component } = create('emergency');
    component.services = [
      {id:'vet',providerProfileId:'vet-provider',serviceName:'Emergency Vet',providerAcceptingRequests:true},
      {id:'groom',providerProfileId:'groom-provider',serviceName:'Grooming',providerAcceptingRequests:true}
    ];
    expect(component.visibleProviders.map(x=>x.id)).toEqual(['vet-provider']);
  });

  it('keeps missing ratings and distance behind known values', () => {
    const rows: ProviderService[] = [
      {id:'unknown',providerProfileId:'unknown'},
      {id:'far',providerProfileId:'far',distanceKm:20},
      {id:'near',providerProfileId:'near',distanceKm:2}
    ];
    const reviews: Record<string, ProviderReviewView> = {
      far: {source:'demo',averageRating:4.5,ratingCount:5,reviews:[],reviewsAvailable:true}
    };
    expect(sortDiscoveryResults(rows,reviews,'nearest').map(x=>x.id)).toEqual(['near','far','unknown']);
    expect(sortDiscoveryResults(rows,reviews,'rating')[0].id).toBe('far');
  });
});
