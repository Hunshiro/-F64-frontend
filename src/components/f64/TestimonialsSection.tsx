import { useState, useEffect } from "react";
import { Quote, ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";

const testimonials = [
  { name: "Sneha Verma", text: "Boosted my score by 30 marks! The mock tests and detailed analysis helped me identify weak areas and improve consistently.", location: "Lucknow", rating: 5 },
  { name: "Rajesh Yadav", text: "Best bilingual classes online. Hindi explanations made complex topics simple and easy to remember. Highly recommended!", location: "Patna", rating: 5 },
  { name: "Meena Joshi", text: "F64's structured roadmap kept me on track. No confusion, just focused preparation every single day.", location: "Jaipur", rating: 5 },
  { name: "Vikram Chauhan", text: "The doubt solving system is incredible. Got answers within hours, not days. The faculty truly cares about students.", location: "Delhi", rating: 5 },
];

const TestimonialsSection = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section id="testimonials" className="section-padding soft-blue-section relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/[0.03] rounded-full blur-[120px]" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="section-badge">
            <MessageSquareQuote size={14} />
            Testimonials
          </span>
          <h2 className="section-title">
            What Students <span className="gradient-text">Say</span>
          </h2>
          <p className="section-subtitle">
            Real stories from real students who transformed their preparation.
          </p>
        </div>

        <div className="premium-card p-8 md:p-12 text-center relative overflow-hidden">
          {/* Decorative quote */}
          <div className="absolute top-4 left-6 text-primary/[0.06]">
            <Quote size={80} />
          </div>

          <div className="relative z-10">
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-foreground fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>

            <div className="min-h-[120px] flex items-center justify-center">
              <div key={current} className="animate-slide-up">
                <p className="text-lg md:text-xl text-foreground/85 leading-relaxed mb-8 max-w-2xl mx-auto italic">
                  "{testimonials[current].text}"
                </p>
                <div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent mx-auto mb-3 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {testimonials[current].name[0]}
                  </div>
                  <div className="font-semibold text-foreground">{testimonials[current].name}</div>
                  <div className="text-sm text-muted-foreground">{testimonials[current].location}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={prev} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-secondary transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === current ? "bg-primary w-8" : "bg-border w-2 hover:bg-primary/30"}`}
                />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-secondary transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
