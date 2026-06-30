import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { EXPENSE_CATEGORY_OPTIONS, Expense, ExpensePayload, ExpenseSummary } from '../../../core/models/customer-core.models';

const emptyForm: ExpensePayload = {
  category: '',
  amount: null,
  expenseDate: '',
  currency: 'AUD',
  description: '',
  isRecurring: false
};

@Component({
  selector: 'app-pet-expenses',
  templateUrl: './pet-expenses.component.html',
  styleUrls: ['./pet-expenses.component.scss']
})
export class PetExpensesComponent implements OnInit {
  readonly categoryOptions = EXPENSE_CATEGORY_OPTIONS;
  petId = this.route.snapshot.paramMap.get('petId') || '';
  expenses: Expense[] = [];
  summary: ExpenseSummary | null = null;
  form: ExpensePayload = { ...emptyForm };
  editingId: string | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly apiService: ApiService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadSummary();
    this.apiService.get<ApiResponse<Expense[]>>(`/pets/${this.petId}/expenses`).subscribe({
      next: (response) => {
        this.expenses = response.data || [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load expenses.';
        this.isLoading = false;
      }
    });
  }

  loadSummary(): void {
    this.apiService.get<ApiResponse<ExpenseSummary>>('/expenses/summary').subscribe({
      next: (response) => {
        this.summary = response.data;
      },
      error: () => {
        this.summary = null;
      }
    });
  }

  saveExpense(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const isEditing = !!this.editingId;
    const request = this.editingId
      ? this.apiService.put<ApiResponse<Expense>>(`/expenses/${this.editingId}`, this.form)
      : this.apiService.post<ApiResponse<Expense>>(`/pets/${this.petId}/expenses`, this.form);

    request.subscribe({
      next: () => {
        this.resetForm();
        this.successMessage = isEditing ? 'Expense updated.' : 'Expense added.';
        this.loadPage();
      },
      error: () => {
        this.errorMessage = 'Unable to save expense.';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  editExpense(expense: Expense): void {
    this.editingId = expense.id;
    this.form = {
      category: expense.category || '',
      amount: expense.amount,
      expenseDate: expense.expenseDate ? expense.expenseDate.substring(0, 10) : '',
      currency: expense.currency || 'AUD',
      description: expense.description || '',
      isRecurring: !!expense.isRecurring
    };
  }

  deleteExpense(expense: Expense): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.apiService.delete<ApiResponse<unknown>>(`/expenses/${expense.id}`).subscribe({
      next: () => {
        this.successMessage = 'Expense deleted.';
        this.loadPage();
      },
      error: () => {
        this.errorMessage = 'Unable to delete expense.';
      }
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = { ...emptyForm };
  }
}
