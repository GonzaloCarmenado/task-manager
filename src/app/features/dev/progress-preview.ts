import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Celebration as CelebrationData, Progress } from '../../core/models/progress';
import { toLocalDay } from '../../core/utils/local-date';
import { Celebration } from '../progress/celebration/celebration';
import { ProgressAccessService } from '../progress/progress.access.service';
import { ProgressScreen } from '../progress/progress-screen/progress-screen';
import { ProgressSummary } from '../progress/progress-summary/progress-summary';

const STATES = ['summary', 'alive', 'new', 'screen', 'celebration', 'cap', 'undo'] as const;
type PreviewState = (typeof STATES)[number];

const today = toLocalDay(new Date());

function stateOf(route: ActivatedRoute): PreviewState {
  const requested = route.snapshot.paramMap.get('state') ?? '';
  return STATES.find((s) => s === requested) ?? 'summary';
}

const SAMPLE: Progress = {
  totalXp: 340,
  level: 4,
  xpIntoLevel: 40,
  xpForNextLevel: 200,
  currentStreak: 6,
  bestStreak: 9,
  xpToday: 30,
  lastCompletedDay: today,
};

const SAMPLES: Record<PreviewState, Progress> = {
  summary: SAMPLE,
  alive: { ...SAMPLE, lastCompletedDay: '2000-01-01' },
  new: {
    ...SAMPLE,
    totalXp: 0,
    level: 1,
    xpIntoLevel: 0,
    xpForNextLevel: 50,
    currentStreak: 0,
    bestStreak: 0,
    xpToday: 0,
    lastCompletedDay: null,
  },
  screen: SAMPLE,
  celebration: SAMPLE,
  cap: SAMPLE,
  undo: SAMPLE,
};

const CELEBRATIONS: Partial<Record<PreviewState, CelebrationData>> = {
  celebration: { xpDelta: 10, capped: false, streakDays: 3, leveledUpTo: null },
  cap: { xpDelta: 0, capped: true, streakDays: null, leveledUpTo: null },
  undo: { xpDelta: -10, capped: false, streakDays: null, leveledUpTo: null },
};

/**
 * SOLO DESARROLLO: muestra el resumen, la pantalla de progreso y la celebración con datos de
 * ejemplo (`/__dev/progress/summary | alive | new | screen | celebration | cap | undo`).
 * La ruta solo existe con `isDevMode()`.
 */
@Component({
  selector: 'app-progress-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressSummary, ProgressScreen, Celebration],
  providers: [
    {
      provide: ProgressAccessService,
      useFactory: () => ({
        progress: signal(SAMPLES[stateOf(inject(ActivatedRoute))]),
        status: signal('ready'),
        load: async () => true,
      }),
    },
  ],
  template: `
    @switch (state) {
      @case ('screen') {
        <app-progress-screen />
      }
      @case ('celebration') {
        <app-celebration [celebration]="celebrationData" />
      }
      @case ('cap') {
        <app-celebration [celebration]="celebrationData" />
      }
      @case ('undo') {
        <app-celebration [celebration]="celebrationData" />
      }
      @default {
        <div class="frame"><app-progress-summary /></div>
      }
    }
  `,
  styles: `
    .frame {
      padding: var(--space-4);
      background: var(--color-bg);
      min-height: 100dvh;
    }
  `,
})
export class ProgressPreview {
  protected readonly state = stateOf(inject(ActivatedRoute));
  protected readonly celebrationData: CelebrationData = CELEBRATIONS[this.state] ?? {
    xpDelta: 10,
    capped: false,
    streakDays: null,
    leveledUpTo: null,
  };
}
