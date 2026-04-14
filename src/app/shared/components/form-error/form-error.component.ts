import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-error',
  standalone: true,
  template: `@if (message()) { <small class="error">{{ message() }}</small> }`,
  styles: `
    .error {
      color: var(--danger);
      display: block;
      font-size: 0.82rem;
      margin-top: 0.35rem;
    }
  `
})
export class FormErrorComponent {
  readonly message = input<string | null>(null);
}
