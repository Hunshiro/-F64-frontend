import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";
import {
  BookOpenCheck,
  Clock3,
  FileText,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
  sectionTimeMinutes?: number;
  timingMode: "aggregate" | "sectional";
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

const SECTIONS = ["Reasoning", "Quantitative Aptitude", "English Comprehension", "General Awareness"] as const;
type SectionName = typeof SECTIONS[number];

const createSectionRecord = <T,>(createValue: () => T): Record<SectionName, T> =>
  SECTIONS.reduce((acc, section) => {
    acc[section] = createValue();
    return acc;
  }, {} as Record<SectionName, T>);

export default function SscCglAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();

  // Quiz data
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // UI State
  const [stage, setStage] = useState<"instruction" | "quiz" | "results">("instruction");
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Quiz state
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer state
  const [sectionTimes, setSectionTimes] = useState<Record<SectionName, number>>(
    () => createSectionRecord(() => 0)
  );
  const [completedSections, setCompletedSections] = useState<SectionName[]>([]);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const attemptedKey = "tb_attempted_quizzes";

  // Section questions
  const sectionQuestions = useMemo(() => {
    const map = createSectionRecord<Question[]>(() => []);
    SECTIONS.forEach((section) => {
      map[section] = quiz?.questions?.filter((q) => q.subject === section) || [];
    });
    return map;
  }, [quiz]);

  const currentSection = SECTIONS[currentSectionIdx];
  const sectionQs = sectionQuestions[currentSection] || [];
  const activeQuestion = sectionQs[activeIndex];
  const totalMarks = quiz?.questions?.reduce((sum, q) => sum + q.marks, 0) || 0;

  // Load quiz
  useEffect(() => {
    if (!id) return;
    const loadQuiz = async () => {
      try {
        const data = await apiRequest<Quiz>(`/api/quizzes/${id}`);
        setQuiz(data);

        // Initialize section times
        const times = createSectionRecord(() => 0);
        SECTIONS.forEach((section) => {
          times[section] = (data.sectionTimeMinutes || data.durationMinutes / 4) * 60;
        });
        setSectionTimes(times);
      } catch (err: any) {
        notify(err.message || "Failed to load quiz");
      }
    };
    loadQuiz();
  }, [id, notify]);

  // Auth check
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Section timer
  useEffect(() => {
    if (stage !== "quiz" || submitted) return;

    const timer = setInterval(() => {
      setSectionTimes((prev) => {
        const timeLeft = prev[currentSection];
        if (timeLeft <= 1) {
          // Auto-advance to next section
          handleNextSection();
          return prev;
        }
        return { ...prev, [currentSection]: timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, currentSection, submitted]);

  // Track visited questions
  useEffect(() => {
    if (activeQuestion && stage === "quiz") {
      setVisited((prev) => {
        const next = new Set(prev);
        next.add(activeQuestion._id);
        return next;
      });
    }
  }, [activeQuestion, stage]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!quiz?._id) return;
    try {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        notify("Fullscreen is required. Please allow fullscreen mode.");
        return;
      }

      const attempt = await apiRequest<{ _id: string }>("/api/attempts/start", {
        method: "POST",
        body: JSON.stringify({ quizId: quiz._id }),
      });
      setAttemptId(attempt._id);
      setStage("quiz");
      setCurrentSectionIdx(0);
      setActiveIndex(0);
      setAnswers({});
      setVisited(new Set());
    } catch (err: any) {
      notify(err.message || "Failed to start attempt");
    }
  };

  const handleToggleOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const existing = prev[questionId] || [];
      let next: number[] = [];

      if (activeQuestion?.type === "multi") {
        next = existing.includes(optionIndex)
          ? existing.filter((i) => i !== optionIndex)
          : [...existing, optionIndex];
      } else {
        next = [optionIndex];
      }

      const updated = { ...prev, [questionId]: next };
      autosave(updated);
      return updated;
    });
  };

  const autosave = async (nextAnswers: Record<string, number[]>) => {
    if (!attemptId) return;
    const payload = Object.entries(nextAnswers).map(([questionId, selectedOptions]) => ({
      questionId,
      selectedOptions,
    }));
    try {
      await apiRequest(`/api/attempts/${attemptId}/autosave`, {
        method: "PATCH",
        body: JSON.stringify({ answers: payload }),
      });
    } catch {
      // silent autosave failure
    }
  };

  const handleNextSection = async () => {
    if (currentSectionIdx < SECTIONS.length - 1) {
      setCompletedSections((prev) =>
        prev.includes(currentSection) ? prev : [...prev, currentSection]
      );
      setCurrentSectionIdx(currentSectionIdx + 1);
      setActiveIndex(0);
    } else {
      // Submit
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    try {
      const result = await apiRequest<SubmitResponse>(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      setSubmitted(result);
      setStage("results");
      setCompletedSections((prev) =>
        prev.includes(currentSection) ? prev : [...prev, currentSection]
      );

      if (quiz?._id) {
        const raw = localStorage.getItem(attemptedKey);
        const existing = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [quiz._id, ...existing.filter((qid) => qid !== quiz._id)].slice(0, 20);
        localStorage.setItem(attemptedKey, JSON.stringify(next));
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      notify("Quiz submitted successfully");
    } catch (err: any) {
      notify(err.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStage("instruction");
    setAttemptId(null);
    setCurrentSectionIdx(0);
    setActiveIndex(0);
    setAnswers({});
    setSubmitted(null);
    setCompletedSections([]);
    setVisited(new Set());
  };

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#f2f5f9] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#0b4d92] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (stage === "instruction") {
    return (
      <div className="min-h-screen bg-[#f2f5f9] p-4 font-sans text-slate-900 md:p-6">
        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-sm border border-gray-300 bg-white shadow-lg">
          {/* Header */}
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

          {/* Candidate Info */}
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

          {/* Overview Cards */}
          <div className="grid gap-5 border-b border-gray-200 px-6 py-5 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded border border-gray-200 bg-slate-50 p-4">
              <Clock3 className="h-5 w-5 text-[#0b4d92]" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Duration</div>
                <div className="text-lg font-semibold">{quiz.durationMinutes} minutes</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded border border-gray-200 bg-slate-50 p-4">
              <FileText className="h-5 w-5 text-[#0b4d92]" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Total Questions</div>
                <div className="text-lg font-semibold">{quiz.questions.length}</div>
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

          {/* Exam Pattern */}
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
                      <th className="border-b border-gray-300 px-4 py-3">Total Marks</th>
                      <th className="border-b border-gray-300 px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTIONS.map((section) => {
                      const qs = sectionQuestions[section] || [];
                      const marks = qs.reduce((sum, q) => sum + q.marks, 0);
                      const timeMin = quiz.sectionTimeMinutes || quiz.durationMinutes / 4;
                      return (
                        <tr key={section} className="border-b border-gray-200">
                          <td className="border-r border-gray-200 px-4 py-3 font-semibold text-[#08376a]">
                            {section}
                          </td>
                          <td className="border-r border-gray-200 px-4 py-3 text-center">{qs.length}</td>
                          <td className="border-r border-gray-200 px-4 py-3 text-center">{marks}</td>
                          <td className="px-4 py-3 text-center">{timeMin} min</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Instructions */}
            {quiz.instructions && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#08376a]">
                  <AlertCircle className="h-5 w-5" />
                  Important Instructions
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
                  <p className="whitespace-pre-wrap">{quiz.instructions}</p>
                </div>
              </section>
            )}
          </div>

          {/* Language & Action */}
          <div className="border-t border-gray-200 bg-slate-50 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700">Language:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    language === "en"
                      ? "bg-[#0b4d92] text-white"
                      : "bg-white border border-gray-300 text-slate-700 hover:bg-gray-50"
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    language === "hi"
                      ? "bg-[#0b4d92] text-white"
                      : "bg-white border border-gray-300 text-slate-700 hover:bg-gray-50"
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/ssc-cgl/mocks")}
                className="px-6 py-2 rounded border border-gray-300 bg-white text-slate-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="px-6 py-2 rounded bg-[#0b4d92] text-white font-semibold hover:bg-[#08376a] transition-colors flex items-center gap-2"
              >
                <Play size={16} />
                Start Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "quiz") {
    const sectionTimeLeft = sectionTimes[currentSection] || 0;
    const isLastSection = currentSectionIdx === SECTIONS.length - 1;
    const isLastQuestion = activeIndex === sectionQs.length - 1;

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to exit? Your progress will be saved.")) {
                  navigate("/ssc-cgl/mocks");
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => undefined);
                  }
                }
              }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft size={16} /> Exit
            </button>
            <h1 className="font-heading font-bold text-sm md:text-base">{currentSection}</h1>
            <div className="flex items-center gap-4 text-sm font-mono">
              <div
                className={`flex items-center gap-1.5 ${
                  sectionTimeLeft < 60 ? "text-red-600" : "text-blue-600"
                }`}
              >
                <Clock3 size={14} />
                <span>{formatTime(sectionTimeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
            {SECTIONS.map((section, idx) => {
              const isActive = idx === currentSectionIdx;
              const isDone = completedSections.includes(section);
              return (
                <button
                  key={section}
                  onClick={() => {
                    if (idx <= currentSectionIdx) {
                      setCurrentSectionIdx(idx);
                      setActiveIndex(0);
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 border transition-colors
                    ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : isDone
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                >
                  {isDone && <CheckCircle2 size={12} />}
                  <span>{section.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
          {/* Sidebar: Question palette */}
          <div className="lg:w-72 shrink-0">
            <div className="glass-card p-4 sticky top-32">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {currentSection}
              </h3>
              <div className="grid grid-cols-6 gap-1.5 mb-4">
                {sectionQs.map((q, i) => (
                  <button
                    key={q._id}
                    onClick={() => setActiveIndex(i)}
                    className={`w-9 h-9 text-xs rounded flex items-center justify-center font-medium transition-all
                      ${
                        i === activeIndex
                          ? "bg-blue-600 text-white ring-2 ring-blue-300"
                          : answers[q._id]
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : visited.has(q._id)
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    title={`Q${i + 1} - ${answers[q._id] ? "Answered" : visited.has(q._id) ? "Visited" : "Not visited"}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                  <span className="text-muted-foreground">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
                  <span className="text-muted-foreground">Visited</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="flex-1">
            {activeQuestion && (
              <div className="glass-card p-6 md:p-8 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                      Q{activeIndex + 1}/{sectionQs.length}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">
                      {activeQuestion.marks} marks
                    </span>
                  </div>
                </div>

                <p className="text-lg font-medium mb-6 leading-relaxed">{activeQuestion.text}</p>

                <div className="space-y-3">
                  {activeQuestion.options.map((option, oi) => (
                    <button
                      key={oi}
                      onClick={() => handleToggleOption(activeQuestion._id, oi)}
                      className={`w-full text-left px-4 py-4 rounded-lg border-2 transition-all text-sm
                        ${
                          answers[activeQuestion._id]?.includes(oi)
                            ? "border-blue-600 bg-blue-50 text-foreground"
                            : "border-border/50 hover:border-blue-300 text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <span className="font-semibold mr-3">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <div className="flex items-center gap-2">
                {isLastQuestion ? (
                  isLastSection ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="btn-primary !text-sm !px-6 !py-2.5 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit Test"}
                    </button>
                  ) : (
                    <button
                      onClick={handleNextSection}
                      className="btn-primary !text-sm !px-6 !py-2.5 flex items-center gap-2"
                    >
                      Next Section <ArrowRight size={16} />
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => setActiveIndex(Math.min(sectionQs.length - 1, activeIndex + 1))}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Next <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>
                  {sectionQs.filter((q) => answers[q._id]).length} answered in {currentSection}
                </span>
                <span>{sectionQs.length} total</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${
                      (sectionQs.filter((q) => answers[q._id]).length / sectionQs.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "results" && submitted) {
    const sectionScores = createSectionRecord(() => ({ correct: 0, total: 0, marks: 0 }));

    submitted.review.forEach((review) => {
      const q = quiz.questions.find((q) => q._id === review.questionId);
      if (!q) return;

      const section = (q.subject || "General Awareness") as SectionName;
      if (!sectionScores[section]) {
        sectionScores[section] = { correct: 0, total: 0, marks: 0 };
      }

      sectionScores[section].total++;
      sectionScores[section].marks += q.marks;

      const isCorrect =
        review.correctOptions.length === review.selectedOptions.length &&
        review.correctOptions.every((opt) => review.selectedOptions.includes(opt));
      if (isCorrect) {
        sectionScores[section].correct++;
      }
    });

    return (
      <div className="min-h-screen bg-[#f2f5f9] p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate("/ssc-cgl/mocks")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Mocks
          </button>

          {/* Result Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Test Results</h1>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div>
                <div className="text-5xl font-bold text-blue-600">{submitted.result.score}</div>
                <div className="text-sm text-slate-600">Score</div>
              </div>
              <div className="text-3xl text-slate-300">/</div>
              <div>
                <div className="text-5xl font-bold text-slate-400">{totalMarks}</div>
                <div className="text-sm text-slate-600">Total</div>
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-900">
              Accuracy: {(submitted.result.accuracy * 100).toFixed(2)}%
            </div>
          </div>

          {/* Section-wise Results */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Section-wise Performance</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {SECTIONS.map((section) => {
                const score = sectionScores[section];
                const accuracy = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                return (
                  <div key={section} className="border border-slate-200 rounded-lg p-4">
                    <div className="font-semibold text-slate-900 mb-3">{section}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Correct:</span>
                        <span className="font-semibold">{score.correct}/{score.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Marks:</span>
                        <span className="font-semibold text-blue-600">{score.correct * (score.marks / score.total)}</span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Answer Review</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {submitted.review.map((review, idx) => {
                const q = quiz.questions.find((q) => q._id === review.questionId);
                if (!q) return null;

                const isCorrect =
                  review.correctOptions.length === review.selectedOptions.length &&
                  review.correctOptions.every((opt) => review.selectedOptions.includes(opt));

                return (
                  <div
                    key={idx}
                    className={`border-l-4 p-4 rounded ${
                      isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle2 size={18} className="text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 mb-1">Q{idx + 1}: {review.text}</p>
                        <p className="text-xs text-slate-600 mb-3">
                          Your answer: {review.selectedOptions.map((opt) => String.fromCharCode(65 + opt)).join(", ") || "Not attempted"}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-slate-600 mb-2">
                            Correct answer: {review.correctOptions.map((opt) => String.fromCharCode(65 + opt)).join(", ")}
                          </p>
                        )}
                        {review.explanation && (
                          <p className="text-xs text-slate-700 italic">💡 {review.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-6 justify-center flex-wrap">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw size={18} />
              Retake Test
            </button>
            <button
              onClick={() => navigate("/ssc-cgl/mocks")}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back to Mocks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
