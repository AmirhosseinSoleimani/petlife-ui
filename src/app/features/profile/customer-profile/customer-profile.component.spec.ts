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
