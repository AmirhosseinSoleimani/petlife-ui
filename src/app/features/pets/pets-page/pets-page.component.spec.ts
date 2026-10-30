import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { Pet } from '../../../core/models/customer-core.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';
import { PetPayload } from '../../../core/models/customer-core.models';
import { PetsPageComponent, isActiveSpeciesSelection, toQuickPetPayload } from './pets-page.component';

describe('Pets quick registration', () => {
  it('only sends the required name and species for a new pet', () => {
    const form = {
      petName: '  Luna  ',
      species: ' Cat ',
      speciesId: null,
      microchipNumber: 'private-data',
      medicalNotes: 'not-for-registration',
      emergencyContactPhone: 'not-for-registration'
    } as PetPayload;

    expect(toQuickPetPayload(form)).toEqual({ petName: 'Luna', species: 'Cat' });
  });

  it('preserves the verified species identifier when it was selected', () => {
    const form = {
      petName: 'Max',
      species: 'Dog',
      speciesId: '6d83fd22-f0a8-4889-aee8-bcae5ed12975',
      dynamicValues: { secret: 'not-for-registration' }
    } as unknown as PetPayload;

    expect(toQuickPetPayload(form)).toEqual({
      petName: 'Max',
      species: 'Dog',
      speciesId: '6d83fd22-f0a8-4889-aee8-bcae5ed12975'
    });
  });
});

describe('Pets species selection', () => {
  const taxonomy = [
    { id: 'dog-id', code: 'dog', name: 'Dog', isActive: true, sortOrder: 0, subgroups: [], breeds: [] },
    { id: 'old-id', code: 'old', name: 'Old', isActive: false, sortOrder: 0, subgroups: [], breeds: [] }
  ];

  it('accepts only an active species returned by the API', () => {
    expect(isActiveSpeciesSelection(taxonomy, 'dog-id')).toBeTrue();
    expect(isActiveSpeciesSelection(taxonomy, 'old-id')).toBeFalse();
    expect(isActiveSpeciesSelection(taxonomy, 'missing-id')).toBeFalse();
    expect(isActiveSpeciesSelection(taxonomy, null)).toBeFalse();
  });

  it('blocks submission when the taxonomy has no options', () => {
    expect(isActiveSpeciesSelection([], 'dog-id')).toBeFalse();
  });
});

describe('Pet delete confirmation', () => {
  const pet = { id: 'b5dffbae-c9a5-4a0f-b292-5a6c74b61fc3', petName: 'Peter' } as Pet;
  function setup() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['delete']);
    const dialog = jasmine.createSpyObj<AppDialogService>('AppDialogService', ['confirm']);
    const component = new PetsPageComponent(api, {} as ActivatedRoute, {} as DomSanitizer, dialog);
    return { api, dialog, component };
  }

  it('does not delete when the confirmation is cancelled', async () => {
    const { api, dialog, component } = setup();
    dialog.confirm.and.returnValue(Promise.resolve(false));
    await component.deletePet(pet);
    expect(dialog.confirm).toHaveBeenCalledWith(jasmine.objectContaining({ tone: 'danger' }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('deletes only after confirmation', async () => {
    const { api, dialog, component } = setup();
    dialog.confirm.and.returnValue(Promise.resolve(true));
    api.delete.and.returnValue(of({ success: true, data: null }));
    spyOn(component, 'loadPets');
    await component.deletePet(pet);
    expect(api.delete).toHaveBeenCalledWith(`/v1/pets/${pet.id}`);
    expect(component.loadPets).toHaveBeenCalledTimes(1);
  });
});
