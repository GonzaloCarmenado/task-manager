package app.tauri.appsettings

import android.app.Activity
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

/**
 * Ajustes del sistema que el plugin de notificaciones no ofrece: estado de las alarmas exactas,
 * acceso a las pantallas de ajustes de notificaciones y de «alarmas y recordatorios», y qué
 * notificación abrió la app.
 */
@InvokeArg
class AlarmArg {
    var id: Int = 0
    var at: Long = 0
    var title: String = ""
    var body: String = ""
}

@InvokeArg
class ScheduleAlarmsArgs {
    lateinit var alarms: Array<AlarmArg>
}

@TauriPlugin
class AppSettingsPlugin(private val activity: Activity) : Plugin(activity) {
    private var launchNotificationId: Int? = null

    @Command
    fun canScheduleExactAlarms(invoke: Invoke) {
        val state = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            "not-needed"
        } else {
            val manager = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (manager.canScheduleExactAlarms()) "allowed" else "not-allowed"
        }
        val result = JSObject()
        result.put("state", state)
        invoke.resolve(result)
    }

    @Command
    fun openNotificationSettings(invoke: Invoke) {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
        open(invoke, intent)
    }

    @Command
    fun openExactAlarmSettings(invoke: Invoke) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            invoke.resolve()
            return
        }
        val intent = Intent(
            Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
            Uri.parse("package:" + activity.packageName)
        )
        open(invoke, intent)
    }

    /**
     * Identificador de la notificación que abrió la app, leído **una sola vez**. El plugin de
     * notificaciones emite el toque antes de que la web registre su oyente y Tauri no retiene el
     * evento: por eso se recoge aquí. Con la app cerrada Android recrea la actividad con el intent
     * original y entrega el del toque por `onNewIntent`, así que se capturan los dos.
     */
    @Command
    fun launchNotificationId(invoke: Invoke) {
        val result = JSObject()
        launchNotificationId?.let { result.put("notificationId", it) }
        launchNotificationId = null
        invoke.resolve(result)
    }

    override fun load(webView: WebView) {
        super.load(webView)
        captureNotification(activity.intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        captureNotification(intent)
    }

    private fun captureNotification(intent: Intent?) {
        val id = intent?.getIntExtra(NOTIFICATION_ID_KEY, Int.MIN_VALUE) ?: Int.MIN_VALUE
        if (id != Int.MIN_VALUE) launchNotificationId = id
    }

    /**
     * Sustituye el conjunto completo de avisos de las tareas: programa con `AlarmManager` (exacta si
     * el sistema lo permite), guarda lo programado y lo restaura tras un reinicio (`BootReceiver`).
     * No usa el plugin oficial de notificaciones para programar: este guarda los avisos sin datos y
     * no puede restaurarlos.
     */
    @Command
    fun scheduleAlarms(invoke: Invoke) {
        val args = invoke.parseArgs(ScheduleAlarmsArgs::class.java)
        AlarmScheduler.replaceAll(activity, args.alarms.map { Alarm(it.id, it.at, it.title, it.body) })
        invoke.resolve()
    }

    private fun open(invoke: Invoke, intent: Intent) {
        try {
            activity.startActivity(intent)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("No se pudo abrir los ajustes del sistema")
        }
    }
}
