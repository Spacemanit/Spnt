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
  changePassword(userId: string, password: string) {
    const url = `${api}/api/auth/update/password`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.patch(url, { userId, password }, { headers });
  }
  updateProfile(userId: string, profile: { name?: string; currency?: string; budget?: number }) {
    const url = `${api}/api/auth/update/profile`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.patch(url, { userId, ...profile }, { headers });
  }
  updateEmail(userId: string, email: string) {
    const url = `${api}/api/auth/update/email`;
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.patch(url, { userId, email }, { headers });
  }
  updateCurrency(userId: string, currency: string) {
    return this.updateProfile(userId, { currency });
  }
  updateBudget(userId: string, budget: number) {
    return this.updateProfile(userId, { budget });
  }
  changeBudget(userId: string, budget: string, name?: string) {
    return this.updateProfile(userId, {
      budget: Number(budget),
      ...(name ? { name } : {}),
    });
  }
}
