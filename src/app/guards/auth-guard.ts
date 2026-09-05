import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

function isLoggedIn(routeUserId: string | null): boolean {
  if (typeof localStorage === 'undefined') return false;
  const token = localStorage.getItem('token');
  const storedId = localStorage.getItem('userId');
  if (!token || !storedId) return false;
  if (routeUserId && routeUserId !== storedId) return false;
  return true;
}

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const paramId = (route.params as Record<string, string>)['userId'] ?? null;
  if (isLoggedIn(paramId)) return true;
  return router.createUrlTree(['/auth']);
};

export const publicOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('token');
    const storedId = localStorage.getItem('userId');
    if (token && storedId) return router.createUrlTree(['/home', storedId]);
  }
  return true;
};
