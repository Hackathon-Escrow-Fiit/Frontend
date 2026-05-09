"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useDecentraWorkRegistry } from "~~/hooks/scaffold-eth";

export const AppHeader = () => {
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const { role: onChainRole } = useDecentraWorkRegistry();

  useEffect(() => {
    if (onChainRole) {
      setRole(onChainRole);
      return;
    }
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "dw_role" && (e.newValue === "client" || e.newValue === "freelancer")) {
        setRole(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [onChainRole]);

  const navLinks =
    role === "client"
      ? [
          { label: "Post a Job", href: "/post-task" },
          { label: "Explore Freelancers", href: "/explore" },
        ]
      : [
          { label: "Find Work", href: "/find-work" },
          { label: "Explore Freelancers", href: "/explore" },
        ];

  return (
    <header className="h-14 shrink-0 bg-base-100 border-b border-base-300 flex items-center px-5">
      <nav className="flex-1 flex items-center justify-center gap-8">
        {navLinks.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-base-content/60 hover:text-base-content transition-colors whitespace-nowrap"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Link
        href="/profile"
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
      >
        <UserCircleIcon className="w-5 h-5 text-primary-content" />
      </Link>
    </header>
  );
};
