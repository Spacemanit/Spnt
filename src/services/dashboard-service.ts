import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { DataList } from '../models/DataList.type';

const api = environment.apiBaseUrl;

export type ExpenseListResponse = {
  message: string;
  data: DataList[];
  meta?: { total: number; page: number; limit: number; pages: number };
};

export type ExpenseFilters = {
  month?: string;
  category?: string;
  q?: string;
  tags?: string;
  page?: number;
  limit?: number;
  sort?: 'date-desc' | 'date-asc' | 'money-desc' | 'money-asc';
};

export type ExpenseSummary = {
  message: string;
  data: {
    totalSpent: number;
    monthlySpent: number;
    month: string;
    count: number;
    budget: number;
    budgetLeft: number | null;
    rolloverEnabled: boolean;
    rollover: number;
    prevMonth: string;
    prevSpent: number;
    effectiveBudget: number;
    savings: { label: string; target: number; deadline: string; savedThisMonth: number; pct: number };
    byCategory: { category: string; total: number; count: number }[];
    byMonth: { month: string; total: number; count: number }[];
  };
};

export type ImportSkip = { row: number; title: string; date: string; money: number | string; reason: string };
export type ImportResponse = { message: string; imported: number; skipped: ImportSkip[] };
export type ImportEntry = {
  title: string;
  money: number;
  category: string;
  date: string;
  description: string;
  tags: string[];
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  createNew(
    userId: string,
    title: string,
    description: string,
    money: number,
    category: string,
    date: string,
    tags: string[] = []
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${api}/api/home/${userId}/new`, {
      title,
      description,
      money,
      category,
      date,
      tags,
    });
  }

  getData(userId: string, filters: ExpenseFilters = {}): Observable<ExpenseListResponse> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ExpenseListResponse>(`${api}/api/home/${userId}`, { params });
  }

  getSummary(userId: string, month?: string): Observable<ExpenseSummary> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<ExpenseSummary>(`${api}/api/home/${userId}/summary`, { params });
  }

  deleteItem(userId: string, dataId: string) {
    return this.http.delete(`${api}/api/home/${userId}/delete/${dataId}`);
  }

  editItem(
    userId: string,
    dataId: string,
    title: string,
    description: string,
    money: number,
    category: string,
    tags: string[] = []
  ) {
    return this.http.put(`${api}/api/home/${userId}/edit`, {
      dataId,
      title,
      description,
      money,
      category,
      tags,
    });
  }

  exportCsv(userId: string, filters: ExpenseFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get(`${api}/api/home/${userId}/export`, {
      params,
      responseType: 'blob',
    });
  }

  importEntries(userId: string, entries: ImportEntry[]): Observable<ImportResponse> {
    return this.http.post<ImportResponse>(`${api}/api/home/${userId}/import`, { entries });
  }
}
