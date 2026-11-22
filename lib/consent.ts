// Art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta: prawo odstąpienia od umowy
// o treść cyfrową wygasa tylko po wyraźnej zgodzie konsumenta i przyjęciu do
// wiadomości utraty prawa. Wersja trafia do zamówienia jako dowód treści zgody.
export const DIGITAL_CONSENT_VERSION="2026-11-22";

export const digitalConsentLabel="Żądam rozpoczęcia przygotowania książeczki PDF przed upływem 14-dniowego terminu na odstąpienie od umowy i przyjmuję do wiadomości, że po jej dostarczeniu utracę prawo odstąpienia od umowy.";

export const digitalConsentMissing="Potwierdź zgodę na dostarczenie książeczki przed upływem terminu na odstąpienie od umowy.";

export function digitalConsentConfirmation(at:number){
 const date=new Intl.DateTimeFormat("pl-PL",{timeZone:"Europe/Warsaw",dateStyle:"long",timeStyle:"short"}).format(new Date(at));
 return `Potwierdzenie zgody (${date}): przed zakupem zażądano rozpoczęcia przygotowania książeczki PDF przed upływem 14-dniowego terminu na odstąpienie od umowy i przyjęto do wiadomości, że po jej dostarczeniu prawo odstąpienia od umowy wygasa. Nie ogranicza to praw z tytułu niezgodności treści cyfrowej z umową.`;
}
