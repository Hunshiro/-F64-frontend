import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";

type Question = {
  _id: string;
  subject?: string;
  visualPdfUrl?: string;
  visualPageNumber?: number;
  visualNote?: string;
  text: string;
  options: string[];
  correctOptions: number[];
  type: "single" | "multi";
  marks: number;
  negativeMarks: number;
  explanation?: string;
};

type Quiz = {
  _id: string;
  title: string;
  durationMinutes: number;
  instructions?: string;
  questions: Question[];
  showAnswersAfterSubmit: boolean;
};

type SubmitResponse = {
  attempt: { _id: string; status: "submitted" };
  result: { score: number; accuracy: number };
  review?: Array<{
    questionId: string;
    selectedOptions: number[];
    correctOptions: number[];
    options: string[];
    text: string;
    explanation?: string;
  }>;
};

const ORDER = [
  "Reasoning",
  "Quantitative Aptitude",
  "English Comprehension",
  "General Awareness"
] as const;

type SectionKey = (typeof ORDER)[number];

function formatMMSS(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function SeriousMockTest() {
  const { id } = useParams();
  const { notify } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);

  // requirement: 60-min aggregate timer
  const TOTAL_SECONDS = 60 * 60;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>("Reasoning");
  const [activeIndex, setActiveIndex] = useState(0); // index within active section

  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    apiRequest<Quiz>(`/api/quizzes/${id}`)
      .then((data) => setQuiz(data))
      .catch((err: any) => notify(err.message || "Failed to load quiz"));
  }, [id, notify]);

  const sectionQuestions = useMemo(() => {
    const q = quiz?.questions || [];
    const map = new Map<SectionKey, Question[]>();
    ORDER.forEach((s) => map.set(s, []));
    
    // Divide questions by position: 0-24: Reasoning, 25-49: Quant, 50-74: English, 75-99: GA
    q.forEach((question, index) => {
      let section: SectionKey;
      if (index < 25) {
        section = "Reasoning";
      } else if (index < 50) {
        section = "Quantitative Aptitude";
      } else if (index < 75) {
        section = "English Comprehension";
      } else {
        section = "General Awareness";
      }
      map.get(section)!.push(question);
    });
    
    return map;
  }, [quiz]);

  const activeQuestions = sectionQuestions.get(activeSection) || [];
  const activeQuestion = activeQuestions[activeIndex];

  useEffect(() => {
    if (!isStarted || submitted) return;
    setTimeLeft(TOTAL_SECONDS);
  }, [isStarted, submitted]);

  useEffect(() => {
    if (!isStarted || submitted || timeLeft === null) return;
    if (timeLeft <= 0) {
      void handleSubmit();
      return;
    }
    const t = window.setInterval(() => {
      setTimeLeft((p) => (p === null ? p : p - 1));
    }, 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, submitted, timeLeft]);

  useEffect(() => {
    if (!isStarted || !activeQuestion) return;
    setVisited((prev) => {
      if (prev.has(activeQuestion._id)) return prev;
      const next = new Set(prev);
      next.add(activeQuestion._id);
      return next;
    });
  }, [activeQuestion, isStarted]);

  const autosave = async (nextAnswers: Record<string, number[]>) => {
    if (!attemptId) return;
    const payload = Object.entries(nextAnswers).map(([questionId, selectedOptions]) => ({
      questionId,
      selectedOptions
    }));
    try {
      await apiRequest(`/api/attempts/${attemptId}/autosave`, {
        method: "PATCH",
        body: JSON.stringify({ answers: payload })
      });
    } catch {
      // silent
    }
  };

  const toggleOption = (question: Question, optionIndex: number) => {
    setAnswers((prev) => {
      const existing = prev[question._id] || [];
      let next: number[] = [];
      if (question.type === "multi") {
        next = existing.includes(optionIndex)
          ? existing.filter((i) => i !== optionIndex)
          : [...existing, optionIndex];
      } else {
        next = [optionIndex];
      }
      const updated = { ...prev, [question._id]: next };
      void autosave(updated);
      return updated;
    });
  };

  const handleStart = async () => {
    if (!quiz?._id) return;
    try {
      const attempt = await apiRequest<{ _id: string }>("/api/attempts/start", {
        method: "POST",
        body: JSON.stringify({ quizId: quiz._id })
      });
      setAttemptId(attempt._id);
      setIsStarted(true);
      setTimeLeft(TOTAL_SECONDS);
      setActiveSection("Reasoning");
      setActiveIndex(0);
      setVisited(new Set());
      setAnswers({});
    } catch (err: any) {
      notify(err.message || "Failed to start attempt");
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    try {
      const result = await apiRequest<SubmitResponse>(`/api/attempts/${attemptId}/submit`, {
        method: "POST"
      });
      setSubmitted(result);
      setIsStarted(false);
      setTimeLeft(null);
      notify("Exam submitted");
    } catch (err: any) {
      notify(err.message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canNavigatePrevNext = activeQuestions.length > 0;

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isStarted && !submitted) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] text-ink">
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <div className="font-display text-lg">SSC CGL Serious Mock</div>
              <div className="text-xs text-ink/60">60-minute aggregate timed test</div>
            </div>
            <div className="text-xs text-ink/60">{quiz.title}</div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <Card title="Instructions">
            <div className="text-sm text-ink/70 whitespace-pre-wrap">
              {quiz.instructions ||
                `Exam Pattern (SSC CGL Serious Mock - 60 mins)\n\n+ Reasoning: 25 questions\n+ Quantitative Aptitude: 25 questions\n+ English Comprehension: 25 questions\n+ General Awareness: 25 questions\n\nAttempt at your pace. Negative marking is applied as per mock configuration.`}
            </div>
          </Card>

          <Card title="Exam Pattern">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {ORDER.map((s) => {
                const count = sectionQuestions.get(s)?.length || 0;
                return (
                  <div key={s} className="p-4 rounded-xl border bg-white/70">
                    <div className="font-semibold">{s}</div>
                    <div className="text-ink/60 mt-1">Questions: {count}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-4 border rounded-2xl bg-white p-5">
            <div>
              <div className="text-sm text-ink/60">Total time</div>
              <div className="text-2xl font-semibold">60:00</div>
            </div>
            <button
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              onClick={handleStart}
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="font-display text-xl">{quiz.title}</div>
              <div className="text-xs text-ink/60">Submission complete</div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 py-8">
          <Card title="Performance">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl border bg-white/70">
                <div className="text-xs text-ink/60">Score</div>
                <div className="text-2xl font-semibold">{submitted.result.score.toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-xl border bg-white/70">
                <div className="text-xs text-ink/60">Accuracy</div>
                <div className="text-2xl font-semibold">{submitted.result.accuracy.toFixed(1)}%</div>
              </div>
              <div className="p-4 rounded-xl border bg-white/70">
                <div className="text-xs text-ink/60">Total Questions</div>
                <div className="text-2xl font-semibold">{quiz.questions.length}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-ink">
      <div className="sticky top-0 z-20 border-b border-black/10 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold">SSC</div>
              <div>
                <div className="font-display text-lg">{quiz.title}</div>
                <div className="text-xs text-ink/60">Aggregate timer</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <div className="text-[10px] text-ink/60 uppercase tracking-widest">Time Left</div>
                <div className="font-semibold text-lg text-blue-700">{formatMMSS(timeLeft ?? TOTAL_SECONDS)}</div>
              </div>

              <button
                className="px-4 py-2 rounded-lg border"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Finish & Submit"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto">
            {ORDER.map((s) => {
              const count = sectionQuestions.get(s)?.length || 0;
              const isActive = s === activeSection;
              return (
                <button
                  key={s}
                  onClick={() => {
                    setActiveSection(s);
                    setActiveIndex(0); // requirement: jump to first question
                  }}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white hover:bg-blue-50 border-black/10"
                  }`}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between text-sm text-ink/60">
            <div>
              {activeSection} • Question {activeQuestions.length ? activeIndex + 1 : 0} of {activeQuestions.length}
            </div>
            <div>{activeQuestions.length ? `${activeQuestions.length} questions` : "No questions"}</div>
          </div>

          {activeQuestion ? (
            <Card title="Question">
              <div className="space-y-4">
                <div className="text-base font-semibold">{activeQuestion.text}</div>

                <div className="grid gap-3">
                  {activeQuestion.options.map((opt, idx) => {
                    const selected = (answers[activeQuestion._id] || []).includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleOption(activeQuestion, idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-black/10 bg-white hover:bg-blue-50"
                        }`}
                      >
                        <span className="font-semibold">
                          {String.fromCharCode(65 + idx)}.
                        </span>{" "}
                        {opt}
                        {selected && <span className="ml-2 text-xs text-blue-700 font-semibold">Selected</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    className="px-4 py-2 rounded-lg border disabled:opacity-50"
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                    disabled={!canNavigatePrevNext || activeIndex === 0}
                  >
                    Previous
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                    onClick={() => setActiveIndex((i) => Math.min(activeQuestions.length - 1, i + 1))}
                    disabled={!canNavigatePrevNext || activeIndex >= activeQuestions.length - 1}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-ink/60">No questions available for this section.</div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">Question Map</div>
            <div className="grid grid-cols-5 gap-2">
              {activeQuestions.map((q, idx) => {
                const isAttempted = (answers[q._id] || []).length > 0;
                const isVisited = visited.has(q._id);
                const isCurrent = idx === activeIndex;

                const cls = isAttempted
                  ? "bg-blue-600 text-white"
                  : isVisited
                    ? "bg-orange-100 text-orange-700"
                    : "bg-black/5 text-ink/70";

                return (
                  <button
                    key={q._id}
                    className={`h-9 rounded-lg text-xs font-semibold border border-transparent ${cls} ${
                      isCurrent ? "ring-2 ring-blue-400" : ""
                    }`}
                    onClick={() => setActiveIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

