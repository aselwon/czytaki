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


## CZ-14 — 2026-10-31
- Gałąź / PR: brak (zadanie pominięte przez harness: `skipTasks`)
- Co próbowano: nic — zadanie wymaga kroku wyłącznie dla człowieka.
- Ostatni błąd (bez sekretów): n/d
- Hipoteza: pełny zakup testowy wymaga prawdziwych kluczy testowych Stripe i Resend oraz klucza OpenAI ustawionych przez właściciela (`wrangler secret put`) i uruchomienia płatnego generowania przez właściciela w limicie 5 zł/dobę.
- Pytanie do właściciela: po ustawieniu kluczy i wdrożeniu (CZ-12) uruchomić scenariusz; agent może przygotować checklistę/skrypt kosztów w osobnym zadaniu, jeśli trzeba.

## CZ-16 — 2026-10-31
- Gałąź / PR: brak (zadanie pominięte przez harness: `skipTasks`)
- Co próbowano: nic — zadanie wymaga kroku wyłącznie dla człowieka.
- Ostatni błąd (bez sekretów): n/d
- Hipoteza: go-live wymaga kluczy live Stripe/Resend/OpenAI ustawionych przez właściciela, `SALES_ENABLED=true`, pierwszego prawdziwego zakupu i zwrotu oraz zatwierdzenia checklisty przez właściciela.
- Pytanie do właściciela: po CZ-14 i CZ-13 ustawić klucze live i zatwierdzić `docs/go-live.md`.
