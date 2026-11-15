import { TestBed } from '@angular/core/testing';
import { AccountConstructorService } from './account.constructor.service';
import { AccountErrorReason } from '../../core/models/account';

function setup(): AccountConstructorService {
  TestBed.configureTestingModule({});
  return TestBed.inject(AccountConstructorService);
}

const states = (rules: readonly { state: string }[]) => rules.map((r) => r.state);

describe('AccountConstructorService · reglas del nombre de usuario', () => {
  it('US-011-02 sin tocar, las dos reglas están en reposo y con su texto', () => {
    const rules = setup().usernameRules('', false);
    expect(rules.map((r) => r.text)).toEqual([
      'De 3 a 24 caracteres',
      'Minúsculas, números, punto, guion y guion bajo',
    ]);
    expect(states(rules)).toEqual(['idle', 'idle']);
  });

  it('US-011-02 un nombre válido cumple las dos reglas', () => {
    expect(states(setup().usernameRules('carlos_ritmo.2-b', true))).toEqual(['ok', 'ok']);
  });

  it('US-011-02 demasiado corto o largo incumple la longitud', () => {
    const s = setup();
    expect(states(s.usernameRules('ab', true))).toEqual(['error', 'ok']);
    expect(states(s.usernameRules('a'.repeat(25), true))).toEqual(['error', 'ok']);
    expect(states(s.usernameRules('a'.repeat(24), true))).toEqual(['ok', 'ok']);
    expect(states(s.usernameRules('', true))).toEqual(['error', 'error']);
  });

  it('US-011-02 caracteres no permitidos incumplen la segunda regla', () => {
    const s = setup();
    for (const bad of ['ana lopez', 'ana@mail', 'añadir', 'ana/b', 'ana!']) {
      expect(states(s.usernameRules(bad, true)), bad).toEqual(['ok', 'error']);
    }
  });

  it('US-011-02 no distingue mayúsculas ni espacios en los extremos', () => {
    expect(states(setup().usernameRules('  Carlos_Ritmo ', true))).toEqual(['ok', 'ok']);
  });

  it('US-011-02 isUsernameValid refleja ambas reglas', () => {
    const s = setup();
    expect(s.isUsernameValid('carlos_ritmo')).toBe(true);
    expect(s.isUsernameValid('ab')).toBe(false);
    expect(s.isUsernameValid('ana lopez')).toBe(false);
  });
});

describe('AccountConstructorService · reglas de la contraseña', () => {
  it('US-011-02 sin tocar, las reglas están en reposo', () => {
    const rules = setup().passwordRules('', '', false);
    expect(rules.map((r) => r.text)).toEqual([
      'De 8 a 64 caracteres',
      'Distinta del nombre de usuario',
    ]);
    expect(states(rules)).toEqual(['idle', 'idle']);
  });

  it('US-011-02 de 8 a 64 caracteres', () => {
    const s = setup();
    expect(states(s.passwordRules('1234567', 'ana', true))[0]).toBe('error');
    expect(states(s.passwordRules('12345678', 'ana', true))[0]).toBe('ok');
    expect(states(s.passwordRules('x'.repeat(64), 'ana', true))[0]).toBe('ok');
    expect(states(s.passwordRules('x'.repeat(65), 'ana', true))[0]).toBe('error');
  });

  it('US-011-02 distinta del nombre de usuario sin distinguir mayúsculas', () => {
    const s = setup();
    expect(states(s.passwordRules('Carlos_Ritmo', 'carlos_ritmo', true))[1]).toBe('error');
    expect(states(s.passwordRules('Carlos_Ritmo2', 'carlos_ritmo', true))[1]).toBe('ok');
    expect(states(s.passwordRules('MiClaveSegura', '', true))[1]).toBe('ok');
  });

  it('US-011-05 con la actual, añade «Distinta de la contraseña actual»', () => {
    const s = setup();
    const rules = s.passwordRules('Nueva12345', 'ana', true, { notSameAs: 'Vieja12345' });
    expect(rules.map((r) => r.text)).toEqual([
      'De 8 a 64 caracteres',
      'Distinta del nombre de usuario',
      'Distinta de la contraseña actual',
    ]);
    expect(states(rules)).toEqual(['ok', 'ok', 'ok']);
    expect(states(s.passwordRules('Vieja12345', 'ana', true, { notSameAs: 'Vieja12345' }))[2]).toBe(
      'error'
    );
  });

  it('US-011-02 isPasswordValid exige todas las reglas', () => {
    const s = setup();
    expect(s.isPasswordValid('MiClaveSegura', 'ana')).toBe(true);
    expect(s.isPasswordValid('corta', 'ana')).toBe(false);
    expect(s.isPasswordValid('ANA_LOPEZ_1', 'ana_lopez_1')).toBe(false);
    expect(s.isPasswordValid('Vieja12345', 'ana', { notSameAs: 'Vieja12345' })).toBe(false);
  });
});

