import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError } from 'rxjs';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.html',
  styles: ``,
})
export class Profile {
  authService = inject(AuthService);
  userId: string | null = null;
  route = inject(ActivatedRoute);
  userData = {name: '', email: '', password: ''};
  isPasswordChange: boolean = false;

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
        throw err;
      })
    )
    .subscribe((response: any) => {
      console.log('Profile data: ', response);
      this.userData = response.data;
    });
  }

  passwordChange(newPassword: string) {
    console.log('Changing password to: ' + newPassword);
    if (newPassword && newPassword.length) {
      this.authService.changePassword(this.userId!, newPassword, this.userData.name, this.userData.email)
      .pipe(
        catchError((err) => {
          alert(err.error?.message);
          throw err;
        })
      )
      .subscribe((response: any) => {
        console.log('Password change response: ', response);
        if (response.message === 'Success') {
          alert('Password changed successfully');
        }
      });
    }
  }
}
