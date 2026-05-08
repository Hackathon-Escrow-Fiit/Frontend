"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  WalletIcon,
} from "@heroicons/react/24/outline";

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
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-52 shrink-0 bg-base-100 border-r border-base-300 flex flex-col h-full">
      <div className="px-5 py-5 border-b border-base-200">
        <p className="font-bold text-primary text-sm">DocentraWork</p>
        <p className="text-[10px] text-base-content/50 mt-0.5">Verified ENS Identity</p>
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
      </div>
    </aside>
  );
};
