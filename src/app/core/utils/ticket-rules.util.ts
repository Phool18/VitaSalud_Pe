/**
 * @fileoverview Motor centralizado de reglas de negocio para los Tickets de Soporte.
 * Define las transiciones de estado permitidas y las autorizaciones basadas en el estado del activo o sede.
 */

import { ActivoTi } from '../models/activo-ti.model';
import { Sede } from '../models/sede.model';
import { TicketEstado, TicketSoporte } from '../models/ticket-soporte.model';
import { VisitaTecnica } from '../models/visita-tecnica.model';

export function canCreateTicketForSede(sede: Sede | undefined): boolean {
  return sede?.estado === 'ACTIVA';
}

export function canCreateTicketForActivo(activo: ActivoTi | undefined): boolean {
  if (!activo) return true;
  return activo.estado !== 'DE_BAJA' && activo.estado !== 'FUERA_SERVICIO';
}

export function canMoveTicketToReview(ticket: TicketSoporte): boolean {
  return ticket.estado === 'REGISTRADO';
}

export function canAssignTicket(ticket: TicketSoporte): boolean {
  return ticket.estado === 'EN_REVISION';
}

export function canEditTicket(ticket: TicketSoporte): boolean {
  return ['REGISTRADO', 'EN_REVISION', 'ASIGNADO'].includes(ticket.estado);
}

export function canResolveTicket(ticket: TicketSoporte, visitas: VisitaTecnica[]): boolean {
  const hasFinishedVisitWithSolution = visitas.some(
    (visita) => visita.estado === 'FINALIZADA' && Boolean(visita.solucionAplicada?.trim())
  );
  return ['ASIGNADO', 'EN_ATENCION'].includes(ticket.estado) && hasFinishedVisitWithSolution;
}

export function canCloseTicket(ticket: TicketSoporte): boolean {
  return ticket.estado === 'RESUELTO';
}

export function canCancelTicket(ticket: TicketSoporte): boolean {
  return !['CERRADO', 'CANCELADO'].includes(ticket.estado);
}

export function canCreateVisit(ticket: TicketSoporte): boolean {
  return !['CANCELADO', 'CERRADO'].includes(ticket.estado);
}

export function hasActiveVisit(visitas: VisitaTecnica[]): boolean {
  return visitas.some((visita) => ['PROGRAMADA', 'EN_CURSO'].includes(visita.estado));
}

export function nextTicketStateAfterVisitStart(): TicketEstado {
  return 'EN_ATENCION';
}

export function nextTicketStateAfterVisitCancellation(ticket: TicketSoporte): TicketEstado {
  if (ticket.tecnicoAsignadoId) {
    return 'ASIGNADO';
  }
  return 'EN_REVISION';
}
