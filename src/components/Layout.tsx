import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export function AppLayout() {
  const location = useLocation();
  const isQuizRoute =
    location.pathname.startsWith("/student/quiz/") ||
    location.pathname.startsWith("/student/descriptive/");

  if (isQuizRoute) {
    return (
      <div className="min-h-screen">
        <main className="p-0">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <Topbar />
        <main className="p-5 lg:p-8">
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
