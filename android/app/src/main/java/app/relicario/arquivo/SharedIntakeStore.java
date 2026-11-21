package app.relicario.arquivo;

import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.text.TextUtils;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

/**
 * Recebe o que outros aplicativos compartilham com o Relicário e guarda no
 * armazenamento privado do app.
 *
 * Por que copiar em vez de guardar a URI: a permissão de leitura concedida a um
 * content:// vale só enquanto a Activity que a recebeu está viva. Se o usuário
 * fechar o Relicário antes de organizar o conteúdo, a URI deixa de abrir. Então
 * os bytes são copiados na hora, para files/compartilhados/, e a fila é gravada
 * em disco — o conteúdo sobrevive a fechar e reabrir o aplicativo.
 */
public class SharedIntakeStore {

    private static final String TAG = "RelicarioIntake";
    private static final String DIR = "compartilhados";
    private static final String QUEUE_FILE = "fila.json";
    private static final long MAX_BYTES = 512L * 1024L * 1024L;

    private final Context context;

    public SharedIntakeStore(Context context) {
        this.context = context.getApplicationContext();
    }

    private File baseDir() {
        File dir = new File(context.getFilesDir(), DIR);
        if (!dir.exists() && !dir.mkdirs()) {
            Log.w(TAG, "Não foi possível criar " + dir.getAbsolutePath());
        }
        return dir;
    }

    private File queueFile() {
        return new File(baseDir(), QUEUE_FILE);
    }

    /** Lê a fila persistida. Uma fila corrompida nunca derruba o aplicativo. */
    public synchronized JSONArray readQueue() {
        File file = queueFile();
        if (!file.exists()) return new JSONArray();
        try (InputStream in = new java.io.FileInputStream(file)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return new JSONArray(out.toString("UTF-8"));
        } catch (IOException | JSONException e) {
            Log.w(TAG, "Fila ilegível, recomeçando vazia", e);
            return new JSONArray();
        }
    }

    private synchronized void writeQueue(JSONArray queue) {
        try (OutputStream out = new FileOutputStream(queueFile())) {
            out.write(queue.toString().getBytes("UTF-8"));
        } catch (IOException e) {
            Log.e(TAG, "Não foi possível gravar a fila de compartilhamentos", e);
        }
    }

    /**
     * Processa um Intent de compartilhamento. Devolve true quando algo foi
     * efetivamente enfileirado.
     */
    public boolean accept(Intent intent) {
        if (intent == null) return false;
        String action = intent.getAction();
        if (action == null) return false;
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return false;
        }

