// Synthetic, complete seller data for offline tests of enabled public sales.
import {sellerComplete as check,LEGAL_VERSION_DATE} from '../../lib/seller.ts';
export {LEGAL_VERSION_DATE};
export const seller={name:'Testowy Sprzedawca',address:'ul. Testowa 1, 00-001 Warszawa',taxId:'',registry:'działalność nierejestrowana',email:'kontakt@example.invalid',vatPayer:false};
export const sellerComplete=(value=seller)=>check(value);
