import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JsonServerApiService {
  private readonly http = inject(HttpClient);

  list<T>(resource: string, query?: Record<string, any>): Observable<T[]> {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== null && value !== undefined && `${value}`.length > 0) {
        params = params.set(key, `${value}`);
      }
    }

    return this.http.get<T[]>(resource, { params });
  }

  getById<T>(resource: string, id: number): Observable<T> {
    return this.http.get<T>(`${resource}/${id}`);
  }

  create<T>(resource: string, payload: Omit<T, 'id'>): Observable<T> {
    return this.http.post<T>(resource, payload);
  }

  update<T>(resource: string, id: number, payload: T): Observable<T> {
    return this.http.put<T>(`${resource}/${id}`, payload);
  }

  patch<T>(resource: string, id: number, payload: Partial<T>): Observable<T> {
    return this.http.patch<T>(`${resource}/${id}`, payload);
  }
}
