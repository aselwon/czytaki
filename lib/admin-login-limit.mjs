// One database statement prevents concurrent failures from losing increments.
export const failedLoginSql = `
INSERT INTO admin_login_attempts (key,count,window_start,blocked_until)
VALUES (?,1,?,0)
ON CONFLICT(key) DO UPDATE SET
 count=CASE WHEN admin_login_attempts.window_start<? THEN 1 ELSE admin_login_attempts.count+1 END,
 window_start=CASE WHEN admin_login_attempts.window_start<? THEN excluded.window_start ELSE admin_login_attempts.window_start END,
 blocked_until=CASE
  WHEN admin_login_attempts.window_start<? THEN CASE WHEN admin_login_attempts.blocked_until>excluded.window_start THEN admin_login_attempts.blocked_until ELSE 0 END
  WHEN admin_login_attempts.count+1>=? THEN MAX(admin_login_attempts.blocked_until,?)
  ELSE admin_login_attempts.blocked_until END`;

export function failedLoginBindings(key,now,windowMs,maxAttempts){
 const cutoff=now-windowMs;
 return [key,now,cutoff,cutoff,cutoff,maxAttempts,now+windowMs];
}
