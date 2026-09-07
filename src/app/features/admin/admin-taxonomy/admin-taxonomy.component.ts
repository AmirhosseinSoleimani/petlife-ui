import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  PetBreed,
  PetDynamicFieldDefinition,
  PetSpecies,
  PetSubgroup,
  PetTaxonomy
} from '../../../core/models/customer-core.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

type TaxonomySection = 'species' | 'subgroups' | 'breeds' | 'fields';
type TaxonomyEntity = 'species' | 'subgroup' | 'breed' | 'field';

interface TaxonomyTab {
  value: TaxonomySection;
  label: string;
}

interface SpeciesForm {
  id?: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface SubgroupForm {
  id?: string;
  speciesId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface BreedForm {
  id?: string;
  speciesId: string;
  subgroupId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface FieldForm {
  id?: string;
  speciesId: string;
  key: string;
  label: string;
  dataType: string;
  isRequired: boolean;
  optionsText: string;
  unit: string;
  placeholder: string;
  sortOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-admin-taxonomy',
  templateUrl: './admin-taxonomy.component.html',
  styleUrls: ['./admin-taxonomy.component.scss']
})
export class AdminTaxonomyComponent implements OnInit {
  readonly tabs: readonly TaxonomyTab[] = [
    { value: 'species', label: 'Species' },
    { value: 'subgroups', label: 'Subgroups' },
    { value: 'breeds', label: 'Breeds / Morphs' },
    { value: 'fields', label: 'Dynamic fields' }
  ];
  readonly dataTypes = ['text', 'number', 'boolean', 'date', 'select', 'multiselect'];

  species: PetSpecies[] = [];
  fields: PetDynamicFieldDefinition[] = [];
  section: TaxonomySection = 'species';
  speciesForm: SpeciesForm = this.emptySpecies();
  subgroupForm: SubgroupForm = this.emptySubgroup();
  breedForm: BreedForm = this.emptyBreed();
  fieldForm: FieldForm = this.emptyField();
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly i18nService: I18nService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get speciesOptions(): AppInputOption[] {
    return this.species.map((species) => ({ label: species.name, value: species.id }));
  }

  get subgroupOptionsForBreed(): AppInputOption[] {
    const species = this.species.find((item) => item.id === this.breedForm.speciesId);
    return (species?.subgroups || []).map((subgroup) => ({ label: subgroup.name, value: subgroup.id }));
  }

  get allSubgroups(): PetSubgroup[] {
    return this.species.reduce(
      (items: PetSubgroup[], species) => items.concat(species.subgroups || []),
      []
    );
  }

  get allBreeds(): PetBreed[] {
    return this.species.reduce(
      (items: PetBreed[], species) => items.concat(species.breeds || []),
      []
    );
  }

  speciesName(id: string): string {
    return this.species.find((species) => species.id === id)?.name || id;
  }

  subgroupName(id?: string | null): string {
    return this.allSubgroups.find((subgroup) => subgroup.id === id)?.name || '—';
  }

  selectSection(section: TaxonomySection): void {
    this.section = section;
    this.reset();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.get<ApiResponse<PetTaxonomy>>('/admin/pet-taxonomy').subscribe({
      next: (response) => {
        this.species = response.data?.species || [];
        if (!this.species.length) {
          this.fields = [];
          this.isLoading = false;
          return;
        }

        const requests = this.species.map((species) =>
          this.apiService
            .get<ApiResponse<PetDynamicFieldDefinition[]>>(
              `/admin/pet-taxonomy/species/${species.id}/schema`
            )
            .pipe(
              catchError(() =>
                of({ success: false, data: [] } as ApiResponse<PetDynamicFieldDefinition[]>)
              )
            )
        );

        forkJoin(requests).subscribe({
          next: (results) => {
            this.fields = results.reduce(
              (all: PetDynamicFieldDefinition[], item) => all.concat(item.data || []),
              []
            );
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Unable to load taxonomy.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.errorMessage = 'Unable to load taxonomy.';
        this.isLoading = false;
      }
    });
  }

  saveSpecies(): void {
    const form = this.speciesForm;
    this.save(
      form.id ? `/admin/pet-taxonomy/species/${form.id}` : '/admin/pet-taxonomy/species',
      form.id ? 'put' : 'post',
      {
        code: form.code,
        name: form.name,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive
      },
      () => (this.speciesForm = this.emptySpecies())
    );
  }

  saveSubgroup(): void {
    const form = this.subgroupForm;
    this.save(
      form.id ? `/admin/pet-taxonomy/subgroups/${form.id}` : '/admin/pet-taxonomy/subgroups',
      form.id ? 'put' : 'post',
      {
        speciesId: form.speciesId,
        code: form.code,
        name: form.name,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive
      },
      () => (this.subgroupForm = this.emptySubgroup())
    );
  }

  saveBreed(): void {
    const form = this.breedForm;
    this.save(
      form.id ? `/admin/pet-taxonomy/breeds/${form.id}` : '/admin/pet-taxonomy/breeds',
      form.id ? 'put' : 'post',
      {
        speciesId: form.speciesId,
        subgroupId: form.subgroupId || null,
        code: form.code,
        name: form.name,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive
      },
      () => (this.breedForm = this.emptyBreed())
    );
  }

  saveField(): void {
    const form = this.fieldForm;
    const options = form.optionsText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    this.save(
      form.id ? `/admin/pet-taxonomy/fields/${form.id}` : '/admin/pet-taxonomy/fields',
      form.id ? 'put' : 'post',
      {
        speciesId: form.speciesId,
        key: form.key,
        label: form.label,
        dataType: form.dataType,
        isRequired: form.isRequired,
        options,
        unit: form.unit || null,
        placeholder: form.placeholder || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive
      },
      () => (this.fieldForm = this.emptyField())
    );
  }

  editSpecies(species: PetSpecies): void {
    this.section = 'species';
    this.speciesForm = {
      id: species.id,
      code: species.code,
      name: species.name,
      sortOrder: species.sortOrder,
      isActive: species.isActive
    };
  }

  editSubgroup(subgroup: PetSubgroup): void {
    this.section = 'subgroups';
    this.subgroupForm = {
      id: subgroup.id,
      speciesId: subgroup.speciesId,
      code: subgroup.code,
      name: subgroup.name,
      sortOrder: subgroup.sortOrder,
      isActive: subgroup.isActive
    };
  }

  editBreed(breed: PetBreed): void {
    this.section = 'breeds';
    this.breedForm = {
      id: breed.id,
      speciesId: breed.speciesId,
      subgroupId: breed.subgroupId || '',
      code: breed.code,
      name: breed.name,
      sortOrder: breed.sortOrder,
      isActive: breed.isActive
    };
  }

  editField(field: PetDynamicFieldDefinition): void {
    this.section = 'fields';
    this.fieldForm = {
      id: field.id,
      speciesId: field.speciesId,
      key: field.key,
      label: field.label,
      dataType: field.dataType,
      isRequired: field.isRequired,
      optionsText: (field.options || []).join(', '),
      unit: field.unit || '',
      placeholder: field.placeholder || '',
      sortOrder: field.sortOrder,
      isActive: field.isActive
    };
  }

  remove(entityType: TaxonomyEntity, id: string): void {
    const confirmed = window.confirm(
      this.i18nService.translate(
        'Delete this taxonomy item? Existing references are protected by the backend.'
      )
    );
    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/admin/pet-taxonomy/${entityType}/${id}`).subscribe({
      next: () => {
        this.successMessage = 'Taxonomy item deleted.';
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage = error.error?.message || 'Unable to delete taxonomy item.';
      }
    });
  }

  reset(): void {
    this.speciesForm = this.emptySpecies();
    this.subgroupForm = this.emptySubgroup();
    this.breedForm = this.emptyBreed();
    this.fieldForm = this.emptyField();
  }

  private save(
    endpoint: string,
    method: 'post' | 'put',
    body: unknown,
    reset: () => void
  ): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = method === 'post'
      ? this.apiService.post<ApiResponse<unknown>>(endpoint, body)
      : this.apiService.put<ApiResponse<unknown>>(endpoint, body);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.successMessage = 'Taxonomy item saved.';
        reset();
        this.load();
      },
      error: (error: { error?: { message?: string; errors?: string[] } }) => {
        this.errorMessage =
          error.error?.errors?.[0] ||
          error.error?.message ||
          'Unable to save taxonomy item.';
        this.isSaving = false;
      }
    });
  }

  private emptySpecies(): SpeciesForm {
    return { code: '', name: '', sortOrder: 0, isActive: true };
  }

  private emptySubgroup(): SubgroupForm {
    return { speciesId: '', code: '', name: '', sortOrder: 0, isActive: true };
  }

  private emptyBreed(): BreedForm {
    return { speciesId: '', subgroupId: '', code: '', name: '', sortOrder: 0, isActive: true };
  }

  private emptyField(): FieldForm {
    return {
      speciesId: '',
      key: '',
      label: '',
      dataType: 'text',
      isRequired: false,
      optionsText: '',
      unit: '',
      placeholder: '',
      sortOrder: 0,
      isActive: true
    };
  }
}
