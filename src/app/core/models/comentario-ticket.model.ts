import { UsuarioRol } from './usuario.model';

export interface ComentarioTicket {
  id: number;
  ticketId: number;
  autorUsuarioId: number;
  autorNombre: string;
  autorRol: UsuarioRol;
  mensaje: string;
  fecha: string;
}

export interface ComentarioCreatePayload {
  ticketId: number;
  autorUsuarioId: number;
  autorNombre: string;
  autorRol: UsuarioRol;
  mensaje: string;
}
