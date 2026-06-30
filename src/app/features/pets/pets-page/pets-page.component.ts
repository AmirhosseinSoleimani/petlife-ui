import { Component, OnInit } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PET_GENDER_OPTIONS, PET_TYPE_OPTIONS, Pet, PetPayload } from '../../../core/models/customer-core.models';

const emptyPetForm: PetPayload = {
  petName: '',
  species: '',
  breed: '',
  approxAge: '',
  gender: '',
  weight: null,
  behaviourNotes: ''
};

@Component({
  selector: 'app-pets-page',
  templateUrl: './pets-page.component.html',
  styleUrls: ['./pets-page.component.scss']
})
export class PetsPageComponent implements OnInit {
  readonly petTypeOptions = PET_TYPE_OPTIONS;
  readonly genderOptions = PET_GENDER_OPTIONS;
  pets: Pet[] = [];
  form: PetPayload = { ...emptyPetForm };
  editingPetId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load pets.';
        this.isLoading = false;
      }
    });
  }

  savePet(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const isEditing = !!this.editingPetId;

    const request = this.editingPetId
      ? this.apiService.put<ApiResponse<Pet>>(`/pets/${this.editingPetId}`, this.form)
      : this.apiService.post<ApiResponse<Pet>>('/pets', this.form);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.successMessage = isEditing ? 'Pet profile updated.' : 'Pet profile created.';
        this.loadPets();
      },
      error: () => {
        this.errorMessage = 'Unable to save pet.';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  editPet(pet: Pet): void {
    this.editingPetId = pet.id;
    this.form = {
      petName: pet.petName,
      species: pet.species || '',
      breed: pet.breed || '',
      approxAge: pet.approxAge || '',
      gender: pet.gender || '',
      weight: pet.weight ?? null,
      behaviourNotes: pet.behaviourNotes || ''
    };
  }

  deletePet(pet: Pet): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/pets/${pet.id}`).subscribe({
      next: () => {
        this.successMessage = 'Pet profile deleted.';
        this.loadPets();
      },
      error: () => {
        this.errorMessage = 'Unable to delete pet.';
      }
    });
  }

  resetForm(): void {
    this.editingPetId = null;
    this.form = { ...emptyPetForm };
  }
}
