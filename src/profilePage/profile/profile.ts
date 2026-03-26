import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { catchError } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { UserData } from '../../models/UserData.type';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  authService = inject(AuthService);
  userId: string | null = null;
  route = inject(ActivatedRoute);
  userData = signal<UserData>({ name: '', email: '', password: '', budget: 0, currency: 'USD' });
  isPasswordChange: boolean = false;
  showToast = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  toastTimer: ReturnType<typeof setTimeout> | null = null;

  showUiToast(type: 'success' | 'error', message: string) {
    this.toastType = type;
    this.toastMessage = message;
    this.showToast = true;

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.showToast = false;
    }, 2200);
  }

  ngOnInit() {
    this.userId = this.route.snapshot.params['userId'];
    if (this.userId) {
      this.getProfile();
    }
  }

  getProfile() {
    this.authService.getProfile(this.userId!)
      .pipe(
        catchError((err) => {
          console.error('Error fetching profile data: ', err);
          this.showUiToast('error', err.error?.message || 'Failed to fetch profile data');
          throw err;
        })
      )
      .subscribe((response: any) => {
        this.userData.set({
          name: response.data?.name ?? '',
          email: response.data?.email ?? '',
          password: '',
          budget: response.data?.budget ?? localStorage.getItem('monthlyBudget') ?? 0,
          currency: response.data?.currency ?? localStorage.getItem('currency') ?? 'USD',
        });
        console.log('Profile data fetched successfully: ', this.userData());
      });
  }

  passwordChange(newPassword: string) {
    if (newPassword && newPassword.length) {
      this.authService.changePassword(this.userId!, newPassword)
        .pipe(
          catchError((err) => {
            this.showUiToast('error', err.error?.message || 'Failed to change password');
            throw err;
          })
        )
        .subscribe((response: any) => {
          if (response.message === 'Success') {
            this.showUiToast('success', 'Password changed successfully');
          }
        });
    }
  }

  changeBudget(newBudget: string) {
    if (!newBudget || Number.isNaN(Number(newBudget))) {
      this.showUiToast('error', 'Please enter a valid budget');
      return;
    }
    this.authService.updateBudget(this.userId!, Number(newBudget))
      .pipe(
        catchError((err) => {
          this.showUiToast('error', err.error?.message || 'Failed to update budget');
          throw err;
        })
      )
      .subscribe((response: any) => {
        if (response.message === 'Success') {
          this.userData.update((currentData) => ({ ...currentData, budget: Number(newBudget) }));
          localStorage.setItem('monthlyBudget', String(newBudget));
          this.showUiToast('success', 'Budget updated successfully');
        }
      });
  }

  changeCurrency(newCurrency: string) {
    if (!newCurrency || !newCurrency.trim()) {
      this.showUiToast('error', 'Please enter a valid currency');
      return;
    }
    const currency = newCurrency.trim().toUpperCase();
    this.authService.updateCurrency(this.userId!, currency)
      .pipe(
        catchError((err) => {
          this.showUiToast('error', err.error?.message || 'Failed to update currency');
          throw err;
        })
      )
      .subscribe((response: any) => {
        if (response.message === 'Success') {
          this.userData.update((currentData) => ({ ...currentData, currency: currency }));
          localStorage.setItem('currency', currency);
          this.showUiToast('success', 'Currency updated successfully');
        }
      });
  }
}