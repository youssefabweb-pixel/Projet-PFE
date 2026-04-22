import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, tap } from 'rxjs';
import { map, switchMap, timeout } from 'rxjs/operators';
import { API_REQUEST_TIMEOUT_MS } from '../constants/api-timeout';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UserMe } from '../models/auth.models';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';
const USERNAME_KEY = 'username';
const USER_ID_KEY = 'userId';

/** Anciennes clés (avant alignement API) — lues une fois puis migrées. */
const LEGACY_TOKEN_KEY = 'jwt_token';
const LEGACY_ROLE_KEY = 'user_role';
const LEGACY_USERNAME_KEY = 'auth_username';
const LEGACY_USER_ID_KEY = 'auth_user_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.apiBaseUrl;

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, payload).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      tap((response) => {
        this.setToken(response.accessToken);
        this.setRole(response.role);
        this.setUsername(response.username);
      }),
      switchMap((response) =>
        this.http.get<UserMe>(`${this.baseUrl}/api/auth/me`).pipe(
          timeout(API_REQUEST_TIMEOUT_MS),
          tap((me) => {
            this.setUserId(me.id);
            this.setRole(me.role);
            this.setUsername(me.username);
          }),
          map(() => response),
        ),
      ),
    );
  }

  /** Recharge id + rôle depuis le backend (après F5 ou navigation directe). */
  syncProfile(): Observable<UserMe | null> {
    if (!this.canUseStorage() || !this.getToken()) {
      return of(null);
    }
    return this.http.get<UserMe>(`${this.baseUrl}/api/auth/me`).pipe(
      timeout(API_REQUEST_TIMEOUT_MS),
      tap((me) => {
        this.setUserId(me.id);
        this.setRole(me.role);
        this.setUsername(me.username);
      }),
    );
  }

  logout(): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ROLE_KEY);
    localStorage.removeItem(LEGACY_USERNAME_KEY);
    localStorage.removeItem(LEGACY_USER_ID_KEY);
  }

  getToken(): string | null {
    if (!this.canUseStorage()) {
      return null;
    }
    return this.migrateGet(TOKEN_KEY, LEGACY_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  getRole(): string | null {
    if (!this.canUseStorage()) {
      return null;
    }
    return this.migrateGet(ROLE_KEY, LEGACY_ROLE_KEY);
  }

  getUsername(): string | null {
    if (!this.canUseStorage()) {
      return null;
    }
    return this.migrateGet(USERNAME_KEY, LEGACY_USERNAME_KEY);
  }

  getUserId(): number | null {
    if (!this.canUseStorage()) {
      return null;
    }
    const raw = this.migrateGet(USER_ID_KEY, LEGACY_USER_ID_KEY);
    if (raw === null || raw === '') {
      return null;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private setToken(token: string): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  }

  private setRole(role: string): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(ROLE_KEY, role);
  }

  private setUsername(username: string): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(USERNAME_KEY, username);
  }

  private setUserId(id: number): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(USER_ID_KEY, String(id));
  }

  private canUseStorage(): boolean {
    return isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined';
  }

  /** Lit `key`, ou à défaut `legacyKey` qu’on recopie vers `key` puis supprime. */
  private migrateGet(key: string, legacyKey: string): string | null {
    let v = localStorage.getItem(key);
    if (v !== null && v !== '') {
      return v;
    }
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null && legacy !== '') {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
      return legacy;
    }
    return null;
  }
}
