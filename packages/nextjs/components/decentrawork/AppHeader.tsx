"use client";

import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { UserCircleIcon } from "@heroicons/react/24/solid";

const navLinks = [
  { label: "Post a Task", href: "/post-task" },
  { label: "Find Work", href: "/find-work" },
  { label: "Explore Freelancers", href: "/explore" },
];

export const AppHeader = () => (
  <header className="h-14 shrink-0 bg-base-100 border-b border-base-300 flex items-center px-5 gap-4">
    <div className="relative w-56 shrink-0">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40 pointer-events-none" />
      <input
        type="text"
        placeholder="Search conversations..."
        className="input input-sm w-full pl-9 bg-base-200 border-transparent focus:border-primary text-sm rounded-lg"
      />
    </div>

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

    <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">
      <UserCircleIcon className="w-5 h-5 text-primary-content" />
    </button>
  </header>
);
