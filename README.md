# Kasb Pro

Бесплатные уроки по рабочим профессиям: схемы, тесты, калькуляторы. Русский и узбекский.

Сайт: https://railf66.github.io/kasb-pro/

- `index.html` — главная страница с профессиями
- `elektrik/` — приложение для электриков (собирается из репозитория railf66/elektrik-pro: `python3 build.py`, затем копия `index.html` с `window.KASB_HUB="../"`)
- `santehnik/` — приложение для сантехников (исходники: папка проекта santehnik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`)
- `medsestra/` — приложение для медсестёр и медбратьев (исходники: папка проекта medsestra-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`). Только уход, первая помощь и санитария, без лекарств и доз.
- `optik/` — приложение для монтажников оптики (исходники: папка проекта optik-app, `python3 build.py`, затем копия `site-index.html` с `window.KASB_HUB="../"`).
