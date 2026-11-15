import { Injectable, signal } from '@angular/core';

const NOTICE_MS = 3_000;

export interface TaskNotice {
  readonly text: string;
  readonly error: boolean;
}

/** Aviso breve compartido: sobrevive al cierre del formulario para mostrarse en la lista. */
@Injectable({ providedIn: 'root' })
export class TasksNoticeService {
  private readonly current = signal<TaskNotice | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly notice = this.current.asReadonly();

  show(text: string, error: boolean): void {
    clearTimeout(this.timer);
    this.current.set({ text, error });
    this.timer = setTimeout(() => this.current.set(null), NOTICE_MS);
  }
}
