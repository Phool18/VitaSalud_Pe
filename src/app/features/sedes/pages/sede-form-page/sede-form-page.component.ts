import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap, take } from 'rxjs';
import { SEDE_ESTADOS, SedeEstado } from '../../../../core/models/sede.model';
import { SedesService } from '../../../../core/services/sedes.service';
import { FormErrorComponent } from '../../../../shared/components/form-error/form-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EnumLabelPipe } from '../../../../shared/pipes/enum-label.pipe';

@Component({
  selector: 'app-sede-form-page',
  standalone: true,
  imports: [AsyncPipe, EnumLabelPipe, FormErrorComponent, PageHeaderComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './sede-form-page.component.html',
  styleUrl: './sede-form-page.component.css'
})
export class SedeFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sedesService = inject(SedesService);

  readonly estados = SEDE_ESTADOS;
  readonly saving = signal(false);
  readonly pageError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', Validators.required],
    ciudad: ['', Validators.required],
    direccion: ['', Validators.required],
    responsable: ['', Validators.required],
    estado: ['', Validators.required]
  });

  readonly vm$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = Number(params.get('id') ?? 0);

      if (!id) {
        return of({
          title: 'Nueva sede',
          subtitle: 'Registra una sede operativa de la red.',
          submitLabel: 'Guardar sede'
        });
      }

      return this.sedesService.getById(id).pipe(
        map((sede) => {
          this.form.patchValue(
            {
              nombre: sede.nombre,
              ciudad: sede.ciudad,
              direccion: sede.direccion,
              responsable: sede.responsable,
              estado: sede.estado
            },
            { emitEvent: false }
          );

          return {
            title: `Editar ${sede.codigo}`,
            subtitle: 'Actualiza la informacion de la sede.',
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
    const payload = {
      nombre: raw.nombre.trim(),
      ciudad: raw.ciudad.trim(),
      direccion: raw.direccion.trim(),
      responsable: raw.responsable.trim(),
      estado: raw.estado as SedeEstado
    };

    const request$ = id ? this.sedesService.update(id, payload) : this.sedesService.create(payload);

    request$.pipe(take(1)).subscribe({
      next: (sede) => void this.router.navigate(['/sedes', sede.id]),
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
