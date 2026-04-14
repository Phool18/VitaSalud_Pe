import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { TicketSoporte, EstadoTicket } from '../models/ticket-soporte.model';

/**
 * @interface FiltrosTicket
 * Define la estructura estricta para los parámetros de búsqueda de tickets.
 */
export interface FiltrosTicket {
  estado?: EstadoTicket;
  prioridad?: string;
  tecnicoId?: number;
}

/**
 * Servicio principal para la gestión y orquestación de Tickets de Soporte.
 * Maneja la comunicación con la API y la transformación de datos inicial.
 * * @class
 */
@Injectable({
  providedIn: 'root'
})
export class TicketsService {
  /** @private @constant {string} URL base del endpoint de tickets */
  private readonly apiUrl = `${environment.apiUrl}/tickets`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Recupera una lista paginada y filtrada de tickets desde el servidor.
   * * @param {FiltrosTicket} [filtros] - Objeto opcional con los criterios de búsqueda.
   * @returns {Observable<TicketSoporte[]>} Flujo reactivo con el arreglo de tickets encontrados.
   * @throws {Error} Lanza un error genérico si el servidor no responde.
   */
  getTickets(filtros?: FiltrosTicket): Observable<TicketSoporte[]> {
    let params = {};
    if (filtros) {
      // Limpiamos propiedades undefined para no enviar query params sucios
      params = Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v != null));
    }

    return this.http.get<TicketSoporte[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza de forma parcial el estado de un ticket específico.
   * * @param {number} ticketId - El identificador único del ticket a modificar.
   * @param {EstadoTicket} nuevoEstado - El nuevo estado a asignar (ej. 'EN_PROGRESO', 'RESUELTO').
   * @returns {Observable<TicketSoporte>} Flujo reactivo con el ticket actualizado.
   */
  actualizarEstado(ticketId: number, nuevoEstado: EstadoTicket): Observable<TicketSoporte> {
    const payload = { estado: nuevoEstado };
    return this.http.patch<TicketSoporte>(`${this.apiUrl}/${ticketId}`, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Interceptor interno de errores HTTP para estandarizar las respuestas fallidas.
   * * @private
   * @param {HttpErrorResponse} error - El error original capturado por HttpClient.
   * @returns {Observable<never>} Observable de error formateado para los componentes.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error crítico en TicketsService:', error);
    return throwError(() => new Error('Ocurrió un error en la comunicación con el servidor de Mesa de Ayuda.'));
  }
}
