import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

@Component({
  selector: 'app-collaborateur-cards',
  standalone: true,
  imports: [CommonModule, PageShellComponent],
  template: `
    <app-page-shell title="Cards" subtitle="Migration de la page Sneat cards.">
      <div class="grid">
        <article class="wb-card wb-card-pad wb-card--interactive" *ngFor="let card of cards">
          <h3>{{ card.title }}</h3>
          <p>{{ card.text }}</p>
        </article>
      </div>
    </app-page-shell>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }
      h3 {
        margin: 0 0 0.5rem;
        color: var(--neutral-900);
      }
      p {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class CollaborateurCardsComponent {
  protected readonly cards = [
    { title: 'Card 1', text: 'Contenu de carte inspir� de Sneat.' },
    { title: 'Card 2', text: 'Composant Angular rempla�ant le markup statique.' },
    { title: 'Card 3', text: 'Structure r�utilisable et lisible.' },
  ];
}
