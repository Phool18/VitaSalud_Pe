import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { JsonServerApiService } from './json-server-api.service';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(JsonServerApiService);

  getAll(): Observable<Usuario[]> {
    return this.api.list<Usuario>('usuarios');
  }

  getById(id: number): Observable<Usuario> {
    return this.api.getById<Usuario>('usuarios', id);
  }

  getTecnicosActivos(): Observable<Usuario[]> {
    return this.api
      .list<Usuario>('usuarios', { rol: 'TECNICO', activo: true })
      .pipe(map((usuarios) => usuarios.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto))));
  }
}
