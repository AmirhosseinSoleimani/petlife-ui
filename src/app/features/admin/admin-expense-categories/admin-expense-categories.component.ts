import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { PetTaxonomy } from '../../../core/models/customer-core.models';
import { ExpenseCategory, ExpenseCategoryPayload } from '../../../core/models/phase1-care.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

@Component({ selector: 'app-admin-expense-categories', templateUrl: './admin-expense-categories.component.html', styleUrls: ['./admin-expense-categories.component.scss'] })
export class AdminExpenseCategoriesComponent implements OnInit {
  categories: ExpenseCategory[] = [];
  taxonomy: PetTaxonomy = { species: [] };
  form = this.emptyForm();
  editingId: string | null = null;
  isLoading = false; isSaving = false; errorMessage = ''; successMessage = '';
  constructor(private readonly apiService: ApiService, private readonly i18nService: I18nService, private readonly dialogService: AppDialogService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.isLoading = true;
    this.apiService.get<ApiResponse<ExpenseCategory[]>>('/admin/expense-categories').subscribe({ next:r=>{this.categories=r.data||[];this.isLoading=false;}, error:()=>{this.errorMessage='expenseCategories.loadError';this.isLoading=false;} });
    this.apiService.get<ApiResponse<PetTaxonomy>>('/admin/pet-taxonomy').subscribe({ next:r=>this.taxonomy=r.data||{species:[]}, error:()=>this.taxonomy={species:[]} });
  }
  toggleSpecies(id:string, checked:boolean):void { const set=new Set(this.form.speciesIds); checked?set.add(id):set.delete(id); this.form.speciesIds=Array.from(set); }
  hasSpecies(id:string):boolean{return this.form.speciesIds.includes(id);}
  save():void { this.isSaving=true;this.errorMessage=''; const payload:ExpenseCategoryPayload={...this.form,sortOrder:Number(this.form.sortOrder)||0}; const req=this.editingId?this.apiService.put<ApiResponse<ExpenseCategory>>(`/admin/expense-categories/${this.editingId}`,payload):this.apiService.post<ApiResponse<ExpenseCategory>>('/admin/expense-categories',payload);req.subscribe({next:()=>{this.successMessage=this.editingId?'expenseCategories.updated':'expenseCategories.created';this.reset();this.load();},error:()=>{this.errorMessage='expenseCategories.saveError';this.isSaving=false;}});}
  edit(item:ExpenseCategory):void {this.editingId=item.id;this.form={code:item.code,name:item.name,description:item.description||'',isActive:item.isActive,sortOrder:item.sortOrder,speciesIds:[...item.speciesIds]};}
  remove(item:ExpenseCategory):void {this.dialogService.confirm({title:'Delete expense category?',message:'expenseCategories.deleteConfirm',confirmLabel:'Delete category',tone:'danger'}).then(confirmed=>{if(!confirmed)return;this.apiService.delete<ApiResponse<unknown>>(`/admin/expense-categories/${item.id}`).subscribe({next:()=>{this.successMessage='expenseCategories.deleted';this.load();},error:()=>this.errorMessage='expenseCategories.deleteError'});});}
  reset():void{this.editingId=null;this.form=this.emptyForm();this.isSaving=false;}
  speciesNames(ids:string[]):string{return ids.length?this.taxonomy.species.filter(s=>ids.includes(s.id)).map(s=>s.name).join(', '):this.i18nService.translate('common.allSpecies');}
  private emptyForm():ExpenseCategoryPayload{return{code:'',name:'',description:'',isActive:true,sortOrder:0,speciesIds:[]};}
}
