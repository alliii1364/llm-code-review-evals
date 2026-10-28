// Looks up a user by email for the login page.
export async function findUserByEmail(db: Pool, email: string) {
  const result = await db.query(
    "SELECT id, email, password_hash FROM users WHERE email = '" + email + "'"
  );
  return result.rows[0];
}
