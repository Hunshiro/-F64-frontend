import { useState, useEffect } from "react";
import { Clock, AlertTriangle, Rocket, ArrowRight, Sparkles } from "lucide-react";

const TARGET_DATE = new Date("2026-05-01T00:00:00+05:30");

const UrgencySection = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, TARGET_DATE.getTime() - now.getTime());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section id="enroll" className="section-padding blue-gradient-section relative overflow-hidden">
      {/* Light overlay shapes */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 40%)"
      }} />
      <div className="absolute top-20 left-10 w-20 h-20 border-2 border-primary-foreground/10 rounded-2xl rotate-12 hidden lg:block" />
      <div className="absolute bottom-20 right-16 w-14 h-14 border-2 border-primary-foreground/10 rounded-full hidden lg:block" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-primary-foreground/15 border border-primary-foreground/20 rounded-full px-4 py-2 mb-8">
          <Sparkles size={14} className="text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground">Currently FREE — Limited Time</span>
        </div>

        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-primary-foreground leading-tight">
          Start Your SSC CGL 2026
          <br />
          Journey Today
        </h2>

        <p className="text-primary-foreground/70 mb-10 text-lg max-w-xl mx-auto">
          Join 10,000+ students already preparing with F64. Don't miss out!
        </p>

        {/* Countdown */}
        <div className="flex justify-center gap-3 md:gap-5 mb-10">
          {units.map((u) => (
            <div key={u.label} className="bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/15 rounded-2xl px-4 py-3 md:px-7 md:py-5 min-w-[72px] md:min-w-[100px]">
              <div className="text-2xl md:text-4xl font-bold font-heading text-primary-foreground">
                {String(u.value).padStart(2, "0")}
              </div>
              <div className="text-xs text-primary-foreground/50 mt-1 uppercase tracking-wider">{u.label}</div>
            </div>
          ))}
        </div>

        <p className="text-primary-foreground/50 mb-10 flex items-center justify-center gap-2 text-sm">
          <Clock size={14} /> Time until expected SSC CGL 2026 Tier 1 exam
        </p>

        <div className="flex items-center justify-center">
          <a href="#enroll" className="btn-white text-lg group">
            <Rocket size={20} />
            Enroll Now — It's Free
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default UrgencySection;
