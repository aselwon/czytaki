# Przygotowanie Czytaków na koncie właściciela

Konto docelowe: `2791466c5820cfd886aad95e0d3ef948`. To instrukcja dla
właściciela, nie potwierdzenie utworzenia zasobów ani wdrożenia. Agent wykonuje
wyłącznie lokalny build i testy. Decyzje o domenie, planach i kosztach należą do
właściciela. `SALES_ENABLED=false` pozostaje do zakończenia odbioru MVP.

## 1. Sprawdź konto i narzędzia

Wymagany Node.js >= 22.13 oraz zależności z lockfile. `npm run cf --` uruchamia
lokalny Wrangler, wymusza konto z `cloudflare.production.json` i izoluje profil
logowania w ignorowanym `.wrangler/account-owner`.

```sh
npm run cf -- login
npm run cf -- whoami
```

Przed operacjami zdalnymi sprawdź dostęp do powyższego konta. Nie kopiuj profilu
logowania innego projektu. Token używany przez harness musi mieć uprawnienia
wyłącznie do zasobów konta właściciela; nie zapisuj go w repo.

## 2. Utwórz nowe, puste zasoby (właściciel)

Poniższe komendy odpowiadają `wrangler d1 create` i `wrangler r2 bucket create`:

```sh
npm run cf -- d1 create czytaki-production-orders
npm run cf -- r2 bucket create czytaki-production-private
```

Jeżeli R2 wymaga aktywacji rozliczeń, zatrzymaj procedurę do decyzji właściciela.
Nie włączaj publicznego `r2.dev` ani publicznej domeny bucketa.

W `cloudflare.production.json` zastąp **wyłącznie** `d1_databases[0].database_id`
identyfikatorem zwróconym przez `d1 create`. Obecne
`00000000-0000-4000-8000-000000000000` jest placeholderem do lokalnego buildu,
nie identyfikatorem produkcyjnym. Bindingi pozostają `DB` i `BUCKET`.
Nie używaj identyfikatora bazy z poprzedniego konta.

## 3. Zastosuj migracje od zera (właściciel)

```sh
npm run cf -- d1 migrations list DB --remote --config cloudflare.production.json
npm run cf -- d1 migrations apply DB --remote --config cloudflare.production.json
npm run cf -- d1 migrations list DB --remote --config cloudflare.production.json
```

Wrangler stosuje cały katalog `drizzle`: `0000_tired_lifeguard.sql`,
`0001_short_lester.sql`, `0002_young_toxin.sql` (i przyszłe migracje).
Po wykonaniu lista nie powinna zawierać oczekujących migracji. Nie uruchamiaj
`db:generate` dla istniejącego schematu. Nie kopiuj lokalnej bazy ani plików
klientów. Dawne zasoby pozostają nietknięte; przeniesienie historycznych zamówień
wymaga osobnego planu właściciela.

## 4. Ustal publiczny host i ochronę administratora

Konfiguracja włącza publiczny host `czytaki.<subdomena-konta>.workers.dev`
(`workers_dev=true`), wyłącza adresy podglądów (`preview_urls=false`).
Dokładny host ustal w panelu konta. Jeżeli właściciel wybierze własną domenę,
musi skonfigurować jej trasę i ochronę przed włączeniem sprzedaży; wyłącz wtedy
`workers_dev`, by nie pozostawić alternatywnej drogi do panelu.

W Cloudflare Zero Trust → Access → Applications właściciel konfiguruje aplikacje
Self-hosted dla **każdego dostępnego hosta**, obejmujące `/admin*` i
`/api/admin/*`, w tym `/admin`, `/admin/…`, `/api/admin` i `/api/admin/…`.
Sprawdź dopasowanie tych ścieżek w panelu Access; w razie potrzeby dodaj osobne
wpisy dla ścieżek bazowych. Polityka Allow dopuszcza tylko tożsamość właściciela z MFA;
pozostali są blokowani, bez Bypass ani Allow Everyone. Hasło aplikacji pozostaje
drugą warstwą. Access jest konfiguracją konta, nie powstaje z pliku Wranglera.
Jeżeli wybrany host nie pozwala objąć ochroną wszystkich ścieżek, nie publikuj
panelu; właściciel musi wybrać host obsługujący taką konfigurację.

Nie obejmuj całego hosta logowaniem Access: sklep i **POST
`/api/payments/webhook` muszą być publiczne**, bez sesji i tokenu Access.
Webhook weryfikuje podpis Stripe w aplikacji. W Stripe właściciel dodaje endpoint
`https://<host>/api/payments/webhook` z wydarzeniami
`checkout.session.completed` oraz `checkout.session.async_payment_succeeded`.
Sekret podpisu musi należeć do tego endpointu i tego samego trybu Stripe co klucz.

## 5. Ustaw sekrety i zmienne (właściciel)

