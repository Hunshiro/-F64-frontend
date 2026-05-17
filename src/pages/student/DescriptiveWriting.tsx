import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";

type WritingQuiz = {
  id: string;
  title: string;
  essayTopic: string;
  letterTopic: string;
};

const QUIZZES: WritingQuiz[] = [
  {
    id: "oicl-ao-1",
    title: "Descriptive Set 1",
    essayTopic: "Digital Banking and Financial Inclusion in India.",
    letterTopic: "Write a letter to the Editor on rising cyber fraud awareness."
  },
  {
    id: "oicl-ao-2",
    title: "Descriptive Set 2",
    essayTopic: "Role of Insurance in Disaster Risk Management.",
    letterTopic: "Write a letter to a customer about claim settlement procedures."
  },
  {
    id: "oicl-ao-3",
    title: "Descriptive Set 3",
    essayTopic: "Impact of Inflation on Household Savings.",
    letterTopic: "Write a letter to your branch manager requesting a new passbook."
  },
  {
    id: "oicl-ao-4",
    title: "Descriptive Set 4",
    essayTopic: "Sustainable Finance and Green Investments.",
    letterTopic: "Write a letter to the municipality about water logging in your area."
  },
  {
    id: "oicl-ao-5",
    title: "Descriptive Set 5",
    essayTopic: "Artificial Intelligence in Banking Operations.",
    letterTopic: "Write a letter to a friend advising on health insurance selection."
  }
];

const ATTEMPT_KEY = "tb_descriptive_attempts";

export default function DescriptiveWriting() {
  const { id } = useParams();
  const { notify } = useToast();
  const quiz = useMemo(() => QUIZZES.find((q) => q.id === id) || QUIZZES[0], [id]);
  const [essay, setEssay] = useState("");
  const [letter, setLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{
    essayScore: number;
    letterScore: number;
    totalScore: number;
    feedback: { essay: string; letter: string; overall: string };
  } | null>(null);

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const essayWords = countWords(essay);
  const letterWords = countWords(letter);

  useEffect(() => {
    if (!isStarted || result) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onFullscreenChange = () => {
      if (!result && isStarted && !document.fullscreenElement) {
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
  }, [isStarted, result, notify]);

  useEffect(() => {
    if (!isStarted || result) return;
    setTimeLeft(30 * 60);
  }, [isStarted, result]);

  useEffect(() => {
    if (!isStarted || result || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev === null ? prev : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isStarted, result, timeLeft]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStart = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsStarted(true);
    } catch {
      notify("Please allow fullscreen to start the quiz.");
    }
  };

  const handleSubmit = async () => {
    if (!essay.trim() || !letter.trim()) {
      notify("Please complete both essay and letter.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiRequest<{
        essayScore: number;
        letterScore: number;
        totalScore: number;
        feedback: { essay: string; letter: string; overall: string };
      }>("/api/ai/grade-writing", {
        method: "POST",
        body: JSON.stringify({
          essayTopic: quiz.essayTopic,
          letterTopic: quiz.letterTopic,
          essayText: essay,
          letterText: letter,
          essayWordCount: essayWords,
          letterWordCount: letterWords,
          essayTargetWords: 300,
          letterTargetWords: 150,
          maxEssayMarks: 20,
          maxLetterMarks: 10
        })
      });
      setResult(res);
      const raw = localStorage.getItem(ATTEMPT_KEY);
      const existing = raw ? (JSON.parse(raw) as Record<string, any>) : {};
      existing[quiz.id] = { totalScore: res.totalScore, essayScore: res.essayScore, letterScore: res.letterScore };
      localStorage.setItem(ATTEMPT_KEY, JSON.stringify(existing));
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => undefined);
      }
      setIsStarted(false);
    } catch (err: any) {
      notify(err.message || "Failed to analyze writing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isStarted && !result) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] text-ink p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-2xl border bg-white p-6">
            <div className="text-xs uppercase tracking-widest text-ink/40">OICL AO Mains</div>
            <div className="font-display text-2xl">Descriptive Writing Practice</div>
            <div className="text-sm text-ink/60">{quiz.title}</div>
            <div className="mt-4 text-sm text-ink/70">
              30 marks • Essay 300 words • Letter 150 words • 30 minutes
            </div>
            <button className="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleStart}>
              Start Attempt
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-ink">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <div className="font-display text-lg">Descriptive Writing Practice</div>
            <div className="text-xs text-ink/60">{quiz.title}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-2 rounded-lg border text-sm">
              Time Left: <span className="font-semibold">{formatTime(timeLeft)}</span>
            </div>
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 px-6 py-6">
        <div className="space-y-5">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm font-semibold">Essay (20 marks) • Target 300 words</div>
            <div className="text-xs text-ink/60 mb-3">{quiz.essayTopic}</div>
            <textarea
              className="w-full min-h-[220px] rounded-xl border p-3 text-sm"
              placeholder="Write your essay here..."
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
            />
            <div className="text-xs text-ink/50 mt-2">Word count: {essayWords}</div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm font-semibold">Letter (10 marks) • Target 150 words</div>
            <div className="text-xs text-ink/60 mb-3">{quiz.letterTopic}</div>
            <textarea
              className="w-full min-h-[200px] rounded-xl border p-3 text-sm"
              placeholder="Write your letter here..."
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
            />
            <div className="text-xs text-ink/50 mt-2">Word count: {letterWords}</div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-semibold">Marks Breakdown</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Essay</span>
                <span>20</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Letter</span>
                <span>10</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>30</span>
              </div>
            </div>
          </div>

          {result && (
            <div className="rounded-2xl border bg-white p-4 space-y-3 text-sm">
              <div className="font-semibold">AI Feedback</div>
              <div className="text-xs text-ink/60">
                Essay: {result.essayScore}/20 • Letter: {result.letterScore}/10 • Total: {result.totalScore}/30
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/40">Essay</div>
                <div>{result.feedback.essay}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/40">Letter</div>
                <div>{result.feedback.letter}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/40">Overall</div>
                <div>{result.feedback.overall}</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
