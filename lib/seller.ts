// Dane sprzedawcy i administratora danych — jedyne miejsce do uzupełnienia przed
// uruchomieniem sprzedaży. Trafiają do regulaminu i polityki prywatności.
// Dopóki name, address i email są puste, dokumenty są oznaczone jako szkic,
// a salesReady() nie włączy publicznej sprzedaży nawet przy SALES_ENABLED=true.
export type Seller={
 /** Pełna nazwa: imię i nazwisko z nazwą firmy (JDG) albo nazwa spółki. */
 name:string;
 /** Adres do doręczeń / siedziby: ulica, kod, miasto. */
 address:string;
 /** NIP (i REGON, jeśli jest). Puste dla działalności nierejestrowanej. */
 taxId:string;
 /** Np. „wpis do CEIDG”, „KRS 0000000000” albo „działalność nierejestrowana”. */
 registry:string;
 /** Adres do kontaktu, reklamacji i spraw danych osobowych. */
 email:string;
 /** true, jeśli sprzedawca jest czynnym podatnikiem VAT. */
 vatPayer:boolean;
};

export const seller:Seller={
 name:"",
 address:"",
 taxId:"",
 registry:"",
 email:"",
 vatPayer:false,
};

// Data wejścia w życie bieżącej wersji regulaminu i polityki prywatności.
export const LEGAL_VERSION_DATE="22 listopada 2026 r.";

export function sellerComplete(s:Seller=seller){
 return !!(s.name.trim()&&s.address.trim()&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email.trim()));
}
