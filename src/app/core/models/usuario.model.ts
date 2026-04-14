export type UsuarioRol = 'SEDE' | 'SOPORTE' | 'TECNICO' | 'ADMIN';

export interface Usuario {
  id: number;
  nombreCompleto: string;
  email: string;
  password: string;
  rol: UsuarioRol;
  sedeId: number | null;
  activo: boolean;
}

export const USUARIO_ROLES: UsuarioRol[] = ['SEDE', 'SOPORTE', 'TECNICO', 'ADMIN'];
