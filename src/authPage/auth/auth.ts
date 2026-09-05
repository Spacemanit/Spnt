import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize } from 'rxjs';
import { AuthService } from '../../services/auth-service';
import { ToastService } from '../../services/toast-service';
import { InkHeader } from '../../app/components/ink-header';

@Component({
  selector: 'app-auth',
  imports: [RouterLink, InkHeader],
  templateUrl: './auth.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  mode = signal<'login' | 'signup'>('login');
  isBusy = signal(false);
  formError = signal<string>('');

  private validEmail(email: string): boolean {
    return /^\S+@\S+\.\S+$/.test(email.trim());
  }

  login(email: string, password: string) {
    const e = email.trim();
    this.formError.set('');
    if (!this.validEmail(e)) {
      this.formError.set('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      this.formError.set('Password must be at least 6 characters.');
      return;
    }
    this.isBusy.set(true);
    this.authService
      .getLogin(e, password)
      .pipe(
        catchError((err) => {
          const msg = err.error?.message || 'Login failed. Check email/password.';
          this.formError.set(msg);
          this.toast.error(msg);
          throw err;
        }),
        finalize(() => this.isBusy.set(false))
      )
      .subscribe((response) => {
        if (response.message === 'Success') {
          try {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response.userId);
            localStorage.setItem('currency', response.currency || 'USD');
          } catch {
            /* storage unavailable */
          }
          this.toast.success('Logged in. Loading ledger…');
          void this.router.navigate(['/home', response.userId]);
        }
      });
  }

  signup(name: string, email: string, password: string) {
    const n = name.trim();
    const e = email.trim();
    this.formError.set('');
    if (n.length < 2) {
      this.formError.set('Enter your name (min 2 characters).');
      return;
    }
    if (!this.validEmail(e)) {
      this.formError.set('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      this.formError.set('Password must be at least 6 characters.');
      return;
    }
    this.isBusy.set(true);
    this.authService
      .getSignUp(e, password, n)
      .pipe(
        catchError((err) => {
          const msg = err.error?.message || 'Signup failed.';
          this.formError.set(msg);
          this.toast.error(msg);
          throw err;
        }),
        finalize(() => this.isBusy.set(false))
      )
      .subscribe(() => {
        this.toast.success('Account created. Please log in.');
        this.mode.set('login');
      });
  }
}
