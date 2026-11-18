package br.mw.painel;

import android.app.Notification;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

public class Notificacoes extends NotificationListenerService {
    static volatile Notificacoes atual;
    static volatile boolean painelNaTela;
    static int filtroAntes = -1;

    @Override
    public void onListenerConnected() {
        atual = this;
        if (painelNaTela) silenciar(true);
    }

    @Override
    public void onListenerDisconnected() { atual = null; }
    static void silenciar(boolean sim) {
        painelNaTela = sim;
        Notificacoes n = atual;
        if (n == null) return;
        try {
            if (sim) {
                int f = n.getCurrentInterruptionFilter();
                if (f != INTERRUPTION_FILTER_ALARMS) { filtroAntes = f; n.requestInterruptionFilter(INTERRUPTION_FILTER_ALARMS); }
            } else if (filtroAntes > 0) {
                n.requestInterruptionFilter(filtroAntes);
                filtroAntes = -1;
            }
        } catch (Exception e) {}
    }
    static String tipo(StatusBarNotification s) {
        switch (s.getPackageName()) {
            case "com.whatsapp": return "whatsapp";
            case "com.whatsapp.w4b": return "business";
            default: return null;
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification s) {
        String tipo = tipo(s);
        if (tipo == null) return;
        Notification n = s.getNotification();
        if ((n.flags & (Notification.FLAG_GROUP_SUMMARY | Notification.FLAG_ONGOING_EVENT | Notification.FLAG_FOREGROUND_SERVICE)) != 0) return;
        Bundle e = n.extras;
        Parcelable[] msgs = e.getParcelableArray(Notification.EXTRA_MESSAGES);
        if (n.getShortcutId() == null && (msgs == null || msgs.length == 0)) return;
        try {
            String titulo = texto(e.getCharSequence(Notification.EXTRA_TITLE));
            String txt = texto(e.getCharSequence(Notification.EXTRA_TEXT));
            String conversa = texto(e.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE));
            long quando = n.when > 0 ? n.when : s.getPostTime();
            int quantas = 1;
            JSONArray todas = new JSONArray();
            if (msgs != null) {
                for (Parcelable m : msgs) {
                    Bundle b = (Bundle) m;
                    CharSequence t = b.getCharSequence("text"), q = b.getCharSequence("sender");
                    if (t == null) continue;
                    if (q == null && android.os.Build.VERSION.SDK_INT >= 28) {
                        Parcelable p = b.getParcelable("sender_person");
                        if (p instanceof android.app.Person) q = ((android.app.Person) p).getName();
                    }
                    todas.put(new JSONObject().put("texto", t.toString()).put("quem", q == null ? JSONObject.NULL : q.toString()).put("t", b.getLong("time", 0)));
                }
            }
            if (msgs != null && msgs.length > 0) {
                quantas = msgs.length;
                Bundle ult = (Bundle) msgs[msgs.length - 1];
                CharSequence t = ult.getCharSequence("text");
                if (t != null) txt = t.toString();
                CharSequence quem = ult.getCharSequence("sender");
                if (quem != null) titulo = quem.toString();
                long tm = ult.getLong("time", 0);
                if (tm > 0) quando = tm;
            }
            if (titulo.isEmpty() && txt.isEmpty()) return;
            if (conversa.isEmpty()) conversa = titulo;
            Principal.postar("notificacao", new JSONObject().put("chave", s.getKey()).put("app", s.getPackageName()).put("tipo", tipo)
                    .put("titulo", titulo).put("texto", txt).put("conversa", conversa)
                    .put("t", quando).put("quantas", quantas).put("mensagens", todas));
        } catch (Exception x) {}
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification s) {
        if (tipo(s) == null) return;
        try { Principal.postar("notificacao", new JSONObject().put("chave", s.getKey()).put("removida", true)); } catch (Exception x) {}
    }

    static String texto(CharSequence c) { return c == null ? "" : c.toString(); }
}
