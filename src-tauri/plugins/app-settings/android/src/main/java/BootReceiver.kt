package app.tauri.appsettings

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Tras reiniciar el móvil Android olvida las alarmas: se reprograman desde lo guardado. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        AlarmScheduler.restore(context)
    }
}
