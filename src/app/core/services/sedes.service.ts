import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, take } from 'rxjs';
import { Sede } from '../models/sede.model';
import { generateYearlyCode } from '../utils/code-generator.util';
import { JsonServerApiService } from './json-server-api.service';

type SedePayload = Omit<Sede, 'id' | 'codigo'>;

@Injectable({ providedIn: 'root' })
export class SedesService {
  private readonly api = inject(JsonServerApiService);

  getAll(): Observable<Sede[]> {
    return this.api.list<Sede>('sedes');
  }

  getById(id: number): Observable<Sede> {
    return this.api.getById<Sede>('sedes', id);
  }

  create(payload: SedePayload): Observable<Sede> {
    return this.getAll().pipe(
      take(1),
      switchMap((sedes) =>
        this.api.create<Sede>('sedes', {
          ...payload,
          codigo: generateYearlyCode(
            'SDE',
            sedes.map((sede) => sede.codigo)
          )
        })
      )
    );
  }

  update(id: number, payload: SedePayload): Observable<Sede> {
    return this.getById(id).pipe(
      take(1),
      switchMap((current) =>
        this.api.update<Sede>('sedes', id, {
          ...current,
          ...payload
        })
      )
    );
  }
}
