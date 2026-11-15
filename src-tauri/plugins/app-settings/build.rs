const COMMANDS: &[&str] = &[
  "can_schedule_exact_alarms",
  "open_notification_settings",
  "open_exact_alarm_settings",
  "launch_notification_id",
  "schedule_alarms",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .build();
}
