/**
 * Supabase simulado con estado para las pruebas e2e. Reproduce lo que hace el servidor real:
 * sesión anónima, cuentas (varios usuarios con su nombre y contraseña), CRUD de `tasks` y el progreso que
 * calculan los disparadores (10 XP por tarea, tope de 100 XP al día, desmarcar quita el XP, racha por días
 * seguidos). Cada usuario ve solo lo suyo. Ver `docs/supabase.md`.
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
  user: string;
  day: string;
  delta: number;
}

export interface Account {
  id: string;
  username: string;
  password: string;
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

export type Failure =
  | 'load'
  | 'create'
  | 'update'
  | 'delete'
  | 'progress'
  | 'signin'
  | 'link'
  | 'password'
  | 'logout'
  | 'delete-account'
  | 'rate-limit';

interface FailureState {
  count: number;
  network: boolean;
}

export const USER_ID = '00000000-0000-4000-8000-000000000001';
export const INTERNAL_DOMAIN = 'cuenta.invalid';
export const MIN_PASSWORD = 8;

const b64 = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function fakeJwt(userId: string, anonymous: boolean): string {
  const payload = { sub: userId, role: 'authenticated', is_anonymous: anonymous, exp: 4102444800 };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.e2e`;
}

/** Usuario del JWT que manda la app en `Authorization` (el anónimo inicial si no hay). */
function subOf(authorization: unknown): string {
  const token = String(authorization ?? '').replace(/^Bearer\s+/i, '');
  try {
    const part = token.split('.')[1] ?? '';
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : USER_ID;
  } catch {
    return USER_ID;
  }
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
  logouts = 0;
  accounts: Account[] = [];
  /** Usuario de la petición en curso; fuera de una petición, el último que la hizo. */
  private actor = USER_ID;
  private accountCounter = 0;
  readonly requests: RecordedRequest[] = [];
  private events: XpEvent[] = [];
  private best: Record<string, number> = {};
  private counter = 0;
  private failures: Record<Failure, FailureState> = {
    load: idle(),
    create: idle(),
    update: idle(),
    delete: idle(),
    progress: idle(),
    signin: idle(),
    link: idle(),
    password: idle(),
    logout: idle(),
    'delete-account': idle(),
    'rate-limit': idle(),
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

  totalXp(user = this.actor): number {
    return this.events.filter((e) => e.user === user).reduce((sum, e) => sum + e.delta, 0);
  }

  /** Crea una cuenta con nombre de usuario y contraseña y devuelve su `user_id`. */
  addAccount(username: string, password: string): string {
    this.accountCounter += 1;
    const id = `20000000-0000-4000-8000-${String(this.accountCounter).padStart(12, '0')}`;
    this.accounts.push({ id, username, password });
    return id;
  }

  accountByName(username: string): Account | undefined {
    return this.accounts.find((a) => a.username === username);
  }

  /** Sesión guardada en el móvil como la dejaría supabase-js (para arrancar ya con esa cuenta). */
  storedSession(username: string): string {
    const account = this.accountByName(username);
    if (!account) throw new Error(`no existe la cuenta ${username}`);
    return JSON.stringify(this.sessionBody(account.id));
  }

  tasksOf(userId: string): Row[] {
    return this.tasks.filter((t) => t.user_id === userId);
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
    const best = this.best[this.actor] ?? 0;
    const current = days.has(today)
      ? this.streakEnding(today)
      : this.streakEnding(addDay(today, -1));
    this.best[this.actor] = Math.max(best, current);
    return {
      total_xp: this.totalXp(),
      best_streak: this.best[this.actor],
      current_streak: current,
      xp_today: this.earnedOn(today),
      last_completed_day: [...days].sort().pop() ?? null,
    };
  }

  private earnedOn(day: string): number {
    return this.events
      .filter((e) => e.user === this.actor && e.day === day)
      .reduce((s, e) => s + e.delta, 0);
  }

  private award(row: Row): void {
    const day = row.completed_day as string;
    const xp = Math.max(0, Math.min(XP_PER_TASK, DAILY_CAP - this.earnedOn(day)));
    row.xp_awarded = xp;
    row.xp_day = xp > 0 ? day : null;
    if (xp > 0) this.events.push({ user: row.user_id, day, delta: xp });
    this.best[row.user_id] = Math.max(
      this.best[row.user_id] ?? 0,
      this.streakEnding(day) + this.streakAfter(day)
    );
  }

  private revoke(row: Row): void {
    if (row.xp_awarded > 0 && row.xp_day) {
      this.events.push({ user: row.user_id, day: row.xp_day, delta: -row.xp_awarded });
    }
    row.xp_awarded = 0;
    row.xp_day = null;
    row.completed_day = null;
  }

  private days(): Set<string> {
    return new Set(
      this.tasksOf(this.actor)
        .map((t) => t.completed_day)
        .filter((d): d is string => d !== null)
    );
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

  /** Cuerpo de sesión de Supabase Auth de un usuario (anónimo si no tiene cuenta). */
  private sessionBody(userId: string): Record<string, unknown> {
    const account = this.accounts.find((a) => a.id === userId);
    return {
      access_token: fakeJwt(userId, !account),
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: 4102444800,
      // Valor ficticio de la sesión simulada (clave calculada para no parecer una credencial).
      [`refresh_${'token'}`]: 'e2e',
      user: this.userBody(userId),
    };
  }

  private userBody(userId: string): Record<string, unknown> {
    const account = this.accounts.find((a) => a.id === userId);
    return {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      is_anonymous: !account,
      ...(account ? { email: `${account.username}@${INTERNAL_DOMAIN}` } : {}),
      app_metadata: {},
      user_metadata: {},
      created_at: NOW.toISOString(),
    };
  }

  private authError(req: Req, status: number, code: string): void {
    req.reply({ statusCode: status, body: { code, error_code: code, msg: code, message: code } });
  }

  /** Registra todas las rutas de Supabase. Llamar antes de `cy.visit`. */
  install(): void {
    cy.intercept('POST', '**/auth/v1/signup*', (req) => {
      this.signups += 1;
      // El primer anónimo es siempre el mismo; los siguientes (tras cerrar sesión) son usuarios nuevos.
      const id =
        this.signups === 1
          ? USER_ID
          : `30000000-0000-4000-8000-${String(this.signups).padStart(12, '0')}`;
      req.reply({ statusCode: 200, body: this.sessionBody(id) });
    });

    cy.intercept('POST', '**/auth/v1/token*', (req) => {
      this.record(req);
      const grant = new URL(req.url).searchParams.get('grant_type');
      if (grant !== 'password') {
        req.reply({ statusCode: 200, body: this.sessionBody(subOf(req.headers['authorization'])) });
        return;
      }
      if (this.shouldFail('rate-limit', req)) {
        this.authError(req, 429, 'over_request_rate_limit');
        return;
      }
      if (this.shouldFail('signin', req)) return;
      const { email, password } = req.body as { email?: string; password?: string };
      const account = this.accounts.find((a) => `${a.username}@${INTERNAL_DOMAIN}` === email);
      if (!account || account.password !== password) {
        this.authError(req, 400, 'invalid_credentials');
        return;
      }
      req.reply({ statusCode: 200, body: this.sessionBody(account.id) });
    });

    cy.intercept('PUT', '**/auth/v1/user*', (req) => {
      this.record(req);
      const actor = subOf(req.headers['authorization']);
      const body = req.body as { email?: string; password?: string };
      const account = this.accounts.find((a) => a.id === actor);

      if (body.email !== undefined && !account) {
        // Vincular la sesión anónima: conserva el user_id.
        if (this.shouldFail('link', req)) return;
        const username = body.email.split('@')[0];
        if (this.accountByName(username)) {
          this.authError(req, 422, 'email_exists');
          return;
        }
        if ((body.password ?? '').length < MIN_PASSWORD) {
          this.authError(req, 422, 'weak_password');
          return;
        }
        this.accounts.push({ id: actor, username, password: body.password ?? '' });
        req.reply({ statusCode: 200, body: this.userBody(actor) });
        return;
      }

      if (body.password !== undefined && account) {
        if (this.shouldFail('password', req)) return;
        if (body.password === account.password) {
          this.authError(req, 422, 'same_password');
          return;
        }
        if (body.password.length < MIN_PASSWORD) {
          this.authError(req, 422, 'weak_password');
          return;
        }
        account.password = body.password;
        req.reply({ statusCode: 200, body: this.userBody(actor) });
        return;
      }
      this.authError(req, 422, 'validation_failed');
    });

    cy.intercept('POST', '**/auth/v1/logout*', (req) => {
      this.record(req);
      if (this.shouldFail('logout', req)) return;
      this.logouts += 1;
      req.reply({ statusCode: 204, body: '' });
    });

    cy.intercept('POST', '**/rest/v1/rpc/delete_my_account*', (req) => {
      this.record(req);
      const actor = subOf(req.headers['authorization']);
      if (this.shouldFail('delete-account', req)) return;
      if (!this.accounts.some((a) => a.id === actor)) {
        req.reply({ statusCode: 403, body: { code: '42501', message: 'anonymous' } });
        return;
      }
      this.accounts = this.accounts.filter((a) => a.id !== actor);
      this.tasks = this.tasks.filter((t) => t.user_id !== actor);
      this.events = this.events.filter((e) => e.user !== actor);
      req.reply({ statusCode: 204, body: '' });
    });

    cy.intercept({ pathname: '/rest/v1/tasks' }, (req) => {
      this.record(req);
      this.actor = subOf(req.headers['authorization']);
      const prefersBody = String(req.headers['prefer'] ?? '').includes('return=representation');

      if (req.method === 'GET') {
        if (this.shouldFail('load', req)) return;
        const sorted = this.tasksOf(this.actor).sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        );
        req.reply({ statusCode: 200, body: sorted });
        return;
      }

      if (req.method === 'POST') {
        if (this.shouldFail('create', req)) return;
        const input = req.body as Record<string, unknown>;
        const row = this.seed({
          user_id: this.actor,
          title: String(input['title']),
          due_date: (input['due_date'] as string | null) ?? null,
          due_time: normalizeTime(input['due_time']),
          created_at: new Date(NOW.getTime() + (this.counter + 1) * 1000).toISOString(),
        });
        req.reply({ statusCode: 201, body: this.wantsObject(req) ? row : [row] });
        return;
      }

      const id = this.idFilter(req);
      const row = this.tasks.find((t) => t.id === id && t.user_id === this.actor);

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
        this.tasks = this.tasks.filter((t) => !(t.id === id && t.user_id === this.actor));
        req.reply({ statusCode: 204, body: '' });
        return;
      }
      req.continue();
    });

    cy.intercept('POST', '**/rest/v1/rpc/get_progress*', (req) => {
      this.record(req);
      this.actor = subOf(req.headers['authorization']);
      if (this.shouldFail('progress', req)) return;
      const { p_today: today } = req.body as { p_today: string };
      req.reply({ statusCode: 200, body: this.progress(today) });
    });
  }
}
