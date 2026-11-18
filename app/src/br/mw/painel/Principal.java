package br.mw.painel;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Principal extends Activity {
    static final String PAINEL = "http://127.0.0.1:8830/";
    static final int FUNDO = Color.rgb(7, 9, 14);
    final Handler h = new Handler(Looper.getMainLooper());
    static final ExecutorService envio = Executors.newSingleThreadExecutor();
    WebView web;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        getWindow().setAttributes(lp);
        web = new WebView(this);
        web.setBackgroundColor(FUNDO);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        web.addJavascriptInterface(new Ponte(), "Nativo");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    v.loadData("<body style='background:#07090e;color:#8b93a7;font:16px system-ui;display:grid;place-items:center;height:90vh'>"
                            + "Esperando o servidor do Painel subir no Termux...</body>", "text/html; charset=utf-8", null);
                    h.postDelayed(() -> v.loadUrl(PAINEL), 4000);
                }
            }
        });
        setContentView(web);
        telaCheia();
        web.loadUrl(PAINEL);
        h.post(dispositivo);
    }

    void telaCheia() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean f) {
        super.onWindowFocusChanged(f);
        if (f) telaCheia();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Notificacoes.silenciar(true);
    }

    @Override
    protected void onPause() {
        Notificacoes.silenciar(false);
        super.onPause();
    }

    @Override
    public void onBackPressed() { web.evaluateJavascript("document.getElementById('folha').hidden=true", null); }

    static void postar(String rota, JSONObject d) {
        envio.execute(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(PAINEL + "api/app/" + rota).openConnection();
                c.setConnectTimeout(3000);
                c.setReadTimeout(5000);
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                byte[] b = d.toString().getBytes("UTF-8");
                c.setFixedLengthStreamingMode(b.length);
                try (OutputStream o = c.getOutputStream()) { o.write(b); }
                c.getResponseCode();
                c.disconnect();
            } catch (Exception e) {}
        });
    }

    boolean notificacoesLiberadas() {
        String l = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return l != null && l.contains(new ComponentName(this, Notificacoes.class).flattenToString());
    }

    final Runnable dispositivo = new Runnable() {
        @Override
        public void run() {
            try {
                Intent i = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                if (i != null) {
                    int nivel = i.getIntExtra(BatteryManager.EXTRA_LEVEL, 0), escala = i.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                    int st = i.getIntExtra(BatteryManager.EXTRA_STATUS, 0), ligado = i.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
                    String fonte = ligado == BatteryManager.BATTERY_PLUGGED_AC ? "tomada" : ligado == BatteryManager.BATTERY_PLUGGED_USB ? "USB"
                            : ligado == BatteryManager.BATTERY_PLUGGED_WIRELESS ? "sem fio" : null;
                    postar("dispositivo", new JSONObject()
                            .put("nivel", nivel * 100.0 / escala)
                            .put("carregando", st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL)
                            .put("cheia", st == BatteryManager.BATTERY_STATUS_FULL)
                            .put("fonte", fonte)
                            .put("saude", i.getIntExtra(BatteryManager.EXTRA_HEALTH, 0))
                            .put("temperatura", i.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0)
                            .put("tensao", i.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0))
                            .put("notificacoes_liberadas", notificacoesLiberadas()));
                }
            } catch (Exception e) {}
            h.postDelayed(this, 15000);
        }
    };

    class Ponte {
        @JavascriptInterface
        public void acessoNotificacoes() {
            h.post(() -> {
                try { startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)); } catch (Exception e) {}
            });
        }

        @JavascriptInterface
        public void vibrar() {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE));
        }
    }
}
