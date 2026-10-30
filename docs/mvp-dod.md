# Czytaki MVP — Definition of Done

MVP jest gotowe, gdy **wszystkie** punkty są odhaczone i każdy ma dowód (PR, wynik testu, log, zrzut lub raport kosztów). Zakres: [`SPEC.md`](../SPEC.md).

## 1. Kontrola kosztów (blokujące)

- [ ] **Preview-first:** przed płatnością generowane są tylko: tekst historii, okładka i 1 scena. Test: przy nieopłaconym zamówieniu liczba wywołań generowania obrazu ≤ 2, niezależnie od wariantu 8/15/30.
- [ ] Po webhooku `checkout.session.completed` pipeline generuje pozostałe sceny i PDF, wznawia się po błędzie i wysyła e-mail dopiero po kompletnym PDF (testy z atrapami: sukces, błąd w połowie + wznowienie, podwójny webhook bez duplikatu).
- [ ] Błąd generowania po płatności po N ponowieniach → status `needs_refund` widoczny w `/admin` i alert e-mail do właściciela (test).
- [ ] Ewidencja kosztu: każde wywołanie OpenAI zapisuje model, tokeny/obrazy i koszt; zamówienie ma sumę kosztu (test).
- [ ] Globalny limit `DAILY_COST_CAP_CENTS` i `MONTHLY_COST_CAP_CENTS`: po przekroczeniu nowe podglądy zwracają 503 z komunikatem, a opłacone zamówienia nadal są kończone (test).
- [ ] **Zmierzony koszt na książkę:** ≥ 2 prawdziwe generacje na wariant (8/15/30) w trybie testowym, wynik w `docs/costs.md` (koszt podglądu, koszt pełnej książki, marża przy obecnych cenach).

## 2. Zakup w trybie testowym

- [ ] Pełny przebieg na środowisku hostowanym z kluczami testowymi Stripe: zdjęcie → podgląd → Checkout → webhook (publiczny URL) → generowanie → PDF → e-mail Resend na adres testowy właściciela → pobranie. Raport ze zrzutami w PR.
- [ ] Parametr `checkout=success` bez webhooka nie odblokowuje pliku (istniejący test + sprawdzenie na hostingu).
- [ ] Niezgodna kwota/waluta w webhooku odrzucona (istniejące testy zielone).

## 3. Bezpieczeństwo treści dla dzieci

- [ ] Moderacja zdjęcia wejściowego, danych formularza, tekstu historii i **każdej wygenerowanej ilustracji** (`omni-moderation-latest`). Odrzucona ilustracja → ponowienie, potem błąd bez pokazania obrazu (test z atrapą).
- [ ] Reguły w promptach: brak przemocy, treści seksualnych, strachu nieodpowiedniego do wieku, marek i postaci chronionych prawem. Zestaw ≥ 20 przypadków testowych (dedykacje, imiona, światy) w `tests/fixtures/safety/` sprawdzany offline.
- [ ] Kategorie `sexual/minors` i podobne blokują zamówienie natychmiast i nie są ponawiane (test).
- [ ] Zgoda opiekuna/osoby ze zdjęcia na użycie wizerunku wymagana przed wysłaniem zdjęcia do AI (istniejąca + test).

## 4. Prywatność (RODO)

- [ ] Zdjęcie źródłowe usuwane po złożeniu PDF (istniejące) **oraz** po 24 h dla porzuconych/nieudanych zamówień — zadanie Cron Trigger z testem.
- [ ] Retencja ilustracji i PDF: usunięcie po N dniach (N ustala właściciel, domyślnie 30), z testem.
- [ ] Usunięcie danych na żądanie (link w e-mailu lub akcja w `/admin`) usuwa rekordy i obiekty R2 (test).
- [ ] Strony: regulamin, polityka prywatności (w tym przekazanie zdjęcia do OpenAI), informacja o braku gwarancji podobieństwa. Treść zatwierdzona przez właściciela.

## 5. Hosting i operacje

- [ ] Wdrożenie na koncie Cloudflare właściciela (`2791466c5820cfd886aad95e0d3ef948`) lub świadoma decyzja właściciela o koncie `130aa5101f2a9a9e790f166b0f54abae`, zapisana w `CLOUDFLARE.md`.
- [ ] Publiczny adres aplikacji i webhooka Stripe; `/admin*` i `/api/admin/*` za Cloudflare Access z MFA (curl bez Access → 302/403).
- [ ] `SALES_ENABLED=true` dopiero po odhaczeniu sekcji 1–4.
- [ ] Backup D1 (eksport) i procedura odtworzenia sprawdzona na kopii.

## 6. Jakość

- [ ] `npm test` 100% zielone, `npx tsc --noEmit` OK, `npm run lint` bez błędów.
- [ ] CI GitHub Actions (`.github/workflows/ci.yml`): install, lint, typecheck, test na PR i `main`, zielone.
- [ ] **Test E2E** (atrapy OpenAI/Stripe/Resend): zdjęcie → podgląd (≤ 2 obrazy) → checkout → webhook → pełne generowanie → PDF z właściwą liczbą stron → e-mail z załącznikiem, uruchamiany w CI.
- [ ] Otwarte punkty z `CHECKLIST.md` (spójny kontur dymka, typografia HTML/PDF, test na telefonie) zamknięte albo świadomie odłożone przez właściciela.
