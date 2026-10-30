# Czytaki: lokalna gotowość i pętla kontroli

## Zakres
Istniejące repozytorium, bez odrzucania zmian użytkownika. Doprowadzić lokalny przepływ zdjęcie → historia → edytor → PDF → płatność i dostarczenie do zweryfikowanej gotowości. Nie utożsamiać lokalnych testów z gotowością produkcyjną.

## Kryteria do sprawdzenia
- [x] Zdjęcie bez obowiązkowego wyboru osoby/zwierzęcia; zachowanie dawnych zamówień. Test schematu i kontrola przeglądarki.
- [ ] Jeden spójny kontur dymka w galerii, PDF, podglądzie i edytorze; tekst nie wchodzi na ogonek.
- [x] Pięć przykładów: poprawione PDF-y i odpowiadające im podglądy. Wszystkie pięć renderów obejrzano po zmianie.
- [x] Testy, build, kontrola typów i lokalna kontrola formularza. Ostatni pełny przebieg: 79/79; ostatnie tsc i build bez błędów. Aplikacja uruchomiona lokalnie, bez publikacji.
- [x] Testy pakietów 8/15/30 stron i wybranych błędów generowania bez płatnych wywołań. Zakres: liczba stron, cache ilustracji, ponowienie analizy, brak obrazu, blokada równoległego żądania. Nie obejmuje 28 różnych obrazów AI.
- [x] Lokalna kontrola dostępu do PDF właściciela i administratora: brak/cudza sesja, podpis admina, nieopłacony plik, no-store; atomowy licznik logowań. Nie jest to pełny audyt wszystkich tras i infrastruktury.
- [x] Testy offline ponowień potwierdzania płatności/wysyłki oraz wznowienia po błędach. Nie potwierdzają faktycznego doręczenia e-maila ani konfiguracji produkcyjnej Stripe.
- [ ] Końcowe podsumowanie: dowody, brakujące integracje, kroki wymagające autoryzacji.

## Granice automatyzacji
Co 30 minut kontynuować od aktualnego stanu. Nie generować płatnie, nie wysyłać maili, nie wykonywać transakcji, nie publikować, nie zmieniać sekretów, nie usuwać zamówień. Nie wyświetlać sekretów ani prywatnych danych. Naprawiać konkretne błędy, nie dopisywać funkcji bez końca. Po zakończeniu lokalnej listy lub dojściu do realnego blokera wstrzymać automatyzację i przekazać wynik.

## Historia
- 2026-09-24: aktywowano automatyczne wznowienie wątku co 30 minut. Rozpoczęto ujednolicenie dymków i formularza bez kategorii.
- 2026-09-24: dodano wspólną geometrię dymka SVG/PDF, bez osobnego trójkąta. Obejrzano także stronę technicznego PDF z produkcyjnego renderera. Kontrola interaktywnego edytora i telefonu nadal do wykonania.
- 2026-09-24: zamknięto błąd fail-open: brak kluczy Stripe/Resend nie odblokowuje już nieopłaconych PDF-ów w publicznym środowisku. Pełny darmowy podgląd/edycja tylko przy loopback APP_URL i wyłączonej sprzedaży. Dodano wylogowanie z lokalnego admina.

