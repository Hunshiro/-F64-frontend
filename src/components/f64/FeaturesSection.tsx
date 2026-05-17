import { BookOpen, FileQuestion, BarChart2, ClipboardList, FileText, UsersRound, Zap } from "lucide-react";

const features = [
  { icon: BookOpen, title: "Recorded Classes", desc: "Access all lectures anytime, anywhere with HD quality recordings.", gradient: "from-primary to-purple-glow" },
  { icon: FileText, title: "Practice Material", desc: "Comprehensive study material and practice sets for every topic.", gradient: "from-purple-glow to-accent" },
  { icon: FileQuestion, title: "Daily Quizzes", desc: "Test your knowledge daily with topic-wise quick quizzes.", gradient: "from-accent to-primary" },
  { icon: BarChart2, title: "Progress Tracking", desc: "Detailed analytics to track your preparation journey.", gradient: "from-primary to-accent" },
  { icon: ClipboardList, title: "Notes & PDFs", desc: "Downloadable notes and PDFs prepared by expert faculty.", gradient: "from-purple-glow to-primary" },
  { icon: UsersRound, title: "Community Support", desc: "Join a community of 10,000+ serious aspirants for peer learning.", gradient: "from-accent to-purple-glow" },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="section-padding relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-accent/[0.05] rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-glow/[0.05] rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="section-badge">
            <Zap size={14} />
            Features
          </span>
          <h2 className="section-title">
            Everything You Need to <span className="gradient-text">Succeed</span>
          </h2>
          <p className="section-subtitle">
            A complete learning platform designed for SSC aspirants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="premium-card p-7 group flex gap-5 relative overflow-hidden"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-700`} />
              <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <f.icon size={22} className="text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold mb-1.5 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
