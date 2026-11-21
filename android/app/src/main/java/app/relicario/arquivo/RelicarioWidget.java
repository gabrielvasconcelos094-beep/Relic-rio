package app.relicario.arquivo;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;

/**
 * Widget real da tela inicial do Android.
 *
 * O widget não tem acesso ao IndexedDB do aplicativo, então o conteúdo mostrado
 * é o que a camada web gravou em SharedPreferences pela última vez
 * (RelicarioNativePlugin.updateWidget).
 *
 * Privacidade: enquanto "showContent" estiver desligado — o padrão — o widget
 * mostra apenas o nome do aplicativo e os atalhos, sem revelar nada do arquivo
 * pessoal na tela inicial.
 */
public class RelicarioWidget extends AppWidgetProvider {

    private static final String ACTION_SHUFFLE = "app.relicario.arquivo.WIDGET_SHUFFLE";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) render(context, manager, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_SHUFFLE.equals(intent.getAction())) {
            // Pedir outra memória exige o app aberto: só ele consegue ler o arquivo.
            context.startActivity(deepLink(context, "/surpreenda")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, RelicarioWidget.class));
        for (int id : ids) render(context, manager, id);
    }

    private static Intent deepLink(Context context, String route) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("relicario://abrir" + route));
        intent.putExtra("route", route);
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return intent;
    }

    private static PendingIntent pending(Context context, String route, int requestCode) {
        return PendingIntent.getActivity(
                context,
                requestCode,
                deepLink(context, route),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void render(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(
                RelicarioNativePlugin.WIDGET_PREFS, Context.MODE_PRIVATE);
        boolean showContent = prefs.getBoolean("showContent", false);
        String title = prefs.getString("title", "");
        String text = prefs.getString("text", "");
        String meta = prefs.getString("meta", "");
        String imagePath = prefs.getString("imagePath", null);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_relicario);

        if (showContent && (!TextUtils.isEmpty(title) || !TextUtils.isEmpty(text))) {
            views.setViewVisibility(R.id.widget_locked, View.GONE);
            views.setViewVisibility(R.id.widget_content, View.VISIBLE);
            views.setTextViewText(R.id.widget_title,
                    TextUtils.isEmpty(title) ? "Memória do dia" : title);
            views.setTextViewText(R.id.widget_text, text);
            views.setTextViewText(R.id.widget_meta, meta);
            views.setViewVisibility(R.id.widget_meta,
                    TextUtils.isEmpty(meta) ? View.GONE : View.VISIBLE);

            Bitmap bitmap = readBitmap(imagePath);
            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap);
                views.setViewVisibility(R.id.widget_image, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_image, View.GONE);
            }
        } else {
            // Modo discreto: nada do conteúdo pessoal aparece na tela inicial.
            views.setViewVisibility(R.id.widget_content, View.GONE);
            views.setViewVisibility(R.id.widget_locked, View.VISIBLE);
        }

        views.setOnClickPendingIntent(R.id.widget_root, pending(context, "/", 1));
        views.setOnClickPendingIntent(R.id.widget_add, pending(context, "/memoria/nova", 2));
        views.setOnClickPendingIntent(R.id.widget_shelter, pending(context, "/abrigo", 3));

        Intent shuffle = new Intent(context, RelicarioWidget.class).setAction(ACTION_SHUFFLE);
        views.setOnClickPendingIntent(R.id.widget_shuffle, PendingIntent.getBroadcast(
                context, 4, shuffle,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        manager.updateAppWidget(widgetId, views);
    }

    private static Bitmap readBitmap(String path) {
        if (TextUtils.isEmpty(path)) return null;
        File file = new File(path);
        if (!file.exists()) return null;
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inSampleSize = 2;
            return BitmapFactory.decodeFile(path, options);
        } catch (Exception e) {
            return null;
        }
    }
}
