# Czytaki — zdjęcie staje się opowieścią

Personalizowane komiksy, historie i bajki PDF z dzieckiem, dorosłym lub zwierzęciem ze zdjęcia. Własny interfejs i treści; inspiracja modelem produktu EasyRead, bez kopiowania jego materiałów.

## Główny proces

1. Dorosły przesyła zdjęcie i potwierdza uprawnienie do użycia wizerunku.
2. Wybiera bohatera, format, świat, styl ilustracji, grupę wiekową i dedykację.
3. OpenAI tworzy sześć scen i ilustracje z oryginalnym zdjęciem jako referencją. Kolejne obrazy otrzymują również pierwszą ilustrację dla spójności. Podobieństwo nie jest gwarantowane.
4. Serwer składa osiem stron PDF: okładka, sześć scen, dedykacja. Pokazuje tylko pierwszy fragment.
5. Stripe Checkout pobiera ustaloną po stronie serwera cenę.
6. Po potwierdzeniu płatności przez Stripe plik trafia jako załącznik przez Resend. Możliwe jest też pobranie w przeglądarce zamówienia.

Komiks używa dwukadrowych ilustracji i podpisów pod nimi; nie generuje tekstu wewnątrz dymków. Dawna czytelnia została zachowana osobno pod /czytelnia.

## Stan integracji

Pełny przebieg jest zaimplementowany: aplikacja generuje PDF przed płatnością, zapisuje go prywatnie, tworzy powiązaną z zamówieniem sesję Stripe Checkout, weryfikuje płatność przez podpisany webhook i wysyła kupiony plik jako załącznik przez Resend. Przycisk powrotu ze Stripe ponawia sprawdzenie dostawy, ale sam adres URL nie odblokowuje pliku.

Lokalna konfiguracja może korzystać z kluczy OpenAI, Stripe i Resend zapisanych w ignorowanym przez Git pliku `.env.local`. W środowisku lokalnym płatność jest potwierdzana po bezpiecznym powrocie z Stripe Checkout; na produkcji wymagany jest podpisany webhook Stripe. Przed sprzedażą należy wykonać pełny przebieg w trybie testowym.

Kupujący wybiera rzeczywistą długość książeczki: 8 stron za 29 zł (regularnie 59 zł), 15 stron za 39 zł (regularnie 99 zł) albo 30 stron za 65 zł (regularnie 169 zł). Generator, liczba ilustracji, skład PDF, podgląd postępu i Stripe korzystają z wybranego wariantu. Cała książka powstaje przed płatnością, więc także niezakończone zakupy generują koszty AI.

## Uruchomienie lokalne

Repozytorium działa samodzielnie na komputerze i przechowuje lokalne zamówienia, obrazy oraz PDF-y w ignorowanym katalogu `.wrangler/`. Wymagany jest Node >=22.13.

1. `npm ci` - tylko przy pierwszym uruchomieniu lub po zmianie zależności.
2. Skopiuj `.env.example` do `.env.local` i ustaw `OPENAI_API_KEY`. Plik jest ignorowany przez Git.
3. `npm run local` - buduje aplikację, przygotowuje lokalną bazę i uruchamia ją pod `http://127.0.0.1:8787`.

Kolejne uruchomienia korzystają z tej samej lokalnej bazy i magazynu plików. Zatrzymanie aplikacji: `Ctrl+C`. `npm run local:setup` tylko przygotowuje build i bazę, bez uruchamiania serwera. Po dodaniu testowych danych Stripe i Resend można ustawić `SALES_ENABLED=true`; lokalnie potwierdzenie następuje po powrocie z Checkout. Limit generowania jest wyłączony.

## Konfiguracja hostowana

Sekrety wyłącznie po stronie serwera. Szablon: `.env.example`; nigdy nie commitować prawdziwych kluczy.

W hostingu skonfiguruj:
- OPENAI_API_KEY; opcjonalnie OPENAI_TEXT_MODEL i OPENAI_IMAGE_MODEL.
- STRIPE_SECRET_KEY oraz STRIPE_WEBHOOK_SECRET.
- RESEND_API_KEY i EMAIL_FROM z zatwierdzonej domeny nadawczej.
- APP_URL z dokładnym adresem aplikacji, PRICE_CENTS=2900 i REGULAR_PRICE_CENTS=5900.
- SALES_ENABLED=true dopiero po testach integracyjnych i uruchomieniu obowiązujących zasad sprzedaży/prywatności.
- ADMIN_PASSWORD — obowiązkowe hasło o długości minimum 20 znaków do panelu `/admin`, zarówno lokalnie, jak i na produkcji. Sesja administratora jest podpisana, HttpOnly, SameSite=Strict i wygasa po 2 godzinach; po pięciu błędnych próbach logowanie jest blokowane na 15 minut.

