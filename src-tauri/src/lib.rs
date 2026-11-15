#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();

  // Bloqueo con huella (spec 004): el plugin solo existe en Android.
  #[cfg(target_os = "android")]
  let builder = builder.plugin(tauri_plugin_biometry::init());

  // Alarmas (spec 006): notificaciones locales y ajustes del sistema, solo en Android.
  #[cfg(target_os = "android")]
  let builder = builder.plugin(tauri_plugin_notification::init());
  #[cfg(target_os = "android")]
  let builder = builder.plugin(tauri_plugin_app_settings::init());

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
