import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ExpenseBreakdown, ExpenseReport } from '../../../core/models/phase1-care.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';
import { PetExpensesComponent, buildExpenseChartRows, localExpenseDate } from './pet-expenses.component';

describe('Expenses interface', () => {
  const rows: ExpenseBreakdown[] = [
    { key: 'vet', label: 'Vet care', totals: [{ currency: 'AUD', amount: 120 }, { currency: 'USD', amount: 20 }] },
    { key: 'food', label: 'Food', totals: [{ currency: 'AUD', amount: 60 }, { currency: 'IRT', amount: 500 }] },
    { key: 'unused', label: 'Unused', totals: [{ currency: 'USD', amount: 60 }] }
  ];

  function createComponent() {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'put']);
    const route = {
      snapshot: {
        paramMap: { get: (_name: string) => null, has: (_name: string) => false }
      }
    } as unknown as ActivatedRoute;
    const i18n = jasmine.createSpyObj<I18nService>('I18nService', ['translate']);
    i18n.translate.and.callFake(key => key);
    const dialog = jasmine.createSpyObj<AppDialogService>('AppDialogService', ['confirm']);
    const component = new PetExpensesComponent(api, route, i18n, dialog);
    return { component, api };
  }

  it('uses the local calendar day, not UTC, for the default date', () => {
    expect(localExpenseDate(new Date(2026, 9, 30, 23, 30))).toBe('2026-10-30');
    const { component } = createComponent();
    expect(component.form.expenseDate).toBe(localExpenseDate());
    component.form.expenseDate = '2026-09-01';
    component.resetForm();
    expect(component.form.expenseDate).toBe(localExpenseDate());
  });

  it('accepts only native calendar dates', () => {
    const { component } = createComponent();
    component.changeExpenseDate('2026-04-15');
    expect(component.form.expenseDate).toBe('2026-04-15');
    component.changeExpenseDate('free text');
    expect(component.form.expenseDate).toBe('2026-04-15');
  });

  it('includes AUD, USD and IRT plus common payment methods', () => {
    const { component } = createComponent();
    expect(component.currencyOptions.map(item => item.value)).toEqual(['AUD', 'USD', 'IRT']);
    expect(component.paymentOptions.map(item => item.value)).toContain('BankTransfer');
    expect(component.paymentOptions.map(item => item.value)).toContain('Cash');
  });

  it('never adds distinct currencies together when plotting', () => {
    const aud = buildExpenseChartRows(rows, 'AUD');
    expect(aud.map(item => item.label)).toEqual(['Vet care', 'Food']);
    expect(aud.map(item => item.amount)).toEqual([120, 60]);
    expect(aud[0].widthPercent).toBe(100);
    expect(aud[1].widthPercent).toBe(50);

    const toman = buildExpenseChartRows(rows, 'IRT');
    expect(toman.map(item => item.amount)).toEqual([500]);
    expect(toman[0].label).toBe('Food');
  });

  it('updates the reporting endpoint when switching monthly to yearly', () => {
    const { component, api } = createComponent();
    const report: ExpenseReport = {
      period: 'yearly', year: component.reportYear,
      totals: [{ currency: 'AUD', amount: 30 }],
      byCategory: [], byPet: []
    };
    api.get.and.returnValue(of({ success: true, data: report }));
    component.changeReportPeriod('yearly');
    expect(api.get).toHaveBeenCalledWith('/expenses/reports?period=yearly&year=' + component.reportYear);
    expect(component.reportChartCurrency).toBe('AUD');
    component.changeReportPeriod('monthly');
    expect(api.get).toHaveBeenCalledWith('/expenses/reports?period=monthly&year=' +
      component.reportYear + '&month=' + component.reportMonth);
  });
});
