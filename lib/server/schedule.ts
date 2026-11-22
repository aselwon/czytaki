// Cron expressions must match cloudflare.production.json "triggers.crons".
export const RETENTION_CRON="17 2 * * *";
export const ORDERS_CRON="*/2 * * * *";

export function scheduledJob(cron:string):"retention"|"orders"{
 return cron===RETENTION_CRON?"retention":"orders";
}
