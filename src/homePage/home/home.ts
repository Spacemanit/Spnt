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

  dataList = signal<DataList[]>([]);
  userCurrency = signal(localStorage.getItem('currency') || 'USD');
  isLoading = signal(false);
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
    if (this.userId) {
      this.dashboardService.createNew(this.userId, title, description, money, category, date)
        .pipe(
          catchError(err => {
            alert(err);
            throw err;
          })
        )
        .subscribe((response: any) => {
          if (response.message === "Success") {
            console.log("Data created successfully");
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
        this.getSpentThisMonth();
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

  editItem(id: string, title: string, description: string, money: number, category: string) {
    this.dashboardService.editItem(this.userId!, id, title, description, money, category)
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

  getTotalSpent(): string {
    let total = 0;
    for (const item of this.dataList()) {
      total += item.money || 0;
    }
    return total.toLocaleString('en-US', { style: 'currency', currency: this.userCurrency() });
  }

  getSpentThisMonth(): string {
    const thisMonth = new Date().getMonth().toLocaleString('en-US', { minimumIntegerDigits: 2 });
    const thisYear = new Date().getFullYear();
    let total = 0;
    for (const item of this.dataList()) {
      const itemDate = new Date(item.date);
      if (itemDate.getMonth() === parseInt(thisMonth) && itemDate.getFullYear() === thisYear) {
        total += item.money || 0;
      }
    }
    return total.toLocaleString('en-US', { style: 'currency', currency: this.userCurrency() });
  }
}
