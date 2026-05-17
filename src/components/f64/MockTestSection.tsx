import { FileText, Target, Layers, History, BarChart3, ArrowRight } from "lucide-react";

const mockCategories = [
  { icon: FileText, title: "Tier 1 Full Tests", count: "100+", desc: "Complete full-length practice tests" },
  { icon: Target, title: "Tier 2 Tests", count: "50+", desc: "Advanced tier 2 exam simulations" },
  { icon: Layers, title: "Sectional Tests", count: "200+", desc: "Topic-wise focused practice" },
  { icon: History, title: "PYQ Tests", count: "50+", desc: "Previous year question papers" },
];

const MockTestSection = () => {
  return (
    <section id="mocks" className="py-12 md:py-16 px-4 md:px-8 soft-blue-section relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-8" data-reveal>
          <span className="section-badge">
            <BarChart3 size={14} />
            Practice
          </span>
          <h2 className="section-title">
            Master SSC with <span className="gradient-text">500+ Mocks</span>
          </h2>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {mockCategories.map((cat, i) => (
            <div
              key={cat.title}
              data-reveal
              data-reveal-delay={Math.min(i + 1, 4)}
              className="premium-card p-4 flex items-center gap-4"
            >
              <div className="icon-box shrink-0">
                <cat.icon size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{cat.title}</div>
                <div className="text-xs text-muted-foreground">{cat.desc}</div>
              </div>
              <div className="text-xl font-bold font-heading text-primary">{cat.count}</div>
            </div>
          ))}
        </div>

        {/* Available Mock Tests */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {[
            { id: "1", title: "Mock Test 1", desc: "100 questions • 4 sections • 60 min" },
            { id: "2", title: "Mock Test 2", desc: "100 questions • 4 sections • 60 min" },
          ].map((m) => (
            <div key={m.id} className="premium-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
              </div>
              <a href="/ssc-cgl/mocks" className="btn-primary !text-sm !px-5 !py-2.5 !rounded-xl group w-full justify-center">
                Start {m.title}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MockTestSection;
