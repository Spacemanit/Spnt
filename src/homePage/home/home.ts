import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize } from 'rxjs';
import { DashboardService, ExpenseSummary, ImportEntry } from '../../services/dashboard-service';
import { ToastService } from '../../services/toast-service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InkCurrencyPipe } from '../../app/pipes/ink-currency.pipe';
import { InkHeader } from '../../app/components/ink-header';
import { Chart } from '../donutChart/chart/chart';
import { DataList } from '../../models/DataList.type';
import { EXPENSE_CATEGORIES, PREDEFINED_TAGS, normalizeTag, parseTagsInput } from '../../app/constants/expense-meta';

type MonthSections = { key: string; label: string; items: DataList[] };
export type ImportResult = { imported: number; skipped: { row: number; title: string; date: string; money: number | string; reason: string }[] };
export type BudgetAlert = { level: 'WARN' | 'LIMIT'; pct: number } | null;

const PAGE_SIZES = [20, 50, 100];

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

@Component({
  selector: 'app-home',
  imports: [DatePipe, FormsModule, InkCurrencyPipe, InkHeader, Chart],
  templateUrl: './home.html',
  styles: ``,
})
export class Home implements OnInit {
  private dashboard = inject(DashboardService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  userId: string | null = null;
  categories: string[] = [...EXPENSE_CATEGORIES];
  predefinedTags: string[] = [...PREDEFINED_TAGS];
  pageSizes = PAGE_SIZES;

  dataList = signal<DataList[]>([]);
  summary = signal<ExpenseSummary['data'] | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  isImporting = signal(false);
  showCreatePanel = signal(false);
  showHelp = signal(false);
  deleteTarget = signal<DataList | null>(null);
  editingId = signal<string | null>(null);
  importResult = signal<ImportResult | null>(null);

  search = signal('');
  categoryFilter = signal('All');
  monthFilter = signal('');
  sort = signal<'date-desc' | 'date-asc' | 'money-desc' | 'money-asc'>('date-desc');
  page = signal(1);
  limit = signal(20);
  selectedNewTags = signal<string[]>([]);
  meta = signal<{ total: number; page: number; limit: number; pages: number }>({ total: 0, page: 1, limit: 20, pages: 0 });
  dismissedAlertKey = signal<string>('');

  userCurrency = signal(
    typeof localStorage !== 'undefined' ? localStorage.getItem('currency') || 'USD' : 'USD'
  );

  availableTags = computed(() => {
    const custom = this.dataList()
      .flatMap((e) => e.tags ?? [])
      .map(normalizeTag)
      .filter(Boolean);
    return [...new Set([...this.predefinedTags, ...custom])];
  });

  monthSections = computed<MonthSections[]>(() => {
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: '2-digit' });
    const map = new Map<string, MonthSections>();
    for (const entry of this.dataList()) {
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const ex = map.get(key);
      if (ex) ex.items.push(entry);
      else map.set(key, { key, label: fmt.format(d), items: [entry] });
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  });

  effectiveBudget = computed(() => this.summary()?.effectiveBudget ?? this.summary()?.budget ?? 0);

  budgetPct = computed(() => {
    const s = this.summary();
    if (!s || !s.budget) return 0;
    const base = s.effectiveBudget || s.budget;
    if (!base) return 0;
    return Math.min(999, Math.round((s.monthlySpent / base) * 100));
  });

  savingsPctClamped = computed(() => {
    const p = this.summary()?.savings?.pct ?? 0;
    return Math.max(0, Math.min(100, p));
  });

