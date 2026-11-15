use serde::{Deserialize, Serialize};

/// Estado de las alarmas exactas que devuelve la parte Kotlin.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ExactAlarmState {
  Allowed,
  NotAllowed,
  NotNeeded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExactAlarmResponse {
  pub state: ExactAlarmState,
}

/// Identificador de la notificación que abrió la app (si la abrió una), leído una sola vez.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchNotificationResponse {
  pub notification_id: Option<i32>,
}

/// Un aviso que debe estar programado: instante en milisegundos, título y texto.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlarmArg {
  pub id: i32,
  pub at: i64,
  pub title: String,
  pub body: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScheduleAlarmsArgs {
  pub alarms: Vec<AlarmArg>,
}
