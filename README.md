# Kasb Pro

Бесплатные уроки по рабочим профессиям: схемы, тесты, калькуляторы. Русский и узбекский.

Сайт: https://railf66.github.io/kasb-pro/

Прогресс уроков хранится в браузере ученика (ключи вида `vn_*`, `hp_*`), язык общий для всех приложений (`ep_lang`).

- `index.html` — главная страница с профессиями
- `elektrik/` — приложение для электриков (собирается из репозитория railf66/elektrik-pro: `python3 build.py`, затем копия `index.html` с `window.KASB_HUB="../"`)
- `santehnik/` — приложение для сантехников (исходники: папка проекта santehnik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`)
- `medsestra/` — приложение для медсестёр и медбратьев (исходники: папка проекта medsestra-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`). Только уход, первая помощь и санитария, без лекарств и доз.
- `optik/` — приложение для монтажников оптики (исходники: папка проекта optik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `svarshik/` — приложение для сварщиков (исходники: папка проекта svarshik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `holod/` — приложение для мастеров по кондиционерам и холодильникам «Холод Pro» (исходники: папка проекта holod-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `avtoelektrik/` — приложение для автоэлектриков и диагностов «Автоэлектрик Pro» (исходники: папка проекта avtoelektrik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
- `videonablyudenie/` — приложение для установщиков видеонаблюдения (исходники: папка проекта videonablyudenie-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
