export type TicketCategoria =
  | 'HARDWARE'
  | 'SOFTWARE'
  | 'RED'
  | 'IMPRESION'
  | 'ACCESOS'
  | 'OTROS';

export type TicketPrioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type TicketEstado =
  | 'REGISTRADO'
  | 'EN_REVISION'
  | 'ASIGNADO'
  | 'EN_ATENCION'
  | 'RESUELTO'
  | 'CERRADO'
  | 'CANCELADO';

export interface TicketSoporte {
  id: number;
  codigo: string;
  sedeId: number;
  activoId: number | null;
  categoria: TicketCategoria;
  prioridad: TicketPrioridad;
  titulo: string;
  descripcion: string;
  reportadoPor: string;
  fechaRegistro: string;
  fechaLimiteAtencion: string;
  estado: TicketEstado;
  tecnicoAsignadoId: number | null;
  solucionResumen: string | null;
  fechaCierre: string | null;
}

export interface TicketCreatePayload {
  sedeId: number;
  activoId: number | null;
  categoria: TicketCategoria;
  prioridad: TicketPrioridad;
  titulo: string;
  descripcion: string;
  reportadoPor: string;
}

export interface TicketUpdatePayload {
  activoId: number | null;
  categoria: TicketCategoria;
  prioridad: TicketPrioridad;
  titulo: string;
  descripcion: string;
}

export const TICKET_CATEGORIAS: TicketCategoria[] = [
  'HARDWARE',
  'SOFTWARE',
  'RED',
  'IMPRESION',
  'ACCESOS',
  'OTROS'
];

export const TICKET_PRIORIDADES: TicketPrioridad[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
export const TICKET_ESTADOS: TicketEstado[] = [
  'REGISTRADO',
  'EN_REVISION',
  'ASIGNADO',
  'EN_ATENCION',
  'RESUELTO',
  'CERRADO',
  'CANCELADO'
];
