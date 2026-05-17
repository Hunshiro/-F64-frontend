import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { mockTestQuestions, Question, Language } from "../../data/mockTestQuestions";
import { mockTest2Questions } from "../../data/mockTest2Questions";

const TESTS: Record<string, { name: string; questions: Question[] }> = {
  "1": { name: "Mock Test 1", questions: mockTestQuestions },
  "2": { name: "Mock Test 2", questions: mockTest2Questions },
};
import { ArrowLeft, ArrowRight, Clock, RotateCcw, BookOpen, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../lib/auth";

const SECTION_TIME = 15 * 60; // 15 minutes per section
const SECTION_ORDER = ["GK", "Reasoning", "Maths", "English"] as const;
type SectionName = typeof SECTION_ORDER[number];

const MockTest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testId = searchParams.get("test") || "1";
  const activeTest = TESTS[testId] ?? TESTS["1"];
  const allQuestions = activeTest.questions;
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Group questions by section, preserving order
  const sectionQuestions = useMemo(() => {
    const map: Record<string, Question[]> = {};
    SECTION_ORDER.forEach(s => { map[s] = allQuestions.filter(q => q.subject === s); });
    return map;
  }, [allQuestions]);

  const [language, setLanguage] = useState<Language | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const t = (en: string, hi: string) => (language === "hi" ? hi : en);
  const qText = (q: Question) => (language === "hi" ? q.question_hi : q.question);
  const qOpts = (q: Question) => (language === "hi" ? q.options_hi : q.options);
  const qSol = (q: Question) => (language === "hi" ? q.solution_hi : q.solution);

  // Per-section remaining time
  const [sectionTime, setSectionTime] = useState<Record<SectionName, number>>(() =>
    SECTION_ORDER.reduce((acc, s) => ({ ...acc, [s]: SECTION_TIME }), {} as Record<SectionName, number>)
  );
  const [completedSections, setCompletedSections] = useState<SectionName[]>([]);

  const currentSection = SECTION_ORDER[currentSectionIdx];
  const questions = sectionQuestions[currentSection] || [];
  const question = questions[currentQ];

  const moveToNextSection = useCallback(() => {
    setCompletedSections(prev => prev.includes(currentSection) ? prev : [...prev, currentSection]);
    if (currentSectionIdx < SECTION_ORDER.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      setCurrentQ(0);
    } else {
      setSubmitted(true);
    }
  }, [currentSection, currentSectionIdx]);

  // Section timer
  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setSectionTime(prev => {
        const left = prev[currentSection];
        if (left <= 1) {
          clearInterval(timer);
          // Auto-advance when section timer hits 0
          setTimeout(() => moveToNextSection(), 0);
          return { ...prev, [currentSection]: 0 };
        }
        return { ...prev, [currentSection]: left - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted, currentSection, moveToNextSection]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const totalTimeLeft = SECTION_ORDER.reduce((sum, s) => sum + sectionTime[s], 0);

  const selectAnswer = (optIdx: number) => {
    if (submitted || !question) return;
    setAnswers(prev => ({ ...prev, [question.id]: optIdx }));
  };

  const getScore = useCallback(() => {
    let correct = 0;
    allQuestions.forEach(q => { if (answers[q.id] === q.answer) correct++; });
    return correct;
  }, [answers]);

  const getSubjectScore = (sub: string) => {
    const qs = allQuestions.filter(q => q.subject === sub);
    let correct = 0;
    qs.forEach(q => { if (answers[q.id] === q.answer) correct++; });
    return { correct, total: qs.length };
  };

  const handleSubmitSection = () => moveToNextSection();
  const handleSubmitAll = () => setSubmitted(true);

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrentSectionIdx(0);
    setCurrentQ(0);
    setCompletedSections([]);
    setSectionTime(SECTION_ORDER.reduce((acc, s) => ({ ...acc, [s]: SECTION_TIME }), {} as Record<SectionName, number>));
  };

  if (!user) {
    return null;
  }

  if (!language) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
            <ArrowLeft size={16} /> Back to Home
          </button>
          <h1 className="font-heading text-2xl font-bold mb-2">Choose Language</h1>
          <p className="text-muted-foreground mb-2">अपनी भाषा चुनें</p>
          <p className="text-xs text-muted-foreground mb-6">You cannot change language during the test.</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage("en")}
              className="border border-border hover:border-primary hover:bg-primary/5 rounded-xl p-5 transition-all"
            >
              <div className="text-2xl mb-1">🇬🇧</div>
              <div className="font-heading font-semibold">English</div>
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className="border border-border hover:border-primary hover:bg-primary/5 rounded-xl p-5 transition-all"
            >
              <div className="text-2xl mb-1">🇮🇳</div>
              <div className="font-heading font-semibold">हिंदी</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const score = getScore();
    const total = allQuestions.length;
    const pct = Math.round((score / total) * 100);

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft size={18} /> Back to Home
          </button>

          <div className="glass-card p-8 text-center mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">Test Results</h1>
            <div className="text-6xl font-bold font-heading my-6">
              <span className="text-foreground">{score}</span>
              <span className="text-muted-foreground text-3xl">/{total}</span>
            </div>
            <p className="text-muted-foreground text-lg mb-2">{pct}% Score</p>
            <p className="text-sm text-muted-foreground">Attempted: {Object.keys(answers).length}/{total}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {SECTION_ORDER.map(sub => {
              const { correct, total: t } = getSubjectScore(sub);
              return (
                <div key={sub} className="glass-card p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">{sub}</div>
                  <div className="text-2xl font-bold font-heading">{correct}/{t}</div>
                  <div className="text-xs text-muted-foreground">{Math.round((correct / t) * 100)}%</div>
                </div>
              );
            })}
          </div>

          <div className="space-y-4 mb-8">
            <h2 className="font-heading text-xl font-bold flex items-center gap-2"><BookOpen size={20} /> Answer Review</h2>
            {allQuestions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.answer;
              return (
                <div key={q.id} className={`glass-card p-4 border-l-4 ${userAns === undefined ? "border-muted" : isCorrect ? "border-foreground" : "border-muted-foreground"}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">{q.subject}</span>
                    <span className="text-xs text-muted-foreground">Q{i + 1}</span>
                  </div>
                  <p className="text-sm mb-2 whitespace-pre-line">{qText(q)}</p>
                  <div className="space-y-1 text-sm">
                    {qOpts(q).map((opt, oi) => (
                      <div key={oi} className={`px-3 py-1.5 rounded ${oi === q.answer ? "bg-muted text-foreground" : oi === userAns && oi !== q.answer ? "bg-muted/50 text-muted-foreground" : "text-muted-foreground"}`}>
                        {String.fromCharCode(65 + oi)}. {opt}
                        {oi === q.answer && " ✓"}
                        {oi === userAns && oi !== q.answer && " ✗"}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">💡 {qSol(q)}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={handleReset} className="btn-primary inline-flex items-center gap-2">
              <RotateCcw size={16} /> Retake Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sectionTimeLeft = sectionTime[currentSection];
  const isLastSection = currentSectionIdx === SECTION_ORDER.length - 1;
  const isLastQuestion = currentQ === questions.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
            <ArrowLeft size={16} /> Exit
          </button>
          <h1 className="font-heading font-bold text-sm md:text-base">{activeTest.name} - {currentSection}</h1>
          <div className="flex items-center gap-4 text-sm font-mono">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className={sectionTimeLeft < 60 ? "text-primary animate-pulse" : "text-primary"} />
              <span className={sectionTimeLeft < 60 ? "text-primary" : ""}>Section {formatTime(sectionTimeLeft)}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-muted-foreground">
              <span>Total {formatTime(totalTimeLeft)}</span>
            </div>
          </div>
        </div>
        {/* Section tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {SECTION_ORDER.map((s, i) => {
            const isActive = i === currentSectionIdx;
            const isDone = completedSections.includes(s);
            return (
              <div key={s}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 border
                  ${isActive ? "bg-primary text-primary-foreground border-primary" :
                    isDone ? "bg-muted text-foreground border-border" :
                    "bg-muted text-muted-foreground border-transparent"}`}>
                {isDone && <CheckCircle2 size={12} />}
                {s} • {formatTime(sectionTime[s])}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar: question palette */}
        <div className="lg:w-64 shrink-0">
          <div className="glass-card p-4 hidden lg:block">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{currentSection} Questions</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 text-xs rounded flex items-center justify-center font-medium transition-colors
                    ${i === currentQ ? "bg-primary text-primary-foreground" : answers[q.id] !== undefined ? "bg-muted text-foreground border border-border" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted border border-border" /> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary" /> Current</span>
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1">
          {question && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">{question.subject}</span>
                <span className="text-sm text-muted-foreground">{t("Question", "प्रश्न")} {currentQ + 1} {t("of", "/")} {questions.length}</span>
              </div>

              <p className="text-lg font-medium mb-6 whitespace-pre-line leading-relaxed">{qText(question)}</p>

              <div className="space-y-3">
                {qOpts(question).map((opt, oi) => (
                  <button key={oi} onClick={() => selectAnswer(oi)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm
                      ${answers[question.id] === oi
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground"}`}>
                    <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span> {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              <ArrowLeft size={16} /> {t("Previous", "पिछला")}
            </button>

            <button
              onClick={() => {
                if (!question) return;
                setAnswers(prev => {
                  const next = { ...prev };
                  delete next[question.id];
                  return next;
                });
              }}
              disabled={!question || answers[question?.id] === undefined}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-border hover:border-destructive hover:text-destructive disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground text-muted-foreground transition-colors"
            >
              <RotateCcw size={14} /> {t("Clear Response", "उत्तर हटाएं")}
            </button>

            <div className="flex items-center gap-2">
              {isLastQuestion ? (
                isLastSection ? (
                  <button onClick={handleSubmitAll} className="btn-primary !text-sm !px-6 !py-2.5">
                    Submit Test
                  </button>
                ) : (
                  <button onClick={handleSubmitSection} className="btn-primary !text-sm !px-6 !py-2.5">
                    Next Section <ArrowRight size={16} />
                  </button>
                )
              ) : (
                <button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
                  Next <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar (current section) */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{questions.filter(q => answers[q.id] !== undefined).length} answered in {currentSection}</span>
              <span>{questions.length} total</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(questions.filter(q => answers[q.id] !== undefined).length / questions.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTest;
