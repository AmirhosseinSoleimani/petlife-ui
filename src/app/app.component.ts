import { Component } from '@angular/core';

import { ApiService } from './core/api/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  readonly uploadProgress$ = this.apiService.uploadProgress$;

  constructor(private readonly apiService: ApiService) {}
}
