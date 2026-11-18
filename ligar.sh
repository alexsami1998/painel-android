#!/data/data/com.termux/files/usr/bin/sh
cd "$(dirname "$0")"
for i in $(seq 1 60); do pg_isready -q && redis-cli ping >/dev/null 2>&1 && break; sleep 2; done
pgrep -f "[s]ervidor.py" >/dev/null || setsid -f .venv/bin/python servidor.py >> painel.log 2>&1 </dev/null
pgrep -f "[a]nuncio.py" >/dev/null || setsid -f .venv/bin/python anuncio.py >> anuncio.log 2>&1 </dev/null
