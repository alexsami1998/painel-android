# Painel

Transforme aquele celular Android parado na gaveta num painel de indicadores sempre ligado.

O celular roda o servidor no Termux e um app em tela cheia, deitado, mostra os indicadores em páginas que você desliza com o dedo.

## O que vem

- **Saúde do dispositivo:** bateria (nível, saúde, temperatura, tensão e fonte), armazenamento e memória, com histórico das últimas 24 h.
- **WhatsApp e WhatsApp Business:** as conversas com mensagem nova, um card que aparece na tela quando chega mensagem e o histórico de cada conversa. A leitura vem das notificações, então nenhuma conversa é marcada como lida.
- **Layout livre:** segure o dedo sobre um indicador para trocar de página, fixar na faixa de cima ou ocultar.
- **Tema escuro ou claro**, e acesso pelo navegador de outro aparelho da rede, protegido por senha.
- **Páginas prontas** para serviços, IA, carteira e câmera.

## Como instalar

### 1. Servidor (no celular, pelo Termux)

Instale o [Termux](https://f-droid.org/packages/com.termux/) e o [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) pelo F-Droid. Depois, no Termux:

```sh
pkg install git
git clone https://github.com/alexsami1998/painel-android painel
cd painel
./instalar.sh
```

O script instala Python, PostgreSQL e Redis, cria o banco e deixa tudo subindo sozinho quando o celular liga.

### 2. App

O app é compilado sem Gradle, num PC com o Android SDK (build-tools 35, platform 35 e um JDK):

```sh
cd app
ANDROID_SDK=/caminho/do/sdk ./montar.sh
adb install ../Painel.apk
```

Abra o app, toque em **Liberar acesso** no card do WhatsApp e ative o Painel no acesso às notificações.

### 3. Acesso pela rede

Com o servidor no ar, abra `http://painel.local:8830` (ou o IP do celular) em qualquer aparelho da mesma rede. No primeiro acesso, você cria a senha.

## Estrutura

```
servidor.py    API, coleta do sistema e páginas
anuncio.py     painel.local na rede
web/           interface (widgets.js tem o catálogo de indicadores)
app/           app Android (WebView + leitor de notificações)
```

## Dicas

- Deixe o celular na tomada e desative a otimização de bateria do Termux e do Painel.
- Viewport de referência: 825 x 360 (720 x 1650 deitado).

## Licença

MIT. Veja [LICENSE](LICENSE).
