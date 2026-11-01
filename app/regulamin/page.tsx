import Link from "next/link";
import LegalDocument from "../legal-document";

export default function TermsPage() {
  return <LegalDocument title="Regulamin Czytaki">
    <h2>1. Sprzedawca i kontakt</h2>
    <p>Do uzupełnienia przez właściciela przed sprzedażą: pełna nazwa sprzedawcy, adres, dane rejestrowe i podatkowe oraz adres e-mail do kontaktu i reklamacji.</p>
    <h2>2. Produkt i zamówienie</h2>
    <p>Czytaki oferuje dorosłym klientom spersonalizowane komiksy, historie i bajki w pliku PDF, w wariantach 8, 15 lub 30 stron. Nie obejmuje to druku ani wysyłki fizycznej. Cenę i walutę zamówienia pokazujemy przed płatnością. Płatność jest jednorazowa i obsługiwana przez Stripe.</p>
    <p>Docelowy przebieg usługi: podgląd przed zakupem jest przykładem, a ilustracje powstaną po płatności. Zdjęcie jest przekazywane do OpenAI dopiero po potwierdzeniu płatności zweryfikowanym webhookiem Stripe. Po przygotowaniu książeczki PDF otrzymasz na podany adres e-mail. Właściciel musi potwierdzić ten przebieg i termin realizacji przed zatwierdzeniem regulaminu.</p>
    <h2>3. Zdjęcie i wynik AI</h2>
    <p>Przesyłaj tylko zdjęcie, którego masz prawo użyć. W przypadku dziecka wymagane jest uprawnienie rodzica lub opiekuna do wykorzystania jego wizerunku. Zdjęcie służy do stworzenia zamówionej książeczki.</p>
    <p>Tekst i ilustracje powstają z pomocą AI. Nie gwarantujemy podobieństwa bohatera do osoby lub obiektu ze zdjęcia. Wynik może zawierać niedokładności; nie wyłącza to możliwości zgłoszenia reklamacji.</p>
    <h2>4. Reklamacje, zwroty i odstąpienie</h2>
    <p>Reklamację dotyczącą pliku, płatności lub realizacji zamówienia należy zgłosić sprzedawcy, podając numer zamówienia i opis problemu. Nie przesyłaj ponownie zdjęcia, jeśli nie jest to potrzebne.</p>
    <p>W razie błędu generowania po płatności sprawę rozpatruje właściciel; ewentualny zwrot wykonuje ręcznie przez Stripe. Zwroty nie są automatyczne.</p>
    <p>Do zatwierdzenia przez właściciela: kontakt i terminy obsługi reklamacji, procedura zwrotu oraz zasady odstąpienia od umowy o treść cyfrową. Akceptacja tego szkicu nie jest oświadczeniem o utracie prawa odstąpienia i nie ogranicza ustawowych praw klienta.</p>
    <h2>5. Dane i dostęp do pliku</h2>
    <p>Zasady usuwania zdjęć oraz przechowywania ilustracji i PDF opisuje <Link href="/prywatnosc">polityka prywatności (szkic)</Link>. Pobierz i zachowaj własną kopię PDF — dostęp na serwerze jest czasowy.</p>
  </LegalDocument>;
}
