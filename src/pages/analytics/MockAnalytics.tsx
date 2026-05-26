import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import {
  Trophy,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  ChevronRight,
  Download,
  Share2,
  RotateCcw,
  Sparkles,
  Bookmark,
  MessageSquare,
  ArrowLeft,
  Activity,
  Gauge,
  Eye, X
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { apiRequest } from "../../lib/api";

type Difficulty = "easy" | "medium" | "hard";

type AnalyticsQuestion = {
  id: string;
  number: number;
  status: "correct" | "wrong" | "skipped";
  timeTaken: number;
  difficulty: Difficulty;
  topic: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  options: string[];
  userAnswerIndex?: number;
  correctAnswerIndex?: number;
  marks: number;
  text: string;
};

type AnalyticsSection = {
  subject: string; 
  score: number;
  totalMarks: number;
  accuracy: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeSpentSeconds: number;
  percentile: number;
  rank: number;
  topperScore: number;
  avgScore: number;
  topics: { name: string; correct: number; total: number }[];
};

type AnalyticsPayload = {
  overall: {
    score: number;
    totalMarks: number;
    percentile: number;
    rank: number;
    totalCandidates: number;
    accuracy: number;
    attempted: number;
    correct: number;
    wrong: number;
    skipped: number;
    timeTakenSeconds: number;
    avgTimePerQuestion: number;
    selectionProbability: number;
    tierPrediction: string;
    performanceBadge: string;
  };
  sections: AnalyticsSection[];
  trends: { mock: string; score: number; avg: number }[];
  questions: AnalyticsQuestion[];
};

type LeaderboardRow = {
  userId: string;
  name: string;
  email: string;
  score: number;
  accuracy: number;
  timeTakenSeconds: number;
  submittedAt: string;
  rank: number;
};

const StatCard = ({ label, value, icon: Icon, color, detail }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    className="relative overflow-hidden rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl shadow-xl"
  >
    <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 ${color}`} />
    <div className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color} text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {detail && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{detail}</p>}
      </div>
    </div>
  </motion.div>
);

function formatMMSS(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function safePct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

export default function MockAnalytics() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [selectedSolution, setSelectedSolution] = useState<AnalyticsQuestion | null>(null);

  const [activeSection, setActiveSection] = useState("All");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    apiRequest<AnalyticsPayload>(`/api/attempts/${id}/analytics`, { method: "GET" })
      .then((res) => setData(res))
      .catch((e: any) => setError(e?.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [id]);

  // leaderboard needs quizId; the analytics endpoint uses attemptId. For now
  // we derive quizId from query param if present; otherwise the UI shows empty.
  useEffect(() => {
    if (!id) return;
    // Try to read quizId if the route passes it.
    const url = new URL(window.location.href);
    const quizId = url.searchParams.get("quizId");
    if (!quizId) return;

    setLeaderboardLoading(true);
    apiRequest<{ quizId: string; totalCandidates: number; leaderboard: LeaderboardRow[] }>(
      `/api/leaderboard/${quizId}`,
      { method: "GET" }
    )
      .then((res) => setLeaderboard(res.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, [id]);

  const radarData = useMemo(() => {
    if (!data) return [];
    return data.sections.map((s) => ({
      subject: s.subject,
      User: safePct(s.score, s.totalMarks),
      Topper: s.topperScore ? safePct(s.topperScore, s.totalMarks) : 100,
      Avg: s.avgScore ? safePct(s.avgScore, s.totalMarks) : safePct((s.totalMarks * (s.accuracy / 100)) / 1, s.totalMarks)
    }));
  }, [data]);

  const filteredSections = useMemo(() => {
    if (!data) return [];
    if (activeSection === "All") return data.sections;
    const keyMap: Record<string, string> = {
      Reasoning: "Reasoning",
      Quant: "Quantitative Aptitude",
      English: "English Comprehension",
      GA: "General Awareness"
    };
    const match = keyMap[activeSection] || activeSection;
    return data.sections.filter((s) => s.subject === match);
  }, [data, activeSection]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-slate-600 font-bold">Loading analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="max-w-lg p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-lg font-black text-slate-900">Failed to load analytics</div>
          <div className="text-sm text-slate-600 mt-2">{error || "Unknown error"}</div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const overall = data.overall;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans text-slate-900 selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all hover:border-blue-500 hover:text-blue-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">Performance Analytics</h1>
              <p className="text-xs font-bold text-slate-500">Submitted on {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Download size={16} /> Report PDF
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700">
              <Share2 size={16} /> Share Result
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl"
          >
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
            <div className="relative z-10 grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                  <Activity size={14} className="text-blue-400" /> Test Summary
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-6xl font-black">{overall.score}</h2>
                    <span className="text-xl font-bold text-slate-400">/ {overall.totalMarks}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-blue-400">{overall.tierPrediction}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl bg-white/5 p-4 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase text-slate-400">All India Rank</p>
                    <p className="text-xl font-black">#{overall.rank}</p>
                    <p className="text-[10px] text-slate-500">out of {overall.totalCandidates}</p>
                  </div>
                  <div className="rounded-3xl bg-white/5 p-4 backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Percentile</p>
                    <p className="text-xl font-black text-emerald-400">{overall.percentile}%</p>
                    <p className="text-[10px] text-slate-500">Top 5% Aspirants</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-[32px] bg-white/5 p-6 text-center backdrop-blur-md border border-white/10">
                <div className="relative h-40 w-40">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${overall.selectionProbability * 2.82} 282`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black">{overall.selectionProbability}%</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Selection Prob.</span>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <Trophy size={16} /> {overall.performanceBadge} Badge
                  </div>
                  <p className="text-xs text-slate-400 px-4">You performed based on your submitted answers.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Accuracy" value={`${overall.accuracy}%`} icon={Target} color="bg-emerald-500" detail="Precision Rate" />
            <StatCard label="Attempted" value={overall.attempted} icon={Zap} color="bg-orange-500" detail={`Out of ${data.questions.length}`} />
            <StatCard label="Correct" value={overall.correct} icon={CheckCircle2} color="bg-blue-500" detail="Questions Correct" />
            <StatCard label="Wrong" value={overall.wrong} icon={XCircle} color="bg-red-500" detail="Negative Marks" />
            <StatCard label="Total Time" value={formatMMSS(overall.timeTakenSeconds)} icon={Clock} color="bg-indigo-500" detail="Time taken" />
            <StatCard label="Speed" value={`${overall.avgTimePerQuestion}s`} icon={Gauge} color="bg-purple-500" detail="Avg per question" />
          </div>
        </div>

        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Activity className="text-blue-600" /> Section-wise Breakdown
            </h2>
            <div className="flex gap-2">
              {["All", "Reasoning", "Quant", "English", "GA"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSection(tab)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeSection === tab
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-slate-600 hover:bg-slate-100 border"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredSections.map((section, idx) => (
              <motion.div
                key={section.subject}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-black text-slate-800">{section.subject}</h3>
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Rank #{section.rank}</div>
                </div>
                <div className="mb-6 flex items-baseline gap-2">
                  <span className="text-3xl font-black">{section.score}</span>
                  <span className="text-xs font-bold text-slate-400">/ {section.totalMarks.toFixed(1)}</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-[10px] font-bold uppercase text-slate-500">
                      <span>Accuracy</span>
                      <span>{section.accuracy}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${section.accuracy}%` }}
                        className={`h-full rounded-full ${section.accuracy > 90 ? "bg-emerald-500" : "bg-orange-500"}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Correct</p>
                      <p className="text-sm font-black text-emerald-600">{section.correct}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Wrong</p>
                      <p className="text-sm font-black text-red-500">{section.wrong}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Skip</p>
                      <p className="text-sm font-black text-slate-400">{section.skipped}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full py-2 px-4 rounded-xl bg-slate-50 text-[10px] font-bold text-slate-600">
                    TOPIC-WISE INSIGHTS <ChevronRight size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-800">Skill Competitiveness</h3>
              <p className="text-xs font-bold text-slate-500">Attempt vs Topper & Avg (best-effort)</p>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="User" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                  <Radar name="Topper" dataKey="Topper" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  <Radar name="Avg" dataKey="Avg" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-800">Improvement Trajectory</h3>
                <p className="text-xs font-bold text-slate-500">Score trend over your last 4 mocks</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-emerald-600 flex items-center gap-1">
                  <TrendingUp size={16} />
                  {data.trends.length >= 2
                    ? `${Math.round(
                        ((data.trends[0].score - data.trends[data.trends.length - 1].score) /
                          Math.max(1, data.trends[data.trends.length - 1].score)) * 100
                      )}%`
                    : ""}
                </span>
                <p className="text-[10px] font-bold text-slate-400">vs earlier attempt</p>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.trends}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mock" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#scoreColor)" />
                  <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Avg" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Sparkles size={24} className="text-blue-600" /> Personalized AI Guidance
            </h3>
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-700">
              Coming soon.
            </div>
          </div>

          <div className="rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-800">Time Strategy</h3>
            <div className="h-[250px] w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.sections} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="timeSpentSeconds">
                    {data.sections.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"][index % 4]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {data.sections.map((s, i) => (
                <div key={s.subject} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${["bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-purple-500"][i % 4]}`} />
                    <span className="text-slate-600">{s.subject}</span>
                  </div>
                  <span className="text-slate-800">{Math.floor((s.timeSpentSeconds || 0) / 60)}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-[40px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Trophy className="text-orange-500" size={28} /> Hall of Fame
            </h3>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-700">Top Candidates</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">(Real leaderboard)</div>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-6 text-sm font-bold text-slate-600 bg-white">No leaderboard data available for this mock.</div>
            ) : (
              <div className="bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboard.slice(0, 10).map((row) => (
                        <tr key={row.userId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-600">#{row.rank}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{row.name}</td>
                          <td className="px-6 py-4 font-bold text-blue-700">{row.score}</td>
                          <td className="px-6 py-4 font-bold text-emerald-700">{row.accuracy.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 mb-20 overflow-hidden rounded-[40px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800">Question-by-Question Analysis</h3>
              <p className="text-xs font-bold text-slate-500">Review your responses</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="px-8 py-4">Q.No</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Topic</th>
                  <th className="px-6 py-4 text-center">Time</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Marks</th>
                  <th className="px-6 py-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.questions.map((q) => (
                  <tr key={q.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-4 font-black text-slate-500">#{q.number}</td>
                    <td className="px-6 py-4">
                      {q.status === "correct" ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 size={12} /> Correct
                        </div>
                      ) : q.status === "wrong" ? (
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 w-fit px-3 py-1 rounded-full border border-red-100">
                          <XCircle size={12} /> Wrong
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-200">
                          <MinusCircle size={12} /> Skipped
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800">{q.topic || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`text-xs font-bold ${q.timeTaken > 45 ? "text-red-500" : "text-slate-600"}`}>{q.timeTaken}s</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          q.difficulty === "easy"
                            ? "bg-emerald-100 text-emerald-700"
                            : q.difficulty === "medium"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-xs">
                      <span className={q.marks >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {q.marks >= 0 ? `+${q.marks}` : `${q.marks}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all">
                          <Bookmark size={14} />
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                          onClick={() => {
                            setSelectedSolution(q);
                          }}
                        >
                          View Solutions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50/50 px-8 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing all {data.questions.length} Questions</p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden">
        <div className="flex gap-3 bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/10">
          <button className="text-white flex flex-col items-center gap-1" onClick={() => navigate(-1)}>
            <RotateCcw size={18} />
            <span className="text-[8px] font-bold uppercase">Retry</span>
          </button>
          <div className="w-px h-8 bg-white/20 mx-2" />
          <button className="text-white flex flex-col items-center gap-1" onClick={() => undefined}>
            <Share2 size={18} />
            <span className="text-[8px] font-bold uppercase">Share</span>
          </button>
        </div>
      </div>

      {/* Solution Modal */}
      {selectedSolution && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="font-black text-slate-800">Question #{selectedSolution.number} Solution</h4>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedSolution.topic}</p>
              </div>
              <button 
                onClick={() => setSelectedSolution(null)}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="text-lg font-bold text-slate-800 leading-relaxed">
                {selectedSolution.text}
              </div>

              <div className="grid gap-3">
                {selectedSolution.options.map((opt, idx) => {
                  const isCorrect = idx === selectedSolution.correctAnswerIndex || opt === selectedSolution.correctAnswer;
                  const isUser = idx === selectedSolution.userAnswerIndex || opt === selectedSolution.userAnswer;
                  
                  let borderColor = "border-slate-100";
                  let bgColor = "bg-white";
                  if (isCorrect) { borderColor = "border-emerald-500"; bgColor = "bg-emerald-50"; }
                  else if (isUser) { borderColor = "border-red-500"; bgColor = "bg-red-50"; }

                  return (
                    <div key={idx} className={`p-4 rounded-2xl border-2 ${borderColor} ${bgColor} flex items-center justify-between`}>
                      <span className="text-sm font-bold text-slate-700">{opt}</span>
                      {isCorrect && <CheckCircle2 size={18} className="text-emerald-600" />}
                      {isUser && !isCorrect && <XCircle size={18} className="text-red-600" />}
                    </div>
                  );
                })}
              </div>

              <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-black text-xs uppercase tracking-widest mb-3">
                  <Sparkles size={16} /> Step-by-Step Explanation
                </div>
                <div className="text-sm text-slate-700 leading-relaxed font-medium">
                  {selectedSolution.explanation || "No detailed explanation provided for this question."}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
