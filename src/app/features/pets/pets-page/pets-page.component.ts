import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PET_GENDER_OPTIONS,
  Pet,
  PetBreed,
  PetDynamicFieldDefinition,
  PetPayload,
  PetSpecies,
  PetSubgroup,
  PetTaxonomy,
  PetTaxonomySpeciesDto,
  mapPetTaxonomySpecies
} from '../../../core/models/customer-core.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { AppFileUploadComponent } from '../../../shared/components/app-file-upload/app-file-upload.component';

const emptyPetForm = (): PetPayload => ({
  petName: '', species: '', breed: '', speciesId: null, subgroupId: null, breedId: null,
  approxAge: '', gender: '', dateOfBirth: '', weight: null, colour: '', microchipNumber: '',
  desexedStatus: '', reproductiveStatus: '', behaviourNotes: '', handlingNotes: '', temperament: '',
  socialCompatibility: '', medicalNotes: '', allergyNotes: '', medicationNotes: '', specialNeeds: '',
  livingEnvironment: '', equipmentNotes: '', feedingNotes: '', primaryVetName: '', primaryVetPhone: '',
  emergencyContactName: '', emergencyContactPhone: '', dynamicValues: {}
});

/**
 * Quick registration intentionally submits only the two required fields and
 * the optional taxonomy identifier. Medical/behavioral/contact fields are
 * collected later through profile editing, never transmitted as blank fields.
 */
export function toQuickPetPayload(form: PetPayload): { petName: string; species: string; speciesId?: string } {
  const payload: { petName: string; species: string; speciesId?: string } = {
    petName: form.petName.trim(),
    species: form.species.trim()
  };
  if (form.speciesId) payload.speciesId = form.speciesId;
  return payload;
}

/** A species must come from the active backend taxonomy, never from free text. */
export function isActiveSpeciesSelection(species: PetSpecies[], id: string | null | undefined): boolean {
  return !!id && species.some(item => item.isActive && item.id === id);
}

@Component({
  selector: 'app-pets-page',
  templateUrl: './pets-page.component.html',
  styleUrls: ['./pets-page.component.scss']
})
export class PetsPageComponent implements OnInit, OnDestroy {
  @ViewChild('petImageUpload') petImageUpload?: AppFileUploadComponent;
  readonly profileImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  readonly profileImageContentTypes = ['image/jpeg', 'image/png', 'image/webp'];
  readonly profileImageMaxSize = 5 * 1024 * 1024 - 1;
  selectedPetImage: File | null = null;
  uploadProgress = 0;
  isUploadingImage = false;
  photoUploadFailed = false;
  private photoUrls = new Map<string, string>();
  private photoRequests = new Map<string, Subscription>();
  readonly genderOptions = PET_GENDER_OPTIONS;
  readonly desexedOptions = ['Unknown', 'Not desexed', 'Desexed'];
  readonly reproductiveOptions = ['Unknown', 'Intact', 'Pregnant', 'Breeding', 'Not applicable'];
  pets: Pet[] = [];
  species: PetSpecies[] = [];
  dynamicFields: PetDynamicFieldDefinition[] = [];
  form: PetPayload = emptyPetForm();
  editingPetId: string | null = null;
  isLoading = false;
  isTaxonomyLoading = false;
  taxonomyLoadFailed = false;
  petsLoadFailed = false;
  isSaving = false;
  isAdditionalDetailsOpen = false;
  errorMessage = '';
  successMessage = '';
  isPetEditorOpen = false;

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {}

  ngOnDestroy(): void { this.clearPhotoUrls(); }

