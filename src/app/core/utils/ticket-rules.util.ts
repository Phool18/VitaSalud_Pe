/**
 * @fileoverview Motor centralizado de reglas de negocio para los Tickets de Soporte.
 * Define las transiciones de estado permitidas y las autorizaciones basadas en el estado del activo o sede.
 */

import { ActivoTi } from '../models/activo-ti.model';
import { Sede } from '../models/sede.model';
import { TicketEstado, TicketSoporte } from '../models/ticket-soporte.model';
import { VisitaTecnica } from '../models/visita-tecnica.model';

/**
 * Verifica si es legalmente posible crear un ticket para una sede específica.
 * @param {Sede | undefined} sede - La sede a evaluar.
 * @returns {boolean} `true` si la sede está activa.
 */
export function canCreateTicketForSede(sede: Sede | undefined): boolean {
  return sede?.estado === 'ACTIVA';
}

/**
 * Verifica si un Activo TI es elegible para recibir soporte técnico.
 * @param {ActivoTi | undefined} activo - El equipo o activo reportado.
 * @returns {boolean} `false` si el activo está dado de baja o fuera de servicio.
 */
export function canCreateTicketForActivo(activo: ActivoTi | undefined): boolean {
  if (!activo) return true;
  return activo.estado !== 'DE_BAJA' && activo.estado !== 'FUERA_SERVICIO';
}

/**
 * Determina si el sistema permite la edición de un ticket existente.
 * @param {TicketSoporte} ticket - El ticket en cuestión.
 * @returns {boolean} `true` si el estado actual permite modificaciones.
 */
export function canEditTicket(ticket: TicketSoporte): boolean {
  // TODO: Bug de negocio inyectado. 
  // Los técnicos se quejarán de que no pueden editar tickets cuando se los asignan.
  return ['REGISTRADO', 'EN_REVISION'].includes(ticket.estado);
}

/**
 * Evalúa si un ticket cumple con todos los requisitos técnicos para ser marcado como 'RESUELTO'.
 * Exige obligatoriamente que exista al menos una visita técnica finalizada con solución.
 * * @param {TicketSoporte} ticket - El ticket a evaluar.
 * @param {VisitaTecnica[]} visitas - Historial de visitas asociadas al ticket.
 * @returns {boolean} `true` si es posible resolver el ticket.
 */
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

export function hasActiveVisit(visitas: VisitaTecnica[]): boolean {
  return visitas.some((visita) => ['PROGRAMADA', 'EN_CURSO'].includes(visita.estado));
}
