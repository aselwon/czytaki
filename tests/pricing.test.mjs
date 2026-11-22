import test from "node:test";
import assert from "node:assert/strict";
import {multiCurrency,priceForRequest,pricesForRequest,regularAmountForCurrency} from "../lib/server/pricing.ts";

const request=(country,language="pl-PL")=>new Request("https://czytaki.example/api/config",{headers:{...(country?{"cf-ipcountry":country}:{}),"accept-language":language}});

test("uses the Polish launch offer by default",()=>{
 assert.deepEqual(priceForRequest(request("PL")),{pages:8,amount:2900,regularAmount:5900,currency:"pln",country:"PL"});
 assert.deepEqual(priceForRequest(request("PL"),undefined,undefined,15),{pages:15,amount:3900,regularAmount:9900,currency:"pln",country:"PL"});
 assert.deepEqual(priceForRequest(request("PL"),undefined,undefined,30),{pages:30,amount:6500,regularAmount:16900,currency:"pln",country:"PL"});
});

test("offers rounded local prices for the USA and Nordic countries when MULTI_CURRENCY is on",()=>{
 assert.deepEqual(priceForRequest(request("US"),undefined,undefined,8,true),{pages:8,amount:799,regularAmount:1499,currency:"usd",country:"US"});
 assert.deepEqual(priceForRequest(request("SE"),undefined,undefined,8,true),{pages:8,amount:7900,regularAmount:14900,currency:"sek",country:"SE"});
 assert.deepEqual(priceForRequest(request("NO"),undefined,undefined,8,true),{pages:8,amount:6900,regularAmount:14900,currency:"nok",country:"NO"});
 assert.deepEqual(priceForRequest(request("DK"),undefined,undefined,8,true),{pages:8,amount:4900,regularAmount:9900,currency:"dkk",country:"DK"});
 assert.deepEqual(priceForRequest(request("FI"),undefined,undefined,8,true),{pages:8,amount:699,regularAmount:1399,currency:"eur",country:"FI"});
 assert.equal(priceForRequest(request("US"),undefined,undefined,30,true).amount,1699);
});

test("falls back to browser locale outside Cloudflare and keeps configured PLN prices",()=>{
 assert.equal(priceForRequest(request(undefined,"en-US"),undefined,undefined,8,true).currency,"usd");
 assert.deepEqual(priceForRequest(request("DE"),"3900","5900"),{pages:8,amount:3900,regularAmount:5900,currency:"pln",country:"DE"});
 assert.equal(regularAmountForCurrency("sek"),14900);
});

test("launch default charges every country in PLN",()=>{
 for(const country of ["US","SE","NO","DK","FI","DE"])assert.deepEqual(priceForRequest(request(country)),{pages:8,amount:2900,regularAmount:5900,currency:"pln",country});
 assert.equal(priceForRequest(request("US"),undefined,undefined,30).amount,6500);
 assert.ok(pricesForRequest(request("SE")).every(offer=>offer.currency==="pln"));
 assert.ok(pricesForRequest(request("SE"),undefined,undefined,true).every(offer=>offer.currency==="sek"));
 assert.equal(multiCurrency("true"),true);
 for(const value of [undefined,"","false","1","TRUE"])assert.equal(multiCurrency(value),false);
});
