import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";
import { BookOpenCheck, Clock3, FileText, ShieldCheck } from "lucide-react";

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

type ReviewItem = {
  questionId: string;
  text: string;
  options: string[];
  correctOptions: number[];
  selectedOptions: number[];
  explanation?: string;
};

type SubmitResponse = {
  attempt: { _id: string; status: "submitted" };
  result: { score: number; accuracy: number };
  review: ReviewItem[];
};

export default function QuizAttempt() {
  const { id } = useParams();
  const { notify } = useToast();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [showExplanationFor, setShowExplanationFor] = useState<string | null>(null);
  const attemptedKey = "tb_attempted_quizzes";

  const totalQuestions = quiz?.questions?.length || 0;
  const activeQuestion = quiz?.questions?.[activeIndex];
  const totalMarks = quiz?.questions?.reduce((sum, question) => sum + (Number(question.marks) || 0), 0) || 0;
  const orderedSections = [
    "Reasoning",
    "Quantitative Aptitude",
    "English Comprehension",
    "General Awareness"
  ];
  const sectionRows = orderedSections.map((section) => {
    const questions = quiz?.questions?.filter((question) => question.subject === section) || [];
    return {
      section,
      questions: questions.length,
      marks: questions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0)
    };
  });

  useEffect(() => {
    if (!id) return;
    apiRequest<Quiz>(`/api/quizzes/${id}`)
      .then((data) => setQuiz(data))
      .catch((err: any) => notify(err.message || "Failed to load quiz"));
  }, [id, notify]);

  useEffect(() => {
    if (!isStarted || submitted) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onFullscreenChange = () => {
      if (!submitted && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          notify("Fullscreen required until you submit the quiz.");
        });
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [isStarted, submitted, notify]);

  useEffect(() => {
    if (!isStarted || !quiz || submitted) return;
    setTimeLeft(quiz.durationMinutes * 60);
  }, [isStarted, quiz, submitted]);

  useEffect(() => {
    if (!isStarted || submitted || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev === null ? prev : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
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

  const handleStart = async () => {
    if (!quiz?._id) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      notify("Please allow fullscreen to start the quiz.");
      return;
    }
    try {
      const attempt = await apiRequest<{ _id: string }>("/api/attempts/start", {
        method: "POST",
        body: JSON.stringify({ quizId: quiz._id })
      });
      setAttemptId(attempt._id);
      setIsStarted(true);
      setActiveIndex(0);
      setVisited(new Set());
      setAnswers({});
    } catch (err: any) {
      notify(err.message || "Failed to start attempt");
    }
  };

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
      // silent autosave failure
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
      autosave(updated);
      return updated;
    });
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
      if (quiz?._id) {
        const raw = localStorage.getItem(attemptedKey);
        const existing = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [quiz._id, ...existing.filter((id) => id !== quiz._id)].slice(0, 20);
        localStorage.setItem(attemptedKey, JSON.stringify(next));
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      notify("Quiz submitted");
    } catch (err: any) {
      notify(err.message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reviewMap = useMemo(() => {
    const map = new Map<string, ReviewItem>();
    submitted?.review?.forEach((r) => map.set(r.questionId, r));
    return map;
  }, [submitted]);

  if (!quiz) {
    return <div className="space-y-4">Loading quiz...</div>;
  }

  if (!isStarted && !submitted) {
    return (
      <div className="min-h-screen bg-[#f2f5f9] p-4 font-sans text-slate-900 md:p-6">
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-sm border border-gray-300 bg-white shadow-lg">
          <div className="border-b-4 border-[#08376a] bg-[#0b4d92] px-6 py-4 text-white">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-wide">Staff Selection Commission (SSC)</h1>
                <p className="mt-1 text-sm opacity-90">Combined Graduate Level Examination (SSC CGL)</p>
              </div>
              <div className="text-sm md:text-right">
                <p>Candidate Login Panel</p>
                <p className="font-semibold">Official Mock Instruction Interface</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-4 border-b border-gray-300 bg-[#edf3fa] px-6 py-3 text-sm">
            <div>
              <span className="font-semibold">Candidate Name:</span> {user?.name || "Student"}
            </div>
            <div>
              <span className="font-semibold">Exam:</span> SSC CGL Tier-I
            </div>
            <div>
              <span className="font-semibold">Mock:</span> {quiz.title}
            </div>
          </div>

          <div className="grid gap-5 border-b border-gray-200 px-6 py-5 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded border border-gray-200 bg-slate-50 p-4">
              <Clock3 className="h-5 w-5 text-[#0b4d92]" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Consolidated Time</div>
                <div className="text-lg font-semibold">{quiz.durationMinutes} minutes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded border border-gray-200 bg-slate-50 p-4">
              <FileText className="h-5 w-5 text-[#0b4d92]" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Questions</div>
                <div className="text-lg font-semibold">{totalQuestions}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded border border-gray-200 bg-slate-50 p-4">
              <BookOpenCheck className="h-5 w-5 text-[#0b4d92]" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Marks</div>
                <div className="text-lg font-semibold">{totalMarks}</div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <section>
              <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#08376a]">
                <ShieldCheck className="h-5 w-5" />
                Examination Pattern
              </div>
              <div className="overflow-hidden rounded border border-gray-300">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#edf3fa] text-left">
                    <tr>
                      <th className="border-b border-gray-300 px-4 py-3">Section</th>
                      <th className="border-b border-gray-300 px-4 py-3">No. of Questions</th>
                      <th className="border-b border-gray-300 px-4 py-3">Marks per Question</th>
                      <th className="border-b border-gray-300 px-4 py-3">Total Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((row) => (
                      <tr key={row.section} className="odd:bg-white even:bg-slate-50">
                        <td className="border-b border-gray-200 px-4 py-3 font-medium">{row.section}</td>
                        <td className="border-b border-gray-200 px-4 py-3">{row.questions}</td>
                        <td className="border-b border-gray-200 px-4 py-3">2</td>
                        <td className="border-b border-gray-200 px-4 py-3">{row.marks}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#f8fbff] font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3">{totalQuestions}</td>
                      <td className="px-4 py-3">2</td>
                      <td className="px-4 py-3">{totalMarks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded border border-gray-300 bg-[#fcfdff] p-4 text-sm leading-6 text-slate-700">
              <div className="mb-2 font-semibold text-slate-900">Important Instructions</div>
              <p>1. The test contains four SSC CGL sections and uses one consolidated timer.</p>
              <p>2. Each question carries 2 marks. Incorrect answers attract a penalty of 0.25 marks.</p>
              <p>3. Answers and PDF-backed solutions will be available only after the test is submitted.</p>
              <p>4. The exam opens in fullscreen mode and remains locked until submission.</p>
            </section>

            <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Click the button only when you are ready to begin the test.
              </div>
              <button
                className="rounded bg-[#0b4d92] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#08376a]"
                onClick={handleStart}
              >
                I am Ready to Begin Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted && !reviewMode) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="font-display text-xl">{quiz.title}</div>
              <div className="text-xs text-ink/60">Submission complete</div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-accent text-white" onClick={() => setReviewMode(true)}>
              Review Quiz
            </button>
          </div>
        </div>

        <div className="px-5 py-6 space-y-6">
          <Card title="Your Performance">
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
                <div className="text-xs text-ink/60">Questions</div>
                <div className="text-2xl font-semibold">{totalQuestions}</div>
              </div>
            </div>
          </Card>

          <Card title="Next Steps">
            <div className="text-sm text-ink/70">
              Review each question to understand mistakes and strengthen weak areas.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (submitted && reviewMode) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <div className="font-display text-xl">{quiz.title}</div>
              <div className="text-xs text-ink/60">Review mode</div>
            </div>
            <button className="px-4 py-2 rounded-lg border" onClick={() => setReviewMode(false)}>
              Back to Metrics
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6 px-5 py-6">
          <div className="space-y-4">
            {activeQuestion && (
              <Card title={`Question ${activeIndex + 1}`}>
                <div className="space-y-3">
                  <div className="font-medium">{activeQuestion.text}</div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {activeQuestion.options.map((opt, idx) => {
                      const review = reviewMap.get(activeQuestion._id);
                      const isCorrect = review?.correctOptions?.includes(idx);
                      const isSelected = review?.selectedOptions?.includes(idx);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border text-left ${
                            isCorrect
                              ? "border-green-500 bg-green-50"
                              : isSelected
                                ? "border-red-500 bg-red-50"
                                : "border-black/10"
                          }`}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded-lg border"
                      onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                      disabled={activeIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      className="px-3 py-2 rounded-lg border"
                      onClick={() => setActiveIndex((i) => Math.min(totalQuestions - 1, i + 1))}
                      disabled={activeIndex === totalQuestions - 1}
                    >
                      Next
                    </button>
                  </div>
                  <button
                    className="px-3 py-2 rounded-lg bg-accent text-white"
                    onClick={() =>
                      setShowExplanationFor((prev) => (prev === activeQuestion._id ? null : activeQuestion._id))
                    }
                  >
                    {showExplanationFor === activeQuestion._id ? "Hide Explanation" : "View Explanation"}
                  </button>
                </div>
                {showExplanationFor === activeQuestion._id && (
                  <div className="mt-4 p-3 rounded-lg border bg-white/70 text-sm text-ink/70">
                    {reviewMap.get(activeQuestion._id)?.explanation || "No explanation provided."}
                  </div>
                )}
              </Card>
            )}
          </div>

          <aside className="space-y-3">
            <div className="card p-4">
              <div className="text-sm font-medium mb-3">Question Map</div>
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((q, idx) => {
                  const review = reviewMap.get(q._id);
                  const isAttempted = (review?.selectedOptions || []).length > 0;
                  const isVisited = visited.has(q._id);
                  const isCurrent = idx === activeIndex;
                  const statusClass = isAttempted
                    ? "border-green-500 bg-green-100 text-green-700"
                    : isVisited
                      ? "border-red-500 bg-red-100 text-red-700"
                      : "border-black/10 bg-black/5 text-ink/70";
                  return (
                    <button
                      key={q._id}
                      className={`h-9 rounded-lg border text-xs font-semibold ${statusClass} ${
                        isCurrent ? "ring-2 ring-accent/60" : ""
                      }`}
                      onClick={() => setActiveIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-ink/60">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Attempted
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Visited
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-black/30" /> Unseen
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const progressPct = totalQuestions ? Math.round(((activeIndex + 1) / totalQuestions) * 100) : 0;
  const [h, m, s] = (() => {
    const total = timeLeft ?? 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return [hours, minutes, seconds];
  })();

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-ink">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">Q</div>
            <div>
              <div className="font-display text-lg">{quiz.title}</div>
              <div className="text-xs text-ink/60">Advanced Mathematics • Unit Practice</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs">
              AI Assistant Ready
            </span>
            <button className="px-3 py-2 rounded-lg border">Save & Exit</button>
            <div className="h-9 w-9 rounded-full bg-black/5" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 px-6 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-ink/60">
            <div>Question {activeIndex + 1} of {totalQuestions}</div>
            <div>{progressPct}% Completed</div>
          </div>
          <div className="h-2 rounded-full bg-black/5">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progressPct}%` }} />
          </div>

          {activeQuestion && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              {activeQuestion.subject && (
                <div className="mb-3 text-xs uppercase tracking-widest text-ink/50">{activeQuestion.subject}</div>
              )}
              {activeQuestion.visualPdfUrl && activeQuestion.visualPageNumber && (
                <div className="mb-5 overflow-hidden rounded-2xl border bg-slate-50">
                  <div className="border-b bg-white px-4 py-3 text-sm font-medium">
                    Visual reference from source PDF, page {activeQuestion.visualPageNumber}
                  </div>
                  <iframe
                    title={`Visual reference page ${activeQuestion.visualPageNumber}`}
                    className="h-[420px] w-full"
                    src={`${activeQuestion.visualPdfUrl}#page=${activeQuestion.visualPageNumber}`}
                  />
                  {activeQuestion.visualNote && (
                    <div className="border-t bg-white px-4 py-3 text-xs text-ink/60">{activeQuestion.visualNote}</div>
                  )}
                </div>
              )}
              <div className="text-lg font-semibold">{activeQuestion.text}</div>
              <div className="mt-5 space-y-3">
                {activeQuestion.options.map((opt, idx) => {
                  const selected = (answers[activeQuestion._id] || []).includes(idx);
                  return (
                    <button
                      key={idx}
                      className={`w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left ${
                        selected ? "border-blue-600 bg-blue-50" : "hover:border-blue-300"
                      }`}
                      onClick={() => toggleOption(activeQuestion, idx)}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            selected ? "border-blue-600 text-blue-600" : "border-black/20"
                          }`}
                        >
                          {selected ? "●" : ""}
                        </span>
                        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                      </div>
                      {selected && <span className="text-xs text-blue-600 font-semibold">Selected</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}



          <div className="flex items-center justify-between">
            <button
              className="px-4 py-2 rounded-lg border"
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
            >
              Previous
            </button>
            <button className="px-4 py-2 rounded-lg border text-amber-700 border-amber-200 bg-amber-50">
              Flag for Review
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              onClick={() => setActiveIndex((i) => Math.min(totalQuestions - 1, i + 1))}
              disabled={activeIndex === totalQuestions - 1}
            >
              Save & Next
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          {/* Section navigation */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold mb-3">Sections</div>
            <div className="flex flex-wrap gap-2">
              {orderedSections.map((section) => {
                const count = sectionRows.find((r) => r.section === section)?.questions || 0;
                return (
                  <button
                    key={section}
                    className={`px-3 py-2 rounded-xl border text-sm font-semibold ${
                      (activeQuestion?.subject || "") === section
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-blue-50 border-black/10"
                    }`}
                    onClick={() => {
                      const idx = quiz?.questions?.findIndex((q) => q.subject === section) ?? 0;
                      setActiveIndex(idx >= 0 ? idx : 0);
                    }}
                  >
                    {section} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs tracking-widest text-ink/50">TIME REMAINING</div>
              <div className="h-7 w-7 rounded-full bg-blue-50" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border bg-black/5 p-3">
                <div className="text-xl font-semibold">{String(h).padStart(2, "0")}</div>
                <div className="text-[10px] text-ink/60">HOURS</div>
              </div>
              <div className="rounded-xl border bg-blue-50 p-3">
                <div className="text-xl font-semibold text-blue-700">{String(m).padStart(2, "0")}</div>
                <div className="text-[10px] text-blue-700">MINUTES</div>
              </div>
              <div className="rounded-xl border bg-black/5 p-3">
                <div className="text-xl font-semibold">{String(s).padStart(2, "0")}</div>
                <div className="text-[10px] text-ink/60">SECONDS</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs tracking-widest text-ink/50">QUESTION MAP</div>
              <div className="flex gap-1">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                <span className="h-3 w-3 rounded-full bg-orange-400" />
                <span className="h-3 w-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => {
                const isAttempted = (answers[q._id] || []).length > 0;
                const isVisited = visited.has(q._id);
                const isCurrent = idx === activeIndex;
                const statusClass = isAttempted
                  ? "bg-blue-600 text-white"
                  : isVisited
                    ? "bg-orange-100 text-orange-700"
                    : "bg-black/5 text-ink/70";
                return (
                  <button
                    key={q._id}
                    className={`h-9 rounded-lg text-xs font-semibold ${statusClass} ${
                      isCurrent ? "ring-2 ring-blue-400" : ""
                    }`}
                    onClick={() => setActiveIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-ink/60">... {Math.max(0, totalQuestions - 25)} more questions</div>
          </div>

          <button
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Finish & Submit Exam"}
          </button>
        </aside>
      </div>
    </div>
  );
}
