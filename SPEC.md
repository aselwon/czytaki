# SPEC — Czytaki MVP

Status: obowiązujący zakres od 2026-10-30.

## Cel MVP

**Sprzedawalny** spersonalizowany komiks, historia lub bajka w PDF ze zdjęcia: klient płaci prawdziwe pieniądze, dostaje plik e-mailem, a koszt AI każdej książeczki jest znany i kontrolowany. **Płatne AI (OpenAI) działa wyłącznie po opłaceniu zamówienia.** Mierzalne kryteria: [`docs/mvp-dod.md`](docs/mvp-dod.md).

## Stan wyjściowy (2026-10-30)

Zaimplementowane: kreator ze zdjęciem, generowanie tekstu i ilustracji (OpenAI), moderacja danych wejściowych i tekstu, warianty 8/15/30 stron, waluty per kraj, skład PDF z polską czcionką, edytor komiksu, Stripe Checkout z podpisanym webhookiem, wysyłka przez Resend z idempotencją, panel `/admin`, dzienne limity per sesja i IP, usuwanie zdjęcia po złożeniu PDF. 82 testy offline.

Braki blokujące sprzedaż:

1. **Cała książka powstaje przed płatnością** — każde porzucone zamówienie kosztuje pełne generowanie.
2. Brak blokady OpenAI dla nieopłaconych zamówień, dziennego limitu bezpieczeństwa wydatków OpenAI i pomiaru kosztu na książkę.
3. Brak pełnego testu zakupu w trybie testowym Stripe na środowisku hostowanym i publicznego adresu webhooka (obecny Site jest prywatny).
4. Brak retencji i usuwania zdjęć porzuconych zamówień (RODO), brak regulaminu i polityki prywatności.
5. Moderacja ilustracji wyjściowych i reguły bezpieczeństwa treści dla dzieci niezweryfikowane testami.
6. Brak testu E2E i CI; 1 test i lint czerwone.
7. Hosting w stanie wyjściowym korzystał z poprzedniego konta Cloudflare. **Decyzja: przenosimy na konto właściciela `2791466c5820cfd886aad95e0d3ef948`** (nowe D1 i R2).

## Zakres (in scope)

- **Płatność przed AI:** OpenAI (tekst, obrazy, moderacja) jest wywoływane **wyłącznie po opłaceniu zamówienia** potwierdzonym zweryfikowanym webhookiem Stripe. Przed płatnością podgląd **nie używa płatnego AI**: domyślnie statyczny przykład z szablonu (gotowe ilustracje z repo + imię i dedykacja klienta), opcjonalnie niskiej jakości podgląd z darmowego Cloudflare Workers AI. Podgląd jest wyraźnie oznaczony jako przykładowy („ilustracje powstaną po płatności”).
- Po płatności: wznawialny pipeline generuje tekst, ilustracje i PDF, a potem wysyła e-mail.
- Globalny limit: generowanie tylko dla opłaconych zamówień oraz **dzienny limit bezpieczeństwa wydatków OpenAI: 20 zł/dobę** (`OPENAI_DAILY_COST_CAP_GROSZE=2000`, doba wg Europe/Warsaw). OpenAI rozlicza w USD, więc koszt każdego wywołania jest liczony w USD z cennika i przeliczany na grosze stałym, konserwatywnym kursem `OPENAI_USD_PLN_RATE` (domyślnie 4.00, celowo powyżej rynkowego). Po jego osiągnięciu opłacone zamówienia czekają w kolejce do następnej doby, a właściciel dostaje alert. Ewidencja kosztu każdego wywołania i każdej książki.
- Bezpieczeństwo treści dla dzieci: moderacja zdjęcia, danych, tekstu i wygenerowanych ilustracji; zablokowane kategorie; test na zestawie przypadków.
- RODO: usuwanie zdjęcia źródłowego po złożeniu PDF, a najpóźniej **automatycznie po 7 dniach** od przesłania (także dla porzuconych zamówień), retencja ilustracji i PDF, usunięcie na żądanie, regulamin, polityka prywatności, zgoda na wizerunek.
- Pełny test zakupu w trybie testowym Stripe i Resend na środowisku hostowanym; procedura zwrotu ręcznego przy błędzie generowania po płatności.
- Hosting na koncie Cloudflare właściciela `2791466c5820cfd886aad95e0d3ef948` (nowe D1 i R2, migracje od zera), publiczny webhook, `/admin*` za Cloudflare Access.
- CI: install, lint, typecheck, testy, E2E z atrapami.
- Polski rynek jako pierwszy (PLN); pozostałe waluty mogą zostać, ale nie są wymagane w DoD.

## Poza zakresem (out of scope)

- Druk i wysyłka fizycznych książek.
- Konta klientów, logowanie klienta, historia zamówień poza sesją i e-mailem.
- Nowe formaty i produkty (album pupila, komiks o adopcji), dawna `/czytelnia`.
- Gwarancja podobieństwa do zdjęcia; ręczna korekta ilustracji przez zespół.
- Automatyczne zwroty Stripe (w MVP zwrot ręczny przez właściciela).
- Marketing, SEO, programy partnerskie, A/B testy cen.
- Aplikacja mobilna.

## Założenia

- Dane i zdjęcia w repo/testach wyłącznie syntetyczne.
- Ceny pozostają jak w README (29/39/65 zł) do czasu pomiaru kosztu na książkę; po pomiarze właściciel potwierdza marżę.
- Model obrazów i tekstu (OpenAI) bez zmian, dopóki pomiar kosztu nie wskaże potrzeby zmiany; wywoływany tylko po płatności.
- Agenci kodujący pracują wyłącznie w ramach subskrypcji ChatGPT (Codex), bez płatnych API.
- Darmowy przydział Workers AI (10 000 neuronów/dobę) jest wspólny dla całego konta, także z HireOS. Opcjonalny podgląd z Workers AI wymaga podziału limitu przez właściciela.

## Aktualizacja CZ-19 (2026-11-01)

Domyślnym modelem obrazów jest `gpt-image-2`. Kontrakt, źródła stawek,
warunkowy szacunek dla 8/15/30 stron i procedura pomiaru właściciela:
[nota migracyjna](docs/image-model-migration.md). Pomiar rzeczywistych kosztów
pozostaje niewykonany. W tej gałęzi brakuje implementacji limitu CZ-05;
wdrożenie wymaga jej dostarczenia i weryfikacji. Ceny sprzedaży bez zmian.
