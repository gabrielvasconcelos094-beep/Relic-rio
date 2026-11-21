package app.relicario.arquivo;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

/** Ponte entre a camada web do Relicário e os recursos nativos do Android. */
@CapacitorPlugin(name = "RelicarioNative")
public class RelicarioNativePlugin extends Plugin {

    public static final String WIDGET_PREFS = "relicario_widget";

    private SharedIntakeStore store;

    @Override
    public void load() {
        store = new SharedIntakeStore(getContext());
    }

    /** Avisa a camada web que chegou conteúdo novo, se o app já estiver aberto. */
    public void notifyShareReceived() {
        notifyListeners("shareReceived", new JSObject());
    }

    @PluginMethod
    public void getPendingShares(PluginCall call) {
        JSONArray queue = store.readQueue();
        JSObject result = new JSObject();
        try {
            result.put("shares", JSArray.from(toArray(queue)));
        } catch (Exception e) {
            result.put("shares", new JSArray());
        }
        call.resolve(result);
    }

    private Object[] toArray(JSONArray array) {
        Object[] out = new Object[array.length()];
        for (int i = 0; i < array.length(); i++) out[i] = array.opt(i);
        return out;
    }

    @PluginMethod
    public void clearShare(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Informe o id do compartilhamento.");
            return;
        }
        store.clear(id);
        call.resolve();
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean("showContent", Boolean.TRUE.equals(call.getBoolean("showContent", false)))
                .putString("title", call.getString("title", ""))
                .putString("text", call.getString("text", ""))
                .putString("meta", call.getString("meta", ""))
                .putString("imagePath", call.getString("imagePath", null))
                .apply();

        RelicarioWidget.refreshAll(context);
        call.resolve();
    }

    @PluginMethod
    public void widgetStatus(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, RelicarioWidget.class));
        JSObject result = new JSObject();
        result.put("installed", ids.length > 0);
        result.put("count", ids.length);
        call.resolve(result);
    }
}
