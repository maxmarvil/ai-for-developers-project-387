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

## 6. Комментарий администратора при отказе в бронировании

**Проблема.** При отклонении брони (action `cancel` в `BookingResource.php:108-116`) администратор не может оставить пояснение причины отказа. Гостевой `comment` перетирать нельзя — это пользовательский ввод.

**Что сделать.**
- **DB-миграция** `2026_08_25_000003_add_cancellation_reason_to_bookings.php`:
  ```php
  Schema::table('bookings', function (Blueprint $table) {
      $table->text('cancellation_reason')->nullable()->after('comment');
  });
  ```
- **Model** (`app/Models/Booking.php`): добавить `cancellation_reason` в `$fillable`.
- **Filament** (`app/Filament/Resources/BookingResource.php`):
  - У action `cancel` добавить форму с `Textarea::make('cancellation_reason')->label('Причина отказа')->nullable()->maxLength(1000)`:
    ```php
    Action::make('cancel')
        ->label('Отменить')
        ->icon('heroicon-o-x-mark')
        ->color('danger')
        ->requiresConfirmation()
        ->visible(fn (Booking $record): bool => ! $record->isCancelled())
        ->form([
            Textarea::make('cancellation_reason')
                ->label('Причина отказа')
                ->nullable()
                ->maxLength(1000),
        ])
        ->action(function (Booking $record, array $data): void {
            $record->update([
                'status' => BookingStatus::CANCELLED,
                'cancellation_reason' => $data['cancellation_reason'] ?? null,
            ]);
        });
    ```
  - Добавить колонку `TextColumn::make('cancellation_reason')->label('Причина отказа')->wrap()->limit(50)->toggleable()` в таблицу.
  - В форме редактирования — `Textarea::make('cancellation_reason')->disabled()` (только для чтения, журнал отказов).
- **API-контракт** (`api/models/admin.tsp`):
  - В `UpdateBookingStatusRequest`:
    ```tsp
    model UpdateBookingStatusRequest {
      status: BookingStatus;
      /** Необязательное пояснение причины отказа (заполняется только при status = cancelled). */
      cancellation_reason?: string | null;
    }
    ```
  - В `AdminBooking` добавить `cancellation_reason: string | null;`
  - Перекомпилировать OpenAPI → `api/openapi.v1.json` → регенерировать `web/src/api/schema.d.ts`.
- **Backend controller/service** (`AdminBookingController` или эквивалент): в `updateStatus`:
  - Валидация: `'cancellation_reason' => 'nullable|string|max:1000'`.
  - Сохранение: при `status=cancelled` писать `cancellation_reason`; при любом другом статусе — обнулять `cancellation_reason` до `null` (чистое состояние).
- **Гостевая часть:** без изменений (причина не показывается посетителю).
- **Тесты Pest:**
  - Отказ с причиной → сохраняется в БД.
  - Отказ без причины → поле `null`.
  - Смена статуса с `cancelled` на `pending`/`confirmed` → `cancellation_reason` обнуляется.
  - Длина > 1000 символов → validation error.

**Файлы:**
- новый `backend/database/migrations/2026_08_25_000003_add_cancellation_reason_to_bookings.php`
- правка `backend/app/Models/Booking.php` (`$fillable`)
- правка `backend/app/Filament/Resources/BookingResource.php` (action `cancel`, колонка, edit-форма)
- правка `backend/app/Http/Controllers/Api/AdminBookingController.php` (или эквивалент — найти PATCH-эндпоинт)
- правка `api/models/admin.tsp` (`UpdateBookingStatusRequest`, `AdminBooking`)
- регенерация `api/openapi.v1.json` + `web/src/api/schema.d.ts`
- новый/обновлённый тест в `backend/tests/Feature/` (или Pest, по конвенции проекта)

**Проверка:** `php artisan migrate`; в админке отменить бронь с текстом причины → колонка показывает причину; `./vendor/bin/pest` зелёный; `npm run typecheck` в `web/` зелёный (после регенерации типов).

**Коммит:** `feat(admin): optional cancellation reason when rejecting booking`

---

## 7. Групповые встречи до 3 гостей

**Проблема.** Сейчас одна бронь = один гость (`bookings.guest_id`). Нет возможности оформить встречу с несколькими участниками (первичный букер + до 2 коллег). Нужно добавить поддержку до 3 участников на одно бронирование, где слот занимается один раз (одно мероприятие).

