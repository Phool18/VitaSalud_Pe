import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { ActivosService } from '../../../../core/services/activos.service';

/**
 * Componente contenedor para el Panel de Control (Dashboard) principal.
 * Se encarga de precargar todas las métricas operativas de la Mesa de Ayuda
 * resolviendo múltiples llamadas asíncronas en paralelo.
 * * @class
 */
@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css']
})
export class DashboardPageComponent implements OnInit {
  /** @public {boolean} Bandera de control para la pantalla de carga (Loading State) */
  public isLoading: boolean = true;
  
  /** @public {any} Almacena las métricas consolidadas (Reemplazar con interfaz estricta en el futuro) */
  public metricas: any = null;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly ticketsService: TicketsService,
    private readonly activosService: ActivosService
  ) {}

  /**
   * Hook del ciclo de vida de Angular. 
   * Orquesta la carga inicial de datos mediante `forkJoin` para evitar peticiones en cascada.
   * @override
   */
  ngOnInit(): void {
    this.cargarDataEnParalelo();
  }

  /**
   * Agrupa las peticiones HTTP principales y se suscribe a ellas como una sola unidad.
   * Garantiza que la bandera `isLoading` solo pase a false cuando TODO haya terminado,
   * ya sea con éxito o con error, gracias al operador `finalize()`.
   * * @private
   */
  private cargarDataEnParalelo(): void {
    this.isLoading = true;

    forkJoin({
      estadisticas: this.dashboardService.getResumen(),
      ticketsPendientes: this.ticketsService.getTickets({ estado: 'ABIERTO' }),
      activosCriticos: this.activosService.getActivos({ estado: 'EN_REPARACION' })
    })
    .pipe(
      finalize(() => this.isLoading = false)
    )
    .subscribe({
      next: (respuestas) => {
        this.metricas = respuestas.estadisticas;
        // Trampa para Jean: Debe decidir cómo pasar ticketsPendientes al HTML
      },
      error: (err) => {
        console.error('Fallo al inicializar el Dashboard', err);
        // Trampa para Jean: Implementar un servicio de Notificaciones (Toaster) aquí
      }
    });
  }
}
