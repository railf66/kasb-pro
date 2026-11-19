#!/bin/bash
# Установка сторожа сервера. Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/railf66/kasb-pro/main/server-watchdog/install.sh | bash
# Ничего не перезапускает и не трогает бота и игру: только читает показатели раз в минуту.
set -e
command -v curl >/dev/null || { apt-get update -qq && apt-get install -y -qq curl; }
mkdir -p /opt/server-watchdog
curl -fsSL https://raw.githubusercontent.com/railf66/kasb-pro/main/server-watchdog/watchdog.sh -o /opt/server-watchdog/watchdog.sh
chmod 755 /opt/server-watchdog/watchdog.sh
cat > /etc/cron.d/server-watchdog <<CRON
* * * * * root nice -n 10 /opt/server-watchdog/watchdog.sh >/dev/null 2>&1
CRON
chmod 644 /etc/cron.d/server-watchdog
echo "== Сторож установлен, проверяет сервер каждую минуту."
/opt/server-watchdog/watchdog.sh test
