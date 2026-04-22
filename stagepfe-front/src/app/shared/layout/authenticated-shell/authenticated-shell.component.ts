import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbarComponent } from '../../components/app-topbar/app-topbar.component';

/** Coque authentifiée : topbar (logo, notifications, thème) + router-outlet. */
@Component({
  selector: 'app-authenticated-shell',
  standalone: true,
  imports: [RouterOutlet, AppTopbarComponent],
  templateUrl: './authenticated-shell.component.html',
  styleUrl: './authenticated-shell.component.scss',
})
export class AuthenticatedShellComponent {}
