import { Injectable } from '@angular/core';
import { Celebration, DAILY_XP_CAP, Progress, ProgressRow } from '../../core/models/progress';

/** Curva, nivel, celebración y textos del progreso. Puro: no accede a datos. */
@Injectable({ providedIn: 'root' })
export class ProgressConstructorService {
  readonly summary = {
    open: 'Ver mi progreso',
    keepStreak: 'Completa 1 tarea hoy para mantenerla',
    loading: 'Cargando tu progreso…',
    error: 'No pudimos cargar tu progreso',
    retry: 'Reintentar',
  } as const;

  readonly screen = {
    title: 'Tu progreso',
    back: 'Volver',
    close: 'Cerrar',
    totalXp: 'XP total',
    nextLevel: 'XP para el siguiente nivel',
    currentStreak: 'Racha actual',
    bestStreak: 'Mejor racha',
    today: 'XP de hoy',
    noGuilt: 'Si se rompe la racha, tu nivel y tus XP siguen intactos.',
    perTask: '+10 XP por cada tarea completada',
    newUser: 'Completa tu primera tarea para empezar a ganar XP y subir de nivel.',
    loading: 'Cargando tu progreso…',
    error: 'No pudimos cargar tu progreso',
    errorHint: 'Revisa tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
  } as const;

  readonly levelUp = {
    title: '¡Has subido de nivel!',
    congrats: '¡Enhorabuena! Sigue así.',
    continue: 'Continuar',
  } as const;

  /** XP acumulados necesarios para alcanzar el nivel N: 25·N·(N−1). */
  xpToReach(level: number): number {
    return 25 * level * (level - 1);
  }

  /** Nivel que corresponde a un XP total (1 con 0 XP). */
  levelOf(totalXp: number): number {
    if (!Number.isFinite(totalXp) || totalXp < 0) return 1;
    let level = 1;
    while (this.xpToReach(level + 1) <= totalXp) level += 1;
    return level;
  }

  toProgress(row: ProgressRow): Progress {
    const level = this.levelOf(row.total_xp);
    return {
      totalXp: row.total_xp,
      level,
      xpIntoLevel: row.total_xp - this.xpToReach(level),
      xpForNextLevel: this.xpToReach(level + 1) - this.xpToReach(level),
      currentStreak: row.current_streak,
      bestStreak: row.best_streak,
      xpToday: row.xp_today,
      lastCompletedDay: row.last_completed_day,
    };
  }

  /** Compara el progreso antes y después (dato confirmado por el servidor). Sin dato previo, nada. */
  celebration(before: Progress | null, after: Progress, done: boolean): Celebration {
    if (before === null) return { xpDelta: 0, capped: false, streakDays: null, leveledUpTo: null };
    const xpDelta = after.totalXp - before.totalXp;
    return {
      xpDelta,
      capped: done && xpDelta === 0 && after.xpToday >= DAILY_XP_CAP,
      streakDays: done && after.currentStreak > before.currentStreak ? after.currentStreak : null,
      leveledUpTo: done && after.level > before.level ? after.level : null,
    };
  }

  /** Texto de XP de la celebración; `null` si no hay nada que decir (p. ej. desmarcar sin XP). */
  xpText(celebration: Celebration): string | null {
    if (celebration.xpDelta > 0) return `+${celebration.xpDelta} XP`;
    if (celebration.xpDelta < 0) return `−${Math.abs(celebration.xpDelta)} XP`;
    return celebration.capped ? 'Hoy ya has llegado al tope de XP' : null;
  }

  streakText(days: number): string {
    return `Llevas ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  streakLabel(days: number): string {
    if (days <= 0) return 'Sin racha';
    return `${days} ${days === 1 ? 'día seguido' : 'días seguidos'}`;
  }

  levelLabel(level: number): string {
    return `Nivel ${level}`;
  }

  xpBar(into: number, total: number): string {
    return `${into} / ${total} XP`;
  }

  remainingText(xp: number): string {
    return `Faltan ${xp} XP`;
  }

  todayXp(xp: number): string {
    return `${xp} / ${DAILY_XP_CAP}`;
  }
}
