import { Component, OnInit, ViewChild } from '@angular/core';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { FileAsset, PET_GENDER_OPTIONS, PET_TYPE_OPTIONS, Pet, PetPayload } from '../../../core/models/customer-core.models';
import { AppFileUploadComponent } from '../../../shared/components/app-file-upload/app-file-upload.component';

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
  @ViewChild('petImageUpload') petImageUpload?: AppFileUploadComponent;

  readonly petTypeOptions = PET_TYPE_OPTIONS;
  readonly genderOptions = PET_GENDER_OPTIONS;
  readonly profileImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  readonly profileImageContentTypes = ['image/jpeg', 'image/png', 'image/webp'];
  readonly profileImageMaxSize = 5 * 1024 * 1024;
  pets: Pet[] = [];
  form: PetPayload = { ...emptyPetForm };
  editingPetId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  removingImagePetId: string | null = null;
  selectedPetImageFileForCreate: File | null = null;
  selectedPetImageFileForEdit: File | null = null;

  constructor(private readonly apiService: ApiService) {}

  ngOnInit(): void {
    this.loadPets();
  }

  get editingPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.editingPetId) || null;
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
    const editingPetId = this.editingPetId;
    const isEditing = !!editingPetId;
    const selectedImage = isEditing
      ? this.selectedPetImageFileForEdit
      : this.selectedPetImageFileForCreate;

    const request = editingPetId
      ? this.apiService.put<ApiResponse<Pet>>(`/pets/${editingPetId}`, this.form)
      : this.apiService.post<ApiResponse<Pet>>('/pets', this.form);

    request.subscribe({
      next: (response) => {
        const savedPetId = editingPetId || response.data?.id;
        if (!selectedImage) {
          this.finishPetSave(isEditing);
          return;
        }
        if (!savedPetId) {
          this.finishPetSave(isEditing, 'files.uploadAfterSaveWarning');
          return;
        }

        this.apiService.uploadPetProfileImage<ApiResponse<FileAsset>>(savedPetId, selectedImage).subscribe({
          next: () => this.finishPetSave(isEditing),
          error: () => this.finishPetSave(isEditing, 'files.uploadAfterSaveWarning')
        });
      },
      error: () => {
        this.errorMessage = 'Unable to save pet.';
        this.isSaving = false;
      }
    });
  }

  editPet(pet: Pet): void {
    this.clearImageSelection();
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

  onPetImageFilesChange(files: File[]): void {
    const file = files[0] || null;
    if (this.editingPetId) {
      this.selectedPetImageFileForEdit = file;
    } else {
      this.selectedPetImageFileForCreate = file;
    }
  }

  removeProfileImage(): void {
    const pet = this.editingPet;
    if (!pet) {
      return;
    }

    this.removingImagePetId = pet.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.deletePetProfileImage<ApiResponse<unknown>>(pet.id).subscribe({
      next: () => {
        pet.profileImageUrl = null;
        this.successMessage = 'pets.profileImageRemoved';
        this.loadPets();
      },
      error: () => {
        this.errorMessage = 'files.deleteFailed';
        this.removingImagePetId = null;
      },
      complete: () => {
        this.removingImagePetId = null;
      }
    });
  }

  profileImageSource(pet: Pet): string | null {
    return this.apiService.resolvePublicUrl(pet.profileImageUrl);
  }

  resetForm(): void {
    this.editingPetId = null;
    this.form = { ...emptyPetForm };
    this.clearImageSelection();
  }

  private finishPetSave(isEditing: boolean, uploadErrorKey = ''): void {
    this.isSaving = false;
    this.resetForm();
    this.successMessage = isEditing ? 'Pet profile updated.' : 'Pet profile created.';
    this.loadPets();
    this.errorMessage = uploadErrorKey;
  }

  private clearImageSelection(): void {
    this.selectedPetImageFileForCreate = null;
    this.selectedPetImageFileForEdit = null;
    this.petImageUpload?.clearSelection();
  }
}