## Następny przebieg
0. 2026-09-24: dodano `locateComicSpeech` + `planAdaptiveLettering`: wykrywanie mówiącego na gotowym obrazie, poszukiwanie miejsca obok niego, kontrola kolizji, kierunkowy ogonek, zachowanie obrazu po odrzuconej analizie. Domyślny model analizy GPT-5.4, detail original, reasoning low; nie zmieniono modelu opowieści/obrazów. Wykonano rzeczywiste wywołania analizy syntetycznego Figa; pierwsze próby starszymi modelami nie przeszły walidacji. Ostateczna mapa przechodzi kontrolę; PDF Figa przebudowano i obejrzano. Fixture pozwala testować bez kolejnych wywołań API. Pozostałe przykłady i istniejące prywatne PDF-y nie zostały automatycznie przeniesione do nowego pozycjonowania. Nie twierdzić, że przetestowano live jelenia lub wszystkie 30 stron. Analiza obrazu ma ograniczenia i może wymagać ponowienia; nie gwarantować bezbłędnej detekcji.
1. Dokończyć wizualną kontrolę edytora/telefonu; sprawdzić długi tekst w małych dymkach.
2. Istniejące prywatne pliki PDF zamówień nie zostały jeszcze przeskładane. Nowy renderer działa dla nowych/zapisanych ponownie plików. Opracować bezpieczne wersjonowane przeskładanie bez AI i bez kasowania oryginałów.
3. Testy 8/15/30, wznowienia generowania, checkout, webhook i dostawy są opisane niżej. Pozostaje produkcyjne end-to-end, nie zastępować go dalszym powtarzaniem tych samych testów offline.
4. Licznik nieudanych prób administratora zmieniono na atomowy UPSERT (2026-09-25); dodano testy na rzeczywistym SQLite: wszystkie przyrosty, próg pięciu prób, niezależność adresów, reset okna i zachowanie aktywnej blokady. Pozostaje sprawdzić cały przepływ autoryzacji; nie traktować tego jako pełnego audytu bezpieczeństwa.
5. Nie oznaczać całego projektu jako ukończonego na podstawie testów lokalnych. Produkcyjny zakup i dostawa pozostają niezweryfikowane end-to-end.

## Aktualna decyzja po kontroli 2026-09-25
- Nie wstrzymano jeszcze automatyzacji: pozostaje lokalna kontrola zgodności obszaru tekstu HTML/PDF i obrysu dymka. Da się ją wykonać na istniejących syntetycznych danych, bez płatnego AI; nie przedstawiać jej jako blokera wymagającego użytkownika.
- Nie dopisywać kolejnych ogólnych testów zamiast tej kontroli. Następny przebieg ma sprawdzić dymek z kilkoma wierszami przy górnej/dolnej krawędzi owalu i porównać tekst z faktycznym konturem, nie tylko prostokątem bounding box.
- Dopiero pełna próba nowych ilustracji, produkcyjnej płatności i doręczenia oraz fizyczny telefon wymagają dodatkowej autoryzacji/dostępu. Bez niej nie wykonywać tych kroków.

## Kontrola 2026-09-25
- Usunięto read-then-write w zapisie błędnych logowań administratora; pojedynczy SQL nie gubi przyrostów. Dodatkowe wywołanie po przesunięciu okna nie usuwa aktywnej blokady.
- `npm test`: 31/31; `tsc --noEmit --incremental false`: bez błędów. Po doprecyzowaniu zachowania aktywnej blokady ponownie sprawdzono oba testy SQLite.
- Nie wykonywano płatnych API, transakcji, wysyłek, publikacji ani zmian sekretów. Zmiana w kodzie źródłowym; działający serwer wymaga kolejnego build/restartu, by ją załadować.
- Pozostałe kryteria nadal otwarte; następny przebieg: testy płatności/dostawy z atrapami usług i kontrola autoryzacji tras.

## Kontrola 2026-09-25 — płatność i dostawa offline
- Dodano `tests/delivery.test.mjs`: 10 testów prawdziwych funkcji `deliver` i `confirmAndDeliver`, ze środowiskiem zastąpionym bazą SQLite w pamięci i atrapami fetch/BUCKET. Nie odczytują ENV, nie łączą się ze Stripe/Resend.
- Sprawdzono: brak wysyłki przed płatnością; równoległe wywołania i ponowienia; stały klucz idempotencji po błędzie; ponowne potwierdzenie płatności; odrzucenie złej kwoty; brak i przywrócenie PDF; blokadę automatycznej wysyłki po 23 godzinach; świeżą i wygasłą rezerwację wysyłki; zachowanie paid przy awarii poczty.
- `npm test`: 41/41. Nie zmieniano implementacji płatności ani danych zamówień w tym przebiegu. Nie wykonano prawdziwej płatności, wysyłki ani publikacji.
- Nie jest to pełny test end-to-end: pozostają checkout i webhook jako trasy HTTP, uprawnienia właściciela/admina, test 30 stron oraz kontrola mobilnego edytora. Symulacja SQLite nie zastępuje sprawdzenia wdrożonego D1 i dostarczenia wiadomości do skrzynki.

