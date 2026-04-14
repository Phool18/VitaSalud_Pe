export type VisitaEstado = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';

export interface VisitaTecnica {
  id: number;
  codigo: string;
  ticketId: number;
  tecnicoId: number;
  fechaProgramada: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: VisitaEstado;
  diagnostico: string | null;
  solucionAplicada: string | null;
  observacion: string | null;
}

export interface VisitaCreatePayload {
  ticketId: number;
  tecnicoId: number;
  fechaProgramada: string;
  observacion: string | null;
}

export interface VisitaUpdatePayload {
  tecnicoId: number;
  fechaProgramada: string;
  observacion: string | null;
}

export const VISITA_ESTADOS: VisitaEstado[] = ['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'];
