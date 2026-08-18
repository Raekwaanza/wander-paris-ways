import { Link } from "@tanstack/react-router";
import { Bookmark, Map, User } from "lucide-react";

const items = [
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="pointer-events-auto sticky bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="group flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-muted-foreground transition-colors data-[status=active]:text-primary"
            >
              <Icon className="size-[22px]" strokeWidth={1.75} />
              <span className="text-[11px] font-medium tracking-wide">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
