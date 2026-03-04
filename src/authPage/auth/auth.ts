import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError } from "rxjs";
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-auth',
  imports: [],
  templateUrl: './auth.html',
  styles: ``,
  providers: [AuthService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  authService = inject(AuthService);
  mode = signal<'login' | 'signup'>('login');
  
  login(email: string, password: string) {
    this.authService.getLogin(email, password)
    .pipe(
      catchError((err) => {
        alert(err.error?.message);
        throw err;
      })
    )
    .subscribe((response: any) => {
      console.log('Login successful: ', response);
      if (response.message === 'Success') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userId', response.userId);
        localStorage.setItem('currency', response.currency);
        window.location.href = '/home/' + response.userId;
      }
    })
  }

  signup(name: string, email: string, password: string) {
    console.log('Signup:', { name, email, password });
    this.authService.getSignUp(email, password, name)
    .pipe(
      catchError((err) => {
        alert(err.error?.message);
        throw err;
      })
    )
    .subscribe((response: any) => {
      console.log('Sign Up Successful: ', response);
      this.mode.set('login');
    })
  }
}
