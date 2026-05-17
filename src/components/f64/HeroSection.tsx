import { Rocket, Zap, BookOpen, Users, Trophy, Star, X, Play, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const stats = [
  { icon: BookOpen, value: "500+", label: "Mock Tests", color: "from-primary to-purple-glow" },
  { icon: Users, value: "10,000+", label: "Students", color: "from-purple-glow to-accent" },
  { icon: Trophy, value: "Top AIR", label: "Results", color: "from-accent to-primary" },
  { icon: Star, value: "4.8★", label: "Rating", color: "from-primary to-accent" },
];

const HeroSection = () => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-bg">
      {/* Animated blobs */}
      <div className="absolute top-20 right-[8%] w-[28rem] h-[28rem] bg-primary/20 rounded-full blur-[120px] animate-blob" />
      <div className="absolute bottom-10 left-[5%] w-[24rem] h-[24rem] bg-purple-glow/20 rounded-full blur-[110px] animate-blob" style={{ animationDelay: "4s" }} />
      <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-accent/15 rounded-full blur-[90px] animate-blob" style={{ animationDelay: "8s" }} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "32px 32px"
      }} />

      {/* Floating shapes */}
      <div className="absolute top-32 right-[15%] w-16 h-16 border-2 border-primary/20 rounded-2xl rotate-12 animate-float hidden lg:block" />
      <div className="absolute bottom-40 left-[10%] w-12 h-12 bg-secondary border border-primary/10 rounded-full animate-float-delayed hidden lg:block" />
      <div className="absolute top-[60%] right-[8%] w-8 h-8 bg-accent/15 rounded-lg rotate-45 animate-float-slow hidden lg:block" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-32 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Headline */}
          <h1 className="animate-slide-up font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
            <span className="text-foreground">Crack SSC CGL 2026</span>
            <br />
            <span className="text-foreground">with </span>
            <span className="gradient-text-vibrant">F64 Academy</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-slide-up-delayed text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            India's most result-driven online coaching — expert faculty,{" "}
            <span className="text-primary font-semibold">500+ mock tests</span>, and a proven strategy to help you succeed.
          </p>

          {/* CTAs */}
          <div className="animate-slide-up-delayed-2 flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a href="#enroll" className="btn-primary text-lg group">
              <Rocket size={20} />
              Start Learning Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <button onClick={() => setShowVideo(true)} className="btn-secondary text-lg">
              <Play size={18} />
              Watch Demo
            </button>
          </div>

          {/* Social proof row */}
          <div className="animate-slide-up-delayed-2 flex flex-col sm:flex-row items-center justify-center gap-5 mb-16">
            <div className="flex -space-x-3">
              {[
                { g: "from-primary to-purple-glow", i: "RS" },
                { g: "from-purple-glow to-accent", i: "RJ" },
                { g: "from-accent to-primary", i: "AP" },
                { g: "from-primary to-accent", i: "RK" },
                { g: "from-purple-glow to-primary", i: "DJ" },
              ].map((p, i) => (
                <div key={i} className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.g} border-2 border-background flex items-center justify-center text-primary-foreground font-bold text-xs shadow-md`}>
                  {p.i}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-foreground text-foreground" />
                ))}
                <span className="ml-1.5 text-sm font-bold text-foreground">4.8/5</span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-success" />
                Trusted by <span className="font-semibold text-foreground">10,000+ aspirants</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mx-auto">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="premium-card p-5 text-center group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} mx-auto mb-3 flex items-center justify-center shadow-md`}>
                <stat.icon size={20} className="text-primary-foreground" />
              </div>
              <div className="text-xl md:text-2xl font-bold font-heading text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md" onClick={() => setShowVideo(false)}>
          <div className="relative w-[90vw] max-w-3xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-card/90 flex items-center justify-center text-foreground hover:bg-card transition-colors"
            >
              <X size={20} />
            </button>
            <video
              src="/demo-video.mp4"
              controls
              autoPlay
              className="w-full rounded-2xl border border-border shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
