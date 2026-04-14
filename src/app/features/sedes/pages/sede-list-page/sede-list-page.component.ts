import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SedesService } from '../../../../core/services/sedes.service';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-sede-list-page',
  standalone: true,
  imports: [AsyncPipe, DataPanelComponent, EmptyStateComponent, PageHeaderComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './sede-list-page.component.html',
  styleUrl: './sede-list-page.component.css'
})
export class SedeListPageComponent {
  private readonly sedesService = inject(SedesService);

  readonly sedes$ = this.sedesService.getAll().pipe(
    map((sedes) => sedes.sort((a, b) => a.nombre.localeCompare(b.nombre)))
  );
}
