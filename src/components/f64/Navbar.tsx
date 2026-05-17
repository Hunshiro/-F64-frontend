import { useState, useEffect } from "react";
import { Menu, X, GraduationCap, LogOut, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const navLinks = [
  { label: "About", href: "/#about" },
  { label: "Features", href: "/#features" },
  { label: "Mocks", href: "/#mocks" },
  { label: "Results", href: "/#results" },
  { label: "FAQ", href: "/#faq" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-card/80 backdrop-blur-xl border-b border-border/60 shadow-[0_4px_20px_-8px_hsl(235_84%_58%/0.15)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <GraduationCap size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-heading font-bold text-foreground">
            F<span className="gradient-text">64</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-primary font-medium transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-sm text-primary font-medium flex items-center gap-1.5">
              <LayoutDashboard size={14} /> Admin
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="text-sm text-muted-foreground hover:text-primary font-medium flex items-center gap-1.5">
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary font-medium">
              Sign In
            </Link>
          )}
          <Link to={user ? "/" : "/signup"} className="btn-primary text-sm !px-6 !py-2.5 !rounded-lg">
            {user ? "Dashboard" : "Sign Up"} →
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-6 space-y-1 animate-slide-up shadow-lg">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-muted-foreground hover:text-primary hover:bg-secondary/50 px-4 py-3 rounded-xl transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-primary hover:bg-secondary/50 px-4 py-3 rounded-xl font-medium">
              Admin Dashboard
            </Link>
          )}
          {user ? (
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="block w-full text-left text-muted-foreground hover:text-primary hover:bg-secondary/50 px-4 py-3 rounded-xl font-medium"
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-muted-foreground hover:text-primary hover:bg-secondary/50 px-4 py-3 rounded-xl font-medium">
              Sign In
            </Link>
          )}
          <div className="pt-2 px-4">
            <Link to={user ? "/" : "/signup"} onClick={() => setMobileOpen(false)} className="btn-primary block text-center text-sm !py-3">
              {user ? "Go to Dashboard" : "Sign Up"} →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
