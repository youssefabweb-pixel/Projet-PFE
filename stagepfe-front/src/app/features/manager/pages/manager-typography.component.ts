import { Component } from '@angular/core';
import { PageShellComponent } from '../../../shared/ui/page-shell/page-shell.component';

@Component({
  selector: 'app-manager-typography',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell title="Typography" subtitle="Inter + Tajawal, charte WIFAK BANK.">
      <div class="wb-card wb-card-pad">
        <h1>Heading H1</h1>
        <h2>Heading H2</h2>
        <p>Texte de paragraphe de d�monstration � typographie Inter.</p>
        <p lang="ar" class="font-arabic" dir="rtl">?? ?????? ?????? ??????? � ?? Tajawal.</p>
      </div>
    </app-page-shell>
  `,
  styles: [],
})
export class ManagerTypographyComponent {}