**Зафиксированные решения:**
- Вариант A: одно мероприятие, слот занимается 1 раз (не 3).
- Лимит 2ч (BR-1) применяется только к первичному букеру; доп. участники не учитываются.
- Доп. участникам нужен полный набор полей: имя, email, телефон.
- Хранение: pivot-таблица `booking_participants` (нормализованно, queryable).
- UI: кнопка «Добавить участника» в `GuestForm`, до 2 доп. строк.
- В `BookingResource` — показывать список участников (Relation Manager).
- Отмена брони отменяет для всех участников (одно мероприятие).

### Что сделать

**DB-миграция** `2026_08_25_000004_create_booking_participants_table.php`:
```php
Schema::create('booking_participants', function (Blueprint $table) {
    $table->id();
    $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
    $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
    $table->enum('role', ['primary', 'secondary'])->default('secondary');
    $table->timestamps();
    $table->unique(['booking_id', 'guest_id']); // один гость не может быть дважды в одной брони
    $table->index('guest_id');
});
```
- Первичный букер дублируется в pivot как `role='primary'` (для queryable связи), а также остаётся в `bookings.guest_id` (backward compat).
- Доп. участники (до 2) — `role='secondary'`.

**Models:**
- `Booking`: добавить relation `participants(): HasMany(BookingParticipant::class)`. Добавить `participants` в `$with` (eager load) или явно загружать где нужно.
- Новый `BookingParticipant` model (`$fillable`: `booking_id`, `guest_id`, `role`; casts для `role`).
- `Guest`: добавить relation `participatingBookings(): BelongsToMany(Booking::class)->using(BookingParticipant::class)->withPivot('role')`.

**Service** (`BookingService::create`):
- Сигнатура: вместо `array $guestData` принимать `array $primaryGuest` + `array $additionalGuests` (по умолчанию `[]`).
- Upsert'ить каждого участника через `GuestService::firstOrCreateByEmail` (полный набор полей: name, email, phone).
- Валидация: всего участников (primary + additional) ≤ 3. Если > 3 → `ErrorCode` `TOO_MANY_PARTICIPANTS` (новый код) или переиспользовать `VALIDATION_ERROR`.
- В цикле создания `Booking::create(...)` для каждого слота — после создания строки бронирования — создавать pivot-записи: primary participant + все secondary.
- Лимит 2ч (BR-1) проверять только для primary (без изменений в логике, просто не расширять на secondary).

**API-контракт** (`api/models/public.tsp`):
- `CreateBookingRequest`:
  ```tsp
  model CreateBookingRequest {
    event_type_id: int32;
    date: CalendarDate;
    guest: GuestInput;                          // primary
    @maxItems(2) additional_guests?: GuestInput[];  // up to 2 secondary
    @minItems(1) slots: BookingSlotInput[];
  }
  ```
- Добавить `ErrorCode` `TOO_MANY_PARTICIPANTS` в `api/models/common.tsp` (или переиспользовать `VALIDATION_ERROR`).
- `CreateBookingResponse` — без изменений (`booking_group_id` + `status`).
- Перекомпилировать OpenAPI → `api/openapi.v1.json` → регенерировать `web/src/api/schema.d.ts`.

**Backend controller/request:**
- `StoreBookingRequest`: добавить правила валидации:
  ```php
  'additional_guests'           => ['nullable', 'array', 'max:2'],
  'additional_guests.*.name'    => ['required', 'string', 'max:255'],
  'additional_guests.*.email'  => ['required', 'email', 'max:255'],
  'additional_guests.*.phone'  => ['required', 'string', 'regex:/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/'],
  ```
- `BookingController::store`: передать `additionalGuests` в `BookingService::create`.

**Frontend** (`web/src/features/booking/GuestForm.tsx`):
- Добавить кнопку «Добавить участника» (до 2 раз).
- Состояние: `additionalGuests: GuestInput[]` (массив, max 2).
- Каждая доп. строка: 3 поля (имя, email, телефон) с валидацией (тот же `isValidEmail` / `isValidPhone`).
- Кнопка «Удалить участника» на каждой доп. строке.
- В payload `useCreateBooking`: передать `additional_guests` (если есть).
- `localStorage`: сохранять только primary гостя (FR-11), доп. участников не персистить.

**Filament** (`BookingResource`):
- Relation Manager `ParticipantsRelationManager`:
  - Таблица: `guest.email`, `guest.name`, `guest.phone`, `role` (primary/secondary).
  - Только для чтения (управление участниками идёт через отмену/пересоздание брони).
- Колонка в основном списке броней: `TextColumn::make('participants_count')->counts('participants')->label('Участников')` (число, для быстрого обзора).
- При отмене брони (action `cancel`) — ничего доп. не делать: pivot cascade-deletes при удалении брони; при смене статуса на `cancelled` pivot остаётся (история), но слот освобождается через существующий `BookingObserver`.

