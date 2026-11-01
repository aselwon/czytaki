import LegalDocument from "../legal-document";

export default function PrivacyPage() {
  return <LegalDocument title="Polityka prywatności Czytaki">
    <h2>1. Administrator danych</h2>
    <p>Do uzupełnienia przez właściciela: tożsamość i adres administratora danych oraz adres e-mail do spraw prywatności i żądań usunięcia danych.</p>
    <h2>2. Dane i cele</h2>
    <p>Przetwarzamy przesłane zdjęcie, imię bohatera, dedykację, ustawienia historii, adres e-mail oraz dane zamówienia i potwierdzenia płatności, aby przygotować i dostarczyć PDF oraz obsługiwać zgłoszenia. Dane sesji i adres IP służą także ochronie usługi i limitowaniu żądań. Nie przesyłaj zbędnych danych osobowych.</p>
    <p>Osoba zamawiająca musi mieć prawo do wykorzystania zdjęcia, a w przypadku dziecka odpowiednie uprawnienia rodzica lub opiekuna. Do zatwierdzenia przez właściciela: podstawy prawne poszczególnych celów przetwarzania i zasady dotyczące wizerunku dzieci.</p>
    <h2>3. Dostawcy i przekazywanie danych</h2>
    <p>OpenAI jest przewidziane jako podmiot przetwarzający dane na potrzeby generowania tekstu, ilustracji i moderacji. Zdjęcie przekazujemy do OpenAI dopiero po płatności potwierdzonej zweryfikowanym webhookiem Stripe. Przed płatnością podgląd nie korzysta z płatnego AI. Te zasady wymagają potwierdzenia w działającej usłudze przed zatwierdzeniem szkicu.</p>
    <p>Cloudflare zapewnia hosting, bazę danych i przechowywanie plików; Stripe obsługuje płatności, a Resend dostarczanie wiadomości z PDF. Nie zapisujemy pełnych danych karty płatniczej.</p>
    <p>Do sprawdzenia i uzupełnienia przez właściciela: umowy powierzenia, role dostawców, lokalizacje przetwarzania, ewentualne transfery poza EOG i ich zabezpieczenia oraz okresy przechowywania po stronie dostawców. Usunięcie plików z Czytaki nie określa okresu przechowywania u dostawcy.</p>
    <h2>4. Retencja i usuwanie</h2>
    <p>Zdjęcie źródłowe usuwamy z przestrzeni Czytaki po złożeniu PDF. Automatyczne usuwanie zdjęć po 7 dniach od przesłania obejmuje także porzucone zamówienia.</p>
    <p>Ilustracje, PDF i dane zamówienia są domyślnie usuwane po 30 dniach od utworzenia zamówienia. Pobierz PDF przed upływem tego czasu. Właściciel musi potwierdzić konfigurację retencji i działanie harmonogramu oraz określić osobno obowiązkowe okresy przechowywania dokumentacji rozliczeniowej.</p>
    <h2>5. Twoje prawa i kontakt</h2>
    <p>Możesz zgłosić żądanie dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania lub przeniesienia danych, a także sprzeciw — w zakresie wynikającym z właściwej podstawy przetwarzania. Jeżeli podstawą jest zgoda, możesz ją wycofać. Możesz również wnieść skargę do Prezesa UODO.</p>
    <p>Żądanie usunięcia danych kieruj do administratora, podając numer zamówienia; przed usunięciem może być konieczna weryfikacja uprawnienia do danych. Kontakt i procedurę właściciel uzupełni przed sprzedażą.</p>
  </LegalDocument>;
}
