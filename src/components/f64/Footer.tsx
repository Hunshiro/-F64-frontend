import { MapPin, Mail, GraduationCap, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GraduationCap size={20} className="text-primary-foreground" />
              </div>
              <span className="text-xl font-heading font-bold text-foreground">
                F<span className="gradient-text">64</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              India's most result-driven SSC CGL coaching platform. Join 10,000+ serious aspirants.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: "About Us", href: "#about" },
                { label: "Features", href: "#features" },
                { label: "Mock Tests", href: "#mocks" },
                { label: "Results", href: "#results" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5">
              {["FAQ", "Privacy Policy", "Terms of Service", "Refund Policy"].map((l) => (
                <li key={l}>
                  <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">{l}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-primary" />
                </div>
                Delhi, India
              </li>
              <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-primary" />
                </div>
                <span className="truncate">niteshchoudhary5290@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 F64 SSC CGL Coaching. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Results may vary based on individual effort and dedication.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
