#!/bin/bash
# Сторож сервера: раз в минуту проверяет память, процессор, диск, службы и сайт игры.
# Если что-то не так 2 проверки подряд — пишет Rail в Telegram. Повтор не чаще раза в час.
# Когда всё вернулось в норму — пишет «восстановлено». Каждый день в 09:00 (Ташкент) — короткая сводка.
# Запуск: watchdog.sh (проверка) | watchdog.sh test (тестовое сообщение) | watchdog.sh report (сводка)

CONF=/etc/server-watchdog.conf
[ -f "$CONF" ] && . "$CONF"
CHAT_ID=${CHAT_ID:-283846387}
LIMIT=${LIMIT:-80}                 # порог в процентах для памяти, процессора и диска
REPEAT_MIN=${REPEAT_MIN:-60}       # напоминать о той же проблеме не чаще, чем раз в N минут
SERVICES=${SERVICES:-"olx-bot sd-game caddy"}
URLS=${URLS:-"https://45-130-148-137.sslip.io/"}
STATE=/var/lib/server-watchdog
mkdir -p "$STATE"

if [ -z "$BOT_TOKEN" ]; then
  BOT_TOKEN=$(grep -m1 '^BOT_TOKEN=' /opt/olx-bot/.env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"' \r')
fi
HOST=$(hostname)

send() {
  [ -n "$BOT_TOKEN" ] || return 1
  curl -s -m 15 -o /dev/null -w '%{http_code}' "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$CHAT_ID" --data-urlencode "text=$1" | grep -q 200
}

name_of() {
  case "$1" in
    olx-bot) echo "бот Makon Radar";;
    sd-game) echo "сервер игры «Стальной двор»";;
    caddy)   echo "веб-сервер Caddy (HTTPS для игры и счётчика)";;
    *)       echo "служба $1";;
  esac
}

# --- замеры ---
mem_pct() { awk '/MemTotal/{t=$2}/MemAvailable/{a=$2}END{printf "%d", (t-a)*100/t}' /proc/meminfo; }
cpu_pct() { awk -v n="$(nproc)" '{printf "%d", $2*100/n}' /proc/loadavg; }   # средняя нагрузка за 5 минут
disk_pct() { df -P / | awk 'NR==2{gsub("%","",$5); print $5}'; }
top_mem() { ps -eo rss,comm --sort=-rss | awk 'NR>1&&NR<=4{printf "%s %d МБ; ", $2, $1/1024}'; }
top_cpu() { ps -eo pcpu,comm --sort=-pcpu | awk 'NR>1&&NR<=4{printf "%s %s%%; ", $2, $1}'; }

summary() {
  local s="Память $(mem_pct)%, процессор $(cpu_pct)%, диск $(disk_pct)%."
  local x st
  for x in $SERVICES; do
    systemctl list-unit-files "$x.service" >/dev/null 2>&1 || continue
    st=$(systemctl is-active "$x" 2>/dev/null); [ "$st" = active ] && st="✅" || st="❌"
    s="$s
$st $(name_of "$x")"
  done
  echo "$s"
}

# --- учёт проблем: problem КЛЮЧ "текст" / ok КЛЮЧ "текст восстановления" ---
now=$(date +%s)
problem() {
  local f="$STATE/$1" cnt=0 last=0
  [ -f "$f" ] && read -r cnt last < "$f"
  cnt=$((cnt+1))
  if [ "$cnt" -ge 2 ] && [ $((now-last)) -ge $((REPEAT_MIN*60)) ]; then
    local head="⚠️ Сервер $HOST: проблема"; [ "$last" -gt 0 ] && head="⚠️ Сервер $HOST: всё ещё проблема"
    send "$head
$2

$(summary)" && last=$now
  fi
  echo "$cnt $last" > "$f"
}
ok() {
  local f="$STATE/$1" cnt=0 last=0
  [ -f "$f" ] || return 0
  read -r cnt last < "$f"
  [ "$last" -gt 0 ] && send "✅ Сервер $HOST: $2

$(summary)"
  rm -f "$f"
}

case "$1" in
  test)
    send "🛡 Сторож сервера включён ($HOST).
Проверяю каждую минуту: память, процессор, диск (порог $LIMIT%), службы и сайт игры.
Сейчас: $(summary)" && echo "Тестовое сообщение отправлено в Telegram." || echo "Не удалось отправить сообщение в Telegram."
    exit 0;;
  report)
    send "☀️ Утренняя сводка сервера $HOST: $(summary)"; exit 0;;
esac

m=$(mem_pct); c=$(cpu_pct); d=$(disk_pct)
[ "$m" -ge "$LIMIT" ] && problem mem "Память занята на $m%. Больше всего едят: $(top_mem)" || ok mem "память в норме ($m%)"
[ "$c" -ge "$LIMIT" ] && problem cpu "Процессор загружен на $c%. Больше всего грузят: $(top_cpu)" || ok cpu "процессор в норме ($c%)"
[ "$d" -ge "$LIMIT" ] && problem disk "Диск заполнен на $d%." || ok disk "диск в норме ($d%)"

for s in $SERVICES; do
  systemctl list-unit-files "$s.service" >/dev/null 2>&1 || continue
  if systemctl is-active --quiet "$s"; then ok "svc-$s" "$(name_of "$s") снова работает"
  else problem "svc-$s" "Не работает $(name_of "$s"). Состояние: $(systemctl is-active "$s")"; fi
done

i=0
for u in $URLS; do
  i=$((i+1))
  if curl -fsS -m 10 -o /dev/null "$u"; then ok "url-$i" "сайт снова отвечает: $u"
  else problem "url-$i" "Сайт не отвечает: $u"; fi
done

# Ежедневная сводка в 09:00 по Ташкенту (04:00 UTC)
[ "$(date -u +%H%M)" = "0400" ] && send "☀️ Утренняя сводка сервера $HOST: $(summary)"
exit 0
