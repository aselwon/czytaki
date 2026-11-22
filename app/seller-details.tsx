import {seller,type Seller} from "@/lib/seller";

const missing="[do uzupełnienia w lib/seller.ts]";

export function SellerDetails({value=seller}:{value?:Seller}){
 return <ul className="legal-seller">
  <li>Sprzedawca i administrator danych: {value.name.trim()||missing}</li>
  <li>Adres: {value.address.trim()||missing}</li>
  {value.taxId.trim()&&<li>{value.taxId.trim()}</li>}
  {value.registry.trim()&&<li>{value.registry.trim()}</li>}
  <li>E-mail (kontakt, reklamacje, dane osobowe): {value.email.trim()?<a href={`mailto:${value.email.trim()}`}>{value.email.trim()}</a>:missing}</li>
 </ul>;
}

export function SellerEmail({value=seller}:{value?:Seller}){
 return value.email.trim()?<a href={`mailto:${value.email.trim()}`}>{value.email.trim()}</a>:<>{missing}</>;
}
