/**
 * @fileoverview Utilitarios para el cálculo de Acuerdos de Nivel de Servicio (SLA).
 * Contiene la lógica central de negocio para los tiempos de respuesta de la Mesa de Ayuda.
 */

import { TicketPrioridad, TicketSoporte } from '../models/ticket-soporte.model';

/**
 * Mapeo estricto de las horas límite de resolución basadas en la prioridad del ticket.
 * CRITICA: +4h | ALTA: +8h | MEDIA: +24h | BAJA: +48h
 */
export const SLA_HORAS: Record<TicketPrioridad, number> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 24,
  BAJA: 48
};

/**
 * Calcula la fecha límite de atención en tiempo real (sin restricción de horario laboral),
 * sumando directamente las horas SLA a la fecha de creación.
 * Esto es coherente con la regla de negocio que habla de horas absolutas (+4h, +8h, etc.).
 */
export const calcularFechaLimiteSLA = (fechaCreacion: Date | string, horasSla: number): Date => {
  const limite = new Date(fechaCreacion);
  limite.setHours(limite.getHours() + horasSla);
  return limite;
};

/**
 * Determina si un ticket está vencido (fecha límite superada y no cerrado/cancelado).
 */
export function isTicketOverdue(ticket: TicketSoporte): boolean {
  if (['CERRADO', 'CANCELADO', 'RESUELTO'].includes(ticket.estado)) {
    return false;
  }
  return new Date() > new Date(ticket.fechaLimiteAtencion);
}

/**
 * Determina si un ticket está abierto (no cerrado ni cancelado).
 */
export function isTicketOpen(ticket: TicketSoporte): boolean {
  return !['CERRADO', 'CANCELADO'].includes(ticket.estado);
}
