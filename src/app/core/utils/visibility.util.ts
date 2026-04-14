import { ActivoTi } from '../models/activo-ti.model';
import { AppSession } from '../models/app-session.model';
import { TicketSoporte } from '../models/ticket-soporte.model';
import { VisitaTecnica } from '../models/visita-tecnica.model';

export function isPrivilegedUser(session: AppSession | null): boolean {
  return session?.rol === 'ADMIN' || session?.rol === 'SOPORTE';
}

export function filterTicketsBySession(
  tickets: TicketSoporte[],
  session: AppSession | null
): TicketSoporte[] {
  if (!session) {
    return [];
  }

  if (isPrivilegedUser(session)) {
    return tickets;
  }

  if (session.rol === 'SEDE') {
    return tickets.filter((ticket) => ticket.sedeId === session.sedeId);
  }

  return tickets.filter((ticket) => ticket.tecnicoAsignadoId === session.id);
}

export function filterActivosBySession(
  activos: ActivoTi[],
  session: AppSession | null
): ActivoTi[] {
  if (!session) {
    return [];
  }

  if (isPrivilegedUser(session) || session.rol === 'TECNICO') {
    return activos;
  }

  return activos.filter((activo) => activo.sedeId === session.sedeId);
}

export function filterVisitasBySession(
  visitas: VisitaTecnica[],
  tickets: TicketSoporte[],
  session: AppSession | null
): VisitaTecnica[] {
  if (!session) {
    return [];
  }

  if (isPrivilegedUser(session)) {
    return visitas;
  }

  if (session.rol === 'TECNICO') {
    return visitas.filter((visita) => visita.tecnicoId === session.id);
  }

  const ticketIds = new Set(
    tickets.filter((ticket) => ticket.sedeId === session.sedeId).map((ticket) => ticket.id)
  );

  return visitas.filter((visita) => ticketIds.has(visita.ticketId));
}
