import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, debounceTime, map } from 'rxjs';
import { ACTIVO_CRITICIDADES, ACTIVO_ESTADOS, ACTIVO_TIPOS } from '../../../../core/models/activo-ti.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivosService } from '../../../../core/services/activos.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { matchesSearchTerm } from '../../../../core/utils/query-filter.util';
import { filterActivosBySession, isPrivilegedUser } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-activo-list-page',
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
  templateUrl: './activo-list-page.component.html',
  styleUrl: './activo-list-page.component.css'
})
export class ActivoListPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly activosService = inject(ActivosService);
  private readonly sedesService = inject(SedesService);

  readonly estados = ACTIVO_ESTADOS;
  readonly criticidades = ACTIVO_CRITICIDADES;
  readonly tipos = ACTIVO_TIPOS;

  readonly filtersForm = this.formBuilder.nonNullable.group({
    search: [''],
    sedeId: [''],
    estado: [''],
    criticidad: [''],
    tipo: ['']
  });

  readonly vm$ = combineLatest([
    this.authService.session$,
    this.activosService.getAll(),
    this.sedesService.getAll(),
    this.route.queryParamMap
  ]).pipe(
    map(([session, activos, sedes, params]) => {
      const search = params.get('search') ?? '';
      const sedeId = Number(params.get('sedeId') ?? 0);
      const estado = params.get('estado') ?? '';
      const criticidad = params.get('criticidad') ?? '';
      const tipo = params.get('tipo') ?? '';
      const visibles = filterActivosBySession(activos, session);
      const visibleSedes = isPrivilegedUser(session)
        ? sedes
        : sedes.filter((sede) => sede.id === session?.sedeId);

      return {
        canEdit: session?.rol !== 'SEDE',
        isPrivileged: isPrivilegedUser(session),
        sedes: visibleSedes,
        activos: visibles
          .filter((activo) => !sedeId || activo.sedeId === sedeId)
          .filter((activo) => !estado || activo.estado === estado)
          .filter((activo) => !criticidad || activo.criticidad === criticidad)
          .filter((activo) => !tipo || activo.tipo === tipo)
          .filter((activo) =>
            matchesSearchTerm(
              [activo.codigoPatrimonial, activo.nombre, activo.marca, activo.modelo, activo.numeroSerie],
              search
            )
          )
          .map((activo) => ({
            ...activo,
            sedeNombre: sedes.find((sede) => sede.id === activo.sedeId)?.nombre ?? 'Sin sede'
          }))
      };
    })
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.filtersForm.patchValue(
        {
          search: params.get('search') ?? '',
          sedeId: params.get('sedeId') ?? '',
          estado: params.get('estado') ?? '',
          criticidad: params.get('criticidad') ?? '',
          tipo: params.get('tipo') ?? ''
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
            sedeId: value.sedeId || null,
            estado: value.estado || null,
            criticidad: value.criticidad || null,
            tipo: value.tipo || null
          },
          replaceUrl: true
        });
      });
  }

  clearFilters(): void {
    this.filtersForm.reset({ search: '', sedeId: '', estado: '', criticidad: '', tipo: '' });
  }
}
