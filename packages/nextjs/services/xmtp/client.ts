import { Client, IdentifierKind } from "@xmtp/browser-sdk";
import type { XmtpEnv } from "@xmtp/browser-sdk";
import type { WalletClient } from "viem";
import { hexToBytes } from "viem";

// Singleton map: address → Client
const clients = new Map<string, Client>();

function makeSigner(walletClient: WalletClient) {
  const address = walletClient.account!.address;
  return {
    type: "EOA" as const,
    getIdentifier: () => ({ identifier: address, identifierKind: IdentifierKind.Ethereum }),
    signMessage: async (message: string): Promise<Uint8Array> => {
      const sig = await walletClient.signMessage({ account: walletClient.account!, message });
      return hexToBytes(sig);
    },
  };
}

const XMTP_ENV: XmtpEnv = (process.env.NEXT_PUBLIC_XMTP_ENV as XmtpEnv) ?? "dev";

export async function getXmtpClient(walletClient: WalletClient): Promise<Client> {
  const address = walletClient.account?.address;
  if (!address) throw new Error("Wallet not connected");

  const existing = clients.get(address);
  if (existing) return existing;

  const signer = makeSigner(walletClient);
  // ClientOptions union type doesn't distribute through Omit, so cast is needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = await Client.create(signer, { env: XMTP_ENV } as any);
  clients.set(address, client);
  return client;
}

export function clearXmtpClient(address: string) {
  clients.delete(address);
}
