/**
 * @fileoverview Interceptor HTTP para peticiones de la Mesa de Ayuda.
 * Se encarga de adjuntar la URL base y los headers de autenticación dinámicamente.
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../utils/api.util';

/**
 * Intercepta todas las llamadas HttpClient salientes.
 * Si la URL no es absoluta, le concatena el API_BASE_URL.
 * Además, inyecta el ID del usuario en los headers.
 * * @type {HttpInterceptorFn}
 */
export const apiPrefixInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAbsoluteUrl = /^https?:\/\//i.test(req.url);

  // TODO: Riesgo de NPE (Null Pointer Exception). 
  // Evaluar qué pasa cuando el snapshot es nulo (Usuario no logueado).
  const request = req.clone({
    url: isAbsoluteUrl ? req.url : `${API_BASE_URL}/${req.url}`,
    setHeaders: {
      'X-User-Id': `${authService.snapshot.id}` 
    }
  });

  return next(request);
};
