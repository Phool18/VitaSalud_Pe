import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../utils/api.util';

export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAbsoluteUrl = /^https?:\/\//i.test(req.url);

  const headers: Record<string, string> = {};
  // FIX: solo inyectar X-User-Id si hay sesión activa, para evitar NPE
  if (authService.snapshot) {
    headers['X-User-Id'] = `${authService.snapshot.id}`;
  }

  const request = req.clone({
    url: isAbsoluteUrl ? req.url : `${API_BASE_URL}/${req.url}`,
    setHeaders: headers
  });

  return next(request);
};