  ngOnInit(): void {
    this.loadTaxonomy();
    this.loadPets();
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('action') === 'add') window.setTimeout(() => this.openCreatePet());
    });
  }

  get editingPet(): Pet | null {
    return this.pets.find((pet) => pet.id === this.editingPetId) || null;
  }

  get editorTitleKey(): string {
    return this.editingPetId ? 'pets.editPet' : 'pets.addPet';
  }

  get editorDescriptionKey(): string {
    return this.editingPetId ? 'pets.editPetDescription' : 'pets.addPetDescription';
  }

  get speciesOptions(): AppInputOption[] {
    return this.species.filter((item) => item.isActive).map((item) => ({ label: item.name, value: item.id }));
  }

  get hasValidSpeciesSelection(): boolean {
    return isActiveSpeciesSelection(this.species, this.form.speciesId);
  }

  get selectedSpecies(): PetSpecies | null {
    return this.species.find((item) => item.id === this.form.speciesId) || null;
  }

  get subgroupOptions(): AppInputOption[] {
    return (this.selectedSpecies?.subgroups || [])
      .filter((item) => item.isActive)
      .map((item) => ({ label: item.name, value: item.id }));
  }

  get breedOptions(): AppInputOption[] {
    return (this.selectedSpecies?.breeds || [])
      .filter((item) => item.isActive && (!this.form.subgroupId || !item.subgroupId || item.subgroupId === this.form.subgroupId))
      .map((item) => ({ label: item.name, value: item.id }));
  }

  dynamicOptions(field: PetDynamicFieldDefinition): AppInputOption[] | string[] {
    if (field.dataType === 'boolean') {
      return [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }];
    }
    return field.options || [];
  }

  dynamicInputType(field: PetDynamicFieldDefinition): string {
    if (field.dataType === 'select' || field.dataType === 'boolean') return 'select';
    if (field.dataType === 'date') return 'date';
    if (field.dataType === 'text' && field.key.includes('notes')) return 'textarea';
    return 'text';
  }

  dynamicHelper(field: PetDynamicFieldDefinition): string {
    if (field.dataType === 'multiselect') return 'Enter one or more allowed values separated by commas.';
    return field.unit ? `Unit: ${field.unit}` : '';
  }

  loadTaxonomy(): void {
    this.isTaxonomyLoading = true;
    this.taxonomyLoadFailed = false;
    this.apiService.get<ApiResponse<PetTaxonomySpeciesDto[]>>('/v1/pets/taxonomy/species').subscribe({
      next: response => {
        this.isTaxonomyLoading = false;
        if (!response?.success || !Array.isArray(response.data) ||
            response.data.some(item => !item || typeof item.id !== 'string' || typeof item.name !== 'string')) {
          this.species = [];
          this.taxonomyLoadFailed = true;
          return;
        }
        this.species = mapPetTaxonomySpecies(response.data);
        this.taxonomyLoadFailed = this.species.length === 0;
        if (this.editingPetId && !this.form.speciesId && this.form.species) {
          const matched = this.species.find(item =>
            item.name.toLocaleLowerCase() === this.form.species.toLocaleLowerCase());
          if (matched) this.form.speciesId = matched.id;
        }
      },
      error: () => {
        this.species = [];
        this.taxonomyLoadFailed = true;
        this.isTaxonomyLoading = false;
      }
    });
  }

  loadPets(): void {
    this.isLoading = true;
    this.petsLoadFailed = false;
    this.apiService.get<ApiResponse<Pet[]>>('/v1/pets').subscribe({
      next: response => {
        this.isLoading = false;
        if (!response?.success || !Array.isArray(response.data)) {
          this.petsLoadFailed = true;
          this.pets = [];
          return;
        }
        this.pets = response.data;
        this.refreshPhotos();
      },
      error: () => {
        this.pets = [];
        this.petsLoadFailed = true;
        this.isLoading = false;
      }
    });
  }

  onSpeciesChange(speciesId: string | number | boolean | null, preserveValues = false): void {
    const id = typeof speciesId === 'string' && speciesId ? speciesId : null;
    this.form.speciesId = id;
    const selected = this.species.find((item) => item.id === id);
    this.form.species = selected?.name || '';
    this.form.subgroupId = null;
    this.form.breedId = null;
    this.form.breed = '';
    if (!preserveValues) this.form.dynamicValues = {};
    this.dynamicFields = [];
    // The standalone Pets public API exposes species only. There is no reviewed
    // subgroup/breed/dynamic-schema read endpoint to call with a Users JWT.
  }

  onSubgroupChange(subgroupId: string | number | boolean | null): void {
    this.form.subgroupId = typeof subgroupId === 'string' && subgroupId ? subgroupId : null;
    const breed = this.selectedSpecies?.breeds.find((item) => item.id === this.form.breedId);
    if (breed?.subgroupId && breed.subgroupId !== this.form.subgroupId) {
      this.form.breedId = null;
      this.form.breed = '';
    }
  }

  onBreedChange(breedId: string | number | boolean | null): void {
    this.form.breedId = typeof breedId === 'string' && breedId ? breedId : null;
    const breed = this.selectedSpecies?.breeds.find((item) => item.id === this.form.breedId);
    this.form.breed = breed?.name || '';
  }

  savePet(): void {
    if (!this.form.petName.trim()) {
      this.errorMessage = 'pets.identityRequired';
      return;
    }
    if (!this.hasValidSpeciesSelection) {
      this.errorMessage = 'pets.speciesRequired';
      return;
    }
    const editingPetId = this.editingPetId;
    const isEditing = !!editingPetId;
    this.isSaving = true;
    this.uploadProgress = 0;
    this.isUploadingImage = false;
    this.photoUploadFailed = false;
    this.errorMessage = '';
    this.successMessage = '';
    const imageFile = this.selectedPetImage;
    const request = editingPetId
      ? this.apiService.put<ApiResponse<Pet>>(`/v1/pets/${editingPetId}`, this.form)
      : this.apiService.post<ApiResponse<Pet>>('/v1/pets', toQuickPetPayload(this.form));

    request.subscribe({
      next: response => {
        if (!response?.success || !response.data?.id) {
          this.errorMessage = response?.message || 'Unable to save pet.';
          this.isSaving = false;
          return;
        }
        if (imageFile) {
          this.uploadPhoto(response.data.id, imageFile, isEditing);
        } else {
          this.finishPetSave(isEditing);
        }
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage = error.error?.errors?.[0] || error.error?.message || 'Unable to save pet.';
        this.isSaving = false;
      }
    });
  }

  openCreatePet(): void {
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.clearPhotoSelection();
    this.isPetEditorOpen = true;
  }

  toggleAdditionalDetails(): void {
    if (this.editingPetId) this.isAdditionalDetailsOpen = !this.isAdditionalDetailsOpen;
  }

  editPet(pet: Pet): void {
    this.clearPhotoSelection();
    this.isAdditionalDetailsOpen = false;
    this.editingPetId = pet.id;
    const matchedSpeciesId = pet.speciesId || this.species.find((item) => item.name.toLowerCase() === pet.species.toLowerCase())?.id || null;
    this.form = {
      petName: pet.petName, species: pet.species || '', breed: pet.breed || '', speciesId: matchedSpeciesId,
      subgroupId: pet.subgroupId || null, breedId: pet.breedId || null, gender: pet.gender || '',
      dateOfBirth: this.toDateInput(pet.dateOfBirth), approxAge: pet.approxAge || '', weight: pet.weight ?? null,
      colour: pet.colour || '', microchipNumber: pet.microchipNumber || '', desexedStatus: pet.desexedStatus || '',
      reproductiveStatus: pet.reproductiveStatus || '', behaviourNotes: pet.behaviourNotes || '', handlingNotes: pet.handlingNotes || '',
      temperament: pet.temperament || '', socialCompatibility: pet.socialCompatibility || '', medicalNotes: pet.medicalNotes || '',
      allergyNotes: pet.allergyNotes || '', medicationNotes: pet.medicationNotes || '', specialNeeds: pet.specialNeeds || '',
      livingEnvironment: pet.livingEnvironment || '', equipmentNotes: pet.equipmentNotes || '', feedingNotes: pet.feedingNotes || '',
      primaryVetName: pet.primaryVetName || '', primaryVetPhone: pet.primaryVetPhone || '',
      emergencyContactName: pet.emergencyContactName || '', emergencyContactPhone: pet.emergencyContactPhone || '',
      dynamicValues: { ...(pet.dynamicValues || {}) }
    };
    this.dynamicFields = [];
    // Preserve existing dynamic values on update. The new public Pets API does
    // not expose the legacy species-specific schema required to edit them.
    this.errorMessage = '';
    this.isPetEditorOpen = true;
  }

  closePetEditor(): void {
    if (this.isSaving) return;
    this.isPetEditorOpen = false;
    this.resetForm();
  }

  deletePet(pet: Pet): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/v1/pets/${pet.id}`).subscribe({
      next: response => {
        if (!response?.success) { this.errorMessage = response?.message || 'Unable to delete pet.'; return; }
        this.successMessage = 'Pet profile deleted.';
        this.loadPets();
      },
      error: () => { this.errorMessage = 'Unable to delete pet.'; }
    });
  }

  profileImageSource(pet: Pet): string | null {
    return this.photoUrls.get(pet.id) || null;
  }

  onPetImageFilesChange(files: File[]): void {
    this.selectedPetImage = files[0] || null;
    this.photoUploadFailed = false;
    this.uploadProgress = 0;
  }

  removeProfileImage(): void {
    const petId = this.editingPetId;
    if (!petId || this.isSaving) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.apiService.deletePetProfileImage<ApiResponse<unknown>>(petId).subscribe({
      next: response => {
        this.isSaving = false;
        if (!response?.success) { this.errorMessage = response?.message || 'pets.imageRemoveFailed'; return; }
        this.successMessage = 'pets.imageRemoved';
        this.revokePhoto(petId);
        this.loadPets();
      },
      error: () => { this.isSaving = false; this.errorMessage = 'pets.imageRemoveFailed'; }
    });
  }

  private uploadPhoto(petId: string, file: File, isEditing: boolean): void {
    this.isUploadingImage = true;
    this.uploadProgress = 0;
    this.apiService.uploadPetProfileImage<ApiResponse<{ profileImageUrl: string }>>(
      petId, file, percent => this.uploadProgress = percent
    ).subscribe({
      next: response => {
        this.isUploadingImage = false;
        this.isSaving = false;
        if (!response?.success) {
          this.photoUploadFailed = true;
          this.errorMessage = response?.message || 'pets.imageUploadFailed';
          this.successMessage = isEditing ? 'Pet profile updated.' : 'pets.quickCreateSuccess';
          this.editingPetId = petId;
          this.loadPets();
          return;
        }
        this.uploadProgress = 100;
        this.revokePhoto(petId);
        this.finishPetSave(isEditing);
      },
      error: () => {
        this.isUploadingImage = false;
        this.isSaving = false;
        this.photoUploadFailed = true;
        this.editingPetId = petId;
        this.errorMessage = 'pets.imageUploadFailed';
        this.successMessage = isEditing ? 'Pet profile updated.' : 'pets.quickCreateSuccess';
        this.loadPets();
      }
    });
  }

  private refreshPhotos(): void {
    const ids = new Set(this.pets.filter(pet => !!pet.profileImageUrl).map(pet => pet.id));
    for (const id of Array.from(this.photoUrls.keys())) {
      if (!ids.has(id)) this.revokePhoto(id);
    }
    for (const id of Array.from(this.photoRequests.keys())) {
      if (!ids.has(id)) { this.photoRequests.get(id)?.unsubscribe(); this.photoRequests.delete(id); }
    }
    for (const pet of this.pets) {
      if (!pet.profileImageUrl || this.photoUrls.has(pet.id) || this.photoRequests.has(pet.id)) continue;
      const sub = this.apiService.getPetProfileImage(pet.id).subscribe({
        next: blob => {
          this.revokePhoto(pet.id);
          this.photoUrls.set(pet.id, URL.createObjectURL(blob));
          this.photoRequests.delete(pet.id);
        },
        error: () => this.photoRequests.delete(pet.id)
      });
      if (!sub.closed) this.photoRequests.set(pet.id, sub);
    }
  }

  private revokePhoto(id: string): void {
    const url = this.photoUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.photoUrls.delete(id);
  }

  private clearPhotoUrls(): void {
    for (const sub of this.photoRequests.values()) sub.unsubscribe();
    this.photoRequests.clear();
    for (const id of Array.from(this.photoUrls.keys())) this.revokePhoto(id);
  }

  private clearPhotoSelection(): void {
    this.selectedPetImage = null;
    this.uploadProgress = 0;
    this.photoUploadFailed = false;
    this.petImageUpload?.clearSelection();
  }

  resetForm(): void {
    this.editingPetId = null;
    this.form = emptyPetForm();
    this.dynamicFields = [];
    this.isAdditionalDetailsOpen = false;
    this.clearPhotoSelection();
  }

  private finishPetSave(isEditing: boolean): void {
    this.isSaving = false;
    this.isPetEditorOpen = false;
    this.resetForm();
    this.successMessage = isEditing ? 'Pet profile updated.' : 'pets.quickCreateSuccess';
    this.loadPets();
    this.errorMessage = '';
  }

  private toDateInput(value?: string | null): string {
    return value ? value.substring(0, 10) : '';
  }
}
