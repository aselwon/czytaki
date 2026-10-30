import {pageCounts,type PageCount,type PriceOffer} from "../product.ts";

export type RegionalPrice=PriceOffer&{country:string};

const regional:Record<string,Record<PageCount,Omit<PriceOffer,"pages">>>={
 PL:{8:{amount:2900,regularAmount:5900,currency:"pln"},15:{amount:3900,regularAmount:9900,currency:"pln"},30:{amount:6500,regularAmount:16900,currency:"pln"}},
 US:{8:{amount:799,regularAmount:1499,currency:"usd"},15:{amount:999,regularAmount:2499,currency:"usd"},30:{amount:1699,regularAmount:4299,currency:"usd"}},
 SE:{8:{amount:7900,regularAmount:14900,currency:"sek"},15:{amount:9900,regularAmount:24900,currency:"sek"},30:{amount:16900,regularAmount:42900,currency:"sek"}},
 NO:{8:{amount:6900,regularAmount:14900,currency:"nok"},15:{amount:9900,regularAmount:23900,currency:"nok"},30:{amount:15900,regularAmount:40900,currency:"nok"}},
 DK:{8:{amount:4900,regularAmount:9900,currency:"dkk"},15:{amount:6900,regularAmount:16900,currency:"dkk"},30:{amount:10900,regularAmount:27900,currency:"dkk"}},
 FI:{8:{amount:699,regularAmount:1399,currency:"eur"},15:{amount:899,regularAmount:2299,currency:"eur"},30:{amount:1499,regularAmount:3999,currency:"eur"}},
};
regional.FO=regional.DK;regional.GL=regional.DK;regional.AX=regional.FI;

function validAmount(value:string|undefined,fallback:number){
 const amount=Number(value);
 return Number.isInteger(amount)&&amount>=100&&amount<=100000?amount:fallback;
}

export function basePrice(value?:string){return validAmount(value,2900);}
export function baseRegularPrice(value?:string){return validAmount(value,5900);}

function localeCountry(req:Request){
 const cf=req.headers.get("cf-ipcountry")?.trim().toUpperCase();
 if(cf&&/^[A-Z]{2}$/.test(cf)&&cf!=="XX"&&cf!=="T1")return cf;
 const locale=req.headers.get("accept-language")?.split(",")[0]?.trim().replace("_","-");
 const match=locale?.match(/-([A-Za-z]{2})(?:$|-)/);
 return match?.[1]?.toUpperCase()||"PL";
}

export function priceForRequest(req:Request,priceCents?:string,regularPriceCents?:string,pages:PageCount=8):RegionalPrice{
 const country=localeCountry(req);
 const polish=pages===8?{amount:basePrice(priceCents),regularAmount:baseRegularPrice(regularPriceCents),currency:"pln"}:regional.PL[pages];
 return{pages,...(regional[country]?.[pages]||polish),country};
}

export function pricesForRequest(req:Request,priceCents?:string,regularPriceCents?:string){
 return pageCounts.map(pages=>priceForRequest(req,priceCents,regularPriceCents,pages));
}

export function regularAmountForCurrency(currency:string,pages:PageCount=8,regularPriceCents?:string){
 const match=Object.values(regional).find(item=>item[pages].currency===currency.toLowerCase());
 return match?.[pages].regularAmount??(pages===8?baseRegularPrice(regularPriceCents):regional.PL[pages].regularAmount);
}
