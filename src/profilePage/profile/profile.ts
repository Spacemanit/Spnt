import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { ToastService } from '../../services/toast-service';
import { InkHeader } from '../../app/components/ink-header';
import { UserData } from '../../models/UserData.type';
import { SUPPORTED_CURRENCIES } from '../../app/constants/expense-meta';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, FormsModule, InkHeader],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  userId: string | null = null;
  userData = signal<UserData>({
    name: '',
    email: '',
    password: '',
    budget: 0,
    currency: 'USD',
    rolloverEnabled: false,
    savingsLabel: '',
    savingsTarget: 0,
    savingsDeadline: '',
  });
  currencies = [...SUPPORTED_CURRENCIES];
  isPasswordChange = false;
  confirmDelete = signal(false);

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    if (this.userId) this.getProfile();
  }

  getProfile(): void {
    this.authService
      .getProfile(this.userId!)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Failed to load profile'); throw err; }))
      .subscribe((response) => {
        this.userData.set({
          name: response.data?.name ?? '',
          email: response.data?.email ?? '',
          password: '',
          budget: response.data?.budget ?? 0,
          currency: response.data?.currency ?? 'USD',
          rolloverEnabled: !!response.data?.rolloverEnabled,
          savingsLabel: response.data?.savingsLabel ?? '',
          savingsTarget: response.data?.savingsTarget ?? 0,
          savingsDeadline: response.data?.savingsDeadline ?? '',
        });
        try {
          if (response.data?.currency) localStorage.setItem('currency', response.data.currency);
          if (response.data?.budget !== undefined) localStorage.setItem('monthlyBudget', String(response.data.budget));
        } catch { /* noop */ }
      });
  }

  passwordChange(newPassword: string): void {
    if (!newPassword || newPassword.length < 6) {
      this.toast.error('Password must be 6+ characters');
      return;
    }
    this.authService
      .changePassword(this.userId!, newPassword)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Password change failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.toast.success('Password stamped.');
          this.isPasswordChange = false;
        }
      });
  }

  changeBudget(newBudget: string): void {
    if (newBudget === '' || Number.isNaN(Number(newBudget)) || Number(newBudget) < 0) {
      this.toast.error('Enter a valid budget');
      return;
    }
    this.authService
      .updateBudget(this.userId!, Number(newBudget))
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Budget update failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.userData.update((d) => ({ ...d, budget: Number(newBudget) }));
          try { localStorage.setItem('monthlyBudget', String(newBudget)); } catch { /* noop */ }
          this.toast.success('Budget filed.');
        }
      });
  }

  changeCurrency(newCurrency: string): void {
    const currency = newCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      this.toast.error('Currency must be 3 letters (e.g. USD)');
      return;
    }
    this.authService
      .updateCurrency(this.userId!, currency)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Currency update failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.userData.update((d) => ({ ...d, currency }));
          try { localStorage.setItem('currency', currency); } catch { /* noop */ }
          this.toast.success('Currency filed.');
        }
      });
  }

  toggleRollover(enabled: boolean): void {
    if (!this.userId) return;
    this.authService
      .updateRollover(this.userId, enabled)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Rollover update failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.userData.update((d) => ({ ...d, rolloverEnabled: enabled }));
          this.toast.success(enabled ? 'Rollover on — leftover and debt carry.' : 'Rollover off.');
        }
      });
  }

  saveSavings(label: string, target: string, deadline: string): void {
    if (!this.userId) return;
    const t = target === '' ? 0 : Number(target);
    if (!Number.isFinite(t) || t < 0) { this.toast.error('Enter a valid savings target'); return; }
    if (deadline) {
      const d = new Date(deadline);
      if (Number.isNaN(d.getTime())) { this.toast.error('Invalid deadline'); return; }
    }
    this.authService
      .updateSavings(this.userId, { savingsLabel: label.trim().slice(0, 60), savingsTarget: t, savingsDeadline: deadline || '' })
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Goal update failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.userData.update((d) => ({ ...d, savingsLabel: label.trim().slice(0, 60), savingsTarget: t, savingsDeadline: deadline || '' }));
          this.toast.success('Savings goal filed.');
        }
      });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth']);
  }

  deleteAccount(): void {
    if (!this.userId) return;
    this.authService
      .deleteAccount(this.userId)
      .pipe(catchError((err) => { this.toast.error(err.error?.message || 'Delete failed'); throw err; }))
      .subscribe((res: unknown) => {
        if ((res as { message?: string })?.message === 'Success') {
          this.authService.logout();
          this.toast.success('Account removed.');
          void this.router.navigate(['/']);
        }
      });
  }
}
