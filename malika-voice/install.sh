#!/bin/bash
# Голос Малики (getyordamchi.uz) на VPS. Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/railf66/kasb-pro/main/malika-voice/install.sh | bash
# Скрипт спросит ключ Gemini (из malika-config.php) один раз и сохранит его только на сервере.
# Бот Makon Radar и игра не трогаются: отдельная служба, лимит памяти 80 МБ.
set -e
DIR=/opt/malika-voice
HOST=${HOST:-malika.45-130-148-137.sslip.io}
PORT=8091
ENVF=/etc/malika-voice.env
say() { echo; echo "== $1"; }

say "Голос Малики: ставлю службу"
command -v git >/dev/null || { apt-get update -qq; apt-get install -y -qq git; }
command -v node >/dev/null || { apt-get update -qq; apt-get install -y -qq nodejs; }

if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull -q
else
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/railf66/kasb-pro "$DIR"
  git -C "$DIR" sparse-checkout set malika-voice
fi

if ! grep -q '^GEMINI_KEY=..' "$ENVF" 2>/dev/null; then
  echo
  echo "Вставьте ключ Gemini (строка в кавычках из malika-config.php, без кавычек) и нажмите Enter:"
  read -r KEY < /dev/tty
  KEY=$(echo "$KEY" | tr -d " '\"\r")
  [ -n "$KEY" ] || { echo "Ключ пустой, остановился."; exit 1; }
  umask 077; echo "GEMINI_KEY=$KEY" > "$ENVF"; chmod 600 "$ENVF"
fi

id malikavoice >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin malikavoice
mkdir -p /var/lib/malika-voice && chown malikavoice /var/lib/malika-voice
cat > /etc/systemd/system/malika-voice.service <<UNIT
[Unit]
Description=Malika voice (TTS/STT) for getyordamchi.uz
After=network.target

[Service]
User=malikavoice
EnvironmentFile=$ENVF
Environment=PORT=$PORT
ExecStart=$(command -v node) $DIR/malika-voice/server.js
Restart=always
RestartSec=3
MemoryMax=80M
CPUQuota=30%
Nice=10

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable -q malika-voice
systemctl restart malika-voice

say "Подключаю HTTPS-адрес $HOST"
if ! command -v caddy >/dev/null; then echo "Caddy не найден. Скопируйте это сообщение и отправьте Claude."; exit 1; fi
if ! grep -q "^$HOST" /etc/caddy/Caddyfile; then
  printf '\n%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$HOST" "$PORT" >> /etc/caddy/Caddyfile
fi
systemctl reload caddy 2>/dev/null || systemctl restart caddy

cat > /etc/cron.d/malika-voice <<CRON
*/5 * * * * root cd $DIR && OLD=\$(git rev-parse HEAD) && git pull -q && git diff --quiet \$OLD HEAD -- malika-voice || systemctl restart malika-voice
CRON

# сторож сервера тоже будет следить за службой
if [ -x /opt/server-watchdog/watchdog.sh ] && ! grep -q malika-voice /etc/server-watchdog.conf 2>/dev/null; then
  if grep -q '^SERVICES=' /etc/server-watchdog.conf 2>/dev/null; then
    sed -i 's/^SERVICES="\(.*\)"/SERVICES="\1 malika-voice"/' /etc/server-watchdog.conf
  else
    echo 'SERVICES="olx-bot sd-game caddy malika-voice"' >> /etc/server-watchdog.conf
  fi
fi

say "Проверяю"
sleep 10
if curl -fsS "https://$HOST/?a=log" | head -1; then
  echo; echo "ГОТОВО. Голос Малики работает на https://$HOST/"
else
  echo "Служба запущена, но HTTPS ещё не ответил (сертификат выдаётся до минуты)."
  echo "Через минуту откройте https://$HOST/?a=log и пришлите Claude, что там написано."
fi
