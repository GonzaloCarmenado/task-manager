use tauri::{command, AppHandle, Runtime};

use crate::models::{AlarmArg, ExactAlarmResponse, LaunchNotificationResponse};
use crate::{AppSettingsExt, Result};

#[command]
pub async fn can_schedule_exact_alarms<R: Runtime>(app: AppHandle<R>) -> Result<ExactAlarmResponse> {
  app.app_settings().can_schedule_exact_alarms()
}

#[command]
pub async fn open_notification_settings<R: Runtime>(app: AppHandle<R>) -> Result<()> {
  app.app_settings().open_notification_settings()
}

#[command]
pub async fn open_exact_alarm_settings<R: Runtime>(app: AppHandle<R>) -> Result<()> {
  app.app_settings().open_exact_alarm_settings()
}

#[command]
pub async fn launch_notification_id<R: Runtime>(app: AppHandle<R>) -> Result<LaunchNotificationResponse> {
  app.app_settings().launch_notification_id()
}

#[command]
pub async fn schedule_alarms<R: Runtime>(app: AppHandle<R>, alarms: Vec<AlarmArg>) -> Result<()> {
  app.app_settings().schedule_alarms(alarms)
}
