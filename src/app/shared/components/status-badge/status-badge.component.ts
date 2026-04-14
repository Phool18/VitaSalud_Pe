import { Component, computed, input } from '@angular/core';
import { EnumLabelPipe } from '../../pipes/enum-label.pipe';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [EnumLabelPipe],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css'
})
export class StatusBadgeComponent {
  readonly value = input.required<string>();

  readonly tone = computed(() => {
    const value = this.value();

    if (['CRITICA', 'CANCELADO', 'DE_BAJA', 'FUERA_SERVICIO', 'SUSPENDIDA'].includes(value)) {
      return 'danger';
    }

    if (['ALTA', 'EN_ATENCION', 'EN_CURSO', 'EN_MANTENIMIENTO'].includes(value)) {
      return 'warning';
    }

    if (['RESUELTO', 'CERRADO', 'FINALIZADA', 'OPERATIVO', 'ACTIVA'].includes(value)) {
      return 'success';
    }

    if (['MEDIA', 'ASIGNADO', 'EN_REVISION', 'PROGRAMADA'].includes(value)) {
      return 'info';
    }

    return 'neutral';
  });
}
