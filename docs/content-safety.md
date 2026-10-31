# Bezpieczeństwo treści dla dzieci — CZ-08

## Przed płatnością

`POST /api/orders` sprawdza lokalnie imię, dedykację i opis bohatera, przed
zapisem zdjęcia i zamówienia. Filtr normalizuje wielkość liter, polskie znaki,
warianty Unicode i niewidoczne znaki formatujące. Blokuje słowa i wzorce dotyczące
seksualizacji, drastycznej przemocy, samookaleczenia, nazizmu i wulgaryzmów.
Nie wywołuje OpenAI ani innych usług sieciowych. Odmowa zwraca HTTP 422.

Zdjęcie musi mieć od 100 bajtów do 8 MiB, MIME `image/jpeg` lub `image/png`
i zgodną sygnaturę bajtową. To walidacja typu i rozmiaru, nie pełne dekodowanie
ani ocena treści zdjęcia. Błędny plik zwraca HTTP 400.

Lista lokalna jest konserwatywna: może blokować niewinne konteksty i nie wykryje
każdej parafrazy, literówki czy obcego alfabetu. Nie gwarantuje bezpieczeństwa
materiału. Nie zastępuje moderacji modelowej.

## Moderacja w pipeline AI

`generateBook` sprawdza zdjęcie, imię, opis i dedykację przed wygenerowaniem
tekstu, a następnie sprawdza gotowy tekst. `planLegacyComic` sprawdza nowe dialogi.
`generateIllustration` sprawdza każdą nową ilustrację przez
`omni-moderation-latest`, zanim zwróci jej bajty wywołującemu. Odrzucony obraz
pozostaje tylko w pamięci: nie trafia do R2, analizy dymków, podglądu ani PDF.

- Każda dodatnia kategoria lub `flagged=true` oznacza odmowę.
- Twarde kategorie: `sexual/minors`, `sexual`, `violence/graphic`, `self-harm`,
  `self-harm/intent`, `self-harm/instructions`, `hate/threatening`,
  `harassment/threatening`. Obowiązują także przy sprzecznym `flagged=false`.
- Twarda blokada kończy próbę natychmiast, bez nowej generacji.
- Inne odrzucenie ilustracji dopuszcza dokładnie jedną nową generację z instrukcją
  spokojnej, bezpiecznej sceny. Ponowne odrzucenie kończy się HTTP 422.
- Brak lub niepoprawny wynik moderacji kończy się HTTP 503 bez udostępnienia obrazu.
  Błędy transportu podlegają istniejącej polityce ponowień połączenia; nie są
  zgodą moderatora ani powodem do ponownej generacji w tej samej próbie.
- Końcowe odrzucenie treści w endpointach generate/remake zapisuje istniejące
  tekstowe pole statusu jako `safety_blocked` i zwalnia blokadę pracy. Kolejne
  żądanie otrzymuje 422 przed AI. Nie ma automatycznego odblokowania ani zwrotu.
  Obsługa płatnego odrzucenia i ewentualny ręczny zwrot należą do właściciela.

Prompty dla historii, adaptacji i obrazów określają poziom napięcia dla wieku
3–5, 6–8 i 9–12 lat; zakazują seksualizacji, krwi, okrucieństwa, horroru,
samookaleczenia i nienawiści. Wymagają bezpiecznego rozwiązania przygody oraz
oryginalnych postaci bez marek, logo i rozpoznawalnych franczyz. Dane klienta
oraz tekst widoczny na zdjęciu są danymi, nigdy instrukcjami.

## Zależności i ograniczenia wdrożenia

Docelowo cała moderacja modelowa działa wyłącznie po płatności potwierdzonej
webhookiem. Baza tej gałęzi nadal pozwala generować przed płatnością i ma
prywatny remake nieopłaconych zamówień. CZ-08 nie realizuje bramki płatności,
limitu kosztów ani przebudowy kolejności zakupu: wymagają integracji CZ-04,
CZ-05 i CZ-06 przed uruchomieniem sprzedaży. Nie należy uznawać testów moderacji
za dowód spełnienia tych zależności.

Istniejące obrazy z cache nie są ponownie moderowane przez tę zmianę. Wznowienie
starszych zamówień wymaga osobnej decyzji migracyjnej przed produkcją. Wynik
modelu nie stanowi gwarancji bezpieczeństwa ani weryfikacji prawnej wizerunku.

## Dowody offline

`tests/fixtures/safety/local.json` zawiera 25 syntetycznych przypadków
odrzucenia i akceptacji. `tests/content-safety.test.mjs` sprawdza lokalną
walidację, endpoint, zdjęcia, prompty, odmowy, ponowienia, błędne odpowiedzi oraz
moderację danych wejściowych. Fetch jest atrapą; testy nie wymagają kluczy.
`tests/generation-resume.test.mjs` sprawdza brak zapisu odrzuconego obrazu,
trwały status i brak AI przy ponowieniu żądania.

Polecenia (Node z PATH harnessu):

```sh
export PATH=/home/harness/.local/bin:$PATH
node --experimental-strip-types --test tests/content-safety.test.mjs tests/generation-resume.test.mjs
npm test && npm run lint
npx tsc --noEmit
```

Skuteczność rzeczywistego modelu i zachowanie na hostowanym środowisku nie są
weryfikowane w sandboxie. Po integracji bramki płatności właściciel może ocenić
je na syntetycznych materiałach, zgodnie z osobną zgodą na koszt testu. Agent
nie wykonuje płatnych wywołań.
