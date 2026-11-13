# Kasb Pro

Бесплатные уроки по рабочим профессиям: схемы, тесты, калькуляторы. Русский и узбекский.

Сайт: https://kasbpro.uz/ (старый адрес https://railf66.github.io/kasb-pro/ перекидывает сюда). Домен куплен в Eskiz, файл CNAME в корне не удалять.

Прогресс уроков хранится в браузере ученика (ключи вида `vn_*`, `hp_*`), язык общий для всех приложений (`ep_lang`).

- `index.html` — главная страница с профессиями
- `elektrik/` — приложение для электриков (собирается из репозитория railf66/elektrik-pro: `python3 build.py`, затем копия `index.html` с `window.KASB_HUB="../"`)
- `elektrik/igra/` — игра «Собери щиток» (RU/UZ, 2 минуты, 3 жизни): подбор автоматов, УЗО, кабеля и подключение проводов. Один файл `index.html`, копия в папке проекта elektrik-game. Кнопка «Поделиться» ведёт в бот `t.me/kasbpro_uz_bot?start=igra`. Ссылка на игру есть на главном экране Электрик Pro.
- `santehnik/` — приложение для сантехников (исходники: папка проекта santehnik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`)
- `medsestra/` — приложение для медсестёр и медбратьев (исходники: папка проекта medsestra-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`). Только уход, первая помощь и санитария, без лекарств и доз.
- `optik/` — приложение для монтажников оптики (исходники: папка проекта optik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `svarshik/` — приложение для сварщиков (исходники: папка проекта svarshik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `holod/` — приложение для мастеров по кондиционерам и холодильникам «Холод Pro» (исходники: папка проекта holod-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `avtoelektrik/` — приложение для автоэлектриков и диагностов «Автоэлектрик Pro» (исходники: папка проекта avtoelektrik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `videonablyudenie/` — приложение для установщиков видеонаблюдения (исходники: папка проекта videonablyudenie-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `povar/` — приложение для поваров (исходники: папка проекта povar-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"` и SEO-тегами).
- `slabotochnik/` — приложение для слаботочников «Слаботочник Pro»: СКС, домофоны, охранная и пожарная сигнализация, СКУД (исходники: папка проекта slabotochnik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`, `tg.js` и SEO-тегами).

## Telegram

- Общий бот: [@kasbpro_uz_bot](https://t.me/kasbpro_uz_bot) (сценарий Make «Kasb Pro Bot»). Ссылка `t.me/kasbpro_uz_bot?start=<папка>` сразу предлагает нужное приложение, `start=` записывается в таблицу как «Откуда пришёл».
- `tg.js` — плашка «Удобнее в Telegram» внизу приложения, если оно открыто в обычном браузере. При копировании новой сборки в папку профессии добавляйте рядом с `window.KASB_HUB` строку `<script src="../tg.js" defer></script>`.
