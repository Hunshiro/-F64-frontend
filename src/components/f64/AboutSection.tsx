import { Video, Map, Languages, MessageCircle, MapPin, Target, Sparkles } from "lucide-react";

const features = [
  { icon: Video, title: "Live + Recorded Classes", desc: "Attend live or revisit anytime in HD.", gradient: "from-primary to-primary-glow" },
  { icon: Map, title: "Structured Roadmap", desc: "Day-by-day strategy by toppers.", gradient: "from-primary to-primary-glow" },
  { icon: Languages, title: "Bilingual Teaching", desc: "Hindi + English for full clarity.", gradient: "from-primary to-primary-glow" },
  { icon: MessageCircle, title: "24hr Doubt Support", desc: "Experts resolve doubts within 24 hours.", gradient: "from-primary to-primary-glow" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-14 md:py-20 px-4 md:px-8 soft-blue-section relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-10" data-reveal>
          <span className="section-badge">
            <Sparkles size={14} />
            Why Choose Us
          </span>
          <h2 className="section-title">
            Why <span className="gradient-text">F64</span> is Different
          </h2>
        </div>

        <div className="flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:gap-5 md:overflow-visible">
          {features.map((f, i) => (
            <div
              key={f.title}
              data-reveal
              data-reveal-delay={Math.min(i + 1, 4)}
              className="premium-card p-6 group relative overflow-hidden flex-shrink-0 w-[75%] sm:w-[45%] md:flex-1 md:w-auto snap-start"
            >
              {/* Top gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              {/* Hover glow */}
              <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-700`} />

              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} mb-5 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
                <f.icon size={24} className="text-primary-foreground" />
              </div>
              <h3 className="font-heading text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
