import { useMemo } from "react";
import { useAuth } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";
import { Bell, CalendarDays, LogOut, Search, Sparkles } from "lucide-react";

export default function Topbar() {
  const { user, logout } = useAuth();
  const today = useMemo(() => new Date().toLocaleDateString(), []);

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10">
      <div className="flex items-center gap-4 p-4 lg:p-6">
        <div className="lg:hidden flex items-center gap-2 rounded-2xl border bg-white/90 px-3 py-2">
          <Sparkles className="h-4 w-4" />
          <span className="font-display text-xl">F64</span>
        </div>
        {user?.role === "student" && (
          <div className="flex-1">
            <div className="flex max-w-2xl items-center gap-3 rounded-2xl border bg-white/90 px-4 py-3 shadow-sm transition focus-within:border-black/30 focus-within:shadow-md">
              <Search className="h-4 w-4 text-ink/50" />
              <input
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Search mocks, attempts, or study tracks..."
              />
            </div>
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-2xl border bg-white/90 px-3 py-2 text-xs text-ink/60">
            <CalendarDays className="h-4 w-4 text-ink/60" />
            <div>
              <div>Today</div>
              <div className="font-medium text-ink">{today}</div>
            </div>
          </div>
          <ThemeToggle />
          <button className="hidden h-11 w-11 items-center justify-center rounded-2xl border bg-white/90 text-ink/70 transition hover:bg-black hover:text-white md:flex" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-2xl border bg-white/90 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
              {(user?.name || "F").slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden text-sm sm:block">
              <div className="font-medium">{user?.name}</div>
              <div className="text-black/50 dark:text-white/60">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className="flex h-11 items-center gap-2 rounded-2xl border border-black/10 bg-white/90 px-3 text-sm transition hover:bg-black hover:text-white dark:border-white/20">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
