import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { DashboardBarDatum, DashboardMetric } from '../models/dashboard.model';
import { AuthService } from './auth.service';
import { SedesService } from './sedes.service';
import { TicketsService } from './tickets.service';
import { VisitasService } from './visitas.service';
import { filterTicketsBySession, filterVisitasBySession } from '../utils/visibility.util';
import { isTicketOpen, isTicketOverdue } from '../utils/sla.util';

export interface DashboardViewModel {
  kpis: DashboardMetric[];
  priorities: DashboardBarDatum[];
  states: DashboardBarDatum[];
  topSedes: DashboardBarDatum[];
  todayVisits: DashboardBarDatum[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly visitasService = inject(VisitasService);
  private readonly sedesService = inject(SedesService);

  getDashboard(): Observable<DashboardViewModel> {
    return combineLatest([
      this.authService.session$,
      this.ticketsService.getAll(),
      this.visitasService.getAll(),
      this.sedesService.getAll()
    ]).pipe(
      map(([session, tickets, visitas, sedes]) => {
        const visibleTickets = filterTicketsBySession(tickets, session);
        const visibleVisitas = filterVisitasBySession(visitas, visibleTickets, session);
        const today = new Date().toISOString().slice(0, 10);

        return {
          kpis: [
            { label: 'Tickets abiertos', value: visibleTickets.filter(isTicketOpen).length, accent: 'var(--info)' },
            {
              label: 'Tickets vencidos SLA',
              value: visibleTickets.filter((ticket) => isTicketOverdue(ticket)).length,
              accent: 'var(--danger)'
            },
            {
              label: 'Visitas de hoy',
              value: visibleVisitas.filter((visita) => visita.fechaProgramada === today).length,
              accent: 'var(--warning)'
            },
            {
              label: 'Tickets resueltos',
              value: visibleTickets.filter((ticket) => ticket.estado === 'RESUELTO').length,
              accent: 'var(--success)'
            }
          ],
          priorities: ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'].map((priority) => ({
            label: priority,
            value: visibleTickets.filter((ticket) => ticket.prioridad === priority).length
          })),
          states: ['REGISTRADO', 'EN_REVISION', 'ASIGNADO', 'EN_ATENCION', 'RESUELTO', 'CERRADO', 'CANCELADO'].map(
            (state) => ({
              label: state,
              value: visibleTickets.filter((ticket) => ticket.estado === state).length
            })
          ),
          topSedes: sedes
            .map((sede) => ({
              label: sede.nombre,
              value: visibleTickets.filter((ticket) => ticket.sedeId === sede.id).length
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5),
          todayVisits: visibleVisitas
            .filter((visita) => visita.fechaProgramada === today)
            .map((visita) => ({
              label: visita.codigo,
              value: 1
            }))
        };
      })
    );
  }
}
