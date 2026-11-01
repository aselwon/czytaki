import Link from "next/link";

export default function LegalLinks() {
  return <nav aria-label="Dokumenty prawne"><Link href="/regulamin">Regulamin (szkic)</Link>{" · "}<Link href="/prywatnosc">Polityka prywatności (szkic)</Link></nav>;
}
