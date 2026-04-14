import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, switchMap, take, throwError } from 'rxjs';
import { TicketSoporte } from '../models/ticket-soporte.model';
import {
  VisitaCreatePayload,
  VisitaTecnica,
  VisitaUpdatePayload
} from '../models/visita-tecnica.model';
import { generateYearlyCode } from '../utils/code-generator.util';
import {
  canCreateVisit,
  hasActiveVisit,
  nextTicketStateAfterVisitCancellation,
  nextTicketStateAfterVisitStart
} from '../utils/ticket-rules.util';
import { JsonServerApiService } from './json-server-api.service';

@Injectable({ providedIn: 'root' })
export class VisitasService {
  private readonly api = inject(JsonServerApiService);

  getAll(): Observable<VisitaTecnica[]> {
    return this.api.list<VisitaTecnica>('visitas');
  }

  getByTicket(ticketId: number): Observable<VisitaTecnica[]> {
    return this.api.list<VisitaTecnica>('visitas', { ticketId });
  }

  getById(id: number): Observable<VisitaTecnica> {
    return this.api.getById<VisitaTecnica>('visitas', id);
  }

  create(payload: VisitaCreatePayload): Observable<VisitaTecnica> {
    return forkJoin({
      ticket: this.api.getById<TicketSoporte>('tickets', payload.ticketId).pipe(take(1)),
      visitas: this.api.list<VisitaTecnica>('visitas', { ticketId: payload.ticketId }).pipe(take(1)),
      allVisitas: this.getAll().pipe(take(1))
    }).pipe(
      switchMap(({ ticket, visitas, allVisitas }) => {
        if (!canCreateVisit(ticket)) {
          return throwError(
            () => new Error('No se puede crear una visita para un ticket cancelado o cerrado.')
          );
        }

        if (hasActiveVisit(visitas)) {
          return throwError(
            () => new Error('Ya existe una visita activa para este ticket en estado programada o en curso.')
          );
        }

        return this.api.create<VisitaTecnica>('visitas', {
          ...payload,
          codigo: generateYearlyCode(
            'VST',
            allVisitas.map((visita) => visita.codigo)
          ),
          fechaInicio: null,
          fechaFin: null,
          estado: 'PROGRAMADA',
          diagnostico: null,
          solucionAplicada: null
        });
      })
    );
  }

  update(id: number, payload: VisitaUpdatePayload): Observable<VisitaTecnica> {
    return this.getById(id).pipe(
      take(1),
      switchMap((visita) => {
        if (visita.estado !== 'PROGRAMADA') {
          return throwError(() => new Error('Solo se puede editar una visita programada.'));
        }

        return this.api.update<VisitaTecnica>('visitas', id, {
          ...visita,
          ...payload
        });
      })
    );
  }

  start(id: number): Observable<VisitaTecnica> {
    return this.getById(id).pipe(
      take(1),
      switchMap((visita) => {
        if (visita.estado !== 'PROGRAMADA') {
          return throwError(() => new Error('Solo se puede iniciar una visita programada.'));
        }

        return this.api.patch<VisitaTecnica>('visitas', id, {
          estado: 'EN_CURSO',
          fechaInicio: new Date().toISOString()
        });
      }),
      switchMap((visita) =>
        this.api
          .patch<TicketSoporte>('tickets', visita.ticketId, { estado: nextTicketStateAfterVisitStart() })
          .pipe(switchMap(() => this.getById(id)))
      )
    );
  }

  finish(
    id: number,
    diagnostico: string,
    solucionAplicada: string,
    observacion: string | null
  ): Observable<VisitaTecnica> {
    return this.getById(id).pipe(
      take(1),
      switchMap((visita) => {
        if (visita.estado !== 'EN_CURSO') {
          return throwError(() => new Error('Solo se puede finalizar una visita en curso.'));
        }

        if (!solucionAplicada.trim()) {
          return throwError(() => new Error('La solución aplicada es obligatoria al finalizar.'));
        }

        return this.api.patch<VisitaTecnica>('visitas', id, {
          estado: 'FINALIZADA',
          fechaFin: new Date().toISOString(),
          diagnostico: diagnostico.trim() || null,
          solucionAplicada: solucionAplicada.trim(),
          observacion: observacion?.trim() || null
        });
      })
    );
  }

  cancel(id: number): Observable<VisitaTecnica> {
    return this.getById(id).pipe(
      take(1),
      switchMap((visita) => {
        if (!['PROGRAMADA', 'EN_CURSO'].includes(visita.estado)) {
          return throwError(() => new Error('Solo se puede cancelar una visita activa.'));
        }

        return this.api.patch<VisitaTecnica>('visitas', id, {
          estado: 'CANCELADA',
          fechaFin: visita.fechaFin ?? new Date().toISOString()
        });
      }),
      switchMap((visita) =>
        this.api
          .getById<TicketSoporte>('tickets', visita.ticketId)
          .pipe(
            switchMap((ticket) =>
              this.api
                .patch<TicketSoporte>('tickets', ticket.id, {
                  estado: nextTicketStateAfterVisitCancellation(ticket)
                })
                .pipe(switchMap(() => this.getById(id)))
            )
          )
      )
    );
  }
}
