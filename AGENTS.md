# AGENTS.md — Czytaki

Instrukcje dla agentów (planista i wykonawcy) pracujących w tym repozytorium w harnessie.

## Projekt w skrócie

Czytaki sprzedaje spersonalizowane komiksy, historie i bajki w PDF. Klient przesyła zdjęcie (dziecko, dorosły, zwierzę), wybiera format, świat, styl i długość (8/15/30 stron), a AI generuje tekst i ilustracje. Szczegóły produktu: [`README.md`](README.md). Historia kontroli jakości: [`CHECKLIST.md`](CHECKLIST.md). Cel MVP: [`SPEC.md`](SPEC.md), kryteria: [`docs/mvp-dod.md`](docs/mvp-dod.md), kolejka zadań: [`planning/tasks.json`](planning/tasks.json).

- Stack: Next.js 16 przez `vinext` (Vite) na Cloudflare Workers, D1 (`DB`, Drizzle, migracje w `drizzle/`), prywatny R2 (`BUCKET`).
- AI: OpenAI (tekst, obrazy, moderacja) w `lib/server/ai.ts`.
- PDF: `pdf-lib` w `lib/server/pdf.ts`. Płatności: Stripe Checkout + webhook (`lib/server/payments.ts`, `app/api/payments/webhook`). E-mail: Resend.
- Panel administratora: `/admin` (hasło + docelowo Cloudflare Access).
- Kreator: `app/studio.tsx`, edytor komiksu: `app/comic-editor.tsx`.

## Uruchamianie, testy, lint

Wymagany Node.js ≥ 22.13 (zweryfikowano na 22.23.1).

```sh
npm ci                 # instalacja (lub npm run install:ci)
cp .env.example .env.local   # tylko lokalnie; nigdy nie commitować
npm run local          # build + lokalna baza + serwer http://127.0.0.1:8787
npm test               # testy node:test (tests/*.test.mjs), bez sieci
npx tsc --noEmit       # kontrola typów
npm run lint           # ESLint
npm run build          # build produkcyjny
```

Stan zweryfikowany lokalnie 2026-10-30:

| Komenda            | Wynik                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `npm test`         | **81/82**, 1 błąd: `tests/bubble-copy.test.mjs` „shared copy fitting respects both bounds…” (`Comic bubble text exceeds bounds`) |
| `npx tsc --noEmit` | OK                                                                                                             |
| `npm run lint`     | **20 błędów, 25 ostrzeżeń** (`<a>` zamiast `<Link>`, `any` w `lib/server/ai.ts`, nieużywane zmienne)           |
| `npm run build`    | OK                                                                                                             |

Z tego powodu CI (`.github/workflows/ci.yml`) **nie zostało jeszcze dodane** — pierwsze zadania w `planning/tasks.json` (CZ-01…CZ-03) naprawiają test i lint, a potem dodają CI.

## Zasady kodowania

- Jedno zadanie z `planning/tasks.json` = jedna gałąź `task/<id>-<opis>` = jeden PR do `main` na remote `github`.
- **Nie pushuj na remote `origin`** (stary host ChatGPT). Jedyny remote do pracy: `github` (`aselwon/czytaki`).
- Każda zmiana zachowania ma test w `tests/`. Testy nie wykonują zapytań sieciowych: OpenAI, Stripe i Resend zawsze przez atrapy.
- Zmiany schematu tylko przez migracje Drizzle (`npm run db:generate`) z zachowaniem dawnych zamówień.
- Operacje płatności, generowania i wysyłki muszą pozostać idempotentne i odporne na ponowienia (wzorce w `lib/server/payments.ts`).
- Każde nowe wywołanie AI przechodzi przez licznik kosztów i globalny limit (zadanie CZ-04/CZ-05).
- Tekst dla klienta po polsku (z obsługą obecnych walut), identyfikatory po angielsku.
- Nie obniżaj progów testów ani nie wyłączaj reguł lint, żeby przejść CI. Wyjątek reguły tylko z komentarzem uzasadniającym.
- Zadanie kończy się, gdy spełnia `acceptance`, a `npm test`, `npx tsc --noEmit` i `npm run lint` są zielone (skill `full-stop`).

## Czego agentom nie wolno

- Commitować ani wypisywać sekretów (`.env.local`, klucze OpenAI/Stripe/Resend, `ADMIN_PASSWORD`). `.env*` jest ignorowany i tak ma zostać.
- Wdrażać (`npm run deploy:cloudflare`, `wrangler deploy`), zmieniać sekretów, D1/R2 ani DNS. Wdrożenie wykonuje właściciel.
- Wysyłać e-maili do prawdziwych osób, tworzyć prawdziwych transakcji (Stripe live), zwrotów ani usuwać prawdziwych zamówień.
- Wywoływać płatnych API (OpenAI) bez zgody właściciela. Domyślny limit pracy rozwojowej: **0 zł** — tylko atrapy. Pomiar kosztu książki (CZ-12) wymaga zgody i limitu.
- Używać prawdziwych zdjęć osób, zwłaszcza dzieci, w repo i testach. Tylko syntetyczne lub licencjonowane fixture'y.
- Mergować własnych PR ani force-pushować do `main`.

## Eskalacja

- Po **3 nieudanych próbach CI** (lub lokalnej bramki, dopóki CI nie istnieje) dla tego samego zadania przestań i dopisz wpis do [`planning/blocked.md`](planning/blocked.md): id zadania, gałąź/PR, co próbowano, ostatni błąd (bez sekretów), hipoteza, pytanie. Ustaw `status: "blocked"` w `planning/tasks.json`.
- Wykonawca (`worker`) przy niejasnej specyfikacji lub potrzebie zmiany architektury oddaje zadanie planiście (`planner`).
- Decyzje prawne (RODO, wizerunek dzieci, regulamin), cenowe, hostingowe i wydatki zawsze do właściciela.
