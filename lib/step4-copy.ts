type Step4OrderState = {
  paymentStatus: string;
  status: string;
  generated: number;
  deliveryStatus: string;
  email?: string;
};

const unpaidCopy = "Po potwierdzeniu płatności wyślemy gotową książeczkę jako załącznik PDF.";

export function step4Copy(order?: Step4OrderState | null): string {
  if (!order || order.paymentStatus !== "paid") return unpaidCopy;
  if (order.deliveryStatus === "sent") {
    return `Gotowe! Książeczka PDF została wysłana${order.email ? ` na ${order.email}` : " na podany adres e-mail"}.`;
  }
  if (order.deliveryStatus === "failed") {
    return "Nie udało się wysłać książeczki. Spróbuj ponownie przyciskiem „Sprawdź wysyłkę” lub skontaktuj się z nami.";
  }
  if (["ready", "assembled", "delivered"].includes(order.status)) {
    return "Książeczka jest gotowa. Kończymy wysyłkę PDF na podany e-mail.";
  }
  return "Płatność przyjęta. Tworzymy Twoją książeczkę – wyślemy ją jako PDF na podany e-mail.";
}
