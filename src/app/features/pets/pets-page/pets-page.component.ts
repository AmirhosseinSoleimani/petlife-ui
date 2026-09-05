import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  FileAsset,
  PET_GENDER_OPTIONS,
  Pet,
  PetBreed,
  PetDynamicFieldDefinition,
  PetPayload,
  PetSpecies,
  PetSubgroup,
  PetTaxonomy
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

@Component({
  selector: 'app-pets-page',
  templateUrl: './pets-page.component.html',
  styleUrls: ['./pets-page.component.scss']
})
export class PetsPageComponent implements OnInit {
  @ViewChild('petImageUpload') petImageUpload?: AppFileUploadComponent;

  readonly genderOptions = PET_GENDER_OPTIONS;
  readonly desexedOptions = ['Unknown', 'Not desexed', 'Desexed'];
  readonly reproductiveOptions = ['Unknown', 'Intact', 'Pregnant', 'Breeding', 'Not applicable'];
  readonly profileImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  readonly profileImageContentTypes = ['image/jpeg', 'image/png', 'image/webp'];
  readonly profileImageMaxSize = 5 * 1024 * 1024;

  pets: Pet[] = [];
  species: PetSpecies[] = [];
  dynamicFields: PetDynamicFieldDefinition[] = [];
  form: PetPayload = emptyPetForm();
  editingPetId: string | null = null;
  isLoading = false;
  isTaxonomyLoading = false;
  petsLoadFailed = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  removingImagePetId: string | null = null;
  selectedPetImageFileForCreate: File | null = null;
  selectedPetImageFileForEdit: File | null = null;
  isPetEditorOpen = false;

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute) {}

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
    this.apiService.get<ApiResponse<PetTaxonomy>>('/pet-taxonomy').subscribe({
      next: (response) => {
        this.species = (response.data?.species || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
        this.isTaxonomyLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load pet taxonomy.';
        this.isTaxonomyLoading = false;
      }
    });
  }

  loadPets(): void {
    this.isLoading = true;
    this.petsLoadFailed = false;
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.petsLoadFailed = true;
        this.errorMessage = 'Unable to load pets.';
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
    if (id) this.loadSchema(id, preserveValues);
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
    if (!this.form.speciesId) {
      this.errorMessage = 'Please select a species.';
      return;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const editingPetId = this.editingPetId;
    const isEditing = !!editingPetId;
    const selectedImage = isEditing ? this.selectedPetImageFileForEdit : this.selectedPetImageFileForCreate;
    const request = editingPetId
      ? this.apiService.put<ApiResponse<Pet>>(`/pets/${editingPetId}`, this.form)
      : this.apiService.post<ApiResponse<Pet>>('/pets', this.form);

    request.subscribe({
      next: (response) => {
        const savedPetId = editingPetId || response.data?.id;
        if (!selectedImage || !savedPetId) {
          this.finishPetSave(isEditing, selectedImage && !savedPetId ? 'files.uploadAfterSaveWarning' : '');
          return;
        }
        this.apiService.uploadPetProfileImage<ApiResponse<FileAsset>>(savedPetId, selectedImage).subscribe({
          next: () => this.finishPetSave(isEditing),
          error: () => this.finishPetSave(isEditing, 'files.uploadAfterSaveWarning')
        });
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
    this.isPetEditorOpen = true;
  }

  editPet(pet: Pet): void {
    this.clearImageSelection();
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
    if (matchedSpeciesId) this.loadSchema(matchedSpeciesId, true);
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
    this.apiService.delete<ApiResponse<unknown>>(`/pets/${pet.id}`).subscribe({
      next: () => { this.successMessage = 'Pet profile deleted.'; this.loadPets(); },
      error: () => { this.errorMessage = 'Unable to delete pet.'; }
    });
  }

  onPetImageFilesChange(files: File[]): void {
    const file = files[0] || null;
    if (this.editingPetId) this.selectedPetImageFileForEdit = file;
    else this.selectedPetImageFileForCreate = file;
  }

  removeProfileImage(): void {
    const pet = this.editingPet;
    if (!pet) return;
    this.removingImagePetId = pet.id;
    this.apiService.deletePetProfileImage<ApiResponse<unknown>>(pet.id).subscribe({
      next: () => { pet.profileImageUrl = null; this.successMessage = 'pets.profileImageRemoved'; this.loadPets(); },
      error: () => { this.errorMessage = 'files.deleteFailed'; },
      complete: () => { this.removingImagePetId = null; }
    });
  }

  profileImageSource(pet: Pet): string | null {
    return this.apiService.resolvePublicUrl(pet.profileImageUrl);
  }

  resetForm(): void {
    this.editingPetId = null;
    this.form = emptyPetForm();
    this.dynamicFields = [];
    this.clearImageSelection();
  }

  private loadSchema(speciesId: string, preserveValues: boolean): void {
    this.apiService.get<ApiResponse<PetDynamicFieldDefinition[]>>(`/pet-taxonomy/species/${speciesId}/schema`).subscribe({
      next: (response) => {
        this.dynamicFields = (response.data || []).filter((field) => field.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
        if (!preserveValues) this.form.dynamicValues = {};
      },
      error: () => { this.errorMessage = 'Unable to load species-specific fields.'; }
    });
  }

  private finishPetSave(isEditing: boolean, uploadErrorKey = ''): void {
    this.isSaving = false;
    this.isPetEditorOpen = false;
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

  private toDateInput(value?: string | null): string {
    return value ? value.substring(0, 10) : '';
  }
}
