// The Workers Free plan allows only 5 cron triggers per account, so Czytaki uses
// a single trigger. Must match cloudflare.production.json "triggers.crons".
export const ORDERS_CRON="*/2 * * * *";
// Retention runs once a day inside the same trigger: the run at 02:00 UTC.
export const RETENTION_HOUR_UTC=2;

export type ScheduledJob="retention"|"orders";

export function scheduledJobs(scheduledTime:number):ScheduledJob[]{
 const at=new Date(scheduledTime);
 // */2 fires on even minutes, so exactly one run per day has minute 0 or 1.
 const retention=at.getUTCHours()===RETENTION_HOUR_UTC&&at.getUTCMinutes()<2;
 return retention?["orders","retention"]:["orders"];
}
