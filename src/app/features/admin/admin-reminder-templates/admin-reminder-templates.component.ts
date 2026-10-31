import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PetTaxonomy, PetTaxonomySpeciesDto, mapPetTaxonomySpecies } from '../../../core/models/customer-core.models';
import { RECURRENCE_TYPES, ReminderTemplate, ReminderTemplatePayload } from '../../../core/models/phase1-care.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

@Component({ selector: 'app-admin-reminder-templates', templateUrl: './admin-reminder-templates.component.html', styleUrls: ['./admin-reminder-templates.component.scss'] })
export class AdminReminderTemplatesComponent implements OnInit {
  readonly recurrenceTypes = RECURRENCE_TYPES;
  readonly reminderTypes = ['Vaccination', 'Medication', 'Checkup', 'ParasiteControl', 'Grooming', 'Environment', 'Feeding', 'Purchase', 'Appointment', 'Other'];
  templates: ReminderTemplate[] = [];
  taxonomy: PetTaxonomy = { species: [] };
  form = this.emptyForm();
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService, private readonly i18nService: I18nService, private readonly dialogService: AppDialogService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.apiService.get<ApiResponse<ReminderTemplate[]>>('/v1/reminders/admin/templates').subscribe({ next: r => { if (!r?.success || !Array.isArray(r.data)) { this.errorMessage = 'reminderTemplates.loadError'; this.isLoading = false; return; } this.templates = r.data; this.isLoading = false; }, error: () => { this.errorMessage = 'reminderTemplates.loadError'; this.isLoading = false; } });
    this.apiService.get<ApiResponse<PetTaxonomySpeciesDto[]>>('/v1/admin/pets/species').subscribe({ next: r => this.taxonomy = { species: mapPetTaxonomySpecies(r.data || []) }, error: () => this.taxonomy = { species: [] } });
  }

  toggleSpecies(id: string, checked: boolean): void {
    const set = new Set(this.form.speciesIds);
    checked ? set.add(id) : set.delete(id);
    this.form.speciesIds = Array.from(set);
  }
  hasSpecies(id: string): boolean { return this.form.speciesIds.includes(id); }

  save(): void {
    this.isSaving = true; this.errorMessage = ''; this.successMessage = '';
    const payload: ReminderTemplatePayload = { ...this.form, defaultRecurrenceInterval: Number(this.form.defaultRecurrenceInterval) || 1, suggestedOffsetDays: this.form.suggestedOffsetDays === null || this.form.suggestedOffsetDays === undefined ? null : Number(this.form.suggestedOffsetDays) };
    const request = this.editingId ? this.apiService.put<ApiResponse<ReminderTemplate>>(`/v1/reminders/admin/templates/${this.editingId}`, payload) : this.apiService.post<ApiResponse<ReminderTemplate>>('/v1/reminders/admin/templates', payload);
    request.subscribe({ next: response => { if (!response?.success) { this.errorMessage = 'reminderTemplates.saveError'; this.isSaving = false; return; } this.successMessage = this.editingId ? 'reminderTemplates.updated' : 'reminderTemplates.created'; this.reset(); this.load(); }, error: () => { this.errorMessage = 'reminderTemplates.saveError'; this.isSaving = false; } });
  }

  edit(item: ReminderTemplate): void {
    this.editingId = item.id;
    this.form = { code: item.code, name: item.name, reminderType: item.reminderType, description: item.description || '', defaultTitle: item.defaultTitle, defaultDescription: item.defaultDescription || '', defaultRecurrenceType: item.defaultRecurrenceType, defaultRecurrenceInterval: item.defaultRecurrenceInterval, suggestedOffsetDays: item.suggestedOffsetDays ?? null, isActive: item.isActive, speciesIds: [...item.speciesIds] };
  }

  remove(item: ReminderTemplate): void {
    this.dialogService.confirm({ title: 'Delete reminder template?', message: 'reminderTemplates.deleteConfirm', confirmLabel: 'Delete template', tone: 'danger' }).then((confirmed) => {
      if (!confirmed) return;
      this.apiService.delete<ApiResponse<unknown>>(`/v1/reminders/admin/templates/${item.id}`).subscribe({ next: response => { if (!response?.success) { this.errorMessage = 'reminderTemplates.deleteError'; return; } this.successMessage = 'reminderTemplates.deleted'; this.load(); }, error: () => this.errorMessage = 'reminderTemplates.deleteError' });
    });
  }

  reset(): void { this.editingId = null; this.form = this.emptyForm(); this.isSaving = false; }
  speciesNames(ids: string[]): string { return ids.length ? this.taxonomy.species.filter(s => ids.includes(s.id)).map(s => s.name).join(', ') : this.i18nService.translate('common.allSpecies'); }

  private emptyForm(): ReminderTemplatePayload { return { code: '', name: '', reminderType: 'Other', description: '', defaultTitle: '', defaultDescription: '', defaultRecurrenceType: 'None', defaultRecurrenceInterval: 1, suggestedOffsetDays: null, isActive: true, speciesIds: [] }; }
}
