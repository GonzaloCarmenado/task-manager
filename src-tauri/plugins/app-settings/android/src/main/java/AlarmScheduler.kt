package app.tauri.appsettings

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/** Clave con la que se pasa al intent el id del aviso (la lee `AppSettingsPlugin` al abrir la app). */
internal const val NOTIFICATION_ID_KEY = "NotificationId"

private const val ALARM_ACTION = "app.tauri.appsettings.ALARM"
private const val CHANNEL_ID = "reminders"
private const val CHANNEL_NAME = "Recordatorios"
private const val PREFS = "app_settings_alarms"
private const val PREFS_KEY = "alarms"
private const val EXTRA_TITLE = "title"
private const val EXTRA_BODY = "body"

/** Un aviso programado: instante en milisegundos, título y texto. */
internal data class Alarm(val id: Int, val at: Long, val title: String, val body: String)

/**
 * Programa, guarda, restaura y publica los avisos de las tareas. Lo usan el plugin (al programar) y
 * los receptores (al sonar la alarma y al reiniciar el móvil), por eso no depende de la web.
 */
internal object AlarmScheduler {

    /** Sustituye el conjunto de avisos: cancela los que sobran, programa los demás y lo guarda. */
    fun replaceAll(context: Context, wanted: List<Alarm>) {
        val wantedIds = wanted.map { it.id }.toSet()
        load(context).filter { it.id !in wantedIds }.forEach { cancel(context, it.id) }
        wanted.forEach { schedule(context, it) }
        save(context, wanted)
    }

    /** Tras un reinicio: reprograma los futuros y publica ya los que se perdieron con el móvil apagado. */
    fun restore(context: Context) {
        val now = System.currentTimeMillis()
        val (future, missed) = load(context).partition { it.at > now }
        future.forEach { schedule(context, it) }
        missed.forEach { post(context, it) }
        save(context, future)
    }

    /** Al sonar: se publica y se quita del almacén. */
    fun fired(context: Context, alarm: Alarm) {
        post(context, alarm)
        save(context, load(context).filter { it.id != alarm.id })
    }

    private fun schedule(context: Context, alarm: Alarm) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = alarmIntent(context, alarm, PendingIntent.FLAG_UPDATE_CURRENT)!!
        val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || manager.canScheduleExactAlarms()
        if (exact) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, pending)
        } else {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.at, pending)
        }
    }

    private fun cancel(context: Context, id: Int) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pending = alarmIntent(context, Alarm(id, 0, "", ""), PendingIntent.FLAG_NO_CREATE) ?: return
        manager.cancel(pending)
        pending.cancel()
    }

    private fun alarmIntent(context: Context, alarm: Alarm, flag: Int): PendingIntent? {
        val intent = Intent(context, AlarmReceiver::class.java)
            .setAction(ALARM_ACTION)
            .putExtra(NOTIFICATION_ID_KEY, alarm.id)
            .putExtra(EXTRA_TITLE, alarm.title)
            .putExtra(EXTRA_BODY, alarm.body)
        return PendingIntent.getBroadcast(context, alarm.id, intent, flag or PendingIntent.FLAG_IMMUTABLE)
    }

    fun fromIntent(intent: Intent): Alarm? {
        val id = intent.getIntExtra(NOTIFICATION_ID_KEY, Int.MIN_VALUE)
        if (id == Int.MIN_VALUE) return null
        return Alarm(id, 0, intent.getStringExtra(EXTRA_TITLE) ?: "", intent.getStringExtra(EXTRA_BODY) ?: "")
    }

    private fun post(context: Context, alarm: Alarm) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        launch.setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(NOTIFICATION_ID_KEY, alarm.id)
        val open = PendingIntent.getActivity(
            context, alarm.id, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(alarm.title)
            .setContentText(alarm.body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()
        manager.notify(alarm.id, notification)
    }

    private fun load(context: Context): List<Alarm> {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PREFS_KEY, null)
            ?: return emptyList()
        return try {
            val array = JSONArray(raw)
            (0 until array.length()).map {
                val o = array.getJSONObject(it)
                Alarm(o.getInt("id"), o.getLong("at"), o.getString("title"), o.getString("body"))
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun save(context: Context, alarms: List<Alarm>) {
        val array = JSONArray()
        alarms.forEach {
            array.put(
                JSONObject().put("id", it.id).put("at", it.at).put("title", it.title).put("body", it.body)
            )
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(PREFS_KEY, array.toString()).apply()
    }
}
