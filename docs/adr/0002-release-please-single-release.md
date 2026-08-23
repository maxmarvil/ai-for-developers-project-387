# Release-please: единый релиз на всё монорепо

Репозиторий состоит из трёх частей (`web/`, `backend/`, `api/`), ничего не
публикуется во внешние реестры, а релизы нужны как учебный артефакт
(тег + changelog, без деплоя). Решили: release-please + release-please-action
v4 в manifest-режиме с единственным пакетом `web` (`include-component-in-tag:
false`), источник версии — `web/package.json`, старт с `1.0.0`,
`bootstrap-sha` — первый конвенциональный коммит (`2719696`), триггер — push
в main, токен — `GITHUB_TOKEN`. После создания тега и GitHub Release ничего
не запускается.

## Considered Options

- **Мультипакетный manifest** (web и backend версионируются отдельно) —
  отвергнуто: backend и web связаны контрактом OpenAPI и осмысленно меняются
  вместе, отдельных потребителей у их версий нет.
- **Корневой `package.json`** как источник версии — отвергнут: создал бы
  вторую, фиктивную точку версии рядом с настоящей в `web/`.

## Consequences

- Скоуп коммита (`web`, `api`, `admin`, `e2e`) — только метка области в
  changelog; на бамп версии он не влияет.
- У `backend/` и `api/` собственных версий нет; `backend/composer.json`
  остаётся без поля `version`.
- Слияние PR — только squash, заголовок PR обязан быть конвенциональным
  коммитом: release-please читает заголовки коммитов в main.
- Коммиты `docs`, `ci`, `chore` не попадают в changelog (дефолтные секции
  release-please).
