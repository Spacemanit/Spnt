import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
const api = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  http = inject(HttpClient);
  createNew(userId: string, title: string, description: string, money: number, category: string, date: string) {
    const url = `${api}/api/home/${userId}/new/`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.post(url, { title, description, money, category, date }, { headers });
  }
  getData(userId: string) {
    const url = `${api}/api/home/${userId}/`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  deleteItem(userId: string, dataId: string) {
    const url = `${api}/api/home/${userId}/delete/${dataId}`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.delete(url, { headers });
  }
  editItem(userId: string, dataId: string, title: string, description: string, money: number, category: string) {
    const url = `${api}/api/home/${userId}/edit/`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.put(url, { dataId, title, description, money, category }, { headers });
  }
}
