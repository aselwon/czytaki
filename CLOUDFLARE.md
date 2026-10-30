# Czytaki na własnym koncie Cloudflare

Konfiguracja: `cloudflare.production.json`. Konto: `130aa5101f2a9a9e790f166b0f54abae`
(adamselwon1993@gmail.com). Logowanie narzędzi jest odizolowane w ignorowanym
`.wrangler/account-adam`; nie używa konta innego projektu.

## Stan przygotowania

- Utworzono D1 `czytaki-orders` w regionie WEUR i zastosowano migracje 0000 oraz 0001.
- Build Cloudflare zachowuje oddzielną konfigurację lokalną.
- R2 `czytaki-private` **nie jest jeszcze utworzone**: konto wymaga aktywacji
  subskrypcji R2 z opłatami po przekroczeniu darmowego limitu.
- Worker **nie został jeszcze opublikowany**. Nie przeniesiono lokalnych zamówień.
- Nie wgrano sekretów. Lokalny Stripe jest testowy; brak webhooka nowego hosta.
- `SALES_ENABLED=false` do czasu sprawdzenia płatności i dostawy.

## Polecenia

```sh
npm run cf -- whoami
npm run build:cloudflare
npm run cf -- deploy --dry-run --config dist/server/wrangler.json
npm run cf -- d1 migrations apply DB --remote --config cloudflare.production.json
npm run deploy:cloudflare
```

Przed pierwszym deployem utworzyć prywatny bucket R2, ustawić `APP_URL` na
faktyczny adres HTTPS i przekazać sekrety przez `wrangler secret put`/`bulk`
(stdin, bez wypisywania wartości i bez dodawania ich do repozytorium).
Nie włączać publicznego adresu R2. Panel administratora wymaga dodatkowego
zabezpieczenia Cloudflare Access; bez niego nie publikować sekretu administratora.

`npm run local` nadal korzysta z dotychczasowej lokalnej bazy i plików.
Wdrożenie aplikacji nie synchronizuje automatycznie lokalnych zamówień ani PDF-ów.