## Kontrola 2026-09-25 — dostęp do PDF
- Dodano `tests/download-access.test.mjs`: 7 testów prawdziwych handlerów pobierania klienta i admina, z prawdziwymi funkcjami ownOrder/requireAdmin/hash i podpisami HMAC. Zastąpiono wyłącznie środowisko Cloudflare danymi syntetycznymi; bez sekretów, prywatnych PDF i sieci.
- Numer zamówienia bez sesji oraz cudza sesja zwracają 404 bez pobrania obiektu. Nieopłacony plik w publicznym środowisku pozostaje zablokowany także przy wyłączonej sprzedaży. Lokalny darmowy podgląd nadal wymaga własności. Poprawne pobranie ma private/no-store.
- Cookie właściciela nie daje dostępu administratora; poprawnie podpisana sesja admina działa, zmieniony podpis zwraca 401 przed odczytem pliku.
- `npm test`: 48/48. Brak zmian kodu aplikacji w tym przebiegu, nie był potrzebny restart. Nie jest to pełny audyt bezpieczeństwa ani test infrastruktury produkcyjnej. Pozostają pozostałe trasy, checkout/webhook, 30 stron i mobilny edytor.

## Kontrola 2026-09-25 — pakiety PDF
- Rozszerzono testy rzeczywistego `createBookPdf` i ponownego otwarcia przez PDFDocument o bajkę 30 stron oraz komiks 15/30 stron. Wszystkie pakiety 8/15/30 mają kontrolę liczby stron; komiksy dodatkowo metadanych, pionowych wymiarów stron i rozmiaru poniżej 20 MiB na ilustracji testowej.
- `npm test`: 51/51. Dokumenty powstały wyłącznie w pamięci, z wielokrotnie używaną lokalną ilustracją testową. Bez AI, płatności, wysyłek i zmian zamówień.
- To test strukturalny, nie wizualna akceptacja 28 różnych plansz. Nie potwierdza rozmiaru PDF z 28 różnymi ilustracjami ani poprawności detekcji wszystkich mówców. Nie dostarczano nowego PDF jako przykładu produktu.

## Kontrola 2026-09-25 — webhook offline
- Dodano 7 testów prawdziwego handlera POST webhooka, weryfikacji HMAC i ograniczenia wielkości body. Atrapy zastępują Cloudflare oraz samo wywołanie confirmAndDeliver; jego implementacja jest osobno pokryta testami dostawy.
- Sprawdzono: brak podpisu, stary podpis, obce zdarzenie, niezgodna sesja Stripe, oba obsługiwane typy potwierdzenia, body ponad 256 KiB i brak sekretu webhooka. Do potwierdzenia przekazywany jest rekord zamówienia z bazy, nie treść przesłana w zdarzeniu.
- `npm test`: 58/58. Zero zewnętrznych wywołań, zmian sekretów i danych zamówień. Nie potwierdza to konfiguracji webhooka w panelu Stripe ani routingu produkcyjnego. Pozostają checkout, mobilny edytor i testy wznowienia generowania.

## Kontrola 2026-09-25 — tworzenie checkout offline
- Dodano 8 testów checkoutSession do zestawu z SQLite w pamięci: parametry ceny/waluty/pakietu z zamówienia, zapis maila i sesji, ponowne użycie otwartej sesji, blokada opłaconego/niegotowego zamówienia, brak PDF, inny e-mail, nowy klucz idempotencji dla wygasłej sesji i odrzucenie nieprawidłowego hosta nowej płatności.
- `npm test`: 66/66. Nie zmieniono kodu aplikacji; nie utworzono żadnej rzeczywistej sesji Stripe. Test funkcji zastępuje salesReady stałą true; warunki konfiguracji oraz blokada równoległych żądań w handlerze checkout wymagają osobnej weryfikacji.
- Następny priorytet: kontrola mobilnego edytora i wznowienia generowania. Pozostaje aktualizacja działającego builda po wcześniejszej poprawce licznika logowań.

