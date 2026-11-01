# CZ-19 — migracja obrazów

Stan: przygotowana lokalnie; **niegotowa do wdrożenia bez CZ-05 i pomiaru CZ-14**.
Nota migracyjna: domyślny `gpt-image-1.5` zastępuje `gpt-image-2`.
Termin wdrożenia z zadania: przed 2026-12-01; wdrożenia nie wykonano.

## Kontrakt i źródła

Dokumentację OpenAI odczytano 2026-11-01 narzędziem dokumentacyjnym poza
powłoką sandboxa. Nie wywoływano płatnych API.

- [Model](https://developers.openai.com/api/docs/models/gpt-image-2): alias
  `gpt-image-2`, obsługa `/v1/images/edits`.
- [Generowanie obrazów](https://developers.openai.com/api/docs/guides/image-generation):
  pomijamy `input_fidelity` (zawsze wysoka wierność). Pozostają `medium`,
  `1024x1024` dla ilustracji i `1024x1536` dla pięciu kadrów komiksu,
  JPEG z kompresją 85. Model obsługuje jakości low/medium/high/auto.
  Zdjęcie i opcjonalna ilustracja wzorcowa nadal trafiają do `image[]`.
- [Cennik](https://developers.openai.com/api/docs/pricing) pokazuje dla modelu
  w tabeli Batch 2,50 USD za wejście tekstowe, 4 USD za wejście obrazowe
  i 15 USD za wyjście, na milion tokenów.
  Stawki Standard w kodzie: **5 / 8 / 30 USD** — wyprowadzone z tych wartości
  i [rabatu Batch 50%](https://developers.openai.com/api/docs/guides/batch).
  Odczytana tabela Standard nie pokazała wprost wiersza tego modelu;
  przed pomiarem właściciel powinien potwierdzić stawki Standard na koncie.
  Nie stosujemy rabatu Batch ani cache do synchronicznego endpointu edits.

## Szacunek warunkowy, nie pomiar książki

Brak pomiaru rzeczywistych tokenów nowego modelu. Nie przenosimy tabel liczby
tokenów poprzednich modeli: wysoka wierność może zwiększać koszt referencji.
Przykład arytmetyczny z syntetycznego fixture'u testowego na jedną ilustrację:
1000 tokenów tekstu + 2000 tokenów obrazu wejściowego + 4000 wyjściowych.
Koszt = (1000×5 + 2000×8 + 4000×30)/1 000 000 = 0,141 USD,
w obecnej ewidencji zaokrąglany do 0,15 USD. Liczba ilustracji = strony − 2.

| Strony | Ilustracje | Same ilustracje USD przed zaokrągleniem | Ewidencja USD | PLN przy 4,00 |
| --- | --- | --- | --- | --- |
| 8 | 6 | 0,846 | 0,90 | 3,60 |
| 15 | 13 | 1,833 | 1,95 | 7,80 |
| 30 | 28 | 3,948 | 4,20 | 16,80 |

To scenariusz dla jednakowego zużycia, **nie prognoza pełnego kosztu książki,
nie górny limit i nie dowód marży**. Dochodzą tekst, analiza rozmieszczenia
komiksu i ponowienia. PLN jest tu wyłącznie przeliczeniem dokumentacyjnym.
Ceny sprzedaży pozostają bez zmian.

## Pomiar CZ-14 do wykonania przez właściciela

Najpierw dostarczyć CZ-05: w tej bazie kodu nie ma atomowej rezerwacji kosztu,
limitu 500 groszy ani testów tej bramki. Sam wpis konfiguracji nie egzekwuje limitu.
Nie zwiększać limitu na potrzeby pomiaru; większe książki mogą czekać kilka dób.

1. Na środowisku testowym ustawić nowy model (nadpisanie `OPENAI_IMAGE_MODEL`
   ma pierwszeństwo nad fallbackiem); użyć wyłącznie syntetycznych obrazów.
2. Dla 8/15/30 stron przejść Stripe test Checkout i zweryfikowany podpisany
   webhook, dopiero potem uruchomić generowanie. OpenAI nadal jest płatne —
   agent nie wykonuje tego kroku. Dostęp i wydatki zatwierdza właściciel.
3. Zapisać dla każdego wariantu datę, rewizję, format, model, rozmiar, jakość,
   liczbę prób, tokeny tekstowe/obrazowe/wyjściowe, pełny koszt USD i PLN,
   czas, liczbę oczekiwań na limit, ocenę PDF i zgodności postaci.
   Uwzględnić wszystkie endpointy i ponowienia. Wyjaśnić każdy wpis
   pending/unknown/failed przed uznaniem kosztu za kompletny.
4. Uzupełnić poniższą tabelę oraz decyzję właściciela o marży w CZ-14.

| Strony | Rzeczywisty koszt USD / PLN | Dowód pomiaru po płatności |
| --- | --- | --- |
| 8 | niezmierzony | do wykonania przez właściciela |
| 15 | niezmierzony | do wykonania przez właściciela |
| 30 | niezmierzony | do wykonania przez właściciela |

Po zielonym CI i zamknięciu powyższych blokad wdraża harness lub właściciel.
Potwierdzić konfigurację modelu, SHA wdrożenia i datę sprzed 2026-12-01
w historii produkcji; sprawdzić zapis nowego modelu w ewidencji zatwierdzonego
zamówienia. Starsze wpisy kosztów pozostają historyczne, bez przeliczenia.
