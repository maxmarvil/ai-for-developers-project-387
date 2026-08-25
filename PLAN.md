# PLAN.md — Улучшения производительности (пакет 1 из 5)

## 1. Индексы на `bookings`

**Проблема.** На таблице `bookings` есть только `booking_group_id` и unique `(event_type_id, date, start_time)`. Колонки `guest_id`, `status`, `date` (как самостоятельный предикат) не проиндексированы → seq scan на каждом запросе броней гостя, проверке лимита 2ч, фильтрах Filament.

**Что сделать.**
- Создать миграцию `database/migrations/2026_08_25_000001_add_bookings_performance_indexes.php`:
  ```php
  Schema::table('bookings', function (Blueprint $table) {
      $table->index('guest_id');
      $table->index('starts_at');
      $table->index(['date', 'status'], 'bookings_date_status_idx');
  });
  ```
- Использовать обычные индексы (не partial).
- Миграция должна быть reversible (`down` удаляет индексы).

**Файлы:**
- новый `backend/database/migrations/2026_08_25_000001_add_bookings_performance_indexes.php`

**Проверка:** `EXPLAIN ANALYZE` на запросах из `BookingService::ensureDailyLimitNotExceeded` и `SlotService::resolveSlotStatus` до/после; `php artisan migrate` + `php artisan migrate:rollback` проходит; `./vendor/bin/pest` зелёный.

---

## 2. OPcache + JIT + preload в Docker-образе

**Проблема.** `Dockerfile:42` ставит `opcache`, но конфига нет: дефолты `validate_timestamps=1`, JIT выключен, preload не настроен. В prod-образе код не меняется после build — каждый запрос перепроверяет файлы и не получает JIT-ускорения.

**Что сделать.**
- Создать `docker/opcache.ini`:
  ```ini
  opcache.enable=1
  opcache.enable_cli=1
  opcache.memory_consumption=256
  opcache.max_accelerated_functions=20000
  opcache.validate_timestamps=0
  opcache.revalidate_freq=0
  opcache.jit=tracing
  opcache.jit_buffer_size=64M
  opcache.preload_user=www-data
  opcache.preload=/var/www/html/preload.php
  ```
- Создать `backend/preload.php`:
  ```php
  <?php
  require_once __DIR__ . '/vendor/autoload.php';
  $app = require_once __DIR__ . '/bootstrap/app.php';
  // Предзагрузка ключевых классов фреймворка и приложения
  \Illuminate\Foundation\ComposerScripts::postAutoloadDump($app);
  ```
  (Уточнить у Laravel-версии: для Laravel 12 используется `bootstrap/app.php` — проверить путь). На крайний случай — минимальный preload, подключающий `vendor/autoload.php` + список часто используемых классов через `opcache_compile_file`.
- В `Dockerfile` (Stage 2, после установки расширений) добавить:
  ```dockerfile
  COPY docker/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
  ```
- Убедиться, что `/var/www/html/preload.php` доступен по пути из `opcache.preload` (WORKDIR в Dockerfile = `/var/www/html`, файл `backend/preload.php` копируется через существующий `COPY backend/ ./`).

**Файлы:**
- новый `docker/opcache.ini`
- новый `backend/preload.php`
- правка `Dockerfile` (одна строка `COPY docker/opcache.ini ...`)

**Проверка:** `docker compose build app` → `docker compose up app` → `php -i | grep opcache.jit` показывает `tracing`; `php -i | grep opcache.preload` показывает путь; бенчмарк `ab -n 1000 -c 10 http://localhost:8000/api/v1/event-types` до/после (ожидать 1.5-2×). Если preload падает при старте — откатить preload-часть (оставить JIT без preload), починить в отдельном коммите.

---

## 3. Фикс тегов кэша слотов

**Проблема.** В `SlotService::generate` запись кэшируется под тегом `slots:{$id}:{$date}`. Но `invalidateForEventType` фушет `slots:{$id}`, а `invalidateAll` — `slots`. Ни один из этих тегов не прикреплён к записям → правки `EventType`/`AvailabilityRule`/`AvailabilityException` не инвалидируют кэш, stale до 600с.

**Что сделать.**
- В `backend/app/Services/SlotService.php:34` изменить теги записи на три уровня:
  ```php
  $tagDay   = "slots:{$eventType->id}:{$dateString}";
  $tagType  = "slots:{$eventType->id}";
  $tagAll   = 'slots';
  return Cache::tags([$tagDay, $tagType, $tagAll])->remember($tagDay, self::CACHE_TTL_SECONDS, $generator);
  ```
- В `invalidate(EventType $eventType, Carbon|string $date)` оставить флуш `$tagDay` (как сейчас, для брони).
- В `invalidateForEventType` флуш `$tagType` — теперь сработает.
- В `invalidateAll` флуш `$tagAll` — теперь сработает.
- Проверить observers `EventTypeObserver`, `AvailabilityRuleObserver`, `AvailabilityExceptionObserver` — они уже вызывают эти методы (по отчету); после фикса тегов начнут работать корректно.

**Файлы:**
- правка `backend/app/Services/SlotService.php` (~3 строки)
- unit-тест на инвалидацию: закрыли дату exception'ом → следующий запрос отдаёт 404 (не кэш).

