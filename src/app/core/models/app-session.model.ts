import { UsuarioRol } from './usuario.model';

export interface AppSession {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: UsuarioRol;
  sedeId: number | null;
}
