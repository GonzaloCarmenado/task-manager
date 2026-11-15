use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

mod commands;
mod error;
mod mobile;
mod models;

pub use error::{Error, Result};
pub use models::{ExactAlarmState, LaunchNotificationResponse};

use mobile::AppSettings;

/// Accesos de `AppHandle`, `App` y `Window` a los ajustes del sistema.
pub trait AppSettingsExt<R: Runtime> {
  fn app_settings(&self) -> &AppSettings<R>;
}

impl<R: Runtime, T: Manager<R>> AppSettingsExt<R> for T {
  fn app_settings(&self) -> &AppSettings<R> {
    self.state::<AppSettings<R>>().inner()
  }
}

/// Inicializa el plugin (solo Android).
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("app-settings")
    .invoke_handler(tauri::generate_handler![
      commands::can_schedule_exact_alarms,
      commands::open_notification_settings,
      commands::open_exact_alarm_settings,
      commands::launch_notification_id,
      commands::schedule_alarms,
    ])
    .setup(|app, api| {
      let app_settings = mobile::init(app, api)?;
      app.manage(app_settings);
      Ok(())
    })
    .build()
}
