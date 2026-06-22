"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/schedule", label: "Schedule" },
  { href: "/family", label: "Members" },
  { href: "/notes", label: "Notes" },
];

export function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <div className="flex w-full">
        {links.map(({ href, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center py-3 text-xs font-medium"
              style={{ color: isActive ? "#d4a853" : "#8a7f72" }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {links.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center rounded-[0.625rem] px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "" : "text-secondary hover:bg-row"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: "rgba(212, 168, 83, 0.15)",
                      color: "#d4a853",
                    }
                  : undefined
              }
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
