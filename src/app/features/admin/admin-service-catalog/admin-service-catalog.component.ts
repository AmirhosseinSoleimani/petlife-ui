import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { ServiceCategory, ServiceDefinition } from '../../../core/models/marketplace.models';
import { AppInputOption } from '../../../shared/components/app-input/app-input.component';

@Component({selector:'app-admin-service-catalog',templateUrl:'./admin-service-catalog.component.html',styleUrls:['./admin-service-catalog.component.scss']})
export class AdminServiceCatalogComponent implements OnInit {
  categories:ServiceCategory[]=[]; definitions:ServiceDefinition[]=[]; species:string[]=[];
  categoryForm=this.emptyCategory(); definitionForm=this.emptyDefinition(); editingCategoryId:string|null=null; editingDefinitionId:string|null=null;
  isLoading=false; isSaving=false; errorMessage=''; successMessage='';
  constructor(private readonly api:ApiService){}
  ngOnInit():void{this.load();this.api.get<ApiResponse<string[]>>('/pet-species').subscribe({next:r=>this.species=r.data||[]});}
  get categoryOptions():AppInputOption[]{return this.categories.map(c=>({label:c.name,value:c.id}));}
  load():void{this.isLoading=true;this.api.get<ApiResponse<ServiceCategory[]>>('/admin/service-catalog/categories').subscribe({next:r=>this.categories=r.data||[],error:()=>this.errorMessage='Unable to load service categories.'});this.api.get<ApiResponse<ServiceDefinition[]>>('/admin/service-catalog/definitions').subscribe({next:r=>{this.definitions=r.data||[];this.isLoading=false;},error:()=>{this.errorMessage='Unable to load service definitions.';this.isLoading=false;}});}
  saveCategory():void{this.isSaving=true;this.errorMessage='';const payload={...this.categoryForm,sortOrder:Number(this.categoryForm.sortOrder)||0};const req=this.editingCategoryId?this.api.put<ApiResponse<ServiceCategory>>(`/admin/service-catalog/categories/${this.editingCategoryId}`,payload):this.api.post<ApiResponse<ServiceCategory>>('/admin/service-catalog/categories',payload);req.subscribe({next:()=>{this.successMessage='Service category saved.';this.resetCategory();this.load();},error:()=>{this.errorMessage='Unable to save category. Seeded/in-use keys cannot be changed or disabled unsafely.';this.isSaving=false;}});}
  editCategory(item:ServiceCategory):void{this.editingCategoryId=item.id;this.categoryForm={name:item.name,key:item.key||'',description:item.description||'',iconKey:item.iconKey||'',sortOrder:item.sortOrder||0,isActive:item.isActive!==false};}
  removeCategory(item:ServiceCategory):void{if(!window.confirm(`Remove ${item.name}?`))return;this.api.delete<ApiResponse<unknown>>(`/admin/service-catalog/categories/${item.id}`).subscribe({next:()=>this.load(),error:()=>this.errorMessage='Category is seeded or in use and cannot be removed.'});}
  saveDefinition():void{this.isSaving=true;this.errorMessage='';const payload={...this.definitionForm,sortOrder:Number(this.definitionForm.sortOrder)||0};const req=this.editingDefinitionId?this.api.put<ApiResponse<ServiceDefinition>>(`/admin/service-catalog/definitions/${this.editingDefinitionId}`,payload):this.api.post<ApiResponse<ServiceDefinition>>('/admin/service-catalog/definitions',payload);req.subscribe({next:()=>{this.successMessage='Service definition saved.';this.resetDefinition();this.load();},error:()=>{this.errorMessage='Unable to save definition. Check category, species and in-use rules.';this.isSaving=false;}});}
  editDefinition(item:ServiceDefinition):void{this.editingDefinitionId=item.id;this.definitionForm={categoryId:item.categoryId,name:item.name,key:item.key||'',description:item.description||'',sortOrder:item.sortOrder||0,isActive:item.isActive!==false,applicableSpecies:[...(item.applicableSpecies||[])]};}
  removeDefinition(item:ServiceDefinition):void{if(!window.confirm(`Remove ${item.name}?`))return;this.api.delete<ApiResponse<unknown>>(`/admin/service-catalog/definitions/${item.id}`).subscribe({next:()=>this.load(),error:()=>this.errorMessage='Definition is seeded or in use and cannot be removed.'});}
  toggleSpecies(species:string,checked:boolean):void{const set=new Set(this.definitionForm.applicableSpecies);checked?set.add(species):set.delete(species);this.definitionForm.applicableSpecies=Array.from(set);}
  hasSpecies(species:string):boolean{return this.definitionForm.applicableSpecies.includes(species);}
  resetCategory():void{this.editingCategoryId=null;this.categoryForm=this.emptyCategory();this.isSaving=false;}
  resetDefinition():void{this.editingDefinitionId=null;this.definitionForm=this.emptyDefinition();this.isSaving=false;}
  private emptyCategory(){return{name:'',key:'',description:'',iconKey:'',sortOrder:0,isActive:true};}
  private emptyDefinition(){return{categoryId:null as string|null,name:'',key:'',description:'',sortOrder:0,isActive:true,applicableSpecies:[] as string[]};}
}
