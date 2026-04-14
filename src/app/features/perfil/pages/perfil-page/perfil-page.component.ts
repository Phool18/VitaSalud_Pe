import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { DataPanelComponent } from '../../../../shared/components/data-panel/data-panel.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [AsyncPipe, DataPanelComponent, EnumLabelPipe, PageHeaderComponent],
  templateUrl: './perfil-page.component.html',
  styleUrl: './perfil-page.component.css'
})
export class PerfilPageComponent {
  private readonly authService = inject(AuthService);
  private readonly sedesService = inject(SedesService);

  readonly vm$ = combineLatest([this.authService.session$, this.sedesService.getAll()]).pipe(
    map(([session, sedes]) => ({
      session,
      sede: sedes.find((sede) => sede.id === session?.sedeId) ?? null
    }))
  );
}
