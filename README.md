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

Kod integracji jest zaimplementowany. Obecne wdrożenie nie ma kluczy usług, dlatego generowanie i zakup są jawnie wyłączone. Nie wykonano prawdziwego przebiegu OpenAI → Stripe → Resend. Ilustracja widoczna przed generowaniem jest oznaczonym przykładem, nie wynikiem personalizacji.

Cena 39 zł jest propozycją demonstracyjną; nie potwierdzono kosztów i marży. Cała książka powstaje przed płatnością, więc także niezakończone zakupy generują koszty AI.

## Konfiguracja

Node >=22.13, npm ci, npm run dev. Sekrety wyłącznie po stronie serwera. Szablon: .env.example; nigdy nie commitować prawdziwych kluczy.

W hostingu skonfiguruj:
- OPENAI_API_KEY; opcjonalnie OPENAI_TEXT_MODEL i OPENAI_IMAGE_MODEL.
- STRIPE_SECRET_KEY oraz STRIPE_WEBHOOK_SECRET.
- RESEND_API_KEY i EMAIL_FROM z zatwierdzonej domeny nadawczej.
- APP_URL z dokładnym adresem aplikacji, PRICE_CENTS w groszach.
- SALES_ENABLED=true dopiero po testach integracyjnych i uruchomieniu obowiązujących zasad sprzedaży/prywatności.

Zacznij od Stripe w trybie testowym. Webhook: /api/payments/webhook; zdarzenia checkout.session.completed i checkout.session.async_payment_succeeded. Weryfikowany jest podpis, czas, identyfikator sesji, zamówienie, status, waluta i pełna kwota. Parametr checkout=success nie odblokowuje pliku.

Aktualny Site jest prywatny. Webhook Stripe wymaga osiągalnego adresu bez logowania do Sites; przed sprzedażą trzeba uzgodnić publiczny dostęp lub osobny endpoint. Nie zmieniono odbiorców wdrożenia automatycznie.

Dane zamówień: D1 DB; zdjęcia i PDF: prywatny R2 BUCKET. Migracja: drizzle/0000_tired_lifeguard.sql, pakowana przez Sites. Lokalnie po build można zastosować ją przez Wrangler d1 execute DB --local z konfiguracją dist/server/wrangler.json i persist-to .wrangler/state.

## Prywatność i ograniczenia

Przeglądarka zmniejsza zdjęcie i ponownie koduje je do JPEG bez metadanych. Serwer sprawdza typ i rozmiar. Zdjęcie jest wysyłane do OpenAI dopiero przy generowaniu. Moderowane są dane wejściowe i tekst opowieści. Klucze nie trafiają do klienta.

Dostęp do zamówienia wymaga losowej sesji w ciasteczku HttpOnly; w bazie zapisany jest jej hash. To nie konto użytkownika: usunięcie ciasteczka oznacza utratę dostępu w przeglądarce. Płatny PDF nadal jest wysyłany na podany e-mail.

Zdjęcie źródłowe jest usuwane po udanym złożeniu PDF. Brak automatycznego sprzątania porzuconych i nieudanych zamówień oraz ich zdjęć — przed publiczną premierą konieczna polityka retencji i zadanie usuwające. Ilustracje i pliki pozostają w prywatnym magazynie. Nie wdrożono panelu administratora, zwrotów ani kolejki automatycznych ponowień.

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
