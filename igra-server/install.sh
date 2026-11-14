#!/bin/bash
# Установка онлайн-сервера «Стальной двор» на VPS (Ubuntu). Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/railf66/kasb-pro/main/igra-server/install.sh | bash
# Бот Makon Radar и другие программы не трогаются: сервер игры работает отдельной службой
# с ограничением памяти (120 МБ) и процессора (35%).
set -e
DIR=/opt/sd-game
HOST=${HOST:-45-130-148-137.sslip.io}
PORT=8090
say() { echo; echo "== $1"; }

say "Стальной двор: ставлю сервер игры"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
command -v git >/dev/null || apt-get install -y -qq git
command -v node >/dev/null || apt-get install -y -qq nodejs
command -v curl >/dev/null || apt-get install -y -qq curl

say "Скачиваю код игры"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull -q
else
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/railf66/kasb-pro "$DIR"
  git -C "$DIR" sparse-checkout set igra-server
fi

say "Создаю службу sd-game"
id sdgame >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin sdgame
cat > /etc/systemd/system/sd-game.service <<EOF
[Unit]
Description=Stalnoy Dvor online game server
After=network.target

[Service]
User=sdgame
Environment=PORT=$PORT
ExecStart=$(command -v node) $DIR/igra-server/server.js
Restart=always
RestartSec=3
MemoryMax=120M
CPUQuota=35%
Nice=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q sd-game
systemctl restart sd-game

say "Настраиваю защищённое соединение (HTTPS) через Caddy"
FRESH=0
if ! command -v caddy >/dev/null; then
  if ss -ltn | grep -qE ':(80|443)\s'; then
    echo "Порты 80 или 443 уже заняты другой программой. Сервер игры запущен, но HTTPS не настроен."
    echo "Скопируйте это сообщение и отправьте Claude."
    ss -ltnp | grep -E ':(80|443)\s' || true
    exit 1
  fi
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
  FRESH=1
fi
if [ "$FRESH" = 1 ] && grep -q '/usr/share/caddy' /etc/caddy/Caddyfile 2>/dev/null; then : > /etc/caddy/Caddyfile; fi
if ! grep -q "$HOST" /etc/caddy/Caddyfile 2>/dev/null; then
  printf '\n%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$HOST" "$PORT" >> /etc/caddy/Caddyfile
fi
systemctl enable -q caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; fi

say "Включаю автообновление (каждые 5 минут)"
cat > /etc/cron.d/sd-game <<EOF
*/5 * * * * root cd $DIR && OLD=\$(git rev-parse HEAD) && git pull -q && git diff --quiet \$OLD HEAD -- igra-server || systemctl restart sd-game
EOF

say "Проверяю"
sleep 8
if curl -fsS "https://$HOST/" ; then
  echo; echo "ГОТОВО. Сервер игры работает. Можно играть в режиме «Онлайн» на kasbpro.uz/igra/"
else
  echo "Сервер запущен, но HTTPS ещё не ответил (сертификат может выдаваться до минуты)."
  echo "Проверьте через минуту: откройте в браузере https://$HOST/"
fi
