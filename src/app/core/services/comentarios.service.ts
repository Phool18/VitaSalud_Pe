import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ComentarioCreatePayload, ComentarioTicket } from '../models/comentario-ticket.model';
import { JsonServerApiService } from './json-server-api.service';

@Injectable({ providedIn: 'root' })
export class ComentariosService {
  private readonly api = inject(JsonServerApiService);

  getByTicket(ticketId: number): Observable<ComentarioTicket[]> {
    return this.api.list<ComentarioTicket>('comentarios', { ticketId, _sort: 'fecha', _order: 'asc' });
  }

  create(payload: ComentarioCreatePayload): Observable<ComentarioTicket> {
    return this.api.create<ComentarioTicket>('comentarios', {
      ...payload,
      fecha: new Date().toISOString()
    });
  }
}
