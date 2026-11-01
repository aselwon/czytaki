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

CZ-04 nie przebudowuje procesu zakupowego: istniejące generowanie przed
płatnością jest teraz blokowane. Przebudowa podglądu/checkoutu i pipeline
po płatności to dalsze zadania. Limit dobowy, przeliczenie USD/PLN,
kolejka i alert właściciela należą do CZ-05; ta zmiana ich nie implementuje.
