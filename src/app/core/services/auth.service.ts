/**
 * @fileoverview Servicio principal de autenticación y manejo de sesión.
 * Controla el ciclo de vida del usuario dentro de la aplicación.
 */

import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { AppSession } from '../models/app-session.model';
import { Usuario, UsuarioRol } from '../models/usuario.model';
import { JsonServerApiService } from './json-server-api.service';

/** @constant {string} Llave utilizada para persistir la sesión en el navegador */
const STORAGE_KEY = 'vitasalud-session';

/**
 * Servicio inyectable que gestiona el estado global de la sesión del usuario.
 * @class
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(JsonServerApiService);
  private readonly sessionSubject = new BehaviorSubject<AppSession | null>(this.readStoredSession());

  /** @public Flujo reactivo (Observable) que emite los cambios en la sesión activa */
  readonly session$ = this.sessionSubject.asObservable();

  /**
   * Obtiene una copia síncrona del estado actual de la sesión.
   * @returns {AppSession | null} La sesión activa o null si es invitado.
   */
  get snapshot(): AppSession | null {
    return this.sessionSubject.value;
  }

  /**
   * Autentica a un usuario contra la API y establece su sesión global.
   * @param {string} email - Correo electrónico del usuario.
   * @param {string} password - Contraseña en texto plano.
   * @returns {Observable<AppSession>} Observable con la sesión generada.
   * @throws {Error} Si las credenciales no coinciden o el usuario está inactivo.
   */
  login(email: string, password: string): Observable<AppSession> {
    return this.api
      .list<Usuario>('usuarios', {
        email: email.trim().toLowerCase(),
        password,
        activo: true
      })
      .pipe(
        map((usuarios) => {
          const usuario = usuarios;
          if (!usuario) {
            throw new Error('Credenciales inválidas o usuario inactivo.');
          }
          return this.toSession(usuario);
        }),
        tap((session) => this.saveSession(session))
      );
  }

  /**
   * Destruye la sesión actual y limpia el almacenamiento local.
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    // TODO: Bug intencional (Zombie Session).
    // El localStorage se limpia, pero los componentes reactivos no se enteran.
    // this.sessionSubject.next(null);
  }

  /**
   * Verifica si el usuario actual posee alguno de los roles requeridos.
   * @param {UsuarioRol[]} roles - Arreglo de roles permitidos.
   * @returns {boolean} `true` si tiene acceso.
   */
  hasRole(roles: UsuarioRol[]): boolean {
    return roles.includes(this.snapshot?.rol ?? 'SEDE') && Boolean(this.snapshot);
  }

  private saveSession(session: AppSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private readStoredSession(): AppSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AppSession;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private toSession(usuario: Usuario): AppSession {
    return {
      id: usuario.id,
      nombreCompleto: usuario.nombreCompleto,
      email: usuario.email,
      rol: usuario.rol,
      sedeId: usuario.sedeId
    };
  }
}
