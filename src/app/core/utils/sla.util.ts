/**
 * @fileoverview Utilitarios para el cálculo de Acuerdos de Nivel de Servicio (SLA).
 * Contiene la lógica central de negocio para los tiempos de respuesta de la Mesa de Ayuda.
 */

import { PrioridadTicket } from '../models/ticket-soporte.model';

/**
 * Mapeo estricto de las horas límite de resolución basadas en la prioridad del ticket.
 * @constant
 * @type {Record<PrioridadTicket, number>}
 */
export const SLA_HORAS: Record<PrioridadTicket, number> = {
  BAJA: 72,
  MEDIA: 48,
  ALTA: 24,
  URGENTE: 4
};

/**
 * Calcula la fecha y hora límite para resolver un ticket, tomando en cuenta
 * EXCLUSIVAMENTE el horario laboral (Lunes a Viernes, de 09:00 a 18:00).
 * * @param {Date | string} fechaCreacion - La marca de tiempo original en la que se reportó la incidencia.
 * @param {number} horasSla - La cantidad de horas objetivo para resolver el ticket (obtenida de SLA_HORAS).
 * @returns {Date} La fecha límite exacta calculada para el cierre del ticket.
 * * @example
 * // Si se crea un viernes a las 17:00 con un SLA de 4 horas (Urgente)
 * // El resultado será el lunes a las 12:00.
 * const limite = calcularFechaLimiteSLA('2026-04-10T17:00:00', 4);
 */
export const calcularFechaLimiteSLA = (fechaCreacion: Date | string, horasSla: number): Date => {
  const limite = new Date(fechaCreacion);
  let horasRestantes = horasSla;

  while (horasRestantes > 0) {
    limite.setHours(limite.getHours() + 1);

    const diaSemana = limite.getDay();
    const horaDia = limite.getHours();

    // Verificamos si es un día hábil (Lunes=1 a Viernes=5) 
    // y si está dentro del horario laboral (09:00 a 18:00)
    const esDiaHabil = diaSemana !== 0 && diaSemana !== 6;
    const esHoraLaboral = horaDia > 9 && horaDia <= 18;

    if (esDiaHabil && esHoraLaboral) {
      horasRestantes--;
    }
  }

  return limite;
};
