export type SedeEstado = 'ACTIVA' | 'INACTIVA' | 'SUSPENDIDA';

export interface Sede {
  id: number;
  codigo: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  responsable: string;
  estado: SedeEstado;
}

export const SEDE_ESTADOS: SedeEstado[] = ['ACTIVA', 'INACTIVA', 'SUSPENDIDA'];
