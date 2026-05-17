import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { BarChart3, Bot, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, Sparkles } from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const links: Array<{ to: string; label: string; icon?: JSX.Element }> =
    user?.role === "admin"
      ? [
          { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: "/admin/courses", label: "Courses", icon: <GraduationCap className="h-4 w-4" /> },
          { to: "/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> }
        ]
      : [
          { to: "/#home", label: "Home", icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: "/student/ai-assistant", label: "AI Assistant", icon: <Bot className="h-4 w-4" /> },
          { to: "/#my-quizzes", label: "My Quizzes", icon: <ClipboardList className="h-4 w-4" /> },
          { to: "/#attempted", label: "Attempted", icon: <CheckCircle2 className="h-4 w-4" /> },
          { to: "/student/performance", label: "Performance", icon: <BarChart3 className="h-4 w-4" /> }
        ];

  return (
    <aside className="hidden lg:flex flex-col gap-6 p-6 border-r border-black/5 dark:border-white/10">
      <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-2xl leading-none">F64</div>
            <div className="mt-1 text-xs text-ink/50">Exam command center</div>
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((l) => {
          const isHashLink = l.to.includes("#");
          const targetHash = l.to.includes("#") ? `#${l.to.split("#")[1]}` : "";
          const currentHash = location.hash || "#home";
          const isActive = isHashLink
            ? currentHash === targetHash
            : location.pathname === l.to || location.pathname.startsWith(`${l.to}/`);

          return (
            <Link key={l.to} to={l.to} className="relative">
              <div
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                  isActive ? "bg-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
                data-active={isActive ? "true" : "false"}
              >
                <span
                  className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-accent transition-all duration-300 ${
                    "group-hover:translate-x-0 group-hover:opacity-100"
                  } ${"opacity-0 -translate-x-2"} ${
                    "group-data-[active=true]:opacity-100 group-data-[active=true]:translate-x-0"
                  }`}
                />
                <span className="text-sm">{l.icon}</span>
                <span className="pl-2 transition-transform duration-300 group-hover:translate-x-1">
                  {l.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
