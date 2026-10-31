import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { MyRequestsComponent } from './my-requests.component';

describe('Customer Requests navigation', () => {
  const data = [
    { id: 'a', status: 'Requested', createdAt: '2026-10-30T00:00:00Z' },
    { id: 'b', status: 'Accepted', createdAt: '2026-10-29T00:00:00Z' },
    { id: 'c', status: 'Completed', createdAt: '2026-10-28T00:00:00Z' },
    { id: 'd', status: 'Rejected', createdAt: '2026-10-27T00:00:00Z' }
  ];

  function setup(view: 'active' | 'history') {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    api.get.and.returnValue(of({ success: true, data }));
    const route = { snapshot: { data: { view } } } as unknown as ActivatedRoute;
    const component = new MyRequestsComponent(api, route);
    component.ngOnInit();
    return { component, api };
  }

  it('shows only live work at the Requests landing page', () => {
    const { component, api } = setup('active');
    expect(api.get).toHaveBeenCalledWith('/v1/service-requests/my');
    expect(component.filteredRequests.map(x => x.id)).toEqual(['a', 'b']);
    expect(component.completedRequestsCount).toBe(2);
  });

  it('shows active and completed work together in history', () => {
    const { component } = setup('history');
    expect(component.filteredRequests.length).toBe(4);
    component.statusFilter = 'completed';
    expect(component.filteredRequests.map(x => x.id)).toEqual(['c']);
  });

  it('keeps an unsuccessful API response from looking like an empty history', () => {
    const { component, api } = setup('active');
    api.get.and.returnValue(of({ success: false, data: [] }));
    component.loadRequests();
    expect(component.errorMessage).toBe('requests.loadError');
  });
});
