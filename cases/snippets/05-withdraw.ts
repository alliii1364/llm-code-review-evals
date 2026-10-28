// Withdraws money from a wallet. Called from an HTTP endpoint.
export async function withdraw(walletId: string, amount: number) {
  const wallet = await db.wallets.findById(walletId);
  if (wallet.balance < amount) {
    throw new Error("Insufficient funds");
  }
  await db.wallets.update(walletId, { balance: wallet.balance - amount });
}
