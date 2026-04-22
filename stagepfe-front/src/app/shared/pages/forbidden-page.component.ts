import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="wb-panel-narrow forbidden">
      <h2>Accès refusé</h2>
      <p>Vous n’avez pas les droits suffisants pour accéder à cette page.</p>
      <a routerLink="/login" class="btn btn--outline forbidden__link">Retour à la connexion</a>
    </section>
  `,
  styles: [
    `
      .forbidden h2 {
        margin-top: 0;
      }
      .forbidden__link {
        display: inline-flex;
        margin-top: 0.75rem;
        text-decoration: none;
      }
    `,
  ],
})
export class ForbiddenPageComponent {}
