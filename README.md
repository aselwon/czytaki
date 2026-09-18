# Czytaki

Polskojęzyczna aplikacja do wspólnego czytania dla dzieci około 5–10 lat. Oryginalny interfejs i treści inspirowane koncepcją personalizowanych historii [EasyRead](https://pulsebook.io/easyread). Kod, teksty, identyfikacja i ilustracja powstały dla tego projektu; nie skopiowano materiałów źródłowej strony.

## Co działa

- Kreator z imieniem bohatera i towarzysza, wyborem jednej z trzech przygód i poziomu czytania.
- Trzy autorskie opowieści po sześć rozdziałów, każda w trzech poziomach językowych i z dwiema ścieżkami.
- Zmiana trudności podczas czytania, wielkie litery, większy tekst i systemowy lektor po polsku.
- Pytania sprawdzające zrozumienie, cztery odznaki i zapamiętywanie miejsca w historii.
- Biblioteczka na urządzeniu, filtrowanie, eksport i import kopii JSON z walidacją.
- Widok do druku / zapisu jako PDF przez systemowy dialog drukowania.
- „Łapka i spółka”: opowieść z imieniem psa i trzy odwracalne misje wykonywane z dorosłym.
- Responsywny interfejs, obsługa klawiatury, dialogi z kontrolą fokusu i ograniczenie animacji.
- WebMCP: `list_reading_library` oraz `create_personalized_story`, działające na tym samym stanie co interfejs.

## Uczciwy zakres wersji

To działające MVP personalizacji **gotowych fabuł**, nie aktywny generator nowych treści AI. Jedna oryginalna ilustracja została wygenerowana z pomocą AI; aplikacja jasno informuje, że jest wspólna dla wszystkich opowieści. Nie ma przesyłania zdjęć, generowania podobizny dziecka, płatności ani synchronizacji kont. Imiona i postępy przechowywane są w `localStorage` tej przeglądarki. Hosting jest prywatny na poziomie Sites; „strefa rodzica” to widok ustawień, nie osobna kontrola dostępu. Głosy i wymowa lektora zależą od systemu i dostępnego polskiego głosu. Google Fonts jest zewnętrznym dostawcą fontów.

## Uruchomienie

Wymagany Node.js >=22.13.0.

```sh
npm ci
npm run dev
```

Serwer podaje adres lokalny w terminalu. Kontrola typów: `npx tsc --noEmit`. Wersja produkcyjna: `npm run build`. Podgląd zbudowanego Workera: `npm start`.

Stos: React 19, TypeScript, Vinext/Vite, Tailwind 4, Radix/Shadcn, Lucide. Docelowe środowisko: Cloudflare Workers przez Sites. Nie są wymagane klucze API ani baza danych.

## Najważniejsze pliki

- `app/page.tsx` — strona główna i nawigacja.
- `app/experience.tsx` — kreator, czytnik, biblioteczka, misje, ustawienia i WebMCP.
- `lib/stories.ts` — fabuły, poziomy tekstu, ścieżki i walidacja kopii.
- `app/globals.css` — wygląd, responsywność i wydruk.
- `public/forest.png` — oryginalna ilustracja projektu.
- `.openai/hosting.json` — powiązanie z prywatnym Site i repozytorium źródłowym.

## Następny etap AI

1. Dodać serwerowy adapter generowania fabuły: profil czytelnika, preferowany świat i zaplanowany schemat sześciu rozdziałów. Klucze wyłącznie w sekretach serwera.
2. Walidować strukturę, długość i poziom tekstu; kontrolować treści przed udostępnieniem dziecku. Zachować bibliotekę jako jawny tryb awaryjny.
3. Dodać ilustracje dla poszczególnych scen ze spójnymi bohaterami. Opcjonalny wizerunek dziecka wymaga osobnego przepływu zgody rodzica i zasad usuwania zdjęć.
4. Dodać kontrolowany zapis na koncie rodzica i eksport składanego komiksu, zamiast jedynie systemowego wydruku.

## Kierunek dla zwierząt: Łapka AI

Najbardziej spójny produkt to **pupil jako bohater opowieści, a dziecko jako jego uważny opiekun**. Rodzic podaje imię, gatunek, wiek i codzienne zwyczaje pupila. AI tworzy krótką historię dopasowaną do poziomu czytania, a po niej proponuje jedną prostą misję do wykonania z dorosłym. W przyszłości zdjęcie pupila może posłużyć do spójnych ilustracji, a historia dnia do rodzinnej książeczki pamiątkowej.

Pierwszy płatny pakiet mógłby obejmować spersonalizowaną książeczkę i tygodniowe przygody. Warto najpierw sprawdzić, czy rodziny wracają do wspólnego czytania i wykonują misje; dopiero potem budować abonament. To hipoteza produktu, nie potwierdzona analiza rynku.

Dodatkowy dziennik obserwacji może porządkować wpisy dorosłego i przygotowywać podsumowanie do rozmowy z weterynarzem. Nie powinien udawać diagnozy, wiarygodnego „tłumacza szczekania” ani zastępować opieki specjalisty. W aktualnym MVP działa opowieść i lista misji; generowanie oraz dziennik pozostają kolejnym etapem.
