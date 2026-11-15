import { Injectable } from '@angular/core';
import {
  AccountErrorReason,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RuleState,
  RuleView,
  USERNAME_MAX,
  USERNAME_MIN,
} from '../../core/models/account';
import { normalizeUsername } from '../../core/utils/username';

export type AccountErrorContext = 'create' | 'signin' | 'change-password' | 'delete';

const USERNAME_CHARS = /^[a-z0-9._-]+$/;

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Reglas de formularios y textos de las pantallas de cuenta. Puro: no accede a datos. */
@Injectable({ providedIn: 'root' })
export class AccountConstructorService {
  readonly text = {
    account: {
      title: 'Cuenta',
      localBadge: 'ALMACENAMIENTO LOCAL ACTIVO',
      localTitle: 'Tus datos viven solo en este móvil',
      localBody:
        'Tus tareas, tu racha y tus puntos de XP se guardan en la memoria de este móvil y se perderían si lo cambias o desinstalas la app.',
      switchTitle: '¿Cambias de móvil pronto?',
      switchBody:
        'Si quieres recuperar tus tareas y tu progreso en otro teléfono, crea una cuenta gratuita.',
      create: 'Crear cuenta gratuita',
      signIn: 'Ya tengo cuenta, iniciar sesión',
      footer: 'La cuenta es opcional y no necesita correo electrónico.',
      saved: 'Tus tareas y tu XP están guardados en tu cuenta',
      settings: 'AJUSTES DE CUENTA',
      changePassword: 'Cambiar contraseña',
      changePasswordHint: 'Protección con clave segura',
      logout: 'Cerrar sesión',
      logoutHint: 'Tus datos seguirán en tu cuenta',
      dangerLabel: 'ZONA DE PELIGRO',
      dangerTitle: 'Borrar cuenta permanentemente',
      dangerBody:
        'Esta acción eliminará tu nombre de usuario, todas tus tareas guardadas, tus rachas y tu nivel de XP. No se puede revertir.',
      dangerButton: 'Borrar cuenta y datos',
      profileLabel: 'Cuenta',
    },
    logoutDialog: {
      title: '¿Cerrar sesión?',
      body: 'Tus tareas y tu progreso permanecerán guardados en tu cuenta. Este teléfono quedará sin tareas hasta que vuelvas a iniciar sesión.',
      confirm: 'Sí, cerrar sesión',
      cancel: 'Cancelar',
    },
    reminder: {
      label: 'Asegura tu progreso',
      title: 'Crea tu respaldo personal',
      body: 'Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.',
      create: 'Crear cuenta',
      later: 'En 14 días',
      dismissLabel: 'Descartar recordatorio',
      laterLabel: 'Recordármelo dentro de 14 días',
    },
    create: {
      title: 'Crear cuenta',
      offlineTitle: 'Sin conexión a Internet',
      offlineBody: 'No se pudo contactar con el servidor. Tus tareas locales permanecen a salvo.',
      retry: 'Reintentar ahora',
      introTitle: 'Sin correos ni verificaciones.',
      introBody: 'Solo tu nombre de usuario y tu contraseña.',
      usernameLabel: 'Nombre de usuario',
      usernamePlaceholder: 'ej. carlos_ritmo',
      usernameError: 'El formato de usuario no es válido.',
      passwordLabel: 'Contraseña',
      passwordHint: 'Mín. 8',
      passwordPlaceholder: '••••••••••••',
      passwordError: 'La contraseña debe cumplir con los requisitos.',
      repeatLabel: 'Repetir contraseña',
      repeatRule: 'Coincidencia exacta con la anterior',
      repeatError: 'Las contraseñas no coinciden.',
      toggleLabel: 'Mostrar u ocultar contraseña',
      noticeTitle: 'Aviso importante sobre tu cuenta',
      noticeText: 'Si olvidas tu contraseña no podremos recuperar tu cuenta.',
      noticeStrong: 'Entiendo que no hay forma de recuperarla.',
      submit: 'Crear cuenta',
      submitting: 'Creando tu cuenta…',
      cancel: 'Cancelar y volver',
      footer: 'Mantienes tus tareas locales intactas en este dispositivo.',
      successTitle: '¡Cuenta creada con éxito!',
      successBody: 'Tus tareas y tu progreso siguen aquí.',
    },
    signIn: {
      title: 'Iniciar sesión',
      badge: 'RECUPERA TU NIVEL',
      welcome: 'Bienvenido de nuevo',
      welcomeBody: 'Inicia sesión para recuperar tus tareas y tu racha.',
      errorTitle: 'Acceso no válido',
      usernameLabel: 'Nombre de usuario',
      usernameSide: 'Identificador único',
      usernamePlaceholder: 'tu nombre de usuario',
      passwordLabel: 'Contraseña',
      submit: 'Iniciar sesión',
      submitting: 'Comprobando…',
      cancel: 'Cancelar',
    },
    localTasks: {
      label: 'Tareas encontradas',
      title: '¿Qué quieres hacer con las tareas de este móvil?',
      body: 'Este dispositivo tiene tareas creadas sin cuenta. Decide qué hacer con ellas al entrar en tu cuenta.',
      pendingBadge: 'Pendientes',
      bringTitle: 'Traer mis tareas pendientes a mi cuenta',
      bringNote: 'Nota: El XP y las tareas ya completadas de este móvil no se sumarán.',
      useOnlyTitle: 'Usar solo mi cuenta',
      useOnlyBody: 'Las tareas de este móvil se descartarán para mostrar únicamente tu cuenta.',
      bringConfirm: 'Traer tareas y continuar',
      cancel: 'Cancelar inicio de sesión',
      discardTitle: '¿Descartar tareas de este móvil?',
      discardConfirm: 'Sí, descartar tareas locales',
      discardBack: 'Volver a opciones',
      completedOnlyTitle: '¿Continuar sin las tareas de este móvil?',
      completedOnlyConfirm: 'Sí, continuar',
      count: (n: number): string => `${n} ${plural(n, 'tarea local', 'tareas locales')} sin cuenta`,
      bringBody: (n: number): string =>
        `${plural(n, 'Se añadirá', 'Se añadirán')} ${n} ${plural(n, 'tarea pendiente', 'tareas pendientes')} de este móvil a tu cuenta.`,
      discardBody: (n: number): string =>
        `Esta acción no se puede deshacer. ${plural(n, 'La tarea pendiente', `Las ${n} tareas pendientes`)} de este móvil se ${plural(n, 'perderá', 'perderán')} y se cargará tu cuenta.`,
      completedOnlyBody: (n: number): string =>
        `${plural(n, 'La tarea completada', `Las ${n} tareas completadas`)} de este móvil y su XP no se sumarán a tu cuenta. No se puede deshacer.`,
    },
    changePassword: {
      title: 'Cambiar contraseña',
      currentLabel: 'Contraseña actual',
      newLabel: 'Contraseña nueva',
      repeatLabel: 'Repetir contraseña nueva',
      submit: 'Cambiar contraseña',
      submitting: 'Cambiando tu contraseña…',
      cancel: 'Cancelar y volver',
    },
    deleteAccount: {
      title: 'Borrar cuenta',
      passwordLabel: 'Contraseña',
      confirmText: 'Entiendo que se borrarán mi cuenta y todos mis datos para siempre.',
      submit: 'Borrar mi cuenta',
      submitting: 'Borrando tu cuenta…',
      cancel: 'Cancelar y volver',
      failure: 'No se ha borrado nada. Inténtalo de nuevo.',
    },
    toast: {
      signedOut: 'Sesión cerrada',
      signedIn: 'Sesión iniciada',
      tasksAdded: 'Tareas añadidas a tu cuenta',
      passwordChanged: 'Contraseña cambiada',
      accountDeleted: 'Cuenta eliminada',
    },
  } as const;

