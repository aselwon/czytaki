# Zablokowane zadania

Agent dopisuje tu wpis po 3 nieudanych próbach CI albo przy blokadzie wymagającej decyzji człowieka. Format:

```text
## <id zadania> — <data>
- Gałąź / PR:
- Co próbowano:
- Ostatni błąd (bez sekretów):
- Hipoteza:
- Pytanie do właściciela:
```


## CZ-14 — 2026-11-01
- Gałąź / PR: brak (zadanie pominięte przez harness: `skipTasks`; zostaje `blocked`, uruchamia właściciel)
- Co próbowano: analiza przepływu zakupu na produkcji (czytaki.kredkuj.pl, Stripe test, Resend i OpenAI podłączone). Checkout blokuje `salesReady()` przy `SALES_ENABLED=false`; brak bramki testowej.
- Ostatni błąd (bez sekretów): `/api/config` → `checkout:false`; dodatkowo brak w kodzie limitu kosztu OpenAI 5 zł/dobę (patrz wpis CZ-05).
- Hipoteza: test zakupu bez publicznego włączania sprzedaży wymaga CZ-20 (twardy limit kosztu) i CZ-21 (bramka testowego checkoutu, sekret `TEST_CHECKOUT_TOKEN`).
- Pytanie do właściciela: po wdrożeniu CZ-20 i CZ-21 ustawić `TEST_CHECKOUT_TOKEN` i wykonać scenariusz (8 stron, karta testowa 4242).

## CZ-05 — 2026-11-01 (notatka: done bez kodu)
- Gałąź / PR: #10 (e669a9a) zmienił wyłącznie `planning/tasks.json`.
- Co próbowano: weryfikacja kodu na main a85dbf5 — brak `OPENAI_DAILY_COST_CAP_GROSZE`, rezerwacji kosztu, statusu `waiting_capacity` i alertów w `lib/server`; potwierdza to `docs/image-model-migration.md`.
- Ostatni błąd (bez sekretów): n/d — limit 5 zł/dobę nie jest egzekwowany.
- Hipoteza: harness oznaczył zadanie jako done po merge PR bez zmian w kodzie.
- Pytanie do właściciela: brak — realizacja w CZ-20 (priorytet wysoki); wpis zamyka CZ-20.

## CZ-16 — 2026-10-31
- Gałąź / PR: brak (zadanie pominięte przez harness: `skipTasks`)
- Co próbowano: nic — zadanie wymaga kroku wyłącznie dla człowieka.
- Ostatni błąd (bez sekretów): n/d
- Hipoteza: go-live wymaga kluczy live Stripe/Resend/OpenAI ustawionych przez właściciela, `SALES_ENABLED=true`, pierwszego prawdziwego zakupu i zwrotu oraz zatwierdzenia checklisty przez właściciela.
- Pytanie do właściciela: po CZ-14 i CZ-13 ustawić klucze live i zatwierdzić `docs/go-live.md`.
