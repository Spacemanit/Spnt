import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
const api = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  http = inject(HttpClient);
  getLogin(email: string, password: string) {
    const url = `${api}/api/auth/login`;
    return this.http.post(url, { email, password });
  }
  getSignUp(email: string, password: string, name: string) {
    const url = `${api}/api/auth/signup`;
    return this.http.post(url, { email, password, name });
  }
  getProfile(userId: string) {
    const url = `${api}/api/auth/profile/${userId}`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get(url, { headers });
  }
  changePassword(userId: string, password: string, name?: string, email?: string) {
    const url = `${api}/api/auth/update`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.put(url, { userId, name, email, password }, { headers });
  }
  updateCurrency(userId: string, currency: string) {
    const url = `${api}/api/auth/update/currency`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.put(url, { userId, currency }, { headers });
  }
}
