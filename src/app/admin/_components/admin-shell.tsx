import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/app/_components/brand";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@/app/_components/ui/cn";
import { logoutAction } from "../auth-actions";

export type AdminNavKey = "credentials" | "studio";

interface NavItem {
  key: AdminNavKey | "loop";
  label: string;
  href: string;
  soon?: boolean;
}

const NAV: readonly NavItem[] = [
  { key: "studio", label: "ドクトリン・スタジオ", href: "/admin/studio" },
  { key: "credentials", label: "認証情報", href: "/admin/credentials" },
  { key: "loop", label: "改善ループ", href: "#", soon: true },
];

interface AdminShellProps {
  active: AdminNavKey;
  title: string;
  sessionSub: string;
  children: ReactNode;
}

export function AdminShell({ active, title, sessionSub, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* ---------- Sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/40 p-5 lg:flex">
        <div className="px-1.5 py-2">
          <Brand size={24} />
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map((item) =>
            item.soon ? (
              <span
                key={item.key}
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-subtle opacity-50"
              >
                {item.label}
                <span className="text-[10px] uppercase text-faint">soon</span>
              </span>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.key === active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  item.key === active
                    ? "bg-accent-soft text-accent"
                    : "text-subtle hover:bg-surface-2 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="lg:hidden">
              <Brand size={24} />
            </div>
            <h1 className="sr-only font-display text-lg font-semibold tracking-tight text-ink lg:not-sr-only lg:block">
              {title}
            </h1>
            <div className="flex items-center gap-3">
              <Badge tone="success" dot>
                {sessionSub}
              </Badge>
              <form action={logoutAction} className="lg:hidden">
                <button
                  type="submit"
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-subtle transition-colors hover:border-line-strong hover:text-ink"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
