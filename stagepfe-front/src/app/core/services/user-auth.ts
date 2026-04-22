import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root',
})
export class UserAuth {
  private readonly platformId = inject(PLATFORM_ID);

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }

  getToken(): string | null {
    if (!this.canUseStorage()) {
      return null;
    }

    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setToken(token: string): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.setItem(TOKEN_KEY, token);
  }

  login(email: string, password: string): void {
    const pseudoJwt = btoa(`${email}:${password}:${new Date().toISOString()}`);
    this.setToken(pseudoJwt);
  }

  logout(): void {
    if (!this.canUseStorage()) {
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
  }
}