## Kontrola 2026-09-25 — dotyk w edytorze
- W przeglądarce odświeżono istniejącą kartę formularza: zniknął stary wybór kategorii, widoczny jest aktualny tekst „Nie musisz wybierać kategorii”. Stara otwarta karta zawierała poprzednią wersję interfejsu.
- W CSS wykryto touch-action:none na całej planszy, blokujące przewijanie rozpoczęte na ilustracji. Zmieniono tło na pan-y pinch-zoom; same dymki nadal mają touch-action:none dla przeciągania. Suwaki na urządzeniach dotykowych mają obszar wysokości minimum 44 px.
- `npm test`: 66/66; `npm run build`: sukces. Brak płatnych wywołań, zmian zamówień i publikacji. Nie restartowano procesu ręcznie i nie potwierdzono jeszcze załadowania nowego CSS do aktywnego edytora.
- Kontrola dotyku i przepełnienia tekstu w działającym edytorze nadal otwarta: sama poprawka CSS i testy backendu nie stanowią testu gestów na telefonie. Następny przebieg powinien użyć odizolowanego przykładu edytora, bez zapisywania prywatnych zamówień.

## Kontrola 2026-09-25 — wznowienie generowania
- Naprawiono zbędny wymóg zdjęcia źródłowego przy analizie zapisanej ilustracji. Handler najpierw sprawdza gotowy obraz; zdjęcie i referencję pierwszej planszy czyta tylko wtedy, gdy naprawdę potrzebuje nowej ilustracji.
- Dodano 4 testy handlera z SQLite i magazynem w pamięci oraz atrapami AI: analiza cache bez zdjęcia; błąd analizy zachowujący obraz i ponowienie bez kolejnej generacji; brak zdjęcia/obrazu; odrzucenie konkurencyjnego żądania przy aktywnej blokadzie. Autoryzacja i render PDF są w tym zestawie zastąpione, nie jest to pełne end-to-end.
- `npm test`: 70/70; kontrola TypeScript bez błędów. Bez płatnych wywołań i zmian rzeczywistych zamówień. Zmiana handlera wymaga nowego build/restartu przed potwierdzeniem w działającej aplikacji.

## Kontrola 2026-09-25 — uruchomienie aktualnego builda
- Przebudowano aplikację i zrestartowano wyłącznie potwierdzony proces lokalnego Czytaki na porcie 8787. Przed restartem sprawdzono agregat aktywnych blokad zamówień: 0. Nie odczytywano treści zamówień ani wartości sekretów.
- `npm run local` zakończył build i przygotowanie lokalnego schematu; serwer zgłosił Ready on http://127.0.0.1:8787, strona główna zwróciła HTTP 200. Aktywny proces zawiera poprawki licznika logowań, dotyku edytora i wznowienia analizy zapisanego obrazu.
- Bez wywołań generowania, płatności, maili i publikacji. Poprzednie uwagi „wymaga restartu” są nieaktualne dla tych zmian. Nadal nie potwierdzono pełnego przepływu na telefonie ani produkcyjnego Stripe/Resend.

## Kontrola 2026-09-25 — odizolowany edytor w przeglądarce
- Uruchomiono prawdziwy ComicEditor z atrapą layout API i syntetycznym tłem na tymczasowym porcie 8789. Bez odczytu/zapisu rzeczywistych zamówień, bez AI. Po kontroli zamknięto kartę i serwer, przywrócono viewport.
- Przy szerokości 390 px panel nie wychodzi poza viewport (scrollWidth 375); wpisanie 86 znaków do dymka 28×8% pokazuje ostrzeżenie. CSS planszy odczytany w przeglądarce: pan-y pinch-zoom. Nie symulowano fizycznych gestów telefonu.
- Znaleziono regresję applyTemplate: zmiana gotowego układu kasowała pole speaker. Poprawiono zachowanie przypisania mówcy według indeksu wypowiedzi. Kontrola przed poprawką: 0 speaker-linked po zmianie; po poprawce: 5. Sam gotowy układ pozostaje ręczny i może wymagać przesunięcia, nie gwarantuje wolnego miejsca na ilustracji.
- `npm test`: 70/70; TypeScript bez błędów. Poprawka ComicEditor zweryfikowana w izolowanym bundlu; główny serwer wymaga nowego builda, by ją udostępnić.
- Nadal otwarte: zgodność wielkości tekstu między HTML/PDF przy ekstremalnie małym dymku; kontrola rzeczywistych gestów; pełny test zewnętrznych integracji. Nie akceptować ostrzeżenia o ciasnym tekście jako dowodu poprawnego składu.

