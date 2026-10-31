import { of, Subject, throwError } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppDialogService } from '../../../shared/services/app-dialog.service';
import { PetTransferComponent, validTransferCode } from './pet-transfer.component';

describe('Pet transfer v1 API contract', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const code = 'a'.repeat(64);
  const token = { id, transferCode: code, expiresAt: '2026-11-01T12:00:00Z' };
  const summary = { id, expiresAt: token.expiresAt, isUsed: false,
    isRevoked: false, isExpired: false, createdAt: '2026-10-31T12:00:00Z' };

  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    auth.getCurrentUser.and.returnValue({ id });
    const dialog = jasmine.createSpyObj<AppDialogService>('AppDialogService', ['confirm']);
    const component = new PetTransferComponent(api, auth, dialog);
    return { component, api, auth, dialog };
  }

  it('rejects unsupported transfer code formats', () => {
    expect(validTransferCode('abc')).toBeFalse();
    expect(validTransferCode('g'.repeat(64))).toBeFalse();
    expect(validTransferCode(code)).toBeTrue();
    expect(validTransferCode(' ' + code + ' ')).toBeTrue();
  });

  it('loads pets without calling the obsolete token list API', () => {
    const { component, api } = setup();
    api.get.and.returnValue(of({ success: true, data: [] }));
    component.load();
    expect(api.get).toHaveBeenCalledWith('/v1/pets');
    expect(api.get).not.toHaveBeenCalledWith('/pet-transfers/tokens');
  });

  it('creates a code with the Pets v1 contract then loads its status by ID', () => {
    const { component, api } = setup();
    api.post.and.returnValue(of({ success: true, data: token }));
    api.get.and.returnValue(of({ success: true, data: summary }));
    component.createToken();
    expect(api.post).toHaveBeenCalledOnceWith('/v1/pet-transfer-tokens', { expiresInMinutes: 30 });
    expect(api.get).toHaveBeenCalledWith('/v1/pet-transfer-tokens/' + id);
    expect(component.createdToken?.transferCode).toBe(code);
    expect(component.tokenSummary?.id).toBe(id);
  });

  it('does not persist a token when API creation fails', () => {
    const { component, api } = setup();
    api.post.and.returnValue(throwError(() => new Error('unavailable')));
    component.createToken();
    expect(component.createdToken).toBeNull();
    expect(component.errorMessage).toBe('petTransfer.createError');
  });

  it('revokes a recipient token using its identifier, not the old route', () => {
    const { component, api } = setup();
    component.lastTokenId = id;
    component.tokenSummary = summary;
    api.post.and.returnValue(of({ success: true, data: null }));
    api.get.and.returnValue(of({ success: true, data: { ...summary, isRevoked: true } }));
    component.revokeToken();
    expect(api.post).toHaveBeenCalledOnceWith('/v1/pet-transfer-tokens/' + id + '/revoke', {});
    expect(component.tokenSummary?.isRevoked).toBeTrue();
  });

  it('requires explicit confirmation before ownership transfer', async () => {
    const { component, api, dialog } = setup();
    component.selectedPetId = id;
    component.transferCode = code;
    dialog.confirm.and.returnValue(Promise.resolve(false));
    await component.transferPet();
    expect(dialog.confirm).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uses successful null-data transfer response and reloads pets', async () => {
    const { component, api, dialog } = setup();
    component.selectedPetId = id;
    component.transferCode = code;
    component.pets = [{ id, petName: 'Sunny', species: 'Dog' } as any];
    dialog.confirm.and.returnValue(Promise.resolve(true));
    api.post.and.returnValue(of({ success: true, data: null }));
    api.get.and.returnValue(of({ success: true, data: [] }));
    await component.transferPet();
    expect(api.post).toHaveBeenCalledOnceWith('/v1/pets/' + id + '/transfer', { transferCode: code });
    expect(component.transferCompleted).toBeTrue();
    expect(component.completedPetName).toBe('Sunny');
    expect(component.transferCode).toBe('');
  });

  it('never calls a nonexistent recipient preview endpoint', () => {
    const { component, api } = setup();
    component.onCodeChanged(code);
    expect(component.isCodeValid).toBeTrue();
    expect(api.post).not.toHaveBeenCalled();
  });
});