        List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND.equals(action)) {
            Uri single = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (single != null) uris.add(single);
        } else {
            ArrayList<Uri> many = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (many != null) {
                for (Uri uri : many) if (uri != null) uris.add(uri);
            }
        }

        CharSequence textExtra = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
        String text = textExtra == null ? "" : textExtra.toString();
        CharSequence subjectExtra = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
        String subject = subjectExtra == null ? "" : subjectExtra.toString();

        if (TextUtils.isEmpty(text) && TextUtils.isEmpty(subject) && uris.isEmpty()) {
            return false;
        }

        String shareId = "shr_" + UUID.randomUUID();
        File shareDir = new File(baseDir(), shareId);
        JSONArray items = new JSONArray();

        for (Uri uri : uris) {
            try {
                JSONObject item = copyIn(uri, shareDir);
                if (item != null) items.put(item);
            } catch (Exception e) {
                Log.w(TAG, "Falha ao copiar " + uri, e);
            }
        }

        if (items.length() == 0 && TextUtils.isEmpty(text) && TextUtils.isEmpty(subject)) {
            return false;
        }

        try {
            JSONObject share = new JSONObject();
            share.put("id", shareId);
            share.put("receivedAt", iso8601(new Date()));
            share.put("text", text);
            share.put("subject", subject);
            share.put("sourcePackage", referrerPackage(intent));
            share.put("items", items);

            JSONArray queue = readQueue();
            // Evita enfileirar duas vezes o mesmo conteúdo quando o Android
            // reentrega o Intent (rotação de tela, retomada da Activity).
            if (!alreadyQueued(queue, share)) {
                queue.put(share);
                writeQueue(queue);
                return true;
            }
            deleteRecursive(shareDir);
            return false;
        } catch (JSONException e) {
            Log.e(TAG, "Não foi possível montar o compartilhamento", e);
            return false;
        }
    }

    /** Duas entregas iguais no mesmo minuto são tratadas como a mesma. */
    private boolean alreadyQueued(JSONArray queue, JSONObject candidate) {
        try {
            String text = candidate.optString("text");
            JSONArray items = candidate.optJSONArray("items");
            String signature = signatureOf(text, items);
            long now = System.currentTimeMillis();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject existing = queue.getJSONObject(i);
                String existingSignature = signatureOf(
                        existing.optString("text"), existing.optJSONArray("items"));
                if (!signature.equals(existingSignature)) continue;
                Date when = parseIso(existing.optString("receivedAt"));
                if (when != null && now - when.getTime() < 60000L) return true;
            }
        } catch (JSONException ignored) {
            // na dúvida, deixa passar: perder conteúdo é pior que duplicar
        }
        return false;
    }

    private String signatureOf(String text, JSONArray items) {
        StringBuilder sb = new StringBuilder(text == null ? "" : text);
        if (items != null) {
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.optJSONObject(i);
                if (item == null) continue;
                sb.append('|').append(item.optString("sha256", item.optString("name")));
            }
        }
        return sb.toString();
    }

    /** Copia os bytes do content:// para dentro do app e descreve o arquivo. */
    private JSONObject copyIn(Uri uri, File shareDir) throws IOException, JSONException {
        ContentResolver resolver = context.getContentResolver();

        String name = displayName(resolver, uri);
        String mime = resolver.getType(uri);
        if (mime == null) mime = "application/octet-stream";

        if (!shareDir.exists() && !shareDir.mkdirs()) {
            throw new IOException("Sem permissão para criar " + shareDir);
        }
        File target = new File(shareDir, sanitize(name));

        MessageDigest digest = null;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (Exception ignored) {
            // segue sem hash
        }

        long total = 0;
        try (InputStream in = resolver.openInputStream(uri);
             OutputStream out = new FileOutputStream(target)) {
            if (in == null) throw new IOException("Conteúdo indisponível: " + uri);
            byte[] buffer = new byte[65536];
            int read;
            while ((read = in.read(buffer)) != -1) {
                total += read;
                if (total > MAX_BYTES) throw new IOException("Arquivo grande demais");
                out.write(buffer, 0, read);
                if (digest != null) digest.update(buffer, 0, read);
            }
        }

        JSONObject item = new JSONObject();
        item.put("name", name);
        item.put("mime", mime);
        item.put("size", total);
        item.put("uri", target.getAbsolutePath());
        if (digest != null) item.put("sha256", toHex(digest.digest()));
        return item;
    }

    private String displayName(ContentResolver resolver, Uri uri) {
        String name = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = resolver.query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (index >= 0) name = cursor.getString(index);
                }
            } catch (Exception ignored) {
                // alguns provedores não respondem a query; o fallback resolve
            }
        }
        if (TextUtils.isEmpty(name)) name = uri.getLastPathSegment();
        if (TextUtils.isEmpty(name)) name = "arquivo";
        return name;
    }

    /** Mantém o nome original, sem deixar escapar do diretório de destino. */
    private String sanitize(String name) {
        String clean = name.replaceAll("[/\\\\]", "_").trim();
        if (clean.isEmpty() || ".".equals(clean) || "..".equals(clean)) clean = "arquivo";
        if (clean.length() > 120) clean = clean.substring(clean.length() - 120);
        return System.nanoTime() + "-" + clean;
    }

    private String referrerPackage(Intent intent) {
        try {
            Uri referrer = intent.getParcelableExtra("android.intent.extra.REFERRER");
            if (referrer != null && referrer.getHost() != null) return referrer.getHost();
            String name = intent.getStringExtra("android.intent.extra.REFERRER_NAME");
            if (name != null) return Uri.parse(name).getHost();
        } catch (Exception ignored) {
            // sem referrer: a origem fica em branco em vez de ser adivinhada
        }
        return null;
    }

    /** Remove a entrada da fila e apaga os arquivos já importados pelo app. */
    public synchronized void clear(String id) {
        JSONArray queue = readQueue();
        JSONArray next = new JSONArray();
        for (int i = 0; i < queue.length(); i++) {
            JSONObject entry = queue.optJSONObject(i);
            if (entry == null) continue;
            if (id.equals(entry.optString("id"))) continue;
            next.put(entry);
        }
        writeQueue(next);
        deleteRecursive(new File(baseDir(), id));
    }

    private void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteRecursive(child);
        if (!file.delete()) Log.w(TAG, "Não foi possível apagar " + file);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static SimpleDateFormat isoFormat() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format;
    }

    private static String iso8601(Date date) {
        return isoFormat().format(date);
    }

    private static Date parseIso(String value) {
        try {
            return isoFormat().parse(value);
        } catch (Exception e) {
            return null;
        }
    }
}
