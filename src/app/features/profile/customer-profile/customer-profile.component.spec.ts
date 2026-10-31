import { of, throwError } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { IdentityProfile } from '../../../core/models/auth.models';
import { CustomerProfileComponent } from './customer-profile.component';

describe('Customer profile / Users identity contract', () => {
  const identity: IdentityProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstName: 'Pet', lastName: 'Owner', email: 'owner@example.com',
    mobileNumber: '+61400000000', role: 'Customer', status: 'Active',
    isEmailVerified: true, isMobileVerified: false
  };

  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'put', 'post']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['syncProfile', 'signOutLocally']);
    const component = new CustomerProfileComponent(api, auth);
    return { api, auth, component };
  }

  it('loads the actual registration identity from /v1/identity/profile, not /customer/profile', () => {
    const { component, api } = setup();
    api.get.and.returnValue(of({ success: true, data: identity }));
    component.ngOnInit();
    expect(api.get).toHaveBeenCalledOnceWith('/v1/identity/profile');
    expect(component.profile?.email).toBe(identity.email);
    expect(component.profile?.mobileNumber).toBe(identity.mobileNumber);
    expect(component.form).toEqual({ firstName: 'Pet', lastName: 'Owner' });
    expect(component.canSaveNames).toBeFalse();
  });

  it('updates only supported name fields and synchronizes the cached header identity', () => {
    const { component, api, auth } = setup();
    api.get.and.returnValue(of({ success: true, data: identity }));
    api.put.and.returnValue(of({ success: true, data: { ...identity, firstName: 'New' } }));
    component.loadProfile();
    component.form.firstName = ' New ';
    component.save();
    expect(api.put).toHaveBeenCalledOnceWith('/v1/identity/profile', {
      firstName: 'New', lastName: 'Owner'
    });
    expect(auth.syncProfile).toHaveBeenCalledWith(jasmine.objectContaining({ firstName: 'New' }));
    expect(component.saveSuccess).toBe('profile.saveSuccess');
  });

  it('does not send location/preferences or invalid or unchanged names to an unsupported endpoint', () => {
    const { component, api } = setup();
    api.get.and.returnValue(of({ success: true, data: identity }));
    component.loadProfile();
    component.save();
    component.form.firstName = ' ';
    component.save();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('does not claim success when the identity request fails', () => {
    const { component, api } = setup();
    api.get.and.returnValue(throwError(() => new Error('failed')));
    component.loadProfile();
    expect(component.loadError).toBe('profile.loadError');
    expect(component.profile).toBeNull();
  });

  describe('profile address API', () => {
    const stored: IdentityProfile = { ...identity, address: '15 Example Street', suburb: 'Richmond',
      postcode: '3121', city: 'Melbourne', state: 'Victoria', country: 'Australia' };

    it('hydrates all six optional fields and prevents unchanged submissions', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: stored }));
      component.loadProfile();
      expect(component.addressSupported).toBeTrue();
      expect(component.addressForm.address).toBe('15 Example Street');
      expect(component.addressForm.postcode).toBe('3121');
      expect(component.addressForm.suburb).toBe('Richmond');
      expect(component.addressForm.city).toBe('Melbourne');
      expect(component.addressForm.state).toBe('Victoria');
      expect(component.addressForm.country).toBe('Australia');
      component.saveAddress();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('permits drafting address when the backend response still omits address fields', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: identity }));
      component.loadProfile();
      component.addressForm.address = 'test';
      component.saveAddress();
      expect(component.addressSupported).toBeTrue();
      expect(component.canSaveAddress).toBeTrue();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('accepts null optional address properties as empty inputs', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: { ...stored, address: null } }));
      component.loadProfile();
      expect(component.addressForm.address).toBe('');
    });

    it('saves the exact six-field payload, allowing explicit clearing with null', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: stored }));
      api.put.and.returnValue(of({ success: true, data: {
        ...stored, address: '42 New Street', postcode: null
      } }));
      component.loadProfile();
      component.addressForm.address = ' 42 New Street ';
      component.addressForm.postcode = '';
      component.saveAddress();
      expect(api.put).toHaveBeenCalledOnceWith('/v1/identity/profile/address', {
        address: '42 New Street', suburb: 'Richmond', postcode: null,
        city: 'Melbourne', state: 'Victoria', country: 'Australia'
      });
      expect(component.addressSuccess).toBe('profile.addressSaveSuccess');
      expect(component.canSaveAddress).toBeFalse();
    });

    it('does not claim successful persistence if server returns a null body', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: identity }));
      api.put.and.returnValue(of(null));
      component.loadProfile();
      component.addressForm.address = 'Draft street';
      component.saveAddress();
      expect(component.addressError).toBe('profile.addressSaveError');
      expect(component.addressSuccess).toBe('');
      expect(component.addressForm.address).toBe('Draft street');
    });

    it('keeps the dirty form and reports errors when the API fails', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: stored }));
      api.put.and.returnValue(throwError(() => new Error('Failed')));
      component.loadProfile();
      component.addressForm.city = 'Geelong';
      component.saveAddress();
      expect(component.addressForm.city).toBe('Geelong');
      expect(component.addressError).toBe('profile.addressSaveError');
      expect(component.canSaveAddress).toBeTrue();
      component.revertAddress();
      expect(component.addressForm.city).toBe('Melbourne');
    });

    it('does not lose address state when name-only PUT returns the old DTO', () => {
      const { component, api } = setup();
      api.get.and.returnValue(of({ success: true, data: stored }));
      api.put.and.returnValue(of({ success: true, data: { ...identity, firstName: 'New' } }));
      component.loadProfile();
      component.form.firstName = 'New';
      component.save();
      expect(component.profile?.address).toBe('15 Example Street');
    });
  });

  it('closes a customer account only after password and explicit acknowledgment', () => {
    const { component, api, auth } = setup();
    api.get.and.returnValue(of({ success: true, data: identity }));
    api.post.and.returnValue(of(undefined));
    component.loadProfile();
    component.closeAccount();
    expect(api.post).not.toHaveBeenCalled();
    component.toggleCloseForm();
    component.closePassword = 'secret password';
    component.closeAccount();
    expect(api.post).not.toHaveBeenCalled();
    component.closeAcknowledged = true;
    component.closeAccount();
    expect(api.post).toHaveBeenCalledOnceWith('/v1/identity/account/close', {
      currentPassword: 'secret password'
    });
    expect(auth.signOutLocally).toHaveBeenCalled();
  });

  it('does not permit self-closure through this endpoint for a provider', () => {
    const { component, api } = setup();
    api.get.and.returnValue(of({ success: true, data: { ...identity, role: 'Provider' } }));
    component.loadProfile();
    component.toggleCloseForm();
    component.closePassword = 'secret';
    component.closeAcknowledged = true;
    component.closeAccount();
    expect(component.showCloseForm).toBeFalse();
    expect(api.post).not.toHaveBeenCalled();
  });
});
