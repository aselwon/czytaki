import Link from "next/link";
import LegalLinks from "./legal-links";
import {LEGAL_VERSION_DATE,sellerComplete} from "@/lib/seller";
import "./legal.css";

export default function LegalDocument({title,children}:{title:string;children:React.ReactNode}) {
  return <div className="legal-document">
    <header><Link href="/">Czytaki — wróć do kreatora</Link></header>
    <main>
      <h1>{title}</h1>
      {sellerComplete()
        ?<p className="legal-version">Wersja obowiązująca od {LEGAL_VERSION_DATE}</p>
        :<p className="legal-draft"><strong>Szkic do akceptacji właściciela — niezatwierdzony do sprzedaży.</strong> Wersja z {LEGAL_VERSION_DATE} Brakuje danych sprzedawcy, więc sprzedaż pozostaje wyłączona.</p>}
      {children}
    </main>
    <footer><LegalLinks/></footer>
  </div>;
}