Sekrety — tylko nazwy, wartości podawaj interaktywnie, nigdy w repo ani logach:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ADMIN_PASSWORD` (minimum 20 znaków; dopiero po przygotowaniu Access)
- `DELETE_TOKEN_SECRET` (osobny, trwały sekret podpisu linków usunięcia danych)

Dla każdej nazwy użyj:

```sh
npm run cf -- secret put NAZWA_SEKRETU --config dist/server/wrangler.json
```

Najpierw wykonaj build z kroku 7. Jeżeli Worker jeszcze nie istnieje, sekrety
ustaw po pierwszym wdrożeniu z wyłączoną sprzedażą i gotowym Access.
Sekretów nie umieszczaj w `vars`. `CLOUDFLARE_API_TOKEN` jest poświadczeniem
narzędzi wdrożeniowych harnessu/właściciela, nie sekretem aplikacji.

W `vars` pliku `cloudflare.production.json` właściciel ustawia `APP_URL`
(dokładny publiczny adres HTTPS) i `EMAIL_FROM` (zweryfikowany nadawca Resend).
Pozostałe ustawienia: `SALES_ENABLED=false`, `DAILY_GENERATION_LIMIT=3`,
`PRICE_CENTS=2900`; opcjonalne `REGULAR_PRICE_CENTS`, `OPENAI_TEXT_MODEL`,
`OPENAI_LAYOUT_MODEL`, `OPENAI_IMAGE_MODEL`. Nie zmieniaj cen ani modeli w ramach
migracji. Retencja korzysta z obecnych domyślnych `PHOTO_RETENTION_DAYS=7`
i `RETENTION_DAYS=30`; decyzje o polityce retencji należą do właściciela.

## 6. Cron Triggers

`triggers.crons: ["17 2 * * *"]` uruchamia `worker.ts` codziennie o 02:17 UTC
(03:17 zimą / 04:17 latem w Polsce). Handler wywołuje `cleanExpiredOrders`
przez `waitUntil`: usuwa przeterminowane zdjęcia i zamówienia z D1/R2.
Codzienny interwał oznacza opóźnienie do kolejnego przebiegu względem progu
wieku; nie dowodzi ścisłego SLA usunięcia w 7 dni.

**Wznawianie generowania nie jest jeszcze zaimplementowane jako zadanie cron.**
Nie dodawaj pozornego drugiego triggera: obecny handler wykonałby znowu retencję.
Po dostarczeniu pipeline po płatności trzeba podłączyć osobny handler wznawiania,
wybrać harmonogram (np. co 5 minut), rozdzielać zadania przez `event.cron` i
potwierdzić idempotencję, weryfikację płatności oraz dzienny limit kosztu AI.
To otwarty warunek uruchomienia sprzedaży; ten PR nie implementuje pipeline.

## 7. Build i publikacja (publikuje wyłącznie właściciel lub harness)

```sh
npm run build:cloudflare
```

`vite.config.ts` łączy bindingi Workera z `cloudflare.production.json` i zapisuje
wynik w `dist/server/wrangler.json`. Sprawdź tam konto, rzeczywisty identyfikator
D1, prywatny bucket, cron i `SALES_ENABLED=false`. Nie edytuj artefaktu ręcznie.
Zwykły `npm run build` zachowuje lokalne bindingi.

Po sprawdzeniu konfiguracji właściciel może wykonać:

```sh
npm run cf -- deploy --dry-run --config dist/server/wrangler.json
npm run deploy:cloudflare
```

Nie wdrażaj z placeholderem D1. Po każdej zmianie konfiguracji powtórz build.
Harness wdraża po merge i zielonym CI, jeżeli właściciel dostarczył uprawnienia.
Agent nie wykonuje żadnego zdalnego kroku tej instrukcji.

## 8. Odbiór na hoście (właściciel)

- Bez logowania sprawdź `/admin`, podstrony panelu i `/api/admin/*`: Access ma
  blokować dostęp. Po logowaniu Access aplikacja nadal wymaga hasła.
- Sprawdź każdy host, także workers.dev; niedopuszczalny jest bypass przez alias.
- POST na webhook bez podpisu powinien zwrócić błąd aplikacji (400 po ustawieniu
  sekretu), nigdy przekierowanie do Access. Następnie wykonaj kontrolowany test
  Stripe w trybie testowym; powtórzenie wydarzenia nie może powielać dostawy.
- Sprawdź brak publicznego dostępu do R2 oraz odczyt/zapis aplikacji do nowej D1.
- Potwierdź wykonanie crona w logach i retencję na syntetycznych danych.
- Zakończ pozostałe kryteria MVP (pipeline po płatności, limit AI i wznawianie)
  przed zmianą `SALES_ENABLED`. Agent nie wykonuje płatnych testów ani wysyłek.