Zacznij od Stripe w trybie testowym. Webhook: /api/payments/webhook; zdarzenia checkout.session.completed i checkout.session.async_payment_succeeded. Weryfikowany jest podpis, czas, identyfikator sesji, zamówienie, status, waluta i pełna kwota. Parametr checkout=success nie odblokowuje pliku. Nie używaj osobnego Stripe Payment Link: aplikacja sama tworzy sesję Checkout z identyfikatorem właściwego zamówienia.

Waluta jest dobierana po kraju rozpoznanym przez Cloudflare, z językiem przeglądarki jako zapasowym sygnałem. Ceny 8/15/30 stron to: Polska 29/39/65 PLN, USA 7,99/9,99/16,99 USD, Szwecja 79/99/169 SEK, Norwegia 69/99/159 NOK, Dania 49/69/109 DKK oraz Finlandia 6,99/8,99/14,99 EUR. Cena, wariant i waluta zostają zapisane w zamówieniu, a Stripe musi potwierdzić dokładnie tę samą kwotę.

Aktualny Site jest prywatny. Webhook Stripe wymaga osiągalnego adresu bez logowania do Sites; przed sprzedażą trzeba uzgodnić publiczny dostęp lub osobny endpoint. Nie zmieniono odbiorców wdrożenia automatycznie.

Dane zamówień i pełne historie: D1 DB; ilustracje i PDF: prywatny R2 BUCKET. Panel obsługi pod `/admin` pozwala wyszukiwać po numerze zamówienia, e-mailu, bohaterze, tytule lub identyfikatorze Stripe, sprawdzać treść historii i statusy oraz otwierać PDF. Stripe otrzymuje wewnętrzny identyfikator zamówienia w `client_reference_id` i metadanych, ale nie jest magazynem historii ani plików. Migracje z katalogu `drizzle/` są pakowane przez Sites. Lokalnie po build można zastosować schemat przez Wrangler `d1 execute DB --local` z konfiguracją `dist/server/wrangler.json` i `persist-to .wrangler/state`.

Na produkcji panel musi być dodatkowo osłonięty przez Cloudflare Access dla ścieżek `/admin*` oraz `/api/admin/*`, z logowaniem przez zatwierdzone konto i MFA. Hasło aplikacyjne pozostaje drugą, niezależną warstwą. Nie wystawiaj panelu publicznie wyłącznie z jednym formularzem hasła.

## Prywatność i ograniczenia

Przeglądarka zmniejsza zdjęcie i ponownie koduje je do JPEG bez metadanych. Serwer sprawdza typ i rozmiar. Zdjęcie jest wysyłane do OpenAI dopiero przy generowaniu. Moderowane są dane wejściowe i tekst opowieści. Klucze nie trafiają do klienta.

Dostęp do zamówienia wymaga losowej sesji w ciasteczku HttpOnly; w bazie zapisany jest jej hash. To nie konto użytkownika: usunięcie ciasteczka oznacza utratę dostępu w przeglądarce. Płatny PDF nadal jest wysyłany na podany e-mail.

Zdjęcie źródłowe jest usuwane po udanym złożeniu PDF. Brak automatycznego sprzątania porzuconych i nieudanych zamówień oraz ich zdjęć — przed publiczną premierą konieczna polityka retencji i zadanie usuwające. Ilustracje i pliki pozostają w prywatnym magazynie. Panel administratora nie zastępuje kopii zapasowych D1/R2; nie wdrożono jeszcze zwrotów ani kolejki automatycznych ponowień.

Generowanie jest etapowe i wznawialne z tej samej przeglądarki. Obowiązują dzienne limity na sesję i hash IP; nie zastępują pełnej ochrony przed nadużyciami. Wysyłka ma idempotencję i blokadę współbieżności. Niejednoznaczny wynik starszy niż 23 godziny wymaga ręcznej kontroli zamiast ryzyka duplikatu.

## Weryfikacja

- npm test: poprawność płatności i podpisów, walidacja danych, ośmiostronicowy PDF z polską czcionką.
- npx tsc --noEmit: kontrola typów.
- npm run build: wersja produkcyjna.
- Sprawdzono odpowiedzi API bez konfiguracji: brak zgody origin → 403, brak klucza AI → 503, obce zamówienie → 404.
- Przykładowy PDF wyrenderowano i sprawdzono wizualnie; to test składu, nie dowód działania personalizacji AI.

## Zwierzęta — ten sam produkt

Tryb „Pupil” jest częścią kreatora: zdjęcie psa, kota lub innego zwierzęcia staje się referencją bohatera. Dalsze pomysły: komiks o adopcji, album pierwszego roku z pupilem i pamiątkowa bajka prezentowa. To produkty kreatywne, nie diagnozowanie zdrowia ani „tłumaczenie” zwierząt.

## Główne moduły

app/studio.tsx — kreator; app/studio.css — wygląd; lib/server/ai.ts — generowanie; lib/server/pdf.ts — skład; lib/server/payments.ts — płatność i wysyłka; app/api — chronione endpointy; db/schema.ts — baza.
