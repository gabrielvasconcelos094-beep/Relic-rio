package app.relicario.arquivo;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private SharedIntakeStore store;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registra o plugin antes de o bridge subir, para a camada web já encontrá-lo.
        registerPlugin(RelicarioNativePlugin.class);
        super.onCreate(savedInstanceState);
        store = new SharedIntakeStore(this);
        // Conteúdo compartilhado com o app fechado chega aqui.
        store.accept(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Com o app já aberto, enfileira e avisa a interface na hora.
        if (store != null && store.accept(intent)) {
            RelicarioNativePlugin plugin = getBridgePlugin();
            if (plugin != null) plugin.notifyShareReceived();
        }
    }

    private RelicarioNativePlugin getBridgePlugin() {
        try {
            com.getcapacitor.PluginHandle handle = getBridge().getPlugin("RelicarioNative");
            if (handle == null) return null;
            return (RelicarioNativePlugin) handle.getInstance();
        } catch (Exception e) {
            return null;
        }
    }
}
