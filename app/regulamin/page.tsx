import Link from "next/link";
import LegalDocument from "../legal-document";
import {SellerDetails,SellerEmail} from "../seller-details";
import {seller} from "@/lib/seller";

export default function TermsPage() {
  return <LegalDocument title="Regulamin Czytaki">
    <h2>1. Sprzedawca i kontakt</h2>
    <p>Serwis Czytaki (czytaki.kredkuj.pl) prowadzi:</p>
    <SellerDetails/>
    <p>Regulamin określa zasady zamawiania spersonalizowanych książeczek w formie pliku PDF. Regulamin jest dostępny bezpłatnie na tej stronie i można go zapisać lub wydrukować.</p>

    <h2>2. Pojęcia</h2>
    <ul>
      <li><strong>Klient</strong> — pełnoletnia osoba fizyczna, osoba prawna lub jednostka organizacyjna składająca zamówienie.</li>
      <li><strong>Konsument</strong> — Klient będący osobą fizyczną, który zawiera umowę niezwiązaną bezpośrednio z jego działalnością gospodarczą lub zawodową. Przepisy o konsumentach stosuje się także do osoby fizycznej prowadzącej działalność gospodarczą, jeżeli umowa nie ma dla niej charakteru zawodowego.</li>
      <li><strong>Książeczka</strong> — treść cyfrowa: spersonalizowany komiks, historia lub bajka w pliku PDF (8, 15 lub 30 stron), przygotowana z pomocą sztucznej inteligencji na podstawie zdjęcia i ustawień Klienta.</li>
    </ul>

    <h2>3. Wymagania techniczne</h2>
    <p>Do złożenia zamówienia potrzebne są: aktualna przeglądarka internetowa z włączoną obsługą JavaScript i plików cookie, adres e-mail oraz program do odczytu plików PDF. Książeczkę można czytać na ekranie lub wydrukować na własny użytek.</p>

    <h2>4. Zamówienie i zawarcie umowy</h2>
    <p>Klient przesyła zdjęcie, wybiera bohatera, format, świat, styl ilustracji, długość i dedykację, a następnie podaje adres e-mail. Przed płatnością widzi podsumowanie zamówienia z ceną. Przykładowy podgląd przed płatnością nie jest gotową książeczką.</p>
    <p>Złożenie zamówienia wymaga akceptacji regulaminu i wyrażenia zgody opisanej w pkt 8. Umowa zostaje zawarta z chwilą potwierdzenia płatności. Potwierdzenie zawarcia umowy i dostarczenia Książeczki Klient otrzymuje e-mailem.</p>

    <h2>5. Ceny i płatności</h2>
    <p>Ceny podane przed płatnością są cenami końcowymi{seller.vatPayer?" i zawierają podatek VAT":""}. Płatność jest jednorazowa, bez abonamentu. Płatności obsługuje Stripe Payments Europe, Ltd.; dostępne metody płatności są widoczne na stronie płatności. Sprzedawca nie otrzymuje pełnych danych karty płatniczej.</p>

    <h2>6. Realizacja i dostarczenie</h2>
    <p>Przygotowanie Książeczki rozpoczyna się po potwierdzeniu płatności. Zwykle trwa od kilku do kilkudziesięciu minut. Ze względu na dzienny limit generowania może się wydłużyć, nie dłużej jednak niż do 7 dni od płatności. Klient nie musi pozostawać na stronie: gotowy plik PDF zostanie wysłany na podany adres e-mail i będzie dostępny do pobrania na stronie zamówienia.</p>
    <p>Pliki są przechowywane na serwerze czasowo (pkt 4 <Link href="/prywatnosc">polityki prywatności</Link>). Klient powinien zapisać własną kopię PDF.</p>

    <h2>7. Zdjęcie i treści przesyłane przez Klienta</h2>
    <p>Klient przesyła wyłącznie zdjęcie, do którego wykorzystania ma prawo. Jeżeli zdjęcie przedstawia dziecko, Klient oświadcza, że jest jego rodzicem lub opiekunem albo ma ich zgodę. Zabronione jest przesyłanie treści bezprawnych, naruszających dobra osobiste lub prawa innych osób.</p>
    <p>Zdjęcia, teksty i wynik są automatycznie sprawdzane pod kątem bezpieczeństwa treści dla dzieci. Jeżeli zamówienie zostanie zablokowane po płatności, Sprzedawca zwraca płatność. Klient może poprosić o weryfikację blokady przez człowieka.</p>

    <h2>8. Prawo odstąpienia od umowy</h2>
    <p>Konsument może co do zasady odstąpić od umowy zawartej na odległość w terminie 14 dni bez podania przyczyny. Zgodnie z art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta prawo to nie przysługuje w przypadku umowy o dostarczanie treści cyfrowej niedostarczanej na nośniku materialnym, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną i uprzednią zgodą Konsumenta, który został poinformowany przed rozpoczęciem świadczenia, że po jego spełnieniu utraci prawo odstąpienia od umowy, i przyjął to do wiadomości.</p>
    <p>Książeczka jest przygotowywana indywidualnie zaraz po płatności, dlatego zamówienie wymaga takiej zgody. Zgodę Klient wyraża osobnym polem przed płatnością, a jej potwierdzenie otrzymuje e-mailem razem z Książeczką. Nie ogranicza to praw z tytułu niezgodności Książeczki z umową (pkt 10).</p>

    <h2>9. Sztuczna inteligencja i korzystanie z Książeczki</h2>
    <p>Tekst i ilustracje powstają z pomocą modeli sztucznej inteligencji (OpenAI). Nie gwarantujemy podobieństwa bohatera do osoby lub zwierzęcia ze zdjęcia; ilustracje mają charakter artystycznej interpretacji.</p>
    <p>Klient może korzystać z Książeczki na własny, niekomercyjny użytek: czytać ją, drukować, przekazywać rodzinie i znajomym. W zakresie, w jakim Sprzedawcy przysługują prawa do Książeczki, Klient otrzymuje na ten cel nieodpłatną, niewyłączną licencję nieograniczoną czasowo i terytorialnie. Odsprzedaż i inne komercyjne wykorzystanie wymagają odrębnej zgody.</p>

    <h2>10. Reklamacje</h2>
    <p>Sprzedawca odpowiada za zgodność Książeczki z umową na zasadach rozdziału 5b ustawy o prawach konsumenta. Książeczka jest niezgodna z umową np. wtedy, gdy nie została dostarczona, plik nie otwiera się, ma inną liczbę stron niż zamówiona albo pomija dane podane w zamówieniu (imię bohatera, dedykację).</p>
    <p>Reklamację można zgłosić e-mailem na adres <SellerEmail/>, podając numer zamówienia z wiadomości e-mail i opis problemu. Sprzedawca odpowiada w ciągu 14 dni. Konsument może żądać doprowadzenia Książeczki do zgodności z umową (np. ponownego przygotowania lub dostarczenia), a gdy nie jest to możliwe lub nie nastąpi w rozsądnym czasie — obniżenia ceny albo odstąpienia od umowy i zwrotu płatności. Zwrot wykonuje ręcznie Sprzedawca przez Stripe, na tę samą metodę płatności, w ciągu 14 dni od uznania reklamacji.</p>

    <h2>11. Pozasądowe rozwiązywanie sporów</h2>
    <p>Konsument może skorzystać z pomocy miejskiego lub powiatowego rzecznika konsumentów, organizacji konsumenckich oraz wojewódzkiego inspektoratu Inspekcji Handlowej. Informacje są dostępne na stronie <a href="https://uokik.gov.pl" rel="noopener noreferrer">uokik.gov.pl</a>. Skorzystanie z tych sposobów jest dobrowolne.</p>

    <h2>12. Dane osobowe</h2>
    <p>Zasady przetwarzania danych osobowych, w tym zdjęć, opisuje <Link href="/prywatnosc">polityka prywatności</Link>.</p>

    <h2>13. Postanowienia końcowe</h2>
    <p>Do umów zawieranych przez serwis stosuje się prawo polskie. Wybór prawa nie pozbawia Konsumenta ochrony przysługującej mu na podstawie bezwzględnie obowiązujących przepisów państwa jego zwykłego pobytu. Zmiana regulaminu nie dotyczy zamówień złożonych przed jej wejściem w życie.</p>
  </LegalDocument>;
}
