import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  { q: "What is the fee structure for SSC CGL coaching?", a: "All our courses are currently FREE of cost! You get complete access to live classes, recorded lectures, mock tests, and study material at zero cost." },
  { q: "How are the mock tests structured?", a: "We offer 500+ mock tests including Tier 1 Full Tests, Tier 2 Tests, Sectional Tests, and Previous Year Question papers. Each test comes with detailed solutions and performance analytics." },
  { q: "Can I access classes in Hindi?", a: "Yes! We offer bilingual teaching in both Hindi and English to ensure maximum clarity and understanding for all students." },
  { q: "How does the doubt solving system work?", a: "You can submit doubts anytime through our platform. Our expert faculty resolves all doubts within 24 hours with detailed explanations." },
  { q: "Is this coaching suitable for beginners?", a: "Absolutely! Our structured roadmap starts from basics and gradually moves to advanced topics. We cater to both beginners and experienced aspirants." },
  { q: "Do you provide study material and notes?", a: "Yes, we provide comprehensive study material, downloadable PDFs, handwritten notes, and topic-wise practice sets for all subjects." },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-padding relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/[0.03] rounded-full blur-[100px]" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="section-badge">
            <HelpCircle size={14} />
            FAQ
          </span>
          <h2 className="section-title">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="section-subtitle">
            Got questions? We've got answers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`premium-card overflow-hidden transition-all duration-300 ${openIndex === i ? "border-primary/20" : ""}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 md:p-6 text-left gap-4"
              >
                <span className="font-medium text-foreground text-sm md:text-base">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-muted-foreground shrink-0 transition-transform duration-300 ${openIndex === i ? "rotate-180 text-primary" : ""}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openIndex === i ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-5 md:px-6 pb-5 md:pb-6 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
