import { afterNextRender, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorBannerComponent } from './shared/components/error-banner/error-banner.component';
import { KeyboardShortcutsService } from './core/ux/keyboard-shortcuts.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorBannerComponent],
  template: '<app-error-banner></app-error-banner><router-outlet></router-outlet>',
})
export class App {
  private readonly shortcuts = inject(KeyboardShortcutsService);

  constructor() {
    afterNextRender(() => this.shortcuts.init());
  }
}
