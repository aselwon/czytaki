# Czytaki MVP — Definition of Done

MVP jest gotowe, gdy **wszystkie** punkty są odhaczone i każdy ma dowód (PR, wynik testu, log, zrzut lub raport kosztów). Zakres: [`SPEC.md`](../SPEC.md).

## 1. Kontrola kosztów (blokujące)

- [ ] **Płatność przed AI:** bramka OpenAI w `lib/server/ai.ts` odrzuca każde wywołanie bez zamówienia w stanie `paid` ustawionym przez zweryfikowany webhook Stripe (`checkout.session.completed`, poprawna kwota i waluta). Test: cały przebieg przed płatnością (zdjęcie → podgląd → Checkout) przy zablokowanym `fetch` do `api.openai.com` kończy się sukcesem i wykonuje **0 wywołań OpenAI** dla 8/15/30 stron.
- [ ] **Podgląd bez płatnego AI:** domyślnie statyczny przykład z szablonu (gotowe ilustracje z repo dla formatu/świata/stylu + imię i dedykacja klienta). Podgląd jest oznaczony widocznym napisem „Przykładowy podgląd — ilustracje z Twoim zdjęciem powstaną po płatności” (test renderu). Opcjonalny podgląd z darmowego Workers AI (CZ-18) jest wyłączony domyślnie.
- [ ] Po webhooku pipeline generuje tekst, wszystkie ilustracje i PDF, wznawia się po błędzie i wysyła e-mail dopiero po kompletnym PDF (testy z atrapami: sukces, błąd w połowie + wznowienie, podwójny webhook bez duplikatu).
- [ ] Błąd generowania lub odrzucenie przez moderację po płatności → status `needs_refund` widoczny w `/admin` i alert e-mail do właściciela (test).
- [ ] Ewidencja kosztu: każde wywołanie OpenAI zapisuje zamówienie, model, tokeny/obrazy i koszt; zamówienie ma sumę kosztu (test).
- [ ] **Dzienny limit bezpieczeństwa 5 zł** (`OPENAI_DAILY_COST_CAP_GROSZE=500`, doba wg Europe/Warsaw), dotyczy wyłącznie opłaconych zamówień. Koszt wywołania liczony w USD z cennika modeli (`ai_calls.cost_usd_micros`) i przeliczany na grosze kursem `OPENAI_USD_PLN_RATE` (domyślnie 4.00, zaokrąglenie w górę). Brak lub niepoprawna konfiguracja limitu = generowanie zablokowane (fail closed). Limit liczony z ewidencji z rezerwacją kosztu przed wywołaniem (atomowo). Po osiągnięciu nowe wywołania nie są wysyłane, opłacone zamówienia przechodzą w `waiting_capacity` i wznawiają się po resecie doby; alert e-mail do właściciela (`OWNER_ALERT_EMAIL`) przy 80% i 100% (testy, w tym równoległe żądania). Zamówienie, którego pojedyncze wywołanie nie mieści się w pozostałym limicie, czeka do następnej doby; książka może powstawać przez kilka dób (np. 30 stron).
- [ ] **Zmierzony koszt na książkę:** ≥ 2 prawdziwe generacje na wariant (8/15/30) po testowej płatności, wynik w `docs/costs.md` (koszt podglądu = 0 zł płatnego AI, koszt pełnej książki, marża przy obecnych cenach).

## 2. Zakup w trybie testowym

- [ ] Pełny przebieg na środowisku hostowanym z kluczami testowymi Stripe: zdjęcie → podgląd → Checkout → webhook (publiczny URL) → generowanie → PDF → e-mail Resend na adres testowy właściciela → pobranie. Raport ze zrzutami w PR.
- [ ] Parametr `checkout=success` bez webhooka nie odblokowuje pliku (istniejący test + sprawdzenie na hostingu).
- [ ] Niezgodna kwota/waluta w webhooku odrzucona (istniejące testy zielone).

## 3. Bezpieczeństwo treści dla dzieci

- [ ] Przed płatnością (bez OpenAI): lokalna walidacja danych formularza (lista blokowanych słów i wzorców, limity długości) oraz typu i rozmiaru zdjęcia (testy).
- [ ] Po płatności: moderacja zdjęcia, danych, tekstu historii i **każdej wygenerowanej ilustracji** (`omni-moderation-latest`). Odrzucona ilustracja → ponowienie, potem błąd bez pokazania obrazu; odrzucone zdjęcie lub dane → `needs_refund` (testy z atrapą).
- [ ] Reguły w promptach: brak przemocy, treści seksualnych, strachu nieodpowiedniego do wieku, marek i postaci chronionych prawem. Zestaw ≥ 20 przypadków testowych (dedykacje, imiona, światy) w `tests/fixtures/safety/` sprawdzany offline.
- [ ] Kategorie `sexual/minors` i podobne blokują zamówienie natychmiast i nie są ponawiane (test).
- [ ] Zgoda opiekuna/osoby ze zdjęcia na użycie wizerunku wymagana przed wysłaniem zdjęcia do AI (istniejąca + test).

## 4. Prywatność (RODO)

- [ ] Zdjęcie źródłowe usuwane po złożeniu PDF (istniejące) **oraz automatycznie po 7 dniach** od przesłania dla każdego zamówienia (porzucone, nieudane, oczekujące) — zadanie Cron Trigger z testem. Okres 7 dni podany w polityce prywatności.
- [ ] Retencja ilustracji i PDF: usunięcie po N dniach (N ustala właściciel, domyślnie 30), z testem.
- [ ] Usunięcie danych na żądanie (link w e-mailu lub akcja w `/admin`) usuwa rekordy i obiekty R2 (test).
- [ ] Strony: regulamin, polityka prywatności (w tym przekazanie zdjęcia do OpenAI dopiero po płatności i usunięcie zdjęcia po maks. 7 dniach), informacja o braku gwarancji podobieństwa. Treść zatwierdzona przez właściciela.

## 5. Hosting i operacje

- [ ] Wdrożenie na koncie Cloudflare właściciela `2791466c5820cfd886aad95e0d3ef948` z nowymi D1 i R2; `cloudflare.production.json` nie wskazuje już konta `130aa5101f2a9a9e790f166b0f54abae`.
- [ ] Brak zależności od ChatGPT Sites: `app/chatgpt-auth.ts` i `scripts/sites-env.mjs` usunięte, build i testy zielone (grep w CI).
- [ ] Publiczny adres aplikacji i webhooka Stripe; `/admin*` i `/api/admin/*` za Cloudflare Access z MFA (curl bez Access → 302/403).
- [ ] `SALES_ENABLED=true` dopiero po odhaczeniu sekcji 1–4.
- [ ] Backup D1 (eksport) i procedura odtworzenia sprawdzona na kopii.

## 6. Jakość

- [ ] `npm test` 100% zielone, `npx tsc --noEmit` OK, `npm run lint` bez błędów.
- [ ] CI GitHub Actions (`.github/workflows/ci.yml`): install, lint, typecheck, test na PR i `main`, zielone.
- [ ] **Test E2E** (atrapy OpenAI/Stripe/Resend): zdjęcie → podgląd (0 wywołań OpenAI) → checkout → webhook → pełne generowanie → PDF z właściwą liczbą stron → e-mail z załącznikiem, uruchamiany w CI.
- [ ] Otwarte punkty z `CHECKLIST.md` (spójny kontur dymka, typografia HTML/PDF, test na telefonie) zamknięte albo świadomie odłożone przez właściciela.