describe('AccountConstructorService · repetición de la contraseña', () => {
  it('US-011-02 sin repetir: «Sin verificar»', () => {
    expect(setup().matchState('MiClaveSegura', '')).toEqual({
      state: 'idle',
      label: 'Sin verificar',
    });
  });

  it('US-011-02 iguales: «Coinciden»; distintas: «No coinciden»', () => {
    const s = setup();
    expect(s.matchState('MiClaveSegura', 'MiClaveSegura')).toEqual({
      state: 'ok',
      label: 'Coinciden',
    });
    expect(s.matchState('MiClaveSegura', 'miclavesegura')).toEqual({
      state: 'error',
      label: 'No coinciden',
    });
  });
});

describe('AccountConstructorService · textos de error por contexto', () => {
  const reasons: AccountErrorReason[] = [
    'invalid-credentials',
    'username-taken',
    'weak-password',
    'same-password',
    'rate-limited',
    'network',
    'timeout',
    'unauthorized',
    'unknown',
  ];

  it('US-011-03 el inicio de sesión no distingue usuario inexistente de contraseña mala', () => {
    const s = setup();
    expect(s.errorText('invalid-credentials', 'signin')).toBe(
      'Nombre de usuario o contraseña incorrectos. Comprueba tus datos e inténtalo de nuevo.'
    );
    expect(s.errorText('rate-limited', 'signin')).toBe('Demasiados intentos. Espera unos minutos.');
  });

  it('US-011-02 crear cuenta: nombre no disponible y contraseña débil', () => {
    const s = setup();
    expect(s.errorText('username-taken', 'create')).toBe('Nombre de usuario no disponible');
    expect(s.errorText('weak-password', 'create')).toBe(
      'La contraseña debe cumplir con los requisitos.'
    );
  });

  it('US-011-05 cambiar contraseña: actual incorrecta e igual a la actual', () => {
    const s = setup();
    expect(s.errorText('invalid-credentials', 'change-password')).toBe(
      'La contraseña actual no es correcta.'
    );
    expect(s.errorText('same-password', 'change-password')).toBe(
      'La nueva contraseña debe ser distinta de la actual.'
    );
  });

  it('US-011-06 borrar cuenta: contraseña incorrecta y fallo sin cambios', () => {
    const s = setup();
    expect(s.errorText('invalid-credentials', 'delete')).toBe('La contraseña no es correcta.');
    expect(s.errorText('unknown', 'delete')).toBe('No se ha borrado nada. Inténtalo de nuevo.');
    expect(s.errorText('network', 'delete')).toBe('No se ha borrado nada. Inténtalo de nuevo.');
  });

  it('US-011-02 todo motivo en todo contexto tiene un texto en español, sin detalles técnicos', () => {
    const s = setup();
    for (const context of ['create', 'signin', 'change-password', 'delete'] as const) {
      for (const reason of reasons) {
        const text = s.errorText(reason, context);
        expect(text.length, `${context}/${reason}`).toBeGreaterThan(10);
        expect(text, `${context}/${reason}`).not.toMatch(
          /supabase|gotrue|jwt|http|\d{3}|undefined/i
        );
      }
    }
  });

  it('US-011-02 sin conexión y sin respuesta se explican', () => {
    const s = setup();
    expect(s.errorText('network', 'create')).toBe('Sin conexión a Internet. Inténtalo de nuevo.');
    expect(s.errorText('timeout', 'signin')).toBe('El servidor no responde. Inténtalo de nuevo.');
  });
});

