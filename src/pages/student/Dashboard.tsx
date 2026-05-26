﻿import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Clock3,
  Flame,
  Gauge,
  Sparkles,
  Target
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  quizId?: string;
};

type QuizSummary = {
  _id: string;
  title: string;
  durationMinutes: number;
  difficulty: string;
};

type LatestMockResponse = {
  quiz: QuizSummary | null;
};

const STORAGE_KEY = "tb_student_quizzes";
const ATTEMPTED_KEY = "tb_attempted_quizzes";
const DESCRIPTIVE_ATTEMPT_KEY = "tb_descriptive_attempts";

const DESCRIPTIVE_QUIZZES = [
  { id: "oicl-ao-1", title: "Descriptive Set 1" },
  { id: "oicl-ao-2", title: "Descriptive Set 2" },
  { id: "oicl-ao-3", title: "Descriptive Set 3" },
  { id: "oicl-ao-4", title: "Descriptive Set 4" },
  { id: "oicl-ao-5", title: "Descriptive Set 5" }
];

export default function StudentDashboard() {
  const location = useLocation();
  const { notify } = useToast();
  const { user } = useAuth();

  const [isGenerating, setIsGenerating] = useState(false);
  const [autoQuestions, setAutoQuestions] = useState(true);

  const [savedQuizIds, setSavedQuizIds] = useState<string[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizSummary[]>([]);

  const [attemptMap, setAttemptMap] = useState<Record<string, string>>({});
  const [attemptedQuizIds, setAttemptedQuizIds] = useState<string[]>([]);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<QuizSummary[]>([]);

  const [attemptedDescriptive, setAttemptedDescriptive] = useState<
    { id: string; title: string; totalScore?: number }[]
  >([]);

  const [latestSscMock, setLatestSscMock] = useState<QuizSummary | null>(null);

  const [form, setForm] = useState({
    examType: "Banking",
    topic: "",
    difficulty: "medium",
    durationMinutes: 20,
    questionsLimit: 20
  });

  const [tutorInput, setTutorInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Tell me your exam, topic, difficulty, and time. I will build a practice quiz for you."
    }
  ]);

  useEffect(() => {
    apiRequest<LatestMockResponse>("/api/ai/ssc-cgl/latest-mock")
      .then((data) => setLatestSscMock(data.quiz))
      .catch(() => setLatestSscMock(null));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const key = `${STORAGE_KEY}_${user.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const map = JSON.parse(raw) as Record<string, string>; // Expecting a map now
      if (map && typeof map === 'object') setSavedQuizIds(Object.keys(map)); // Get quiz IDs from keys
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    
    // Fetch attempt history directly from MongoDB
    apiRequest<any[]>(`/api/attempts?status=submitted`)
      .then(attempts => {
        if (!Array.isArray(attempts)) return;
        const map: Record<string, string> = {};
        attempts.forEach(attempt => {
          const qId = attempt.quizId?._id || attempt.quizId;
          const aId = attempt._id;
          if (qId) map[String(qId)] = String(aId);
        });
        setAttemptMap(map);
        setAttemptedQuizIds(Object.keys(map));
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `${DESCRIPTIVE_ATTEMPT_KEY}_${user.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Record<string, { totalScore?: number }>;
      const items = Object.keys(data || {}).map((id) => {
        const meta = DESCRIPTIVE_QUIZZES.find((q) => q.id === id);
        return {
          id,
          title: meta?.title || "Descriptive Writing",
          totalScore: data[id]?.totalScore
        };
      });
      setAttemptedDescriptive(items);
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    if (!savedQuizIds.length) return;
    let active = true;
    Promise.all(
      savedQuizIds.map((quizId) => apiRequest<QuizSummary>(`/api/quizzes/${quizId}`).catch(() => null))
    ).then((items) => {
      if (!active) return;
      setSavedQuizzes(items.filter(Boolean) as QuizSummary[]);
    });
    return () => {
      active = false;
    };
  }, [savedQuizIds]);

  useEffect(() => {
    if (!attemptedQuizIds.length) return;
    let active = true;
    Promise.all(
      attemptedQuizIds.map((quizId) => apiRequest<QuizSummary>(`/api/quizzes/${quizId}`).catch(() => null))
    ).then((items) => {
      if (!active) return;
      setAttemptedQuizzes(items.filter(Boolean) as QuizSummary[]);
    });
    return () => {
      active = false;
    };
  }, [attemptedQuizIds]);

  const setDuration = (value: number) => {
    setForm((f) => {
      const next = { ...f, durationMinutes: value };
      if (autoQuestions) {
        const suggested = Math.min(50, Math.max(5, Math.round(value)));
        next.questionsLimit = suggested;
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!form.topic.trim()) {
      notify("Topic is required");
      return;
    }

    const summary = `${form.examType} exam, Topic: ${form.topic}, Difficulty: ${form.difficulty}, Time: ${form.durationMinutes} min, Questions: ${form.questionsLimit}`;
    const pendingId = Math.random().toString(36).slice(2);

    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), role: "user", text: summary },
      { id: pendingId, role: "assistant", text: "Generating your quiz..." }
    ]);

    try {
      setIsGenerating(true);

      const result = await apiRequest<{ quizId: string; count: number; usedAi?: boolean; aiProvider?: string }>(
        "/api/ai/practice-quiz",
        {
          method: "POST",
          body: JSON.stringify({
            examType: form.examType,
            topic: form.topic.trim(),
            difficulty: form.difficulty,
            durationMinutes: form.durationMinutes,
            questionsLimit: form.questionsLimit
          })
        }
      );

      setSavedQuizIds((prev) => {
        if (!user?.id) return prev;
        const key = `${STORAGE_KEY}_${user.id}`;
        const existingMap = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, string>;
        existingMap[result.quizId] = result.quizId; // Store quizId -> quizId for saved
        const next = Object.keys(existingMap);
        localStorage.setItem(key, JSON.stringify(existingMap));
        return next.slice(0, 10);
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                text: `Your quiz is ready. ${result.usedAi ? `AI: ${result.aiProvider || "assistant"}` : "Fallback mode"} • ${result.count} questions.`,
                quizId: result.quizId
              }
            : m
        )
      );

      notify({
        message: "Quiz generated",
        action: {
          label: "Start Quiz",
          onClick: () => {
            window.location.href = `/student/quiz/${result.quizId}`;
          }
        }
      });
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, text: "Failed to generate quiz." } : m)));
      notify(err.message || "AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTutorSend = () => {
    if (!tutorInput.trim()) return;

    const userText = tutorInput.trim();
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), role: "user", text: userText },
      {
        id: Math.random().toString(36).slice(2),
        role: "assistant",
        text: `Here is a quick breakdown: ${userText}. If you want, generate a practice test from the panel on the right.`
      }
    ]);
    setTutorInput("");
  };

  const activeSection = (location.hash || "#home").replace("#", "");
  const isActive = (key: string) => activeSection === key;

  return (
    <div className="space-y-6">
      {isActive("home") && (
        <section id="home" className="space-y-5">
          <div className="overflow-hidden rounded-3xl border bg-white/95 p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border bg-black px-3 py-1 text-xs font-medium text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  Focus dashboard
                </div>
                <div>
                  <div className="font-display text-3xl leading-tight md:text-4xl">
                    Good morning, {user?.name || "Student"}.
                  </div>
                  <div className="mt-2 max-w-2xl text-sm text-ink/70 md:text-base">
                    Your preparation lane is clear. Keep the rhythm, take the next mock, and turn today into measurable progress.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                    to="/student/ssc-cgl-mocks"
                  >
                    View SSC CGL Mocks
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-medium transition hover:bg-black hover:text-white"
                    to="/#my-quizzes"
                  >
                    View My Quizzes
                    <BarChart3 className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border bg-[#F7F8FA] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-ink/50">Weekly Goal</div>
                    <div className="mt-1 text-2xl font-semibold">85%</div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <Target className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/10">
                  <div className="h-full w-[85%] rounded-full bg-black" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border bg-white p-3">
                    <div className="flex items-center gap-2 text-ink/60">
                      <Flame className="h-4 w-4" />
                      Streak
                    </div>
                    <div className="mt-2 text-xl font-semibold">6 days</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-3">
                    <div className="flex items-center gap-2 text-ink/60">
                      <Gauge className="h-4 w-4" />
                      Pace
                    </div>
                    <div className="mt-2 text-xl font-semibold">Strong</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: "Hours Studied", value: "42.5h", detail: "This month", icon: <Clock3 className="h-5 w-5" /> },
                { label: "Quiz Average", value: "88.4%", detail: "Last 5 attempts", icon: <BarChart3 className="h-5 w-5" /> },
                { label: "Upcoming Deadlines", value: "3", detail: "Mocks queued", icon: <CalendarClock className="h-5 w-5" /> }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="group flex items-center gap-4 rounded-2xl border bg-white/90 p-4 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white transition group-hover:scale-105">
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-ink/50">{stat.label}</div>
                    <div className="mt-1 text-xl font-semibold">{stat.value}</div>
                    <div className="text-xs text-ink/60">{stat.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card title="Exam Mock Tests">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "SSC CGL Full Length Mock", tag: "SSC CGL", subtitle: "100 questions • 4 sections", live: true },
                { title: "Banking PO Mock", tag: "Banking", subtitle: "Coming soon", live: false },
                { title: "Insurance AO Mock", tag: "Insurance", subtitle: "Coming soon", live: false },
                { title: "Railway NTPC Mock", tag: "Railway", subtitle: "Coming soon", live: false },
                { title: "State PCS Mock", tag: "State", subtitle: "Coming soon", live: false },
                { title: "Mixed Aptitude Mock", tag: "Mixed", subtitle: "Coming soon", live: false }
              ].map((c) => (
                <div key={c.title} className="p-4 rounded-2xl border bg-white/70 space-y-2">
                  <div className="text-xs uppercase tracking-widest text-ink/40">{c.tag}</div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-ink/60">{c.subtitle}</div>

                  {c.live ? (
                    <Link className="px-3 py-2 rounded-lg bg-accent text-white text-sm inline-block" to="/student/ssc-cgl-mocks">
                      View
                    </Link>
                  ) : (
                    <Link className="px-3 py-2 rounded-lg border text-sm inline-block" to="/student/exam-coming-soon">
                      Coming Soon
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {isActive("ai") && (
        <section id="ai">
          <Card title="AI Tutor">
            <div className="grid lg:grid-cols-[1fr_320px] gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs">AI Engine Active</span>
                  <span className="text-xs text-ink/50">Powered by tutor mode</span>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl text-sm max-w-[80%] shadow-sm ${
                          msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border"
                        }`}
                      >
                        <div>{msg.text}</div>
                        {msg.quizId && (
                          <div className="mt-2">
                            <Link
                              className="px-3 py-1 rounded-lg bg-white/90 text-black text-xs"
                              to={`/student/quiz/${msg.quizId}`}
                            >
                              Start Quiz
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border bg-white/90 p-3">
                  <input
                    className="flex-1 bg-transparent outline-none text-sm"
                    placeholder="Ask anything about your study material..."
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                  />
                  <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleTutorSend}>
                    Send
                  </button>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border bg-white/90 p-4 space-y-4">
                  <div>
                    <div className="font-medium">Create Practice Test</div>
                    <div className="text-xs text-ink/60">Generate custom quizzes using AI based on your topics.</div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide text-ink/50 mb-2">Upload Study Material</div>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-xs text-ink/60 cursor-pointer">
                      <span className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">⬆️</span>
                      Click to upload or drag & drop
                      <input type="file" className="hidden" />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-ink/60">Study Topic</label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border"
                      placeholder="e.g. Photosynthesis, RBI, Insurance"
                      value={form.topic}
                      onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-ink/60">Difficulty Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["easy", "medium", "hard"] as const).map((level) => (
                        <button
                          key={level}
                          className={`px-2 py-2 rounded-lg border text-xs ${
                            form.difficulty === level ? "bg-blue-600 text-white border-blue-600" : "bg-white"
                          }`}
                          onClick={() => setForm((f) => ({ ...f, difficulty: level }))}
                        >
                          {level[0].toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wide text-ink/60">Questions</label>
                      <input
                        type="number"
                        min={5}
                        max={50}
                        className="w-full px-3 py-2 rounded-lg border"
                        value={form.questionsLimit}
                        onChange={(e) => {
                          setAutoQuestions(false);
                          setForm((f) => ({ ...f, questionsLimit: Number(e.target.value) }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs uppercase tracking-wide text-ink/60">Time (min)</label>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        className="w-full px-3 py-2 rounded-lg border"
                        value={form.durationMinutes}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate Practice Test"}
                  </button>
                </div>

                <div className="rounded-2xl border bg-white/90 p-4">
                  <div className="text-xs uppercase tracking-widest text-ink/50">Recent Quizzes</div>
                  <div className="mt-3 space-y-2">
                    {savedQuizzes.slice(0, 2).map((q) => (
                      <div key={q._id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div>
                          <div className="text-sm font-medium">{q.title}</div>
                          <div className="text-xs text-ink/60">{q.durationMinutes} min</div>
                        </div>
                        <Link className="text-xs text-blue-600" to={`/student/quiz/${q._id}`}>
                          Open
                        </Link>
                      </div>
                    ))}
                    {!savedQuizzes.length && <div className="text-xs text-ink/50">No recent quizzes yet.</div>}
                  </div>
                </div>
              </aside>
            </div>
          </Card>
        </section>
      )}

      {isActive("my-quizzes") && (
        <section id="my-quizzes">
          <Card title="My Quizzes">
            <div className="space-y-2">
              {!savedQuizzes.length && <div className="text-sm text-ink/60">No quizzes yet. Generate one to get started.</div>}
              {savedQuizzes.map((q) => (
                <div key={q._id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-xs text-ink/60">
                      {q.durationMinutes} min • {q.difficulty}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${attemptMap[q._id] ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-accent text-white hover:opacity-90'}`} 
                      to={attemptMap[q._id] ? `/student/mock-analytics/${attemptMap[q._id]}?quizId=${q._id}` : `/student/quiz/${q._id}`}
                    >
                      {attemptMap[q._id] ? 'Review' : 'Attempt'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {isActive("attempted") && (
        <section id="attempted">
          <Card title="Attempted Quizzes">
            <div className="space-y-2">
              {!attemptedQuizzes.length && !attemptedDescriptive.length && (
                <div className="text-sm text-ink/60">No attempts yet. Start a quiz to see it here.</div>
              )}

              {attemptedQuizzes.map((q) => (
                <div key={q._id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-xs text-ink/60">
                      {q.durationMinutes} min • {q.difficulty}
                    </div>
                  </div>
                  <Link 
                    className="px-3 py-2 rounded-lg border text-sm" 
                    to={attemptMap[q._id] ? `/student/mock-analytics/${attemptMap[q._id]}?quizId=${q._id}` : `/student/quiz/${q._id}`}
                  >
                    Review
                  </Link>
                </div>
              ))}

              {attemptedDescriptive.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-xs text-ink/60">
                      Descriptive • {q.totalScore !== undefined ? `Score ${q.totalScore}/30` : "Score pending"}
                    </div>
                  </div>
                  <Link className="px-3 py-2 rounded-lg border text-sm" to={`/student/descriptive/${q.id}`}>
                    Review
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
