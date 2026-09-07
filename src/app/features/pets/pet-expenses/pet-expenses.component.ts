import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Expense, ExpensePayload, Pet } from '../../../core/models/customer-core.models';
import { ExpenseCategory, ExpenseReport } from '../../../core/models/phase1-care.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

interface AllocationRow { petId: string; petName: string; selected: boolean; amount: number | null; }

const emptyForm: ExpensePayload = {
  category: '', categoryId: null, amount: null, expenseDate: '', currency: 'AUD', vendorName: '', description: '', paymentMethod: '', isRecurring: false, allocations: []
};

@Component({
  selector: 'app-pet-expenses',
  templateUrl: './pet-expenses.component.html',
  styleUrls: ['./pet-expenses.component.scss']
})
export class PetExpensesComponent implements OnInit {
  petId = '';
  pets: Pet[] = [];
  expenses: Expense[] = [];
  categories: ExpenseCategory[] = [];
  report: ExpenseReport | null = null;
  form: ExpensePayload = { ...emptyForm };
  allocations: AllocationRow[] = [];
  sharedExpense = false;
  editingId: string | null = null;
  selectedReceipt: File | null = null;
  reportPeriod = 'monthly';
  reportYear = new Date().getFullYear();
  reportMonth = new Date().getMonth() + 1;
  isLoading = false;
  isSaving = false;
  isReportLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute, private readonly i18nService: I18nService, private readonly dialogService: AppDialogService) {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
  }

  get categoryOptions(): AppInputOption[] { return this.categories.map(category => ({ label: category.name, value: category.id })); }
  get monthOptions(): AppInputOption[] { return Array.from({ length: 12 }, (_, index) => ({ label: new Date(2000, index, 1).toLocaleString(undefined, { month: 'long' }), value: index + 1 })); }
  get yearOptions(): AppInputOption[] { const current = new Date().getFullYear(); return Array.from({ length: 7 }, (_, index) => ({ label: String(current - index), value: current - index })); }
  get selectedAllocationTotal(): number { return this.allocations.filter(item => item.selected).reduce((sum, item) => sum + Number(item.amount || 0), 0); }

  ngOnInit(): void { this.loadPets(); this.loadPage(); this.loadReport(); }

  loadPets(): void {
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: response => {
        this.pets = response.data || [];
        this.resetAllocations();
        const current = this.pets.find(pet => pet.id === this.petId);
        this.loadCategories(current?.speciesId || null);
      },
      error: () => this.loadCategories(null)
    });
  }

  loadCategories(speciesId: string | null): void {
    const query = speciesId ? `?speciesId=${speciesId}` : '';
    this.apiService.get<ApiResponse<ExpenseCategory[]>>(`/expense-categories${query}`).subscribe({
      next: response => this.categories = response.data || [],
      error: () => { this.categories = []; }
    });
  }

  loadPage(): void {
    this.isLoading = true; this.errorMessage = '';
    this.apiService.get<ApiResponse<Expense[]>>(`/pets/${this.petId}/expenses`).subscribe({
      next: response => { this.expenses = response.data || []; this.isLoading = false; },
      error: () => { this.errorMessage = 'expenses.loadError'; this.isLoading = false; }
    });
  }

  loadReport(): void {
    this.isReportLoading = true;
    const month = this.reportPeriod === 'monthly' ? `&month=${this.reportMonth}` : '';
    this.apiService.get<ApiResponse<ExpenseReport>>(`/expenses/reports?period=${this.reportPeriod}&year=${this.reportYear}${month}&petId=${this.petId}`).subscribe({
      next: response => { this.report = response.data; this.isReportLoading = false; },
      error: () => { this.report = null; this.isReportLoading = false; }
    });
  }

  onCategoryChange(categoryId: string | null): void {
    this.form.categoryId = categoryId;
    this.form.category = this.categories.find(item => item.id === categoryId)?.name || '';
  }

  onSharedChange(value: boolean): void {
    this.sharedExpense = value;
    if (!value) this.resetAllocations();
  }

  onReceiptFiles(files: File[]): void { this.selectedReceipt = files[0] || null; }

  allocationAmountAria(petName: string): string {
    return `${petName} · ${this.i18nService.translate('expenses.allocationAmount')}`;
  }

  saveExpense(): void {
    this.errorMessage = ''; this.successMessage = '';
    if (!this.form.amount || this.form.amount <= 0) { this.errorMessage = 'expenses.amountInvalid'; return; }
    if (!this.form.category.trim()) { this.errorMessage = 'expenses.categoryRequired'; return; }
    const allocations = this.sharedExpense
      ? this.allocations.filter(item => item.selected).map(item => ({ petId: item.petId, amount: Number(item.amount || 0) }))
      : [{ petId: this.petId, amount: Number(this.form.amount) }];
    if (!allocations.length || allocations.some(item => item.amount <= 0) || Math.abs(allocations.reduce((sum, item) => sum + item.amount, 0) - Number(this.form.amount)) > 0.009) {
      this.errorMessage = 'expenses.allocationMismatch'; return;
    }

    this.isSaving = true;
    const wasEditing = !!this.editingId;
    const payload: ExpensePayload = { ...this.form, allocations, categoryId: this.form.categoryId || null };
    const request = this.editingId
      ? this.apiService.put<ApiResponse<Expense>>(`/expenses/${this.editingId}`, payload)
      : this.apiService.post<ApiResponse<Expense>>(`/pets/${this.petId}/expenses`, payload);
    request.subscribe({
      next: response => {
        const expense = response.data;
        if (expense && this.selectedReceipt) {
          if (!this.editingId) this.editingId = expense.id;
          this.apiService.uploadExpenseReceipt<ApiResponse<unknown>>(expense.id, this.selectedReceipt).subscribe({
            next: () => this.finishSave(wasEditing),
            error: () => { this.errorMessage = 'expenses.receiptUploadError'; this.isSaving = false; this.loadPage(); }
          });
        } else {
          this.finishSave(wasEditing);
        }
      },
      error: () => { this.errorMessage = 'expenses.saveError'; this.isSaving = false; }
    });
  }

  editExpense(expense: Expense): void {
    this.editingId = expense.id;
    this.selectedReceipt = null;
    this.form = {
      category: expense.category || '', categoryId: expense.categoryId || null, amount: expense.amount,
      expenseDate: expense.expenseDate ? expense.expenseDate.substring(0, 10) : '', currency: expense.currency || 'AUD',
      vendorName: expense.vendorName || '', description: expense.description || '', paymentMethod: expense.paymentMethod || '',
      isRecurring: !!expense.isRecurring, allocations: []
    };
    const existing = expense.allocations || [];
    this.sharedExpense = existing.length > 1;
    this.allocations = this.pets.map(pet => {
      const allocation = existing.find(item => item.petId === pet.id);
      return { petId: pet.id, petName: pet.petName, selected: !!allocation, amount: allocation?.amount ?? null };
    });
    if (!existing.length) this.resetAllocations();
  }

  deleteExpense(expense: Expense): void {
    this.dialogService.confirm({ title: 'Delete expense?', message: 'expenses.deleteConfirm', confirmLabel: 'Delete expense', tone: 'danger' }).then((confirmed) => {
      if (!confirmed) return;
      this.apiService.delete<ApiResponse<unknown>>(`/expenses/${expense.id}`).subscribe({
        next: () => { this.successMessage = 'expenses.deleteSuccess'; this.loadPage(); this.loadReport(); },
        error: () => this.errorMessage = 'expenses.deleteError'
      });
    });
  }

  downloadReceipt(expense: Expense): void {
    this.apiService.downloadExpenseReceipt(expense.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = expense.receiptFileName || 'receipt'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      error: () => this.errorMessage = 'expenses.receiptDownloadError'
    });
  }

  deleteReceipt(expense: Expense): void {
    this.dialogService.confirm({ title: 'Delete receipt?', message: 'expenses.receiptDeleteConfirm', confirmLabel: 'Delete receipt', tone: 'danger' }).then((confirmed) => {
      if (!confirmed) return;
      this.apiService.deleteExpenseReceipt<ApiResponse<unknown>>(expense.id).subscribe({
        next: () => { this.successMessage = 'expenses.receiptDeleted'; this.loadPage(); },
        error: () => this.errorMessage = 'expenses.receiptDeleteError'
      });
    });
  }

  resetForm(): void {
    this.editingId = null; this.form = { ...emptyForm }; this.selectedReceipt = null; this.sharedExpense = false; this.resetAllocations();
  }

  private resetAllocations(): void {
    this.allocations = this.pets.map(pet => ({ petId: pet.id, petName: pet.petName, selected: pet.id === this.petId, amount: pet.id === this.petId ? this.form.amount : null }));
  }

  private finishSave(wasEditing: boolean): void {
    this.resetForm();
    this.successMessage = wasEditing ? 'expenses.updateSuccess' : 'expenses.createSuccess';
    this.isSaving = false;
    this.loadPage(); this.loadReport();
  }
}
