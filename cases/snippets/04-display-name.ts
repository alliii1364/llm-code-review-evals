// Shows the user's display name in the page header.
// findUser returns undefined when no user has that id.
export async function headerName(userId: string): Promise<string> {
  const user = await findUser(userId);
  return user.profile.displayName.trim();
}
