import { redirect } from "next/navigation";

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/disputes/${id}/defense`);
}
