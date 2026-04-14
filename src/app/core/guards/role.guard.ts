/**
 * @fileoverview Guardián de rutas basado en roles de usuario.
 * Protege la navegación en Angular verificando los permisos del usuario activo.
 */

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { UsuarioRol } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';

/**
 * Extrae los roles permitidos definidos en la data de la ruta activa.
 * * @param {ActivatedRouteSnapshot} route - La instantánea de la ruta actual.
 * @returns {UsuarioRol[]} Arreglo de roles permitidos para esta ruta.
 */
function getRoles(route: ActivatedRouteSnapshot): UsuarioRol[] {
  return (route.data['roles'] as UsuarioRol[] | undefined) ?? [];
}

/**
 * Función CanActivate que intercepta la navegación.
 * Valida si el usuario autenticado posee al menos uno de los roles requeridos.
 * * @type {CanActivateFn}
 * @returns {boolean | import('@angular/router').UrlTree} `true` si tiene acceso, o redirige al dashboard si es denegado.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = getRoles(route);

  // TODO: Bug intencional inyectado para evaluación. 
  // Falla cuando la ruta no requiere roles específicos.
  if (authService.hasRole(roles)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
