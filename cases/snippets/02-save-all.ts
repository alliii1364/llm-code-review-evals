// Saves every user, then reports how many were saved.
export async function saveAll(users: User[], db: Db): Promise<string> {
  let saved = 0;
  users.forEach(async (user) => {
    await db.save(user);
    saved++;
  });
  return `Saved ${saved} users`;
}