**Бизнес-правила (обновить в REQUIREMENTS/CONTEXT при необходимости):**
- Слот занимается 1 раз независимо от числа участников (1-3).
- Лимит 2ч применяется только к primary букеру.
- Все участники делят один `booking_group_id` и один статус (отмена = отмена для всех).
- Доп. участник не может быть тем же email, что и primary (unique constraint на pivot + валидация).

**Тесты Pest:**
- Групповая бронь на 3 гостей (1 primary + 2 secondary) → создаётся, pivot заполнен.
- Превышение 3 участников (1 + 3) → validation error.
- Дублирующийся email в доп. участниках и primary → ошибка.
- Лимит 2ч не увеличивается для secondary (secondary делает свою бронь в тот же день → не блокируется).
- Отмена групповой брони → слот освобождается, pivot остаётся (cascade только при hard delete).
- UI E2E (опционально): добавление/удаление участника в форме.

### Файлы
- новый `backend/database/migrations/2026_08_25_000004_create_booking_participants_table.php`
- новый `backend/app/Models/BookingParticipant.php`
- правка `backend/app/Models/Booking.php` (relation `participants`)
- правка `backend/app/Models/Guest.php` (relation `participatingBookings`)
- правка `backend/app/Services/BookingService.php` (метод `create`)
- правка `backend/app/Http/Controllers/Api/BookingController.php`
- правка `backend/app/Http/Requests/StoreBookingRequest.php`
- правка `api/models/public.tsp` (`CreateBookingRequest`, `additional_guests`)
- правка `api/models/common.tsp` (новый `ErrorCode` если добавляем)
- регенерация `api/openapi.v1.json` + `web/src/api/schema.d.ts`
- правка `web/src/features/booking/GuestForm.tsx` (UI участников)
- правка `web/src/features/booking/BookingPage.tsx` (передача `additional_guests` в payload)
- новый `backend/app/Filament/Resources/BookingResource/RelationManagers/ParticipantsRelationManager.php`
- правка `backend/app/Filament/Resources/BookingResource.php` (подключение RM, колонка)
- новые тесты в `backend/tests/Feature/` (или Pest по конвенции проекта)
- (опционально) `web/e2e/` — E2E сценарий добавления участника

### Проверка
- `php artisan migrate`; в админке создать групповую бронь на 3 участников → pivot заполнен, RM показывает список.
- `./vendor/bin/pest` зелёный.
- `npm run typecheck` в `web/` зелёный (после регенерации типов).
- `npm run lint` зелёный.
- E2E (если добавлен): выбор 1 слота → добавление 2 участников → отправка → confirmation показывает `booking_group_id`.

### Коммит
`feat(api): support group bookings with up to 3 participants`

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
  6. `feat(admin): optional cancellation reason when rejecting booking`
  7. `feat(api): support group bookings with up to 3 participants`
- **Файлы, которые НЕ затрагиваем:** OpenAPI-контракт `api/` правится только в п.6 и п.7, сидеры.
- **Порядок выполнения пунктов 6-7 (фичи):** после perf-пунктов 1-5; п.6 и п.7 независимы друг от друга, но п.7 правит `StoreBookingRequest`/`BookingController` — проверить, что п.6 (правка `AdminBookingController`) не конфликтует.

---

## Зафиксированные решения

1. Обычный индекс `index(['date', 'status'])` — без partial индексов.
2. Миграция `failed_jobs` добавляется в п.5.
3. `BookingObserver::created` остаётся пустым методом (observer не разегистрируется).
4. `opcache.preload` включается в п.2 вместе с JIT.
5. Поле причины отказа: имя `cancellation_reason`, тип `text`, nullable, `max:1000` на уровне валидации.
6. Причина отказа видна только администратору (гостю не показываем).
7. `cancellation_reason` обнуляется при любой смене статуса на не-`cancelled`.
8. В Filament edit-форме поле `cancellation_reason` только для чтения (`disabled()`).
9. Поле причины отказа необязательное (nullable) на уровне UI и API.
10. Групповая встреча: слот занимается 1 раз (одно мероприятие), не по числу участников.
11. Лимит 2ч (BR-1) для групповых встреч применяется только к primary букеру; secondary не учитываются.
12. Доп. участникам нужен полный набор полей (имя, email, телефон); хранение — pivot-таблица `booking_participants`.
13. Первичный букер дублируется в pivot как `role='primary'` + остаётся в `bookings.guest_id` (backward compat).
14. В `GuestForm` — кнопка «Добавить участника» (до 2 доп. строк); `localStorage` только для primary.
15. В `BookingResource` — Relation Manager для участников (только чтение) + колонка с количеством.
16. Отмена групповой брони = отмена для всех участников; pivot cascade-deletes при hard delete.
