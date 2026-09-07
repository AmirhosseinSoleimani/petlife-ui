import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { GeographyArea } from '../../../core/models/marketplace.models';
import { AppDialogService } from '../../../shared/services/app-dialog.service';

interface GeographyForm {
  city: string; suburb: string; state: string; postcode: string; country: string;
  latitude: number | null; longitude: number | null; sortOrder: number; isActive: boolean;
}

@Component({selector:'app-admin-geography',templateUrl:'./admin-geography.component.html',styleUrls:['./admin-geography.component.scss']})
export class AdminGeographyComponent implements OnInit {
  areas: GeographyArea[]=[]; form=this.emptyForm(); editingId:string|null=null; search='';
  isLoading=false; isSaving=false; errorMessage=''; successMessage='';
  constructor(private readonly api:ApiService, private readonly dialogService:AppDialogService){}
  ngOnInit():void{this.load();}
  clearSearch():void{this.search='';this.load();}
  load():void{this.isLoading=true;this.errorMessage='';const q=this.search.trim()?`?search=${encodeURIComponent(this.search.trim())}`:'';this.api.get<ApiResponse<GeographyArea[]>>(`/admin/geography${q}`).subscribe({next:r=>{this.areas=r.data||[];this.isLoading=false;},error:()=>{this.errorMessage='Unable to load geography.';this.isLoading=false;}});}
  save():void{this.isSaving=true;this.errorMessage='';this.successMessage='';const payload={...this.form,sortOrder:Number(this.form.sortOrder)||0,latitude:this.form.latitude===null?null:Number(this.form.latitude),longitude:this.form.longitude===null?null:Number(this.form.longitude)};const req=this.editingId?this.api.put<ApiResponse<GeographyArea>>(`/admin/geography/${this.editingId}`,payload):this.api.post<ApiResponse<GeographyArea>>('/admin/geography',payload);req.subscribe({next:()=>{this.successMessage=this.editingId?'Geography updated.':'Geography created.';this.reset();this.load();},error:()=>{this.errorMessage='Unable to save geography.';this.isSaving=false;}});}
  edit(item:GeographyArea):void{this.editingId=item.id;this.form={city:item.city,suburb:item.suburb,state:item.state,postcode:item.postcode,country:item.country||'Australia',latitude:item.latitude??null,longitude:item.longitude??null,sortOrder:item.sortOrder||0,isActive:item.isActive!==false};}
  remove(item:GeographyArea):void{this.dialogService.confirm({title:'Remove geography?',message:`Remove ${item.suburb} ${item.postcode}?`,confirmLabel:'Remove',tone:'danger'}).then(confirmed=>{if(!confirmed)return;this.api.delete<ApiResponse<unknown>>(`/admin/geography/${item.id}`).subscribe({next:()=>{this.successMessage='Geography removed.';this.load();},error:()=>this.errorMessage='Unable to remove geography. It may be in use.'});});}
  reset():void{this.editingId=null;this.form=this.emptyForm();this.isSaving=false;}
  private emptyForm():GeographyForm{return{city:'Sydney',suburb:'',state:'NSW',postcode:'',country:'Australia',latitude:null,longitude:null,sortOrder:0,isActive:true};}
}
