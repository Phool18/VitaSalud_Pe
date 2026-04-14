import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { SedesService } from '../../../../core/services/sedes.service';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-sede-detail-page',
  standalone: true,
  imports: [AsyncPipe, DataPanelComponent, PageHeaderComponent, RouterLink, StatusBadgeComponent],
  templateUrl: './sede-detail-page.component.html',
  styleUrl: './sede-detail-page.component.css'
})
export class SedeDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly sedesService = inject(SedesService);

  readonly sede$ = this.route.paramMap.pipe(
    switchMap((params) => this.sedesService.getById(Number(params.get('id') ?? 0)))
  );
}
