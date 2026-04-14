export type ActivoTipo =
  | 'PC'
  | 'IMPRESORA'
  | 'ROUTER'
  | 'SWITCH'
  | 'LECTOR_BARRAS'
  | 'CAMARA'
  | 'OTROS';

export type ActivoCriticidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type ActivoEstado =
  | 'OPERATIVO'
  | 'EN_MANTENIMIENTO'
  | 'FUERA_SERVICIO'
  | 'DE_BAJA';

export interface ActivoTi {
  id: number;
  codigoPatrimonial: string;
  sedeId: number;
  nombre: string;
  tipo: ActivoTipo;
  marca: string;
  modelo: string;
  numeroSerie: string;
  criticidad: ActivoCriticidad;
  estado: ActivoEstado;
  activo: boolean;
  fechaRegistro: string;
}

export const ACTIVO_TIPOS: ActivoTipo[] = [
  'PC',
  'IMPRESORA',
  'ROUTER',
  'SWITCH',
  'LECTOR_BARRAS',
  'CAMARA',
  'OTROS'
];

export const ACTIVO_CRITICIDADES: ActivoCriticidad[] = ['BAJA', 'MEDIA', 'ALTA'];
export const ACTIVO_ESTADOS: ActivoEstado[] = [
  'OPERATIVO',
  'EN_MANTENIMIENTO',
  'FUERA_SERVICIO',
  'DE_BAJA'
];
