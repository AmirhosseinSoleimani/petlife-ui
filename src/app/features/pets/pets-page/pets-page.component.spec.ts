import { PetPayload } from '../../../core/models/customer-core.models';
import { toQuickPetPayload } from './pets-page.component';

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