  private rule(key: string, text: string, ok: boolean, touched: boolean): RuleView {
    const state: RuleState = !touched ? 'idle' : ok ? 'ok' : 'error';
    return { key, text, state };
  }

  usernameRules(value: string, touched: boolean): RuleView[] {
    const name = normalizeUsername(value);
    return [
      this.rule(
        'length',
        `De ${USERNAME_MIN} a ${USERNAME_MAX} caracteres`,
        name.length >= USERNAME_MIN && name.length <= USERNAME_MAX,
        touched
      ),
      this.rule(
        'chars',
        'Minúsculas, números, punto, guion y guion bajo',
        USERNAME_CHARS.test(name),
        touched
      ),
    ];
  }

  isUsernameValid(value: string): boolean {
    return this.usernameRules(value, true).every((r) => r.state === 'ok');
  }

  passwordRules(
    password: string,
    username: string,
    touched: boolean,
    extra?: { notSameAs?: string }
  ): RuleView[] {
    const name = normalizeUsername(username);
    const rules = [
      this.rule(
        'length',
        `De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres`,
        password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
        touched
      ),
      this.rule(
        'not-username',
        'Distinta del nombre de usuario',
        name === '' || password.toLowerCase() !== name,
        touched
      ),
    ];
    if (extra?.notSameAs !== undefined) {
      rules.push(
        this.rule(
          'not-current',
          'Distinta de la contraseña actual',
          password !== extra.notSameAs,
          touched
        )
      );
    }
    return rules;
  }

  isPasswordValid(password: string, username: string, extra?: { notSameAs?: string }): boolean {
    return this.passwordRules(password, username, true, extra).every((r) => r.state === 'ok');
  }

  matchState(
    password: string,
    repeat: string
  ): { state: RuleState; label: 'Sin verificar' | 'Coinciden' | 'No coinciden' } {
    if (repeat === '') return { state: 'idle', label: 'Sin verificar' };
    return password === repeat
      ? { state: 'ok', label: 'Coinciden' }
      : { state: 'error', label: 'No coinciden' };
  }

  errorText(reason: AccountErrorReason, context: AccountErrorContext): string {
    if (context === 'delete' && reason === 'invalid-credentials') {
      return 'La contraseña no es correcta.';
    }
    if (context === 'delete' && reason !== 'unauthorized' && reason !== 'rate-limited') {
      return this.text.deleteAccount.failure;
    }
    switch (reason) {
      case 'invalid-credentials':
        return context === 'change-password'
          ? 'La contraseña actual no es correcta.'
          : 'Nombre de usuario o contraseña incorrectos. Comprueba tus datos e inténtalo de nuevo.';
      case 'username-taken':
        return 'Nombre de usuario no disponible';
      case 'invalid-username':
        return this.text.create.usernameError;
      case 'weak-password':
        return 'La contraseña debe cumplir con los requisitos.';
      case 'same-password':
        return 'La nueva contraseña debe ser distinta de la actual.';
      case 'rate-limited':
        return 'Demasiados intentos. Espera unos minutos.';
      case 'network':
        return 'Sin conexión a Internet. Inténtalo de nuevo.';
      case 'timeout':
        return 'El servidor no responde. Inténtalo de nuevo.';
      case 'unauthorized':
        return 'Tu sesión ha caducado. Vuelve a abrir la app e inténtalo de nuevo.';
      default:
        return 'No se ha podido completar la operación. Inténtalo de nuevo.';
    }
  }
}
