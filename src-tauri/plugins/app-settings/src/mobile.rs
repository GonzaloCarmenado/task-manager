use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::{AlarmArg, ExactAlarmResponse, LaunchNotificationResponse, ScheduleAlarmsArgs};

const PLUGIN_IDENTIFIER: &str = "app.tauri.appsettings";

/// Inicializa la clase Kotlin del plugin.
#[allow(clippy::needless_pass_by_value)]
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<AppSettings<R>> {
  let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "AppSettingsPlugin")?;
  Ok(AppSettings(handle))
}

/// Acceso a los ajustes del sistema de Android.
pub struct AppSettings<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> AppSettings<R> {
  pub fn can_schedule_exact_alarms(&self) -> crate::Result<ExactAlarmResponse> {
    self.0.run_mobile_plugin("canScheduleExactAlarms", ()).map_err(Into::into)
  }

  pub fn open_notification_settings(&self) -> crate::Result<()> {
    self.0.run_mobile_plugin("openNotificationSettings", ()).map_err(Into::into)
  }

  pub fn launch_notification_id(&self) -> crate::Result<LaunchNotificationResponse> {
    self.0.run_mobile_plugin("launchNotificationId", ()).map_err(Into::into)
  }

  pub fn schedule_alarms(&self, alarms: Vec<AlarmArg>) -> crate::Result<()> {
    self.0
      .run_mobile_plugin("scheduleAlarms", ScheduleAlarmsArgs { alarms })
      .map_err(Into::into)
  }

  pub fn open_exact_alarm_settings(&self) -> crate::Result<()> {
    self.0.run_mobile_plugin("openExactAlarmSettings", ()).map_err(Into::into)
  }
}
