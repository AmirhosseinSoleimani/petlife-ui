import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { AppDialogService } from '../../../shared/services/app-dialog.service';
import { PetShareGrant } from '../../../core/models/phase1-care.models';
import { PetSharingComponent, shareExpiryWindow, isValidRecipientContact } from './pet-sharing.component';

describe('Pet sharing behavior', () => {
  const petId = 'd38f2f25-e04a-4f84-886e-2dce1a26f9ac';
  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['post', 'get']);
    const dialog = jasmine.createSpyObj<AppDialogService>('AppDialogService', ['confirm']);
    const route = { snapshot: { paramMap: { get: () => petId } } } as unknown as ActivatedRoute;
    const component = new PetSharingComponent(api, route, dialog);
    return { component, api, dialog };
  }

  it('requires future dates within the backend 90-day limit', () => {
    const bounds = shareExpiryWindow(new Date(2026, 9, 30, 12));
    expect(bounds.min).toBe('2026-10-31');
    expect(bounds.max).toBe('2027-01-27');
  });

  it('accepts email and phone contact shapes, rejecting internal IDs', () => {
    expect(isValidRecipientContact('person@example.org')).toBeTrue();
    expect(isValidRecipientContact('+61412345678')).toBeTrue();
    expect(isValidRecipientContact(petId)).toBeFalse();
  });

  it('refuses unverified private share creation without sending a public grant', () => {
    const { component, api } = setup();
    component.selectTab('private');
    component.recipientContact = 'provider@example.org';
    component.createShare();
    expect(component.errorMessage).toBe('sharing.privateUnavailable');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uses the protected versioned endpoints for preview and audit', () => {
    const { component, api } = setup();
    const grant = { id: petId, isActive: true } as PetShareGrant;
    api.get.and.returnValue(of({ success: true, data: [] }));
    component.showAudit(grant);
    expect(api.get).toHaveBeenCalledWith(`/v1/pet-shares/${petId}/audit`);
    component.showPreview(grant);
    expect(api.get).toHaveBeenCalledWith(`/v1/pet-shares/${petId}/preview`);
  });

  it('never revokes an active share without confirmation', async () => {
    const { component, api, dialog } = setup();
    dialog.confirm.and.returnValue(Promise.resolve(false));
    await component.revoke({ id: petId, isActive: true } as PetShareGrant);
    expect(api.post).not.toHaveBeenCalled();
  });
});
