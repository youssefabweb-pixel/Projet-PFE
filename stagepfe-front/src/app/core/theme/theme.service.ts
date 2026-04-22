import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

const STORAGE_KEY = 'wifak-theme';

/** Thème clair / sombre avec persistance localStorage. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /** false = light, true = dark */
  readonly darkMode = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const dark = stored === 'dark' || (stored === null && prefersDark);
    this.darkMode.set(dark);
    this.apply(dark);
  }

  toggle(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    this.apply(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    }
  }

  setDark(dark: boolean): void {
    this.darkMode.set(dark);
    this.apply(dark);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    }
  }

  private apply(dark: boolean): void {
    const root = this.doc.documentElement;
    root.dataset['theme'] = dark ? 'dark' : 'light';
    root.classList.toggle('dark', dark);
  }
}
