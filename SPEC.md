# SPEC — Czytaki MVP

Status: obowiązujący zakres od 2026-10-30.

## Cel MVP

**Sprzedawalny** spersonalizowany komiks, historia lub bajka w PDF ze zdjęcia: klient płaci prawdziwe pieniądze, dostaje plik e-mailem, a koszt AI każdej książeczki jest znany i kontrolowany. Mierzalne kryteria: [`docs/mvp-dod.md`](docs/mvp-dod.md).

## Stan wyjściowy (2026-10-30)

Zaimplementowane: kreator ze zdjęciem, generowanie tekstu i ilustracji (OpenAI), moderacja danych wejściowych i tekstu, warianty 8/15/30 stron, waluty per kraj, skład PDF z polską czcionką, edytor komiksu, Stripe Checkout z podpisanym webhookiem, wysyłka przez Resend z idempotencją, panel `/admin`, dzienne limity per sesja i IP, usuwanie zdjęcia po złożeniu PDF. 82 testy offline.

Braki blokujące sprzedaż:

1. **Cała książka powstaje przed płatnością** — każde porzucone zamówienie kosztuje pełne generowanie.
2. Brak globalnego limitu kosztów i pomiaru kosztu na książkę.
3. Brak pełnego testu zakupu w trybie testowym Stripe na środowisku hostowanym i publicznego adresu webhooka (obecny Site jest prywatny).
4. Brak retencji i usuwania zdjęć porzuconych zamówień (RODO), brak regulaminu i polityki prywatności.
5. Moderacja ilustracji wyjściowych i reguły bezpieczeństwa treści dla dzieci niezweryfikowane testami.
6. Brak testu E2E i CI; 1 test i lint czerwone.
7. Hosting: `cloudflare.production.json` wskazuje konto Cloudflare `130aa5101f2a9a9e790f166b0f54abae`, inne niż konto właściciela `2791466c5820cfd886aad95e0d3ef948`. Kod zawiera też zależności od hostingu ChatGPT Sites (`app/chatgpt-auth.ts`, `scripts/sites-env.mjs`).

## Zakres (in scope)

- **Preview-first:** przed płatnością powstaje tylko historia (tekst), okładka i 1 scena jako podgląd ze znakiem wodnym. Pozostałe ilustracje i PDF powstają po potwierdzeniu płatności przez webhook, z wznawialnym pipeline i wysyłką po zakończeniu.
- Globalny dzienny i miesięczny limit kosztów AI (oprócz istniejących limitów per sesja/IP) oraz ewidencja kosztu każdego wywołania i każdej książki.
- Bezpieczeństwo treści dla dzieci: moderacja zdjęcia, danych, tekstu i wygenerowanych ilustracji; zablokowane kategorie; test na zestawie przypadków.
- RODO: usuwanie zdjęcia źródłowego po zakończeniu lub po 24 h od porzucenia, retencja ilustracji i PDF, usunięcie na żądanie, regulamin, polityka prywatności, zgoda na wizerunek.
- Pełny test zakupu w trybie testowym Stripe i Resend na środowisku hostowanym; procedura zwrotu ręcznego przy błędzie generowania po płatności.
- Hosting na koncie Cloudflare właściciela, publiczny webhook, `/admin*` za Cloudflare Access.
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
- Model obrazów i tekstu bez zmian, dopóki pomiar kosztu nie wskaże potrzeby zmiany.
