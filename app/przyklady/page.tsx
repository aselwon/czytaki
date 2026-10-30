import './examples.css';
import Link from "next/link";
const examples=[
 {slug:'maja',name:'Maja',kind:'Dziecko · magiczny las',title:'Maja i szept lasu',split:512},
 {slug:'figo',name:'Figo',kind:'Pies · morska przygoda',title:'Figo i morska wyprawa',split:500},
 {slug:'olek',name:'Olek',kind:'Dziecko · kosmiczna wyprawa',title:'Olek i zagubiona gwiazda',split:456},
 {slug:'julia',name:'Julia',kind:'Dorosła bohaterka · sekretny ogród',title:'Julia i ogród sekretów',split:432},
 {slug:'luna',name:'Luna',kind:'Kot · nocne miasteczko',title:'Luna i nocne latarnie',split:412},
];
export default function Examples(){return <div className="examples-page">
 <header className="examples-nav"><Link href="/" className="examples-brand">czytaki<span>.</span></Link><Link href="/">Stwórz własną historię ↗</Link></header>
 <main className="examples-main"><section className="examples-intro"><span className="examples-eyebrow">MAŁE ZDJĘCIE. WIELKA PRZYGODA.</span><h1>Zobacz, kto może<br/>zostać <em>bohaterem.</em></h1><p>Od zdjęcia do świata wyobraźni. Pięć bohaterów, pięć przygód i prawdziwe fragmenty PDF-ów — z dialogami, nie tylko ilustracjami.</p><div className="examples-disclosure">Galeria demonstracyjna: zdjęcia referencyjne i ilustracje są wygenerowane przez AI. Pokazujemy pojedyncze plansze z rozdziału 3, nie okładki ani pełne książki.</div></section>
 {examples.map((e,i)=><article className="example-card" key={e.slug}><div className="example-heading"><span>0{i+1} / {e.kind}</span><h2>{e.title}</h2></div><div className="example-comparison"><figure className="example-reference"><figcaption>01 — ZDJĘCIE REFERENCYJNE</figcaption><div className="example-photo"><img src={`/examples/${e.slug}-source.png`} alt={`Syntetyczne zdjęcie referencyjne: ${e.name}`} loading="lazy" style={{width:`${1536/e.split*100}%`}}/></div><p>Poznaj bohatera: <strong>{e.name}</strong><br/><small>Zdjęcie demonstracyjne wygenerowane przez AI</small></p></figure><figure className="example-result"><figcaption>02 — FRAGMENT PDF Z DYMKAMI</figcaption><a href={`/examples/${e.slug}.pdf`} target="_blank" rel="noreferrer" aria-label={`Otwórz PDF: ${e.title}`}><img src={`/examples/${e.slug}-page.png`} alt={`Strona komiksu „${e.title}” z pięcioma wypełnionymi dymkami i narracją`} loading="lazy" width="990" height="1400"/></a><a className="example-pdf-link" href={`/examples/${e.slug}.pdf`} target="_blank" rel="noreferrer">Powiększ / pobierz fragment PDF ↗</a></figure></div></article>)}
 <section className="examples-cta"><h2>A teraz Wasza kolej.</h2><p>Wybierz zdjęcie, świat i bohatera swojej opowieści.</p><Link href="/">Stwórz własny komiks →</Link></section></main><footer className="examples-footer">Opowieść i ilustracje przygotowano z pomocą AI.</footer>
 </div>;}
