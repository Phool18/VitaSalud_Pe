import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, debounceTime, map } from 'rxjs';
import { TICKET_CATEGORIAS, TICKET_ESTADOS, TICKET_PRIORIDADES } from '../../../../core/models/ticket-soporte.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { matchesSearchTerm } from '../../../../core/utils/query-filter.util';
import { isTicketOverdue } from '../../../../core/utils/sla.util';
import { filterTicketsBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

interface TicketListItem {
  id: number;
  codigo: string;
  titulo: string;
  sede: string;
  categoria: string;
  prioridad: string;
  estado: string;
  tecnico: string;
  fechaRegistro: string;
  fechaLimiteAtencion: string;
  slaVencido: boolean;
}

@Component({
  selector: 'app-ticket-list-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DataPanelComponent,
    DatePipe,
    EmptyStateComponent,
    EnumLabelPipe,
    PageHeaderComponent,
    ReactiveFormsModule,
    RouterLink,
    StatusBadgeComponent
  ],
  templateUrl: './ticket-list-page.component.html',
  styleUrl: './ticket-list-page.component.css'
})
export class TicketListPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly ticketsService = inject(TicketsService);
  private readonly sedesService = inject(SedesService);
  private readonly usuariosService = inject(UsuariosService);

  readonly estados = TICKET_ESTADOS;
  readonly prioridades = TICKET_PRIORIDADES;
  readonly categorias = TICKET_CATEGORIAS;

  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    estado: [''],
    prioridad: [''],
    sedeId: [''],
    tecnicoId: [''],
    categoria: ['']
  });

  readonly vm$ = combineLatest([
    this.ticketsService.getAll(),
    this.sedesService.getAll(),
    this.usuariosService.getTecnicosActivos(),
    this.authService.session$,
    this.route.queryParamMap
  ]).pipe(
    map(([tickets, sedes, tecnicos, session, params]) => {
      const search = params.get('search') ?? '';
      const estado = params.get('estado') ?? '';
      const prioridad = params.get('prioridad') ?? '';
      const sedeId = Number(params.get('sedeId') ?? 0);
      const tecnicoId = Number(params.get('tecnicoId') ?? 0);
      const categoria = params.get('categoria') ?? '';
      const visibleTickets = filterTicketsBySession(tickets, session);
      const visibleSedes = isPrivilegedUser(session)
        ? sedes
        : sedes.filter((sede) => sede.id === session?.sedeId);

      return {
        canCreate: session?.rol !== 'TECNICO',
        isPrivileged: isPrivilegedUser(session),
        tickets: visibleTickets
          .filter((ticket) => !search || !estado || ticket.estado === estado)
          .filter((ticket) => search || !prioridad || ticket.prioridad === prioridad)
          .filter((ticket) => !categoria || ticket.categoria === categoria)
          .filter((ticket) => !sedeId || ticket.sedeId === sedeId)
          .filter((ticket) => !tecnicoId || ticket.tecnicoAsignadoId === tecnicoId)
          .filter((ticket) =>
            matchesSearchTerm(
              [ticket.codigo, ticket.titulo, ticket.descripcion, ticket.reportadoPor],
              search
            )
          )
          .map<TicketListItem>((ticket) => ({
            id: ticket.id,
            codigo: ticket.codigo,
            titulo: ticket.titulo,
            sede: sedes.find((sede) => sede.id === ticket.sedeId)?.nombre ?? 'Sin sede',
            categoria: ticket.categoria,
            prioridad: ticket.prioridad,
            estado: ticket.estado,
            tecnico:
              tecnicos.find((tecnico) => tecnico.id === ticket.tecnicoAsignadoId)?.nombreCompleto ??
              'Sin asignar',
            fechaRegistro: ticket.fechaRegistro,
            fechaLimiteAtencion: ticket.fechaLimiteAtencion,
            slaVencido: isTicketOverdue(ticket)
          })),
        sedes: visibleSedes,
        tecnicos
      };
    })
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.filtersForm.patchValue(
        {
          search: params.get('search') ?? '',
          estado: params.get('estado') ?? '',
          prioridad: '',
          sedeId: params.get('sedeId') ?? '',
          tecnicoId: params.get('tecnicoId') ?? '',
          categoria: params.get('categoria') ?? ''
        },
        { emitEvent: false }
      );
    });

    this.filtersForm.valueChanges
      .pipe(debounceTime(150))
      .subscribe((value) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            search: value.search || null,
            estado: value.estado || null,
            prioridad: value.prioridad || null,
            sedeId: value.sedeId || null,
            tecnicoId: value.tecnicoId || null,
            categoria: value.categoria || null
          },
          replaceUrl: true
        });
      });
  }

  clearFilters(): void {
    this.filtersForm.reset({
      search: '',
      estado: '',
      prioridad: '',
      sedeId: '',
      tecnicoId: '',
      categoria: ''
    });
  }

  formatLabel(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }
}
