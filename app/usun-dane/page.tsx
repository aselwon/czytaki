"use client";
import {useSearchParams} from "next/navigation";
import {useState} from "react";

export default function DeleteDataPage(){
 const token=useSearchParams().get("token")||"",[done,setDone]=useState(false),[error,setError]=useState("");
 async function remove(){const response=await fetch("/api/orders/delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});if(response.ok)setDone(true);else{const body=await response.json().catch(()=>({error:undefined})) as {error?:string};setError(body.error||"Nie udało się usunąć danych.");}}
 return <main className="admin-login"><section><h1>{done?"Dane usunięte":"Usunąć zamówienie i pliki?"}</h1><p>{done?"Zamówienie oraz powiązane pliki zostały usunięte.":"Ta operacja jest nieodwracalna. Usuniemy rekord zamówienia i pliki przechowywane do jego realizacji."}</p>{!done&&<><button className="button primary" onClick={remove} disabled={!token}>Usuń moje dane</button>{error&&<p role="alert">{error}</p>}</>}</section></main>;
}
