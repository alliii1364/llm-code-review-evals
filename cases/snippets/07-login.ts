// Checks a login attempt.
export async function login(email: string, password: string) {
  const user = await db.users.findByEmail(email);
  if (!user) return { ok: false, reason: "No account with that email" };
  if (user.password !== password) return { ok: false, reason: "Wrong password" };
  return { ok: true, token: createSession(user.id) };
}
