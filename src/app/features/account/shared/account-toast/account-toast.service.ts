import { Injectable, signal } from '@angular/core';

export type AccountToastData =
  | { readonly kind: 'small'; readonly text: string }
  | { readonly kind: 'success'; readonly title: string; readonly text: string };

const SMALL_MS = 2800;
const SUCCESS_MS = 3200;

/** Avisos pequeños de la cuenta («Sesión cerrada»…). Un aviso nuevo sustituye al anterior. */
@Injectable({ providedIn: 'root' })
export class AccountToastService {
  private readonly _toast = signal<AccountToastData | null>(null);
  readonly toast = this._toast.asReadonly();
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string): void {
    this.publish({ kind: 'small', text }, SMALL_MS);
  }

  showSuccess(title: string, text: string): void {
    this.publish({ kind: 'success', title, text }, SUCCESS_MS);
  }

  dismiss(): void {
    this.clear();
    this._toast.set(null);
  }

  private publish(data: AccountToastData, ms: number): void {
    this.clear();
    this._toast.set(data);
    this.timer = setTimeout(() => this.dismiss(), ms);
  }

  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