## Kontrola 2026-09-25 — przepełnienie najmniejszych dymków
- Dodano testy renderera dla minimalnego rozmiaru edytora 12×5,5% planszy, z mówcą oraz bez mówcy: krótki tekst „Hej!” daje prawidłowy 8-stronicowy dokument, długa wypowiedź jest odrzucana komunikatem Comic bubble text exceeds bounds. Dokumenty testowe tylko w pamięci; bez eksportu i zmian zamówień.
- Sprawdzono obsługę tego błędu w trasie zapisu layout: przed BUCKET.put zwraca HTTP 400 z prośbą o powiększenie dymka/skrócenie tekstu. To przegląd kolejności kodu, nie nowy test integracyjny trasy.
- `npm test`: 72/72. Nie była potrzebna zmiana renderera. Nadal nie jest potwierdzona identyczna typografia podglądu HTML i PDF ani wizualny skład wszystkich długości tekstu.

## Kontrola 2026-09-25 — limit żądania edytora
- Naprawiono poleganie wyłącznie na Content-Length w POST layout. Body jest teraz czytane przez boundedBytes z limitem 400000 bajtów, także bez nagłówka i przy przesyłaniu porcjami. Błędny JSON zwraca HTTP 400, nie ogólny 503. Kontrola następuje przed blokadą zapisu i składaniem PDF.
- Dwa testy rzeczywistego boundedBytes: akceptacja dokładnego limitu oraz odrzucenie/przerwanie strumienia przekraczającego limit bez Content-Length. Nie jest to pełny test integracyjny trasy layout.
- `npm test`: 74/74; TypeScript bez błędów. Bez sieci, płatnych API i zmian zamówień. Do następnego lokalnego build/restartu: ta poprawka i zachowanie speaker przy zmianie szablonu edytora.

## Kontrola 2026-09-25 — aktualizacja lokalnego serwera
- Ponownie `npm test`: 74/74. Sprawdzono brak aktywnych operacji (agregat blokad: 0), zrestartowano tylko potwierdzony proces Czytaki.
- `npm run local`: build i lokalny schemat OK, Ready on 127.0.0.1:8787. Strona główna i /przyklady: HTTP 200. Zachowanie speaker w edytorze i limit strumieniowego body są już w aktualnym buildzie.
- Bez nowych funkcji, płatnych generacji, transakcji, e-maili i publikacji. Nadal otwarte: pełny test zapisu edytora z zachowaniem starego PDF przy błędzie oraz porównanie HTML/PDF, rzeczywisty telefon i integracje produkcyjne.

## Kontrola 2026-09-25 — bezpieczeństwo zapisu edytora
- Dodano 5 testów prawdziwego handlera POST layout z SQLite i magazynem w pamięci. Scenariusze: przepełnienie dymka, brak ilustracji, nieaktualna rewizja, poprawny zapis i niepoprawny JSON.
- Potwierdzono brak zmiany book/pdf_key/rewizji przy błędzie, zwolnienie własnej blokady oraz brak zapisu nowego obiektu. Poprawny zapis tworzy nowy klucz PDF, pozostawia oryginalny obiekt i zachowuje speaker.
- `npm test`: 79/79. W testach renderer jest atrapą zwracającą błąd/bytes, a autoryzacja i boundedBytes są zastąpione. Ich rzeczywiste implementacje mają osobne testy; zestaw nie jest testem pełnego środowiska D1/R2 ani przeglądarki.
- Nie zmieniano aplikacji ani prawdziwych zamówień. Brak potrzeby restartu po tym przebiegu. Następne pozostające prace: zgodność HTML/PDF i końcowe uporządkowanie kryteriów gotowości; test telefonu oraz produkcyjnych usług wymagają odrębnej kontroli.
