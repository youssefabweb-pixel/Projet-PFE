import { Injectable, signal } from '@angular/core';

const EMAIL_NOTIFICATIONS_KEY = 'pm-email-notifications-enabled';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly enabled = signal<boolean>(this.readInitialValue());

  readonly emailNotificationsEnabled = this.enabled.asReadonly();

  setEmailNotificationsEnabled(value: boolean): void {
    this.enabled.set(value);
    localStorage.setItem(EMAIL_NOTIFICATIONS_KEY, String(value));
  }

  isEmailNotificationsEnabled(): boolean {
    return this.enabled();
  }

  private readInitialValue(): boolean {
    const raw = localStorage.getItem(EMAIL_NOTIFICATIONS_KEY);
    if (raw == null) {
      return true;
    }
    return raw.toLowerCase() !== 'false';
  }
}