  budgetAlert = computed<BudgetAlert>(() => {
    const s = this.summary();
    if (!s || !s.budget) return null;
    const base = s.effectiveBudget || s.budget;
    if (!base) return null;
    const pct = Math.round((s.monthlySpent / base) * 100);
    const key = `${s.month}-${pct >= 100 ? 'LIMIT' : pct >= 80 ? 'WARN' : ''}`;
    if (pct < 80) return null;
    if (this.dismissedAlertKey() === key) return null;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(`spnt-alert-${key}`) === '1') return null;
    } catch { /* noop */ }
    return { level: pct >= 100 ? 'LIMIT' : 'WARN', pct };
  });

  pageNumbers = computed(() => {
    const pages = this.meta().pages || 0;
    const cur = this.meta().page || 1;
    if (!pages) return [] as number[];
    const start = Math.max(1, cur - 2);
    const end = Math.min(pages, start + 4);
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  });

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    if (this.userId) {
      this.fetchData();
      this.fetchSummary();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    const tag = (t?.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || t?.isContentEditable;
    if (e.key === 'Escape') {
      this.showHelp.set(false);
      this.importResult.set(null);
      this.deleteTarget.set(null);
      this.editingId.set(null);
      return;
    }
    if (typing) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.showCreatePanel()) {
        e.preventDefault();
        this.submitCreateFromDom();
      }
      return;
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      if (!this.showCreatePanel()) this.showCreatePanel.set(true);
      setTimeout(() => document.getElementById('new-title')?.focus(), 0);
    } else if (e.key === '/') {
      e.preventDefault();
      setTimeout(() => document.getElementById('ledger-search')?.focus(), 0);
    } else if (e.key === '?') {
      e.preventDefault();
      this.showHelp.update((v) => !v);
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      window.print();
    }
  }

  private submitCreateFromDom(): void {
    const title = (document.getElementById('new-title') as HTMLInputElement | null)?.value ?? '';
    const money = (document.getElementById('new-money') as HTMLInputElement | null)?.valueAsNumber ?? NaN;
    const cat = (document.getElementById('new-category') as HTMLSelectElement | null)?.value ?? '';
    const date = (document.getElementById('new-date') as HTMLInputElement | null)?.value ?? '';
    const desc = (document.getElementById('new-desc') as HTMLTextAreaElement | null)?.value ?? '';
    this.createNew(title, desc, money, cat, date);
  }

  fetchData(): void {
    if (!this.userId) return;
    this.isLoading.set(true);
    this.dashboard
      .getData(this.userId, {
        q: this.search() || undefined,
        category: this.categoryFilter() === 'All' ? undefined : this.categoryFilter(),
        month: this.monthFilter() || undefined,
        sort: this.sort(),
        limit: this.limit(),
        page: this.page(),
      })
      .pipe(
        catchError((err) => {
          this.toast.error(err.error?.message || 'Failed to load entries');
          throw err;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((res) => {
        this.dataList.set(res.data ?? []);
        if (res.meta) {
          this.meta.set(res.meta);
          this.page.set(res.meta.page);
        }
      });
  }

  fetchSummary(): void {
    if (!this.userId) return;
    this.dashboard
      .getSummary(this.userId, this.monthFilter() || undefined)
      .pipe(catchError((err) => { throw err; }))
      .subscribe((res) => {
        this.summary.set(res.data);
        this.maybeToastBudgetAlert(res.data);
      });
  }

  private maybeToastBudgetAlert(s: ExpenseSummary['data']): void {
    if (!s.budget) return;
    const base = s.effectiveBudget || s.budget;
    if (!base) return;
    const pct = Math.round((s.monthlySpent / base) * 100);
    const level = pct >= 100 ? 'LIMIT' : pct >= 80 ? 'WARN' : '';
    if (!level) return;
    const key = `${s.month}-${level}`;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(`spnt-alert-${key}`)) return;
    } catch { /* noop */ }
    if (level === 'LIMIT') this.toast.error(`Budget limit reached (${pct}%).`);
    else this.toast.info(`Budget ${pct}% used.`);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(`spnt-alert-${key}`, '1');
    } catch { /* noop */ }
  }

  dismissAlert(): void {
    const s = this.summary();
    const a = this.budgetAlert();
    if (!s || !a) return;
    const key = `${s.month}-${a.level}`;
    this.dismissedAlertKey.set(key);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(`spnt-alert-${key}`, '1');
    } catch { /* noop */ }
  }

  onFilterChange(resetPage = true): void {
    if (resetPage) this.page.set(1);
    this.fetchData();
    this.fetchSummary();
  }

  gotoPage(n: number): void {
    const pages = this.meta().pages || 1;
    const next = Math.max(1, Math.min(pages, n));
    if (next === this.page()) return;
    this.page.set(next);
    this.fetchData();
  }

  changeLimit(n: number): void {
    this.limit.set(n);
    this.page.set(1);
    this.fetchData();
  }

  clearFilters(): void {
    this.search.set('');
    this.categoryFilter.set('All');
    this.monthFilter.set('');
    this.sort.set('date-desc');
    this.page.set(1);
    this.onFilterChange(false);
    this.page.set(1);
    this.fetchData();
    this.fetchSummary();
  }

  toggleCreatePanel(): void {
    this.showCreatePanel.update((v) => !v);
  }

  createNew(title: string, description: string, money: number, category: string, date: string): void {
    const t = title.trim();
    if (!t) { this.toast.error('Title is required'); return; }
    if (!Number.isFinite(money) || money < 0) { this.toast.error('Amount must be >= 0'); return; }
    const cat = category.trim() || 'Uncategorized';
    const d = date || new Date().toISOString().slice(0, 10);
    if (!this.userId) return;
    this.isSaving.set(true);
    this.dashboard
      .createNew(this.userId, t, description.trim(), money, cat, d, this.selectedNewTags())
      .pipe(
        catchError((err) => { this.toast.error(err.error?.message || 'Create failed'); throw err; }),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe((res) => {
        if (res.message === 'Success') {
          this.toast.success('Entry filed.');
          this.selectedNewTags.set([]);
          this.showCreatePanel.set(false);
          this.fetchData();
          this.fetchSummary();
        }
      });
  }

  askDelete(entry: DataList): void {
    this.deleteTarget.set(entry);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || !this.userId) return;
    this.dashboard
      .deleteItem(this.userId, target._id)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Delete failed'); throw err; }))
      .subscribe((res: unknown) => {
        const msg = (res as { message?: string })?.message;
        if (msg === 'Success') {
          this.toast.success('Entry removed.');
          this.deleteTarget.set(null);
          this.fetchData();
          this.fetchSummary();
        }
      });
  }

  startEdit(entry: DataList): void {
    this.editingId.set(this.editingId() === entry._id ? null : entry._id);
  }

  saveEdit(id: string, title: string, description: string, money: number, category: string, tagsInput: string): void {
    const t = title.trim();
    if (!t) { this.toast.error('Title is required'); return; }
    const tags = parseTagsInput(tagsInput);
    if (!this.userId) return;
    this.dashboard
      .editItem(this.userId, id, t, description.trim(), Number.isFinite(money) ? money : 0, category.trim() || 'Uncategorized', tags)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Update failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.toast.success('Entry updated.');
          this.editingId.set(null);
          this.fetchData();
          this.fetchSummary();
        }
      });
  }

  exportCsv(): void {
    if (!this.userId) return;
    this.dashboard
      .exportCsv(this.userId, {
        q: this.search() || undefined,
        category: this.categoryFilter() === 'All' ? undefined : this.categoryFilter(),
        month: this.monthFilter() || undefined,
      })
      .pipe(catchError(() => { this.toast.error('Export failed'); throw new Error('export'); }))
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'spnt-export.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success('CSV exported.');
      });
  }

  onImportFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.userId) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const entries = this.parseCsvToEntries(String(reader.result || ''));
        if (!entries.length) { this.toast.error('No valid rows in CSV'); return; }
        this.isImporting.set(true);
        this.dashboard
          .importEntries(this.userId!, entries)
          .pipe(
            catchError((err) => { this.toast.error(err.error?.message || 'Import failed'); throw err; }),
            finalize(() => this.isImporting.set(false))
          )
          .subscribe((res) => {
            this.importResult.set({ imported: res.imported, skipped: res.skipped ?? [] });
            this.fetchData();
            this.fetchSummary();
          });
      } catch {
        this.toast.error('Could not parse CSV');
      }
    };
    reader.readAsText(file);
  }

  parseCsvToEntries(text: string): ImportEntry[] {
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length < 2) return [];
    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (n: string) => header.indexOf(n);
    const ti = idx('title');
    if (ti === -1) throw new Error('missing title');
    const mi = idx('money');
    const ci = idx('category');
    const di = idx('date');
    const dei = idx('description');
    const tai = idx('tags');
    const out: ImportEntry[] = [];
    for (let i = 1; i < lines.length && out.length < 1000; i++) {
      const cols = parseCsvLine(lines[i]);
      const title = (cols[ti] || '').trim();
      if (!title) continue;
      const money = Number((cols[mi] || '0').trim());
      out.push({
        title: title.slice(0, 120),
        money: Number.isFinite(money) ? money : 0,
        category: ((cols[ci] || '').trim() || 'Uncategorized').slice(0, 40),
        date: ((cols[di] || '').trim() || new Date().toISOString().slice(0, 10)).slice(0, 10),
        description: (cols[dei] || '').slice(0, 2000),
        tags: (cols[tai] || '')
          .split('|')
          .map(normalizeTag)
          .filter(Boolean)
          .slice(0, 20),
      });
    }
    return out;
  }

  printLedger(): void {
    window.print();
  }

  toggleNewTag(tag: string): void {
    const n = normalizeTag(tag);
    if (!n) return;
    this.selectedNewTags.update((cur) => (cur.includes(n) ? cur.filter((c) => c !== n) : [...cur, n]));
  }

  addCustomNewTag(raw: string): void {
    const n = normalizeTag(raw);
    if (!n) return;
    this.selectedNewTags.update((cur) => (cur.includes(n) ? cur : [...cur, n]));
  }

  removeNewTag(tag: string): void {
    this.selectedNewTags.update((cur) => cur.filter((c) => c !== tag));
  }

  getTagsInputValue(tags?: string[]): string {
    return tags?.length ? tags.join(', ') : '';
  }
}
