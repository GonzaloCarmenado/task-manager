package app.tauri.appsettings

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Suena la alarma de una tarea: publica la notificación (también con la app cerrada). */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarm = AlarmScheduler.fromIntent(intent) ?: return
        AlarmScheduler.fired(context, alarm)
    }
}
