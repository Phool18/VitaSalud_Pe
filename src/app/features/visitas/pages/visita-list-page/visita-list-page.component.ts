import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, debounceTime, map } from 'rxjs';
import { VISITA_ESTADOS } from '../../../../core/models/visita-tecnica.model';
import { AuthService } from '../../../../core/services/auth.service';
import { TicketsService } from '../../../../core/services/tickets.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { VisitasService } from '../../../../core/services/visitas.service';
import { matchesSearchTerm } from '../../../../core/utils/query-filter.util';
import { filterTicketsBySession, filterVisitasBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-visita-list-page',
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
  templateUrl: './visita-list-page.component.html',
  styleUrl: './visita-list-page.component.css'
})
export class VisitaListPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly visitasService = inject(VisitasService);
  private readonly ticketsService = inject(TicketsService);
  private readonly usuariosService = inject(UsuariosService);

  readonly estados = VISITA_ESTADOS;

  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    estado: [''],
    tecnicoId: ['']
  });

  readonly vm$ = combineLatest([
    this.authService.session$,
    this.visitasService.getAll(),
    this.ticketsService.getAll(),
    this.usuariosService.getTecnicosActivos(),
    this.route.queryParamMap
  ]).pipe(
    map(([session, visitas, tickets, tecnicos, params]) => {
      const search = params.get('search') ?? '';
      const estado = params.get('estado') ?? '';
      const tecnicoId = Number(params.get('tecnicoId') ?? 0);
      const visibleTickets = filterTicketsBySession(tickets, session);
      const visibleVisitas = filterVisitasBySession(visitas, visibleTickets, session);

      return {
        canCreate: session?.rol !== 'SEDE',
        isPrivileged: isPrivilegedUser(session),
        tecnicos,
        visitas: visibleVisitas
          .filter((visita) => !estado || visita.estado === estado)
          .filter((visita) => !tecnicoId || visita.tecnicoId === tecnicoId)
          .filter((visita) =>
            matchesSearchTerm(
              [
                visita.codigo,
                tickets.find((ticket) => ticket.id === visita.ticketId)?.codigo,
                tecnicos.find((tecnico) => tecnico.id === visita.tecnicoId)?.nombreCompleto
              ],
              search
            )
          )
          .map((visita) => ({
            ...visita,
            ticketCodigo: tickets.find((ticket) => ticket.id === visita.ticketId)?.codigo ?? 'Sin ticket',
            tecnicoNombre:
              tecnicos.find((tecnico) => tecnico.id === visita.tecnicoId)?.nombreCompleto ?? 'Sin tecnico'
          }))
      };
    })
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filtersForm.patchValue(
        {
          search: params.get('search') ?? '',
          estado: params.get('estado') ?? '',
          tecnicoId: params.get('tecnicoId') ?? ''
        },
        { emitEvent: false }
      );
    });

    this.filtersForm.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            search: value.search || null,
            estado: value.estado || null,
            tecnicoId: value.tecnicoId || null
          },
          replaceUrl: true
        });
      });
  }

  clearFilters(): void {
    this.filtersForm.reset({ search: '', estado: '', tecnicoId: '' });
  }
}
