#!/data/data/com.termux/files/usr/bin/sh
set -e
cd "$(dirname "$0")"
pkg install -y python postgresql redis
[ -d "$PREFIX/var/lib/postgresql" ] || initdb "$PREFIX/var/lib/postgresql"
pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/lib/postgresql/log" status >/dev/null 2>&1 || pg_ctl -D "$PREFIX/var/lib/postgresql" -l "$PREFIX/var/lib/postgresql/log" start
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes
sleep 2
psql -lqt | cut -d'|' -f1 | grep -qw painel || createdb painel
python -m venv .venv
.venv/bin/pip install -q -r requirements.txt
mkdir -p ~/.termux/boot
printf '#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock\npg_ctl -D "$PREFIX/var/lib/postgresql" start\nredis-server --daemonize yes\n%s/ligar.sh\n' "$(pwd)" > ~/.termux/boot/painel.sh
chmod +x ~/.termux/boot/painel.sh ligar.sh
./ligar.sh
echo "Painel no ar: http://127.0.0.1:8830"
