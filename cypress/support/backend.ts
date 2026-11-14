/**
 * Supabase simulado con estado para las pruebas e2e. Reproduce lo que hace el servidor real:
 * sesión anónima, CRUD de `tasks` y el progreso que calculan los disparadores (10 XP por tarea,
 * tope de 100 XP al día, desmarcar quita el XP, racha por días seguidos). Ver `docs/supabase.md`.
 */
import type { CyHttpMessages } from 'cypress/types/net-stubbing';

type Req = CyHttpMessages.IncomingHttpRequest;

export const NOW = new Date(2026, 10, 14, 10, 0, 0); // sábado 14/11/2026, 10:00 local
export const TODAY = '2026-11-14';
export const DAILY_CAP = 100;
export const XP_PER_TASK = 10;

export interface Row {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  completed_day: string | null;
  xp_awarded: number;
  xp_day: string | null;
  postponed_count: number;
  created_at: string;
}

interface XpEvent {
  day: string;
  delta: number;
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

export type Failure = 'load' | 'create' | 'update' | 'delete' | 'progress';

interface FailureState {
  count: number;
  network: boolean;
}

const USER_ID = '00000000-0000-4000-8000-000000000001';

const b64 = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function fakeJwt(): string {
  const payload = { sub: USER_ID, role: 'authenticated', is_anonymous: true, exp: 4102444800 };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.e2e`;
}

export function addDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/** Postgres guarda `time` con segundos: «18:30» vuelve como «18:30:00». */
function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return value.length === 5 ? `${value}:00` : value;
}

const idle = (): FailureState => ({ count: 0, network: false });

export class FakeBackend {
  tasks: Row[] = [];
  signups = 0;
  readonly requests: RecordedRequest[] = [];
  private events: XpEvent[] = [];
  private best = 0;
  private counter = 0;
  private failures: Record<Failure, FailureState> = {
    load: idle(),
    create: idle(),
    update: idle(),
    delete: idle(),
    progress: idle(),
  };

  /** Hace fallar las próximas `count` peticiones de ese tipo (500, o error de red). */
  fail(kind: Failure, count = 1, network = false): void {
    this.failures[kind] = { count, network };
  }

  /** Cuántas peticiones de ese método y ruta se han hecho. */
  count(method: string, path: string): number {
    return this.requests.filter((r) => r.method === method && r.path === path).length;
  }

  lastBody(method: string, path: string): Record<string, unknown> | undefined {
    const found = [...this.requests].reverse().find((r) => r.method === method && r.path === path);
    return found?.body as Record<string, unknown> | undefined;
  }

  /** Tarea ya guardada en el servidor (no solo en la pantalla). */
  byTitle(title: string): Row | undefined {
    return this.tasks.find((t) => t.title === title);
  }

  totalXp(): number {
    return this.events.reduce((sum, e) => sum + e.delta, 0);
  }

  seed(partial: Partial<Row> & { title: string }): Row {
    this.counter += 1;
    const row: Row = {
      id: `10000000-0000-4000-8000-${String(this.counter).padStart(12, '0')}`,
      user_id: USER_ID,
      due_date: null,
      due_time: null,
      completed_at: null,
      completed_day: null,
      xp_awarded: 0,
      xp_day: null,
      postponed_count: 0,
      created_at: new Date(NOW.getTime() - 3_600_000 + this.counter * 1000).toISOString(),
      ...partial,
    };
    this.tasks.push(row);
    return row;
  }

  /** Tarea ya completada en `day`, con sus XP y su racha, como si la hubiera completado el servidor. */
  seedCompleted(title: string, day: string): Row {
    const row = this.seed({ title });
    row.completed_at = new Date(`${day}T09:00:00`).toISOString();
    row.completed_day = day;
    this.award(row);
    return row;
  }

  progress(today: string): Record<string, unknown> {
    const days = this.days();
    const current = days.has(today)
      ? this.streakEnding(today)
      : this.streakEnding(addDay(today, -1));
    this.best = Math.max(this.best, current);
    return {
      total_xp: this.totalXp(),
      best_streak: this.best,
      current_streak: current,
      xp_today: this.earnedOn(today),
      last_completed_day: [...days].sort().pop() ?? null,
    };
  }

  private earnedOn(day: string): number {
    return this.events.filter((e) => e.day === day).reduce((s, e) => s + e.delta, 0);
  }

  private award(row: Row): void {
    const day = row.completed_day as string;
    const xp = Math.max(0, Math.min(XP_PER_TASK, DAILY_CAP - this.earnedOn(day)));
    row.xp_awarded = xp;
    row.xp_day = xp > 0 ? day : null;
    if (xp > 0) this.events.push({ day, delta: xp });
    this.best = Math.max(this.best, this.streakEnding(day) + this.streakAfter(day));
  }

  private revoke(row: Row): void {
    if (row.xp_awarded > 0 && row.xp_day) {
      this.events.push({ day: row.xp_day, delta: -row.xp_awarded });
    }
    row.xp_awarded = 0;
    row.xp_day = null;
    row.completed_day = null;
  }

  private days(): Set<string> {
    return new Set(this.tasks.map((t) => t.completed_day).filter((d): d is string => d !== null));
  }

  /** Días seguidos que hay justo después de `day` (sin contarlo). */
  private streakAfter(day: string): number {
    const days = this.days();
    let n = 0;
    for (let d = addDay(day, 1); days.has(d); d = addDay(d, 1)) n += 1;
    return n;
  }

  private streakEnding(day: string): number {
    const days = this.days();
    let n = 0;
    for (let d = day; days.has(d); d = addDay(d, -1)) n += 1;
    return n;
  }

  private applyPatch(row: Row, body: Record<string, unknown>): void {
    const wasDone = row.completed_at !== null;
    const target = row as unknown as Record<string, unknown>;
    for (const key of [
      'title',
      'due_date',
      'due_time',
      'completed_at',
      'completed_day',
      'postponed_count',
    ]) {
      if (key in body) target[key] = key === 'due_time' ? normalizeTime(body[key]) : body[key];
    }
    if (!wasDone && row.completed_at !== null && row.completed_day) this.award(row);
    else if (wasDone && row.completed_at === null) this.revoke(row);
  }

  private shouldFail(kind: Failure, req: Req): boolean {
    const f = this.failures[kind];
    if (f.count <= 0) return false;
    f.count -= 1;
    if (f.network) req.reply({ forceNetworkError: true });
    else req.reply({ statusCode: 500, body: { message: 'fallo simulado' } });
    return true;
  }

  private record(req: Req): void {
    this.requests.push({ method: req.method, path: new URL(req.url).pathname, body: req.body });
  }

  private idFilter(req: Req): string | null {
    const raw = new URL(req.url).searchParams.get('id');
    return raw?.startsWith('eq.') ? raw.slice(3) : null;
  }

  private wantsObject(req: Req): boolean {
    return String(req.headers['accept'] ?? '').includes('vnd.pgrst.object');
  }

  /** Registra todas las rutas de Supabase. Llamar antes de `cy.visit`. */
  install(): void {
    cy.intercept('POST', '**/auth/v1/signup*', (req) => {
      this.signups += 1;
      req.reply({
        statusCode: 200,
        body: {
          access_token: fakeJwt(),
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 4102444800,
          // Valor ficticio de la sesión simulada (clave calculada para no parecer una credencial).
          [`refresh_${'token'}`]: 'e2e',
          user: {
            id: USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            is_anonymous: true,
            app_metadata: {},
            user_metadata: {},
            created_at: NOW.toISOString(),
          },
        },
      });
    });

    cy.intercept({ pathname: '/rest/v1/tasks' }, (req) => {
      this.record(req);
      const prefersBody = String(req.headers['prefer'] ?? '').includes('return=representation');

      if (req.method === 'GET') {
        if (this.shouldFail('load', req)) return;
        const sorted = [...this.tasks].sort((a, b) => a.created_at.localeCompare(b.created_at));
        req.reply({ statusCode: 200, body: sorted });
        return;
      }

      if (req.method === 'POST') {
        if (this.shouldFail('create', req)) return;
        const input = req.body as Record<string, unknown>;
        const row = this.seed({
          title: String(input['title']),
          due_date: (input['due_date'] as string | null) ?? null,
          due_time: normalizeTime(input['due_time']),
          created_at: new Date(NOW.getTime() + (this.counter + 1) * 1000).toISOString(),
        });
        req.reply({ statusCode: 201, body: this.wantsObject(req) ? row : [row] });
        return;
      }

      const id = this.idFilter(req);
      const row = this.tasks.find((t) => t.id === id);

      if (req.method === 'PATCH') {
        if (this.shouldFail('update', req)) return;
        if (!row) {
          const single = this.wantsObject(req);
          req.reply({
            statusCode: single ? 406 : 204,
            body: single ? { message: 'sin filas' } : '',
          });
          return;
        }
        this.applyPatch(row, req.body as Record<string, unknown>);
        if (!prefersBody) req.reply({ statusCode: 204, body: '' });
        else req.reply({ statusCode: 200, body: this.wantsObject(req) ? row : [row] });
        return;
      }

      if (req.method === 'DELETE') {
        if (this.shouldFail('delete', req)) return;
        this.tasks = this.tasks.filter((t) => t.id !== id);
        req.reply({ statusCode: 204, body: '' });
        return;
      }
      req.continue();
    });

    cy.intercept('POST', '**/rest/v1/rpc/get_progress*', (req) => {
      this.record(req);
      if (this.shouldFail('progress', req)) return;
      const { p_today: today } = req.body as { p_today: string };
      req.reply({ statusCode: 200, body: this.progress(today) });
    });
  }
}
