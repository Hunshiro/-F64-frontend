import { Shield, Award, Star, TrendingUp, CheckCircle, Sparkles, Users, Trophy } from "lucide-react";

const badges = [
  { icon: Shield, label: "Verified Faculty" },
  { icon: Award, label: "Top Results" },
  { icon: Star, label: "4.8★ Rated" },
  { icon: TrendingUp, label: "500+ Selections" },
  { icon: CheckCircle, label: "IBPS/SSC Expert" },
  { icon: Sparkles, label: "Bilingual Classes" },
  { icon: Users, label: "10,000+ Students" },
  { icon: Trophy, label: "Top AIR Holders" },
];

const TrustSection = () => {
  const items = [...badges, ...badges];
  return (
    <section className="relative py-10 bg-card border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <p className="text-center text-muted-foreground text-xs mb-6 tracking-[0.25em] uppercase font-semibold">
          Trusted by serious SSC aspirants across India
        </p>
        <div className="marquee">
          <div className="marquee-track">
            {items.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-muted-foreground/80 hover:text-primary transition-all duration-300 group cursor-default shrink-0"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary border border-primary/10 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
                  <b.icon size={16} className="text-primary/70 group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
