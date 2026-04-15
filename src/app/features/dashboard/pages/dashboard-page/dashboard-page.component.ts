import { AsyncPipe, NgStyle } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { DashboardBarDatum } from '../../../../core/models/dashboard.model';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgStyle,
    DataPanelComponent,
    EmptyStateComponent,
    EnumLabelPipe,
    LoadingStateComponent,
    PageHeaderComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private readonly dashboardService = inject(DashboardService);

  readonly vm$ = this.dashboardService.getDashboard();

  hasBarData(items: DashboardBarDatum[]): boolean {
    return items.some((item) => item.value > 0);
  }

  width(value: number, total: number): string {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  }
}
