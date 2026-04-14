import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivosService } from '../../../../core/services/activos.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { filterActivosBySession } from '../../../../core/utils/visibility.util';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-activo-detail-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DataPanelComponent,
    DatePipe,
    EmptyStateComponent,
    EnumLabelPipe,
    PageHeaderComponent,
    RouterLink,
    StatusBadgeComponent
  ],
  templateUrl: './activo-detail-page.component.html',
  styleUrl: './activo-detail-page.component.css'
})
export class ActivoDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly activosService = inject(ActivosService);
  private readonly sedesService = inject(SedesService);

  readonly vm$ = this.route.paramMap.pipe(
    switchMap((params) =>
      combineLatest([
        this.authService.session$,
        this.activosService.getAll(),
        this.sedesService.getAll(),
        of(Number(params.get('id') ?? 0))
      ])
    ),
    map(([session, activos, sedes, id]) => {
      const activo = filterActivosBySession(activos, session).find((item) => item.id === id) ?? null;

      if (!activo) {
        return null;
      }

      return {
        activo,
        sede: sedes.find((sede) => sede.id === activo.sedeId) ?? null,
        canEdit: session?.rol !== 'SEDE' && session?.rol !== undefined
      };
    })
  );
}
