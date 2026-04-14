import { Component, input } from '@angular/core';

@Component({
  selector: 'app-data-panel',
  standalone: true,
  templateUrl: './data-panel.component.html',
  styleUrl: './data-panel.component.css'
})
export class DataPanelComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
