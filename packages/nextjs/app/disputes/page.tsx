"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DisputesRedirect() {
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("dw_role");
    router.replace(role === "freelancer" ? "/disputes/all" : "/disputes/mine");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}
