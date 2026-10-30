import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Expense, ExpensePayload, Pet } from '../../../core/models/customer-core.models';
import { ExpenseBreakdown, ExpenseCategory, ExpenseReport } from '../../../core/models/phase1-care.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

interface AllocationRow { petId: string; petName: string; selected: boolean; amount: number | null; }

export interface ExpenseChartRow {
  key: string;
  label: string;
  amount: number;
  widthPercent: number;
}

/** Chart values must never sum or compare amounts from different currencies. */
export function buildExpenseChartRows(items: ExpenseBreakdown[], currency: string): ExpenseChartRow[] {
  const rows = items.map(item => ({
    key: item.key,
    label: item.label,
    amount: Number(item.totals.find(total => total.currency === currency)?.amount || 0)
  })).filter(item => Number.isFinite(item.amount) && item.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
  const largest = rows[0]?.amount || 0;
  return rows.map(item => ({
    ...item,
    widthPercent: largest > 0 ? Math.max(0, Math.min(100, item.amount / largest * 100)) : 0
  }));
}

export function localExpenseDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  readonly isExpensesHub: boolean;
  pets: Pet[] = [];
  isLoadingPets = false;
  petsLoadFailed = false;
  categoriesLoadFailed = false;
  reportLoadFailed = false;
  private expensesRequestId = 0;
  private categoriesRequestId = 0;
  private reportRequestId = 0;
  expenses: Expense[] = [];
  categories: ExpenseCategory[] = [];
  report: ExpenseReport | null = null;
  form: ExpensePayload = { ...emptyForm, expenseDate: localExpenseDate() };
  activeSection: 'manage' | 'report' = 'manage';
  reportChartCurrency = '';
  readonly currencyOptions: AppInputOption[] = [
    { label: 'expenses.currencyAUD', value: 'AUD' },
    { label: 'expenses.currencyUSD', value: 'USD' },
    { label: 'expenses.currencyIRT', value: 'IRT' }
  ];
  readonly paymentOptions: AppInputOption[] = [
    { label: 'expenses.paymentCash', value: 'Cash' },
    { label: 'expenses.paymentDebitCard', value: 'DebitCard' },
    { label: 'expenses.paymentCreditCard', value: 'CreditCard' },
    { label: 'expenses.paymentBankTransfer', value: 'BankTransfer' },
    { label: 'expenses.paymentDigitalWallet', value: 'DigitalWallet' },
    { label: 'expenses.paymentOther', value: 'Other' }
  ];
  allocations: AllocationRow[] = [];
  sharedExpense = false;
  editingId: string | null = null;
  selectedReceipt: File | null = null;
  reportPeriod: 'monthly' | 'yearly' = 'monthly';
  reportYear = new Date().getFullYear();
  reportMonth = new Date().getMonth() + 1;
  isLoading = false;
  isSaving = false;
  isReportLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly apiService: ApiService, private readonly route: ActivatedRoute, private readonly i18nService: I18nService, private readonly dialogService: AppDialogService) {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.isExpensesHub = !this.route.snapshot.paramMap.has('petId');
  }

  get petOptions(): AppInputOption[] { return this.pets.map(pet => ({ label: pet.petName, value: pet.id })); }
  get categoryOptions(): AppInputOption[] { return this.categories.map(category => ({ label: category.name, value: category.id })); }
  get availableCurrencyOptions(): AppInputOption[] {
    return this.form.currency && !this.currencyOptions.some(option => option.value === this.form.currency)
      ? [...this.currencyOptions, { label: this.form.currency, value: this.form.currency }]
      : this.currencyOptions;
  }
  get availablePaymentOptions(): AppInputOption[] {
    return this.form.paymentMethod && !this.paymentOptions.some(option => option.value === this.form.paymentMethod)
      ? [...this.paymentOptions, { label: this.form.paymentMethod, value: this.form.paymentMethod }]
      : this.paymentOptions;
  }
  get chartCurrencyOptions(): AppInputOption[] {
    return (this.report?.totals || []).map(total => ({ label: total.currency, value: total.currency }));
  }
  get activeChartCurrency(): string {
    const totals = this.report?.totals || [];
    return totals.some(total => total.currency === this.reportChartCurrency)
      ? this.reportChartCurrency : (totals[0]?.currency || 'AUD');
  }
  get chartTotal(): number {
    return Number(this.report?.totals.find(total => total.currency === this.activeChartCurrency)?.amount || 0);
  }
  get categoryChartRows(): ExpenseChartRow[] {
    return buildExpenseChartRows(this.report?.byCategory || [], this.activeChartCurrency);
  }
  get petChartRows(): ExpenseChartRow[] {
    return buildExpenseChartRows(this.report?.byPet || [], this.activeChartCurrency);
  }
  get donutSlices(): Array<{ label: string; amount: number; percent: number }> {
    const rows = this.categoryChartRows;
    const top = rows.slice(0, 4).map(row => ({ label: row.label, amount: row.amount }));
    const remainder = rows.slice(4).reduce((sum, row) => sum + row.amount, 0);
    if (remainder > 0) top.push({ label: this.i18nService.translate('expenses.otherCategories'), amount: remainder });
    const total = top.reduce((sum, row) => sum + row.amount, 0);
    return top.map(row => ({ ...row, percent: total ? row.amount / total * 100 : 0 }));
  }
  get donutBackground(): string {
    const slices = this.donutSlices;
    if (!slices.length) return 'var(--color-surface-soft)';
    const palette = ['var(--color-primary)', 'var(--color-info)', 'var(--color-accent)',
      'var(--color-warning)', 'var(--color-success)'];
    let start = 0;
    const stops = slices.map((slice, index) => {
      const end = start + slice.percent;
      const segment = `${palette[index]} ${start.toFixed(3)}% ${end.toFixed(3)}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }
  get selectedPetName(): string {
    return this.pets.find(pet => pet.id === this.petId)?.petName || this.i18nService.translate('expenses.allPets');
  }
  get monthOptions(): AppInputOption[] { return Array.from({ length: 12 }, (_, index) => ({ label: new Date(2000, index, 1).toLocaleString(undefined, { month: 'long' }), value: index + 1 })); }
  get yearOptions(): AppInputOption[] { const current = new Date().getFullYear(); return Array.from({ length: 7 }, (_, index) => ({ label: String(current - index), value: current - index })); }
  get selectedAllocationTotal(): number { return this.allocations.filter(item => item.selected).reduce((sum, item) => sum + Number(item.amount || 0), 0); }

  ngOnInit(): void {
    this.loadPets();
    if (this.petId) this.loadPage();
    this.loadReport();
  }

  loadPets(): void {
    this.isLoadingPets = true;
    this.petsLoadFailed = false;
    this.apiService.get<ApiResponse<Pet[]>>('/pets').subscribe({
      next: response => {
        this.isLoadingPets = false;
        if (!response?.success || !Array.isArray(response.data)) {
          this.pets = [];
          this.petsLoadFailed = true;
          this.loadCategories(null);
          return;
        }
        this.pets = response.data;
        this.resetAllocations();
        const current = this.pets.find(pet => pet.id === this.petId);
        this.loadCategories(current?.speciesId || null);
      },
      error: () => {
        this.isLoadingPets = false;
        this.petsLoadFailed = true;
        this.pets = [];
        this.loadCategories(null);
      }
    });
  }

  showSection(section: 'manage' | 'report'): void {
    this.activeSection = section;
  }

  navigateSectionTabs(event: KeyboardEvent): void {
    const rtl = document.documentElement.dir === 'rtl';
    let section: 'manage' | 'report' | null = null;
    if (event.key === 'Home') section = 'manage';
    if (event.key === 'End') section = 'report';
    if (event.key === 'ArrowRight') section = rtl ? 'manage' : 'report';
    if (event.key === 'ArrowLeft') section = rtl ? 'report' : 'manage';
    if (!section) return;

    event.preventDefault();
    this.showSection(section);
    const group = event.currentTarget as HTMLElement | null;
    const tabs = group?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const selected = section === 'manage' ? 0 : 1;
    tabs?.item(selected)?.focus();
  }

  changeReportPeriod(period: 'monthly' | 'yearly'): void {
    if (this.reportPeriod === period) return;
    this.reportPeriod = period;
    this.loadReport();
  }

  changeReportYear(value: string | number | boolean | null): void {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() || year === this.reportYear) return;
    this.reportYear = year;
    this.loadReport();
  }

  changeReportMonth(value: string | number | boolean | null): void {
    const month = Number(value);
    if (!Number.isInteger(month) || month < 1 || month > 12 || month === this.reportMonth) return;
    this.reportMonth = month;
    this.loadReport();
  }

  openExpenseCalendar(input: HTMLInputElement): void {
    // Invoked directly by a button click. The visible control cannot accept manual typing.
    const native = input as HTMLInputElement & { showPicker?: () => void };
    try {
      if (typeof native.showPicker === 'function') {
        native.showPicker();
        return;
      }
    } catch { /* Older browsers may restrict native pickers. */ }
    input.focus();
    input.click();
  }

  changeExpenseDate(value: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(new Date(`${value}T12:00:00`).getTime())) {
      this.form.expenseDate = value;
    }
  }

  onPetChange(value: string | number | boolean | null): void {
    const selectedId = typeof value === 'string' ? value : '';
    if (!this.isExpensesHub || this.isSaving || selectedId === this.petId ||
        (selectedId && !this.pets.some(pet => pet.id === selectedId))) return;

    this.petId = selectedId;
    this.expensesRequestId++;
    this.expenses = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.resetForm();
    const current = this.pets.find(pet => pet.id === selectedId);
    this.loadCategories(current?.speciesId || null);
    if (selectedId) this.loadPage();
    else this.isLoading = false;
    this.report = null;
    this.loadReport();
  }

  loadCategories(speciesId: string | null): void {
    const requestId = ++this.categoriesRequestId;
    this.categoriesLoadFailed = false;
    this.categories = [];
    const query = speciesId ? '?speciesId=' + encodeURIComponent(speciesId) : '';
    this.apiService.get<ApiResponse<ExpenseCategory[]>>('/expense-categories' + query).subscribe({
      next: response => {
        if (requestId !== this.categoriesRequestId) return;
        if (!response?.success || !Array.isArray(response.data)) {
          this.categoriesLoadFailed = true;
          return;
        }
        this.categories = response.data;
      },
      error: () => {
        if (requestId !== this.categoriesRequestId) return;
        this.categoriesLoadFailed = true;
      }
    });
  }

  loadPage(): void {
    if (!this.petId) {
      this.expenses = [];
      this.isLoading = false;
      return;
    }
    const requestId = ++this.expensesRequestId;
    const requestedPetId = this.petId;
    this.isLoading = true;
    this.errorMessage = '';
    this.expenses = [];
    this.apiService.get<ApiResponse<Expense[]>>('/pets/' + requestedPetId + '/expenses').subscribe({
      next: response => {
        if (requestId !== this.expensesRequestId) return;
        if (!response?.success || !Array.isArray(response.data)) {
          this.errorMessage = 'expenses.loadError';
        } else {
          this.expenses = response.data;
        }
        this.isLoading = false;
      },
      error: () => {
        if (requestId !== this.expensesRequestId) return;
        this.errorMessage = 'expenses.loadError';
        this.isLoading = false;
      }
    });
  }

  loadReport(): void {
    const requestId = ++this.reportRequestId;
    this.isReportLoading = true;
    this.reportLoadFailed = false;
    this.report = null;
    const month = this.reportPeriod === 'monthly' ? '&month=' + this.reportMonth : '';
    const pet = this.petId ? '&petId=' + encodeURIComponent(this.petId) : '';
    const query = '?period=' + encodeURIComponent(this.reportPeriod) +
      '&year=' + this.reportYear + month + pet;
    this.apiService.get<ApiResponse<ExpenseReport>>('/expenses/reports' + query).subscribe({
      next: response => {
        if (requestId !== this.reportRequestId) return;
        if (!response?.success || !response.data) {
          this.reportLoadFailed = true;
        } else {
          this.report = response.data;
          if (!this.report.totals.some(total => total.currency === this.reportChartCurrency)) {
            this.reportChartCurrency = this.report.totals[0]?.currency || '';
          }
        }
        this.isReportLoading = false;
      },
      error: () => {
        if (requestId !== this.reportRequestId) return;
        this.reportLoadFailed = true;
        this.isReportLoading = false;
      }
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
    if (!this.petId) { this.errorMessage = 'expenses.selectPetBeforeManaging'; return; }
    if (!this.form.amount || this.form.amount <= 0) { this.errorMessage = 'expenses.amountInvalid'; return; }
    if (!this.form.category.trim()) { this.errorMessage = 'expenses.categoryRequired'; return; }
    if (!this.form.expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(this.form.expenseDate)) {
      this.errorMessage = 'expenses.dateRequired'; return;
    }
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
        if (!response?.success || !response.data?.id) {
          this.errorMessage = 'expenses.saveError';
          this.isSaving = false;
          return;
        }
        const expense = response.data;
        if (this.selectedReceipt) {
          if (!this.editingId) this.editingId = expense.id;
          this.apiService.uploadExpenseReceipt<ApiResponse<unknown>>(expense.id, this.selectedReceipt).subscribe({
            next: receiptResponse => {
              if (!receiptResponse?.success) {
                this.errorMessage = 'expenses.receiptUploadError';
                this.isSaving = false;
                this.loadPage();
                return;
              }
              this.finishSave(wasEditing);
            },
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
      expenseDate: expense.expenseDate ? expense.expenseDate.substring(0, 10) : localExpenseDate(), currency: expense.currency || 'AUD',
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
        next: response => {
          if (!response?.success) { this.errorMessage = 'expenses.deleteError'; return; }
          this.successMessage = 'expenses.deleteSuccess'; this.loadPage(); this.loadReport();
        },
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
        next: response => {
          if (!response?.success) { this.errorMessage = 'expenses.receiptDeleteError'; return; }
          this.successMessage = 'expenses.receiptDeleted'; this.loadPage();
        },
        error: () => this.errorMessage = 'expenses.receiptDeleteError'
      });
    });
  }

  resetForm(): void {
    this.editingId = null; this.form = { ...emptyForm, expenseDate: localExpenseDate() }; this.selectedReceipt = null; this.sharedExpense = false; this.resetAllocations();
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
