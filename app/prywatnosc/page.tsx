import Link from "next/link";
import LegalDocument from "../legal-document";
import {SellerDetails,SellerEmail} from "../seller-details";

export default function PrivacyPage() {
  return <LegalDocument title="Polityka prywatności Czytaki">
    <h2>1. Administrator danych</h2>
    <p>Administratorem danych osobowych przetwarzanych w serwisie Czytaki jest:</p>
    <SellerDetails/>
    <p>W sprawach danych osobowych pisz na adres <SellerEmail/>.</p>

    <h2>2. Jakie dane przetwarzamy</h2>
    <ul>
      <li>przesłane zdjęcie, w tym wizerunek osoby (również dziecka) lub zwierzęcia;</li>
      <li>imię bohatera, dedykację, tytuł i ustawienia historii;</li>
      <li>adres e-mail, numer i stan zamówienia, kwotę, walutę oraz potwierdzenie płatności otrzymane od Stripe (bez pełnych danych karty);</li>
      <li>datę i treść zgód złożonych przy zamówieniu;</li>
      <li>dane techniczne: adres IP, identyfikator sesji w pliku cookie, dzienniki serwera.</li>
    </ul>
    <p>Nie przesyłaj danych, które nie są potrzebne do przygotowania książeczki.</p>

    <h2>3. Cele i podstawy prawne</h2>
    <ul>
      <li><strong>Przygotowanie i dostarczenie książeczki, obsługa reklamacji</strong> — wykonanie umowy (art. 6 ust. 1 lit. b RODO). Zdjęcie służy wyłącznie jako odniesienie dla ilustracji w zamówionej książeczce; nie używamy go do jednoznacznej identyfikacji osoby.</li>
      <li><strong>Obowiązki rachunkowe i podatkowe</strong> — obowiązek prawny (art. 6 ust. 1 lit. c RODO).</li>
      <li><strong>Bezpieczeństwo serwisu, zapobieganie nadużyciom, ustalenie i dochodzenie roszczeń</strong> — prawnie uzasadniony interes administratora (art. 6 ust. 1 lit. f RODO).</li>
    </ul>
    <p>Wizerunek dziecka przetwarzamy wyłącznie na zlecenie rodzica lub opiekuna, który składa zamówienie. Podanie danych jest dobrowolne, ale niezbędne do realizacji zamówienia. Treści są automatycznie moderowane pod kątem bezpieczeństwa dla dzieci; w razie blokady możesz poprosić o weryfikację przez człowieka. Nie profilujemy klientów w celach marketingowych.</p>

    <h2>4. Retencja i usuwanie</h2>
    <p>Zdjęcie trafia do generatora dopiero po płatności potwierdzonej przez Stripe. Zdjęcie źródłowe usuwamy z przestrzeni Czytaki po złożeniu PDF. Automatyczne usuwanie zdjęć po 7 dniach od przesłania obejmuje także porzucone zamówienia.</p>
    <p>Ilustracje, PDF i dane zamówienia usuwamy automatycznie po 30 dniach od utworzenia zamówienia. Wcześniej możesz je usunąć sam linkiem z wiadomości e-mail albo na <Link href="/usun-dane">stronie usuwania danych</Link>. Dokumenty rozliczeniowe przechowujemy przez okres wymagany przepisami podatkowymi (zwykle 5 lat od końca roku podatkowego).</p>

    <h2>5. Odbiorcy danych</h2>
    <p>Korzystamy z dostawców, którzy przetwarzają dane w naszym imieniu jako podmiot przetwarzający, na podstawie umów powierzenia:</p>
    <ul>
      <li><strong>Cloudflare</strong> — hosting, baza danych i prywatne przechowywanie plików;</li>
      <li><strong>OpenAI</strong> — generowanie tekstu i ilustracji oraz moderacja treści, dopiero po płatności. Zgodnie z zasadami OpenAI dla API dane nie są używane do trenowania modeli i mogą być przechowywane do 30 dni w celu wykrywania nadużyć;</li>
      <li><strong>Resend</strong> — wysyłka wiadomości e-mail z książeczką.</li>
    </ul>
    <p><strong>Stripe</strong> obsługuje płatności i w zakresie własnych obowiązków (np. przeciwdziałania oszustwom i praniu pieniędzy) działa jako odrębny administrator. Dane mogą otrzymać także podmioty prowadzące księgowość oraz organy uprawnione na podstawie przepisów.</p>
    <p>Część dostawców przetwarza dane w USA. Przekazanie odbywa się na podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony (EU-US Data Privacy Framework) wobec podmiotów nią objętych albo standardowych klauzul umownych zatwierdzonych przez Komisję. Kopię zabezpieczeń można uzyskać, pisząc do administratora.</p>

    <h2>6. Twoje prawa</h2>
    <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania i przenoszenia, a także prawo sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Żądanie wyślij na adres <SellerEmail/>, podając numer zamówienia; odpowiadamy w ciągu miesiąca. Możesz też wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (ul. Stawki 2, 00-193 Warszawa).</p>

    <h2>7. Pliki cookie i pamięć przeglądarki</h2>
    <p>Używamy wyłącznie niezbędnych plików cookie: <code>czytaki_session</code> wiąże zamówienia z Twoją przeglądarką, a <code>czytaki_admin</code> i <code>__Host-czytaki_test_checkout</code> służą obsłudze serwisu. W pamięci przeglądarki (localStorage) zapisujemy ustawienia kreatora i numer ostatniego zamówienia, aby można było do niego wrócić. Nie używamy plików cookie analitycznych ani reklamowych.</p>
  </LegalDocument>;
}
