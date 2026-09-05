import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

const api = environment.apiBaseUrl;

export type LoginResponse = { message: string; token: string; userId: string; currency: string };
export type SignupResponse = { message: string };
export type ProfileResponse = {
  message: string;
  data: {
    name: string;
    email: string;
    currency: string;
    budget: number;
    rolloverEnabled: boolean;
    savingsLabel: string;
    savingsTarget: number;
    savingsDeadline: string;
  };
};

export type ProfileUpdate = {
  name?: string;
  currency?: string;
  budget?: number;
  rolloverEnabled?: boolean;
  savingsLabel?: string;
  savingsTarget?: number;
  savingsDeadline?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  getLogin(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${api}/api/auth/login`, { email, password });
  }

  getSignUp(email: string, password: string, name: string): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${api}/api/auth/signup`, { email, password, name });
  }

  getProfile(userId: string): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${api}/api/auth/profile/${userId}`);
  }

  changePassword(userId: string, password: string) {
    return this.http.patch(`${api}/api/auth/update/password`, { userId, password });
  }

  updateProfile(userId: string, profile: ProfileUpdate) {
    return this.http.patch(`${api}/api/auth/update/profile`, { userId, ...profile });
  }

  updateEmail(userId: string, email: string) {
    return this.http.patch(`${api}/api/auth/update/email`, { userId, email });
  }

  updateCurrency(userId: string, currency: string) {
    return this.updateProfile(userId, { currency });
  }

  updateBudget(userId: string, budget: number) {
    return this.updateProfile(userId, { budget });
  }

  updateSavings(userId: string, savings: { savingsLabel?: string; savingsTarget?: number; savingsDeadline?: string }) {
    return this.updateProfile(userId, savings);
  }

  updateRollover(userId: string, rolloverEnabled: boolean) {
    return this.updateProfile(userId, { rolloverEnabled });
  }

  changeBudget(userId: string, budget: string, name?: string) {
    return this.updateProfile(userId, {
      budget: Number(budget),
      ...(name ? { name } : {}),
    });
  }

  deleteAccount(userId: string) {
    return this.http.delete(`${api}/api/auth/account/${userId}`);
  }

  logout(): void {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    } catch {
      /* noop */
    }
  }

  isLoggedIn(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return !!localStorage.getItem('token') && !!localStorage.getItem('userId');
  }
}
