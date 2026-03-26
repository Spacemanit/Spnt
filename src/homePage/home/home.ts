import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard-service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize } from 'rxjs';
import { DataList } from '../../models/DataList.type';
import { DatePipe } from '@angular/common';
import {
  AccordionGroup,
  AccordionTrigger,
  AccordionPanel,
  AccordionContent,
} from '@angular/aria/accordion';
import { Chart } from '../donutChart/chart/chart';

type MonthSections = {
  key: string;
  label: string;
  items: DataList[];
};

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, AccordionGroup, AccordionTrigger, AccordionPanel, Chart],
  templateUrl: './home.html',
  styles: ``,
})

export class Home implements OnInit {
  dashboardService = inject(DashboardService);
  route = inject(ActivatedRoute);
  userId: string | null = null;
  predefinedTags = ['essential', 'subscription', 'reimbursable', 'family', 'work', 'travel'];

  dataList = signal<DataList[]>([]);
  selectedNewTags = signal<string[]>([]);
  availableTags = computed(() => {
    const customTags = this.dataList()
      .flatMap((entry) => entry.tags ?? [])
      .map((tag) => this.normalizeTag(tag))
      .filter((tag) => !!tag);

    return [...new Set([...this.predefinedTags, ...customTags])];
  });
  userCurrency = signal(localStorage.getItem('currency') || 'USD');
  isLoading = signal(false);
  monthlyTotal = signal(0);
  budgetLeft = signal<string>('N/A');
  showCreatePanel = signal(false);
  visibleCount = signal(20);
  visibleEntries = computed(() => this.dataList().slice(0, this.visibleCount()));
  monthSections = computed<MonthSections[]>(() => {
    const monthFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: '2-digit'
    });
    const sections = new Map<string, MonthSections>();

    for (const entry of this.visibleEntries()) {
      const parsedDate = new Date(entry.date);
      if (Number.isNaN(parsedDate.getTime())) {
        continue;
      }

      const key = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`;
      const existingSection = sections.get(key);

      if (existingSection) {
        existingSection.items.push(entry);
      } else {
        sections.set(key, {
          key,
          label: monthFormatter.format(parsedDate),
          items: [entry]
        });
      }
    }

    return [...sections.values()].sort((a, b) => b.key.localeCompare(a.key));
  });


  ngOnInit() {
    this.userId = this.route.snapshot.params['userId'];
    if (this.userId) {
      this.fetchData();
    }
  }

  createNew(title: string, description: string, money: number, category: string, date: string) {
    console.log(this.userId);
    const tags = this.selectedNewTags();
    if (this.userId) {
      this.dashboardService.createNew(this.userId, title, description, money, category, date, tags)
        .pipe(
          catchError(err => {
            alert(err);
            throw err;
          })
        )
        .subscribe((response: any) => {
          if (response.message === "Success") {
            console.log("Data created successfully");
            this.selectedNewTags.set([]);
            this.fetchData();
          }
        })
    }
  }

  fetchData() {
    this.isLoading.set(true);
    this.visibleCount.set(20);
    this.dashboardService.getData(this.userId!)
      .pipe(
        catchError(err => {
          console.error(err);
          throw err;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe((response: any) => {
        this.dataList.set((response as { data: DataList[] }).data ?? []);
        this.recomputeDashboardTotals();
      });
  }

  toggleCreatePanel() {
    this.showCreatePanel.update((isOpen) => !isOpen);
  }

  showMore() {
    this.visibleCount.update((count) => {
      if (count >= 50) {
        return count += 40;
      }
      return count += 20;
    });
  }

  deleteItem(id: string) {
    console.log(id);
    this.dashboardService.deleteItem(this.userId!, id)
      .pipe(
        catchError(err => {
          console.error(err);
          throw err;
        }))
      .subscribe((response: any) => {
        if (response.message === "Success") {
          console.log("Data deleted successfully");
          this.fetchData();
        }
      })
  }

  editItem(id: string, title: string, description: string, money: number, category: string, tagsInput: string) {
    const tags = this.parseTagsInput(tagsInput);
    this.dashboardService.editItem(this.userId!, id, title, description, money, category, tags)
      .pipe(
        catchError(err => {
          console.error(err);
          throw err;
        }))
      .subscribe((response: any) => {
        if (response.message === "Success") {
          console.log("Data edited successfully");
          this.fetchData();
        }
      })
  }

  toggleNewTag(tag: string) {
    this.selectedNewTags.update((currentTags) => {
      const normalized = this.normalizeTag(tag);
      if (!normalized) {
        return currentTags;
      }
      if (currentTags.includes(normalized)) {
        return currentTags.filter((currentTag) => currentTag !== normalized);
      }
      return [...currentTags, normalized];
    });
  }

  addCustomNewTag(rawTag: string) {
    const normalized = this.normalizeTag(rawTag);
    if (!normalized) {
      return;
    }
    this.selectedNewTags.update((currentTags) => {
      if (currentTags.includes(normalized)) {
        return currentTags;
      }
      return [...currentTags, normalized];
    });
  }

  removeNewTag(tag: string) {
    this.selectedNewTags.update((currentTags) => currentTags.filter((currentTag) => currentTag !== tag));
  }

  parseTagsInput(tagsInput: string) {
    const tags = tagsInput
      .split(',')
      .map((tag) => this.normalizeTag(tag))
      .filter((tag) => !!tag);

    return [...new Set(tags)];
  }

  getTagsInputValue(tags?: string[]) {
    if (!tags?.length) {
      return '';
    }
    return tags.join(', ');
  }

  private normalizeTag(rawTag: string) {
    return rawTag.trim().toLowerCase();
  }

  getTotalSpent(): string {
    let total = 0;
    for (const item of this.dataList()) {
      total += item.money || 0;
    }
    return total.toLocaleString('en-US', { style: 'currency', currency: this.userCurrency() });
  }

  getSpentThisMonth(): string {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    let total = 0;
    for (const item of this.dataList()) {
      const itemDate = new Date(item.date);
      if (itemDate.getMonth() === thisMonth && itemDate.getFullYear() === thisYear) {
        total += item.money || 0;
      }
    }
    return total.toLocaleString('en-US', { style: 'currency', currency: this.userCurrency() });
  }

  private recomputeDashboardTotals() {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    let total = 0;

    for (const item of this.dataList()) {
      const itemDate = new Date(item.date);
      if (itemDate.getMonth() === thisMonth && itemDate.getFullYear() === thisYear) {
        total += item.money || 0;
      }
    }

    this.monthlyTotal.set(total);
    this.getBudgetLeft();
  }

  getBudgetLeft() {
    const monthlyBudget = localStorage.getItem('monthlyBudget');
    if (!monthlyBudget) {
      this.budgetLeft.set('N/A');
      return;
    }
    const budget = parseFloat(monthlyBudget);
    console.log('Budget:', budget, 'Monthly Total:', this.monthlyTotal());
    this.budgetLeft.set((budget - this.monthlyTotal()).toLocaleString('en-US', { style: 'currency', currency: this.userCurrency() }));
  }
}
