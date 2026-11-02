# Ewidencja AI (CZ-04)

Każda próba HTTP w `lib/server/ai.ts` wymaga `orderId`, stanu
`payment_status=paid` oraz `payment_verified_at`. Znacznik zapisuje wyłącznie
ścieżka podpisanego webhooka po sprawdzeniu sesji Stripe. Powrót klienta
z płatności nie nadaje uprawnień AI. Dawne zamówienia pozostają zachowane;
nie otrzymują automatycznie znacznika weryfikacji.

`ai_calls` zapisuje model, endpoint (`kind`), tokeny wejścia/wyjścia, liczbę
zwróconych obrazów, rozmiar, jakość i koszt. `cost_cents` oraz
`orders.ai_cost_cents` są w **centach USD**, niezależnie od waluty zakupu.
Każde wywołanie zaokrąglamy w górę do pełnego centa. Moderacja kosztuje zero.
Tokeny wejściowe obrazów mają osobną stawkę; stawki konfiguruje
`lib/server/ai-pricing.ts`. Nieznany model blokuje HTTP.

Są to konserwatywne koszty według konfiguracji, bez rabatu za cache,
nie faktura dostawcy. Źródła i ograniczenia weryfikacji stawek GPT Image 2 opisuje
[nota CZ-19](image-model-migration.md). Pozostałych stawek nie weryfikowano ponownie.
Przed produkcją właściciel powinien porównać stawki z cennikiem swoich modeli.

Rozliczenie i zwiększenie sumy zamówienia odbywają się w jednym `DB.batch`.
Ponowne rozliczenie tego samego wpisu nie zwiększa sumy drugi raz.
Każda faktyczna ponowna próba HTTP dostaje odrębny wpis.
Błędy HTTP mają status `failed`, brak odpowiedzi lub danych o użyciu
`unknown`, a przerwanie procesu może pozostawić `pending`.
Ich koszt jest NULL, a nie zero; suma w panelu obejmuje wyłącznie
rozliczone wywołania. Takie wpisy wymagają uzgodnienia z dostawcą.
Dane zdjęć, prompty i klucze nie są zapisywane w ewidencji.

## Dzienny limit (CZ-20)

`OPENAI_DAILY_COST_CAP_GROSZE=2000` i `OPENAI_USD_PLN_RATE=4.00` są
wartościami konfiguracji produkcyjnej i `.env.example`. Brak, pusty ciąg,
niepoprawny lub niedodatni limit/kurs blokuje generowanie HTTP 503 — kod nie
podstawia domyślnych wartości przy błędzie konfiguracji. Doba jest wyznaczana
przez `Intl.DateTimeFormat` dla `Europe/Warsaw`, również przy zmianie czasu.

Każda próba HTTP, w tym moderacja i retry, najpierw przechodzi weryfikację
płatności, a następnie transakcję `DB.batch`: utworzenie doby, warunkowy INSERT
`ai_calls`, zwiększenie `ai_daily_budget.reserved_grosze` tylko dla przyjętego
wpisu. Warunek obejmuje sumę kosztów rozliczonych i nadal zajętych rezerwacji.
Równoległe żądania nie mogą zarezerwować więcej niż skonfigurowany limit.
Migracja `0004_melted_ultimates.sql` zachowuje dawne zamówienia i ewidencję.

Szacunek rezerwuje maksymalne `max_output_tokens` dla Responses, jeden token
na bajt tekstu oraz 8192 tokeny na obraz wejściowy. Dla używanych wywołań
Images (jeden obraz medium 1024x1024 lub 1024x1536) rezerwuje 16384 tokeny
wyjściowe i dwa wejścia po 8192 tokeny. To konserwatywne założenia konfiguracji,
nie odczyt limitów dostawcy: przed zmianą modelu, rozmiaru, jakości lub liczby
referencji trzeba ponownie sprawdzić te granice i stawki. Ich zgodność z
rzeczywistym rozliczeniem dostawcy wymaga pomiaru właściciela bez podnoszenia
limitu. Rezerwacja większa niż cały limit nie zostanie wysłana także jutro.

Koszt USD z tokenów mnożymy przez zapisany przy rezerwacji kurs i 100,
zaokrąglając w górę do grosza (`cost_grosze`). Nie przeliczamy wcześniej
zaokrąglonych centów USD. Rozliczenie zwalnia nadwyżkę w tej samej transakcji
co ewidencja i suma zamówienia; powtórzenie rozliczenia niczego nie zmienia.
`pending`, `failed` i `unknown` zachowują pełną rezerwację w dobie rozpoczęcia.
Odpowiedź po północy rozlicza pierwotną dobę.

Brak miejsca oznacza HTTP 503, `waiting_capacity` oraz polski komunikat
w kreatorze. Opłacenie, książka i zapisane ilustracje pozostają zachowane.
Klient wznawia przez „Kontynuuj generowanie” (`POST /generate`); nowa doba
ma osobny budżet. Generowanie może trwać kilka dób. Cron `17 2 * * *`
pozostaje zadaniem retencji; wznowienie generowania wymaga wizyty klienta.
Retencja zdjęć nadal wynosi maksymalnie 7 dni, więc długie oczekiwanie może
wymagać interwencji właściciela.

`OWNER_ALERT_EMAIL`, `RESEND_API_KEY` i `EMAIL_FROM` umożliwiają alerty 80% i
100% (także przy odmowie rezerwacji, gdy pozostały budżet nie wystarcza).
Unikalny wpis `(day, threshold)` jest atomowo zajmowany przed wysłaniem;
Resend otrzymuje ten sam klucz idempotencji. Maksymalnie jedna próba wysyłki
na próg i dobę, również przy niejednoznacznym błędzie transportu. Błędy są
logowane, nie blokują budżetu. Brak konfiguracji poczty pomija alerty;
właściciel musi ją uzupełnić przed sprzedażą. Testy używają wyłącznie atrap.

Przedpłatowy podgląd nadal nie importuje klienta OpenAI i nie zużywa tego
budżetu. Dawne nierozliczone wywołania sprzed migracji nie są automatycznie
przenoszone do nowej doby: wdrożenie powinno nastąpić bez aktywnych generowań.
