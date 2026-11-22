# Go-live: włączenie sprzedaży Czytaki

Kroki wyłącznie dla właściciela (agenci ich nie wykonują — patrz `AGENTS.md`).
Kolejność ma znaczenie: każdy krok zakłada poprzednie.

## 1. Dane i dokumenty

- [ ] Uzupełnij `lib/seller.ts` (nazwa, adres, NIP/rejestr, e-mail, `vatPayer`) i ustaw
      `LEGAL_VERSION_DATE`. Bez tego dokumenty mają baner „Szkic”, a `salesReady()`
      nie włączy sprzedaży nawet przy `SALES_ENABLED=true`.
- [ ] Przeczytaj `/regulamin` i `/prywatnosc` na produkcji. Zalecana weryfikacja przez
      prawnika: termin realizacji (do 7 dni), licencja na użytek osobisty, wizerunek dzieci,
      transfery do USA.
- [ ] Zawrzyj / zaakceptuj umowy powierzenia (DPA): Cloudflare, OpenAI, Resend.
- [ ] Ustal z księgową: VAT, ewidencja sprzedaży / kasa fiskalna dla sprzedaży
      konsumentom online, dokument sprzedaży. Jeśli faktury ze Stripe — `STRIPE_INVOICES=true`.
- [ ] Waluty: zostaw `MULTI_CURRENCY` wyłączone, dopóki nie rozliczasz VAT OSS.

## 2. Test zakupu (CZ-14)

- [ ] Ustaw sekret `TEST_CHECKOUT_TOKEN` (klucz Stripe `sk_test_…`) i wejdź na
      `https://czytaki.kredkuj.pl/?test_checkout=<token>`.
- [ ] Zamów 8 stron kartą testową 4242 4242 4242 4242, **zamknij kartę po płatności**
      i sprawdź, że PDF przychodzi e-mailem w ciągu kilkunastu minut (cron `*/2 * * * *`).
- [ ] Sprawdź w e-mailu potwierdzenie zgody z art. 38, numer zamówienia i link do regulaminu.
- [ ] Odczytaj koszt w panelu `/admin` (ewidencja `ai_calls`) i uzupełnij
      `docs/image-model-migration.md`. Na tej podstawie ustal `OPENAI_DAILY_COST_CAP_GROSZE`
      na czas promocji (20 zł/dobę ≈ kilka książeczek).

## 3. Włączenie sprzedaży (CZ-16)

- [ ] Stripe live: `STRIPE_SECRET_KEY=sk_live_…`, webhook na `/api/payments/webhook`
      (`checkout.session.completed`, `checkout.session.async_payment_succeeded`) i jego
      `STRIPE_WEBHOOK_SECRET`.
- [ ] Resend: domena `czytaki.kredkuj.pl` zweryfikowana, `OWNER_ALERT_EMAIL` ustawiony.
- [ ] `SALES_ENABLED=true` w `cloudflare.production.json` (zmiana przez PR).
- [ ] Pierwszy prawdziwy zakup i zwrot w Stripe; sprawdź e-mail i usunięcie danych linkiem.