**Проверка:** `./vendor/bin/pest --filter=SlotService` зелёный; ручной сценарий: запросить слоты → через `tinker` создать `AvailabilityException` на эту дату → повторный запрос отдаёт 404.

---

## 4. Дефер инвалидации кэша броней + батч

**Проблема.** `BookingService::create` в цикле вызывает `Booking::create(...)` N раз внутри `DB::Transaction`. Каждый `created` ивент → `BookingObserver` → `SlotService::invalidate(...)` → Redis FLUSH — N раз, внутри незакоммиченной транзакции. При rollback кэш уже инвалидирован (но данные не записаны) — лишние флуши.

**Что сделать.**
- В `BookingService::create` собрать коллекцию уникальных `[$eventType->id, $date]` пар в локальную переменную `$toInvalidate` внутри цикла создания.
- После `DB::Transaction(...)` (т.е. после успешного commit) — один цикл по `$toInvalidate` с вызовом `$this->slotService->invalidate(...)`.
- В `BookingObserver::created` — оставить метод пустым (тело пустое, без логики). Не разрегистрировать observer — сохранить структуру для будущих хуков, просто не выполнять инвалидацию при `created`.
- В `BookingObserver::updated`/`deleted` — оставить инвалидацию как есть (смена статуса админом, отмена брони — нужны инвалидации; они идут вне транзакции сервиса и нормально работают).
- Учесть: `BookingResource` Filament при смене статуса триггерит `updated` → инвалидация сработает — корректно.

**Файлы:**
- правка `backend/app/Services/BookingService.php` (метод `create`)
- правка `backend/app/Observers/BookingObserver.php` (тело `created` → пустое, с комментарием-заглушкой)

**Проверка:** `./vendor/bin/pest --filter=BookingService` зелёный; ручной сценарий: длинная бронь на 4 слота → в логе Redis видим 1 FLUSH (не 4); rollback транзакции не инвалидирует кэш.

---

## 5. `QUEUE_CONNECTION: redis` + worker в supervisor + failed_jobs

**Проблема.** `docker-compose.yml:62` жёстко ставит `QUEUE_CONNECTION: sync` (перекрывая `.env`). Любой будущий job заблокирует HTTP-запрос. В `docker/supervisord.conf` нет `queue:work` программы — даже с redis-очередью jobs не обработались бы. Миграция `failed_jobs` отсутствует.

**Что сделать.**
- В `docker-compose.yml` секция `app.environment`: `QUEUE_CONNECTION: redis` (вместо `sync`).
- В `docker/supervisord.conf` добавить программу:
  ```ini
  [program:laravel-worker]
  command=php artisan queue:work redis --tries=3 --max-time=3600 --sleep=3
  autostart=true
  autorestart=true
  stdout_logfile=/dev/stdout
  stdout_logfile_maxbytes=0
  stderr_logfile=/dev/stderr
  stderr_logfile_maxbytes=0
  ```
- В `backend/.env.example` и `backend/.env` — `QUEUE_CONNECTION=redis`.
- Добавить миграцию `failed_jobs` (стандартная Laravel-миграция):
  ```bash
  php artisan make:queue-failed-table
  ```
  Или вручную создать `database/migrations/2026_08_25_000002_create_failed_jobs_table.php` со стандартной схемой (id, uuid, connection, queue, payload, exception, failed_at).

**Файлы:**
- правка `docker-compose.yml` (1 строка)
- правка `docker/supervisord.conf` (+ блок программы)
- правка `backend/.env.example`, `backend/.env` (значение `QUEUE_CONNECTION`)
- новый `backend/database/migrations/2026_08_25_000002_create_failed_jobs_table.php`

**Проверка:** `docker compose up app` → `supervisorctl status` показывает `laravel-worker RUNNING`; `php artisan tinker` → `config('queue.default')` == `'redis'`; тестовый job `dispatch(new class implements ShouldQueue { ... })` уходит в redis и подбирается воркером (видно в логах); `php artisan migrate` создаёт `failed_jobs` таблицу.

---

## Общие параметры

- **Порядок выполнения:** пункты независимы, можно делать параллельно. Рекомендую: 1 → 3 → 4 → 2 → 5 (DB-миграция первой, чтобы остальные тесты на свежих индексах шли).
- **Тестирование после каждого пункта:**
  - `cd backend && ./vendor/bin/pest --no-coverage`
  - `cd backend && ./vendor/bin/pint --test`
  - `cd backend && ./vendor/bin/phpstan analyse --memory-limit=512M --no-progress`
- **Коммиты** (Conventional Commits по AGENTS.md):
  1. `perf(db): add performance indexes on bookings`
  2. `perf(docker): enable opcache jit and preload for production`
  3. `fix(api): correct slot cache tags for proper invalidation`
  4. `perf(api): defer and batch slot cache invalidation on booking`
  5. `perf(docker): use redis queue and add worker to supervisor`
- **Файлы, которые НЕ затрагиваем:** фронтенд (`web/`), OpenAPI-контракт (`api/`), сидеры.

---

## Зафиксированные решения

1. Обычный индекс `index(['date', 'status'])` — без partial индексов.
2. Миграция `failed_jobs` добавляется в п.5.
3. `BookingObserver::created` остаётся пустым методом (observer не разрегистрируется).
4. `opcache.preload` включается в п.2 вместе с JIT.
