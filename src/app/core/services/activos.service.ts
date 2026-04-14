import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, take } from 'rxjs';
import { ActivoTi } from '../models/activo-ti.model';
import { generateYearlyCode } from '../utils/code-generator.util';
import { JsonServerApiService } from './json-server-api.service';

type ActivoPayload = Omit<ActivoTi, 'id' | 'codigoPatrimonial'>;

@Injectable({ providedIn: 'root' })
export class ActivosService {
  private readonly api = inject(JsonServerApiService);

  getAll(): Observable<ActivoTi[]> {
    return this.api.list<ActivoTi>('activos');
  }

  getById(id: number): Observable<ActivoTi> {
    return this.api.getById<ActivoTi>('activos', id);
  }

  create(payload: ActivoPayload): Observable<ActivoTi> {
    return this.getAll().pipe(
      take(1),
      switchMap((activos) =>
        this.api.create<ActivoTi>('activos', {
          ...payload,
          codigoPatrimonial: generateYearlyCode(
            'ACT',
            activos.map((activo) => activo.codigoPatrimonial)
          )
        })
      )
    );
  }

  update(id: number, payload: ActivoPayload): Observable<ActivoTi> {
    return this.getById(id).pipe(
      take(1),
      switchMap((current) =>
        this.api.update<ActivoTi>('activos', id, {
          ...current,
          ...payload
        })
      )
    );
  }
}
