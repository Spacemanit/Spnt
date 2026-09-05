import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof localStorage === 'undefined') return next(req);
  const token = localStorage.getItem('token');
  if (!token) return next(req);
  // Only attach to our API calls
  if (!req.url.includes('/api/')) return next(req);
  return next(
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
  );
};
