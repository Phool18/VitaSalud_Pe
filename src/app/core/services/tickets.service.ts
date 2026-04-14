import { inject, Injectable } from '@angular/core';
import { Observable, of, switchMap, take, throwError } from 'rxjs';
import {
  TicketCreatePayload,
  TicketSoporte,
  TicketUpdatePayload
} from '../models/ticket-soporte.model';
import { ActivoTi } from '../models/activo-ti.model';
import { Sede } from '../models/sede.model';
import { VisitaTecnica } from '../models/visita-tecnica.model';
import { generateYearlyCode } from '../utils/code-generator.util';
import { SLA_HORAS, calcularFechaLimiteSLA } from '../utils/sla.util';
import {
  canAssignTicket,
  canCancelTicket,
  canCloseTicket,
  canCreateTicketForActivo,
  canCreateTicketForSede,
  canMoveTicketToReview,
  canResolveTicket
} from '../utils/ticket-rules.util';
import { JsonServerApiService } from './json-server-api.service';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly api = inject(JsonServerApiService);

  getAll(): Observable<TicketSoporte[]> {
    return this.api.list<TicketSoporte>('tickets');
  }

  getById(id: number): Observable<TicketSoporte> {
    return this.api.getById<TicketSoporte>('tickets', id);
  }

  create(payload: TicketCreatePayload): Observable<TicketSoporte> {
    return this.api.getById<Sede>('sedes', payload.sedeId).pipe(
      take(1),
      switchMap((sede) => {
        if (!canCreateTicketForSede(sede)) {
          return throwError(
            () => new Error('La sede no está activa. No se puede registrar el ticket.')
          );
        }

        const activoCheck$ = payload.activoId
          ? this.api.getById<ActivoTi>('activos', payload.activoId).pipe(
              take(1),
              switchMap((activo) => {
                if (!canCreateTicketForActivo(activo)) {
                  return throwError(
                    () =>
                      new Error(
                        'El activo seleccionado no está disponible (DE_BAJA o FUERA_SERVICIO).'
                      )
                  );
                }
                return of(true);
              })
            )
          : of(true);

        return activoCheck$.pipe(
          switchMap(() =>
            this.getAll().pipe(
              take(1),
              switchMap((todos) => {
                const codigo = generateYearlyCode(
                  'TKT',
                  todos.map((t) => t.codigo)
                );
                const fechaRegistro = new Date().toISOString();
                const horasSla = SLA_HORAS[payload.prioridad];
                const fechaLimiteAtencion = calcularFechaLimiteSLA(
                  fechaRegistro,
                  horasSla
                ).toISOString();

                return this.api.create<TicketSoporte>('tickets', {
                  ...payload,
                  codigo,
                  fechaRegistro,
                  fechaLimiteAtencion,
                  estado: 'REGISTRADO',
                  tecnicoAsignadoId: null,
                  solucionResumen: null,
                  fechaCierre: null
                });
              })
            )
          )
        );
      })
    );
  }

  update(id: number, payload: TicketUpdatePayload): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((current) => {
        const horasSla = SLA_HORAS[payload.prioridad];
        const fechaLimiteAtencion = calcularFechaLimiteSLA(
          current.fechaRegistro,
          horasSla
        ).toISOString();

        return this.api.update<TicketSoporte>('tickets', id, {
          ...current,
          ...payload,
          fechaLimiteAtencion
        });
      })
    );
  }

  moveToReview(id: number): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((ticket) => {
        if (!canMoveTicketToReview(ticket)) {
          return throwError(
            () => new Error('El ticket solo puede pasar a EN_REVISION desde REGISTRADO.')
          );
        }
        return this.api.patch<TicketSoporte>('tickets', id, { estado: 'EN_REVISION' });
      })
    );
  }

  assign(id: number, tecnicoId: number): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((ticket) => {
        if (!canAssignTicket(ticket)) {
          return throwError(
            () => new Error('El ticket solo puede asignarse desde EN_REVISION.')
          );
        }
        return this.api.patch<TicketSoporte>('tickets', id, {
          estado: 'ASIGNADO',
          tecnicoAsignadoId: tecnicoId
        });
      })
    );
  }

  resolve(id: number, solucionResumen: string): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((ticket) =>
        this.api
          .list<VisitaTecnica>('visitas', { ticketId: id })
          .pipe(
            take(1),
            switchMap((visitas) => {
              if (!canResolveTicket(ticket, visitas)) {
                return throwError(
                  () =>
                    new Error(
                      'Para resolver el ticket debe existir al menos una visita finalizada con solución aplicada.'
                    )
                );
              }
              return this.api.patch<TicketSoporte>('tickets', id, {
                estado: 'RESUELTO',
                solucionResumen: solucionResumen.trim()
              });
            })
          )
      )
    );
  }

  close(id: number): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((ticket) => {
        if (!canCloseTicket(ticket)) {
          return throwError(
            () => new Error('El ticket solo puede cerrarse cuando está en estado RESUELTO.')
          );
        }
        return this.api.patch<TicketSoporte>('tickets', id, {
          estado: 'CERRADO',
          fechaCierre: new Date().toISOString()
        });
      })
    );
  }

  cancel(id: number): Observable<TicketSoporte> {
    return this.getById(id).pipe(
      take(1),
      switchMap((ticket) => {
        if (!canCancelTicket(ticket)) {
          return throwError(
            () => new Error('No se puede cancelar un ticket ya cerrado o cancelado.')
          );
        }
        return this.api.patch<TicketSoporte>('tickets', id, { estado: 'CANCELADO' });
      })
    );
  }
}
