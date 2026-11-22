import Link from "next/link";
import {sellerComplete} from "@/lib/seller";

export default function LegalLinks() {
  const draft=sellerComplete()?"":" (szkic)";
  return <nav aria-label="Dokumenty prawne"><Link href="/regulamin">Regulamin{draft}</Link>{" · "}<Link href="/prywatnosc">Polityka prywatności{draft}</Link></nav>;
}
