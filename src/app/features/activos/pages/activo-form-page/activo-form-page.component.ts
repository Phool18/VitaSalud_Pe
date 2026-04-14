import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, map, of, switchMap, take } from 'rxjs';
import {
  ActivoCriticidad,
  ActivoEstado,
  ActivoTipo,
  ACTIVO_CRITICIDADES,
  ACTIVO_ESTADOS,
  ACTIVO_TIPOS
} from '../../../../core/models/activo-ti.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivosService } from '../../../../core/services/activos.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-activo-form-page',
  standalone: true,
  imports: [AsyncPipe, EnumLabelPipe, FormErrorComponent, PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './activo-form-page.component.html',
  styleUrl: './activo-form-page.component.css'
})
export class ActivoFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly activosService = inject(ActivosService);
  private readonly sedesService = inject(SedesService);

  readonly tipos = ACTIVO_TIPOS;
  readonly criticidades = ACTIVO_CRITICIDADES;
  readonly estados = ACTIVO_ESTADOS;
  readonly saving = signal(false);
  readonly pageError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    sedeId: ['', Validators.required],
    nombre: ['', Validators.required],
    tipo: ['', Validators.required],
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    numeroSerie: ['', Validators.required],
    criticidad: ['', Validators.required],
    estado: ['', Validators.required],
    activo: [true, Validators.required],
    fechaRegistro: ['', Validators.required]
  });

  readonly vm$ = combineLatest([this.authService.session$, this.sedesService.getAll(), this.route.paramMap]).pipe(
    switchMap(([session, sedes, params]) => {
      const visibleSedes = session?.rol === 'SEDE' ? sedes.filter((sede) => sede.id === session.sedeId) : sedes;
      const id = Number(params.get('id') ?? 0);

      if (!id) {
        if (session?.rol === 'SEDE' && session.sedeId) {
          this.form.patchValue({ sedeId: `${session.sedeId}` }, { emitEvent: false });
          this.form.controls.sedeId.disable({ emitEvent: false });
        }

        return of({
          sedes: visibleSedes,
          title: 'Nuevo activo TI',
          subtitle: 'Registra un activo con datos patrimoniales y operativos.',
          submitLabel: 'Guardar activo'
        });
      }

      return this.activosService.getById(id).pipe(
        map((activo) => {
          this.form.patchValue(
            {
              sedeId: `${activo.sedeId}`,
              nombre: activo.nombre,
              tipo: activo.tipo,
              marca: activo.marca,
              modelo: activo.modelo,
              numeroSerie: activo.numeroSerie,
              criticidad: activo.criticidad,
              estado: activo.estado,
              activo: activo.activo,
              fechaRegistro: activo.fechaRegistro
            },
            { emitEvent: false }
          );

          return {
            sedes: visibleSedes,
            title: `Editar ${activo.codigoPatrimonial}`,
            subtitle: 'Actualiza la informacion del activo TI.',
            submitLabel: 'Guardar cambios'
          };
        })
      );
    })
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pageError.set(null);
    this.saving.set(true);

    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    const raw = this.form.getRawValue();

    const request$ = id
      ? this.activosService.update(id, {
          sedeId: Number(raw.sedeId),
          nombre: raw.nombre.trim(),
          tipo: raw.tipo as ActivoTipo,
          marca: raw.marca.trim(),
          modelo: raw.modelo.trim(),
          numeroSerie: raw.numeroSerie.trim(),
          criticidad: raw.criticidad as ActivoCriticidad,
          estado: raw.estado as ActivoEstado,
          activo: raw.activo,
          fechaRegistro: raw.fechaRegistro
        })
      : this.activosService.create({
          sedeId: Number(raw.sedeId),
          nombre: raw.nombre.trim(),
          tipo: raw.tipo as ActivoTipo,
          marca: raw.marca.trim(),
          modelo: raw.modelo.trim(),
          numeroSerie: raw.numeroSerie.trim(),
          criticidad: raw.criticidad as ActivoCriticidad,
          estado: raw.estado as ActivoEstado,
          activo: raw.activo,
          fechaRegistro: raw.fechaRegistro
        });

    request$.pipe(take(1)).subscribe({
      next: (activo) => void this.router.navigate(['/activos', activo.id]),
      error: (error: Error) => {
        this.pageError.set(error.message);
        this.saving.set(false);
      },
      complete: () => this.saving.set(false)
    });
  }

  error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    return control.touched && control.invalid ? 'Este campo es obligatorio.' : null;
  }
}
