"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TaskRedirect() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    router.replace(`/my-tasks/${id}/bids`);
  }, [id, router]);

  return null;
}
