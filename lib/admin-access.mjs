// CR-251: /admin/* is for the emails in BH_ADMIN_EMAILS (comma separated). Anyone else gets a 404.
export function adminEmails(env = process.env) {
  return String(env.BH_ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export function isAdminEmail(email, env = process.env) {
  return typeof email === 'string' && email.length > 0 && adminEmails(env).includes(email.trim().toLowerCase());
}
