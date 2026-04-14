import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { AppSession } from '../models/app-session.model';
import { Usuario, UsuarioRol } from '../models/usuario.model';
import { JsonServerApiService } from './json-server-api.service';

const STORAGE_KEY = 'vitasalud-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(JsonServerApiService);
  private readonly sessionSubject = new BehaviorSubject<AppSession | null>(this.readStoredSession());

  readonly session$ = this.sessionSubject.asObservable();

  get snapshot(): AppSession | null {
    return this.sessionSubject.value;
  }

  login(email: string, password: string): Observable<AppSession> {
    return this.api
      .list<Usuario>('usuarios', {
        email: email.trim().toLowerCase(),
        password,
        activo: true
      })
      .pipe(
        map((usuarios) => {
          // FIX: usuarios es un array; se debe tomar el primer elemento
          const usuario = usuarios[0];
          if (!usuario) {
            throw new Error('Credenciales inválidas o usuario inactivo.');
          }
          return this.toSession(usuario);
        }),
        tap((session) => this.saveSession(session))
      );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    // FIX: notificar a todos los suscriptores que la sesión terminó
    this.sessionSubject.next(null);
  }

  hasRole(roles: UsuarioRol[]): boolean {
    if (!this.snapshot) return false;
    if (roles.length === 0) return true;
    return roles.includes(this.snapshot.rol);
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
