import { Award, Trophy } from "lucide-react";
import reenaSingh from "../../assets/f64/reena-singh.png";
import rakeshJakhar from "../../assets/f64/rakesh-jakhar.png";
import anshuPandey from "../../assets/f64/anshu-pandey.png";
import rishabhSingh from "../../assets/f64/rishabh-singh.png";
import dikshaJain from "../../assets/f64/diksha-jain.png";

const achievers = [
  { name: "Reena Singh", rank: "AIR 10388", score: "185/200", post: "Selected", emoji: "🥇", photo: reenaSingh, badge: "Gold" },
  { name: "Rakesh Jakhar", rank: "AIR 208", score: "—", post: "Income Tax Inspector", emoji: "🥈", photo: rakeshJakhar, badge: "Silver" },
  { name: "Rishabh Singh", rank: "AIR 322", score: "—", post: "ASO in MEA", emoji: "🥉", photo: rishabhSingh, badge: "Bronze" },
  { name: "Anshu Pandey", rank: "AIR 727", score: "—", post: "Office Superintendent", emoji: "🏅", photo: anshuPandey, badge: "Bronze" },
  { name: "Diksha Jain", rank: "AIR 6332", score: "—", post: "Assistant in Ministry of Mines", emoji: "🏅", photo: dikshaJain, badge: "Bronze" },
];

const ResultsSection = () => {
  return (
    <section id="results" className="py-12 md:py-16 px-4 md:px-8 relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8" data-reveal>
          <span className="section-badge">
            <Trophy size={14} />
            Proven Results
          </span>
          <h2 className="section-title">
            Our Results <span className="gradient-text">Speak</span>
          </h2>
        </div>

        <div className="flex flex-row gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible">
          {achievers.map((a, i) => (
            <div
              key={a.name}
              data-reveal
              data-reveal-delay={Math.min(i, 4)}
              className="premium-card p-4 text-center group flex-shrink-0 w-[60%] sm:w-[40%] md:w-auto snap-start"
            >
              <div className="rank-glow w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-secondary overflow-hidden">
                {a.photo ? (
                  <img src={a.photo} alt={a.name} className="w-full h-full object-cover object-top" />
                ) : (
                  <span className="text-2xl">{a.emoji}</span>
                )}
              </div>

              <div className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 mb-2">
                <Award size={11} className="text-primary" />
                <span className="text-[10px] font-bold text-primary">{a.rank}</span>
              </div>

              <h3 className="font-heading text-sm font-semibold text-foreground leading-tight">{a.name}</h3>
              <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{a.post === "Selected" ? `Score ${a.score}` : a.post}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ResultsSection;
