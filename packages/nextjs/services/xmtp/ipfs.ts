const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export async function uploadToIpfs(data: Uint8Array, filename: string): Promise<string> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) throw new Error("NEXT_PUBLIC_PINATA_JWT is not set");

  const form = new FormData();
  form.append("file", new Blob([data]), filename);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const { IpfsHash } = (await res.json()) as { IpfsHash: string };
  return `${PINATA_GATEWAY}/${IpfsHash}`;
}
