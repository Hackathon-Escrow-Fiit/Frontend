"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { blo } from "blo";
import { useAccount } from "wagmi";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  UserCircleIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useDecentraWorkRegistry } from "~~/hooks/scaffold-eth";

type NavItem = {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", Icon: Squares2X2Icon },
  { label: "Messages", href: "/messages", Icon: ChatBubbleLeftRightIcon },
  { label: "My Tasks", href: "/my-tasks", Icon: ClipboardDocumentListIcon },
  { label: "Disputes", href: "/disputes", Icon: ShieldExclamationIcon },
  { label: "Wallet", href: "/wallet", Icon: WalletIcon },
  { label: "Profile", href: "/profile", Icon: UserCircleIcon },
];

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/settings", Icon: Cog6ToothIcon },
  { label: "Support", href: "/support", Icon: QuestionMarkCircleIcon },
];

const NavLink = ({ item, active }: { item: NavItem; active: boolean }) => (
  <Link
    href={item.href}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
      active
        ? "bg-primary text-primary-content font-medium"
        : "text-base-content/60 hover:bg-base-200 hover:text-base-content"
    }`}
  >
    <item.Icon className="w-4 h-4 shrink-0" />
    {item.label}
  </Link>
);

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { address } = useAccount();
  const { currentName } = useDecentraWorkRegistry();
  const [role, setRole] = useState<"client" | "freelancer">("client");

  useEffect(() => {
    const stored = localStorage.getItem("dw_role");
    if (stored === "freelancer" || stored === "client") setRole(stored);
  }, []);

  const toggleRole = () => {
    const next = role === "client" ? "freelancer" : "client";
    localStorage.setItem("dw_role", next);
    setRole(next);
    router.refresh();
  };

  const isActive = (href: string) => {
    if (pathname === href || pathname.startsWith(href + "/")) return true;
    if (href === "/dashboard" && pathname.startsWith("/browse")) return true;
    return false;
  };

  return (
    <aside className="w-52 shrink-0 bg-base-100 border-r border-base-300 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-base-200 flex items-center gap-3">
        {address && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={blo(address as `0x${string}`)} alt="avatar" className="w-8 h-8 rounded-full shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-bold text-primary text-sm truncate">
            {currentName ? `${currentName}.eth` : "DecentraWork"}
          </p>
          <p className="text-[10px] text-base-content/50 mt-0.5">Verified ENS Identity</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3">
        {mainNav.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-base-200">
        {bottomNav.map(item => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <button
          onClick={toggleRole}
          className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
        >
          <span className="text-[10px] font-bold tracking-widest text-base-content/40 uppercase">Role</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              role === "client" ? "bg-info/15 text-info" : "bg-success/15 text-success"
            }`}
          >
            {role}
          </span>
        </button>
      </div>
    </aside>
  );
};
