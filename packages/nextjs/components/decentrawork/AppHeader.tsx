"use client";

import Link from "next/link";
import { UserCircleIcon } from "@heroicons/react/24/solid";

const navLinks = [
  { label: "Post a Task", href: "/post-task" },
  { label: "Find Work", href: "/find-work" },
  { label: "Explore Freelancers", href: "/explore" },
];

export const AppHeader = () => (
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

    <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">
      <UserCircleIcon className="w-5 h-5 text-primary-content" />
    </button>
  </header>
);