describe('AccountConstructorService · textos fijos de las pantallas', () => {
  it('US-011-01 pantalla Cuenta sin cuenta', () => {
    const t = setup().text.account;
    expect(t.title).toBe('Cuenta');
    expect(t.localBadge).toBe('ALMACENAMIENTO LOCAL ACTIVO');
    expect(t.localTitle).toBe('Tus datos viven solo en este móvil');
    expect(t.localBody).toBe(
      'Tus tareas, tu racha y tus puntos de XP se guardan en la memoria de este móvil y se perderían si lo cambias o desinstalas la app.'
    );
    expect(t.switchTitle).toBe('¿Cambias de móvil pronto?');
    expect(t.switchBody).toBe(
      'Si quieres recuperar tus tareas y tu progreso en otro teléfono, crea una cuenta gratuita.'
    );
    expect(t.create).toBe('Crear cuenta gratuita');
    expect(t.signIn).toBe('Ya tengo cuenta, iniciar sesión');
    expect(t.footer).toBe('La cuenta es opcional y no necesita correo electrónico.');
  });

  it('US-011-04 pantalla Cuenta con cuenta, cierre de sesión y zona de peligro', () => {
    const t = setup().text.account;
    expect(t.saved).toBe('Tus tareas y tu XP están guardados en tu cuenta');
    expect(t.settings).toBe('AJUSTES DE CUENTA');
    expect(t.changePassword).toBe('Cambiar contraseña');
    expect(t.changePasswordHint).toBe('Protección con clave segura');
    expect(t.logout).toBe('Cerrar sesión');
    expect(t.logoutHint).toBe('Tus datos seguirán en tu cuenta');
    expect(t.dangerLabel).toBe('ZONA DE PELIGRO');
    expect(t.dangerTitle).toBe('Borrar cuenta permanentemente');
    expect(t.dangerBody).toBe(
      'Esta acción eliminará tu nombre de usuario, todas tus tareas guardadas, tus rachas y tu nivel de XP. No se puede revertir.'
    );
    expect(t.dangerButton).toBe('Borrar cuenta y datos');
  });

  it('US-011-04 diálogo de cerrar sesión', () => {
    const t = setup().text.logoutDialog;
    expect(t.title).toBe('¿Cerrar sesión?');
    expect(t.body).toBe(
      'Tus tareas y tu progreso permanecerán guardados en tu cuenta. Este teléfono quedará sin tareas hasta que vuelvas a iniciar sesión.'
    );
    expect(t.confirm).toBe('Sí, cerrar sesión');
    expect(t.cancel).toBe('Cancelar');
  });

  it('US-011-01 tarjeta de recordatorio', () => {
    const t = setup().text.reminder;
    expect(t.label).toBe('Asegura tu progreso');
    expect(t.title).toBe('Crea tu respaldo personal');
    expect(t.body).toBe(
      'Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.'
    );
    expect(t.create).toBe('Crear cuenta');
    expect(t.later).toBe('En 14 días');
    expect(t.dismissLabel).toBe('Descartar recordatorio');
    expect(t.laterLabel).toBe('Recordármelo dentro de 14 días');
  });

  it('US-011-02 pantalla Crear cuenta', () => {
    const t = setup().text.create;
    expect(t.title).toBe('Crear cuenta');
    expect(t.offlineTitle).toBe('Sin conexión a Internet');
    expect(t.offlineBody).toBe(
      'No se pudo contactar con el servidor. Tus tareas locales permanecen a salvo.'
    );
    expect(t.retry).toBe('Reintentar ahora');
    expect(t.introTitle).toBe('Sin correos ni verificaciones.');
    expect(t.introBody).toBe('Solo tu nombre de usuario y tu contraseña.');
    expect(t.usernameLabel).toBe('Nombre de usuario');
    expect(t.usernamePlaceholder).toBe('ej. carlos_ritmo');
    expect(t.usernameError).toBe('El formato de usuario no es válido.');
    expect(t.passwordLabel).toBe('Contraseña');
    expect(t.passwordHint).toBe('Mín. 8');
    expect(t.passwordError).toBe('La contraseña debe cumplir con los requisitos.');
    expect(t.repeatLabel).toBe('Repetir contraseña');
    expect(t.repeatRule).toBe('Coincidencia exacta con la anterior');
    expect(t.repeatError).toBe('Las contraseñas no coinciden.');
    expect(t.toggleLabel).toBe('Mostrar u ocultar contraseña');
    expect(t.noticeTitle).toBe('Aviso importante sobre tu cuenta');
    expect(t.noticeText).toBe('Si olvidas tu contraseña no podremos recuperar tu cuenta.');
    expect(t.noticeStrong).toBe('Entiendo que no hay forma de recuperarla.');
    expect(t.submit).toBe('Crear cuenta');
    expect(t.submitting).toBe('Creando tu cuenta…');
    expect(t.cancel).toBe('Cancelar y volver');
    expect(t.footer).toBe('Mantienes tus tareas locales intactas en este dispositivo.');
    expect(t.successTitle).toBe('¡Cuenta creada con éxito!');
    expect(t.successBody).toBe('Tus tareas y tu progreso siguen aquí.');
  });

  it('US-011-03 pantalla Iniciar sesión', () => {
    const t = setup().text.signIn;
    expect(t.title).toBe('Iniciar sesión');
    expect(t.badge).toBe('RECUPERA TU NIVEL');
    expect(t.welcome).toBe('Bienvenido de nuevo');
    expect(t.welcomeBody).toBe('Inicia sesión para recuperar tus tareas y tu racha.');
    expect(t.errorTitle).toBe('Acceso no válido');
    expect(t.usernameLabel).toBe('Nombre de usuario');
    expect(t.usernameSide).toBe('Identificador único');
    expect(t.usernamePlaceholder).toBe('tu nombre de usuario');
    expect(t.passwordLabel).toBe('Contraseña');
    expect(t.submit).toBe('Iniciar sesión');
    expect(t.cancel).toBe('Cancelar');
  });

  it('US-011-03 hoja de tareas de este móvil y confirmación de descarte', () => {
    const t = setup().text.localTasks;
    expect(t.label).toBe('Tareas encontradas');
    expect(t.title).toBe('¿Qué quieres hacer con las tareas de este móvil?');
    expect(t.body).toBe(
      'Este dispositivo tiene tareas creadas sin cuenta. Decide qué hacer con ellas al entrar en tu cuenta.'
    );
    expect(t.pendingBadge).toBe('Pendientes');
    expect(t.bringTitle).toBe('Traer mis tareas pendientes a mi cuenta');
    expect(t.bringNote).toBe(
      'Nota: El XP y las tareas ya completadas de este móvil no se sumarán.'
    );
    expect(t.useOnlyTitle).toBe('Usar solo mi cuenta');
    expect(t.useOnlyBody).toBe(
      'Las tareas de este móvil se descartarán para mostrar únicamente tu cuenta.'
    );
    expect(t.bringConfirm).toBe('Traer tareas y continuar');
    expect(t.cancel).toBe('Cancelar inicio de sesión');
    expect(t.discardTitle).toBe('¿Descartar tareas de este móvil?');
    expect(t.discardConfirm).toBe('Sí, descartar tareas locales');
    expect(t.discardBack).toBe('Volver a opciones');
    expect(t.completedOnlyTitle).toBe('¿Continuar sin las tareas de este móvil?');
    expect(t.completedOnlyConfirm).toBe('Sí, continuar');
  });

  it('US-011-03 textos con recuento, en singular y plural', () => {
    const t = setup().text.localTasks;
    expect(t.count(1)).toBe('1 tarea local sin cuenta');
    expect(t.count(3)).toBe('3 tareas locales sin cuenta');
    expect(t.bringBody(1)).toBe('Se añadirá 1 tarea pendiente de este móvil a tu cuenta.');
    expect(t.bringBody(4)).toBe('Se añadirán 4 tareas pendientes de este móvil a tu cuenta.');
    expect(t.discardBody(1)).toBe(
      'Esta acción no se puede deshacer. La tarea pendiente de este móvil se perderá y se cargará tu cuenta.'
    );
    expect(t.discardBody(2)).toBe(
      'Esta acción no se puede deshacer. Las 2 tareas pendientes de este móvil se perderán y se cargará tu cuenta.'
    );
    expect(t.completedOnlyBody(1)).toBe(
      'La tarea completada de este móvil y su XP no se sumarán a tu cuenta. No se puede deshacer.'
    );
    expect(t.completedOnlyBody(5)).toBe(
      'Las 5 tareas completadas de este móvil y su XP no se sumarán a tu cuenta. No se puede deshacer.'
    );
  });

  it('US-011-05 y US-011-06 cambiar contraseña y borrar cuenta', () => {
    const s = setup();
    const c = s.text.changePassword;
    expect(c.title).toBe('Cambiar contraseña');
    expect(c.currentLabel).toBe('Contraseña actual');
    expect(c.newLabel).toBe('Contraseña nueva');
    expect(c.repeatLabel).toBe('Repetir contraseña nueva');
    expect(c.submit).toBe('Cambiar contraseña');
    expect(c.submitting).toBe('Cambiando tu contraseña…');
    const d = s.text.deleteAccount;
    expect(d.title).toBe('Borrar cuenta');
    expect(d.passwordLabel).toBe('Contraseña');
    expect(d.confirmText).toBe(
      'Entiendo que se borrarán mi cuenta y todos mis datos para siempre.'
    );
    expect(d.submit).toBe('Borrar mi cuenta');
    expect(d.submitting).toBe('Borrando tu cuenta…');
    expect(d.failure).toBe('No se ha borrado nada. Inténtalo de nuevo.');
  });

  it('US-011-01 avisos pequeños', () => {
    const t = setup().text.toast;
    expect(t.signedOut).toBe('Sesión cerrada');
    expect(t.signedIn).toBe('Sesión iniciada');
    expect(t.tasksAdded).toBe('Tareas añadidas a tu cuenta');
    expect(t.passwordChanged).toBe('Contraseña cambiada');
    expect(t.accountDeleted).toBe('Cuenta eliminada');
  });

  it('US-011-02 ningún texto promete lo que la spec descartó', () => {
    const all = JSON.stringify(setup().text).toLowerCase();
    for (const banned of [
      'sincronizar en vivo',
      '100 %',
      'recomendado',
      'privacidad máxima',
      'última copia',
      '5 segundos',
      '¿has olvidado',
      'correo electrónico para',
    ]) {
      expect(all, banned).not.toContain(banned);
    }
  });
});
