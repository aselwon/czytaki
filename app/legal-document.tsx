import Link from "next/link";
import LegalLinks from "./legal-links";
import "./legal.css";

export default function LegalDocument({title,children}:{title:string;children:React.ReactNode}) {
  return <div className="legal-document">
    <header><Link href="/">Czytaki — wróć do kreatora</Link></header>
    <main>
      <h1>{title}</h1>
      <p className="legal-draft"><strong>Szkic do akceptacji właściciela — niezatwierdzony do sprzedaży.</strong> Wersja z 1 listopada 2026 r. Przed uruchomieniem sprzedaży właściciel musi uzupełnić dane i zatwierdzić treść oraz zgodność z działaniem usługi.</p>
      {children}
    </main>
    <footer><LegalLinks/></footer>
  </div>;
}
