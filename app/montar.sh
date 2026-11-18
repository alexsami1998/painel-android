#!/bin/sh
set -e
A=${ANDROID_SDK:-~/android}; BT=$A/build-tools-35; JAR=$A/platform-35/android.jar
export JAVA_HOME=$A/jdk PATH=$A/jdk/bin:$PATH
cd "$(dirname "$0")"; rm -rf out; mkdir -p out/classes
$BT/aapt2 compile --dir res -o out/res.zip
$BT/aapt2 link -I $JAR --manifest AndroidManifest.xml -o out/base.apk out/res.zip
javac -source 8 -target 8 -nowarn -encoding UTF-8 -classpath $JAR -d out/classes src/br/mw/painel/*.java 2>&1 | grep -v "bootstrap\|^1 warning\|source value 8\|target value 8\|suppress\|^Note:" || true
$BT/d8 --release --lib $JAR --min-api 26 --output out $(find out/classes -name '*.class') 2>&1 | grep -v "^Warning" || true
(cd out && zip -q base.apk classes.dex )
$BT/zipalign -p -f 4 out/base.apk out/alinhado.apk
[ -f chave.jks ] || keytool -genkeypair -keystore chave.jks -storepass painel -keypass painel -alias painel -keyalg RSA -keysize 2048 -validity 20000 -dname CN=Painel >/dev/null 2>&1
$BT/apksigner sign --ks chave.jks --ks-pass pass:painel --out ../Painel.apk out/alinhado.apk
echo pronto: $(ls -la ../Painel.apk)
