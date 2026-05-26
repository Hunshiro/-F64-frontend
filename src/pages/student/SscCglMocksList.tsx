import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { 
  ArrowRight, 
  ArrowLeft,
  Clock, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Info, 
  Trophy, 
  BookOpen, 
  Languages 
} from "lucide-react";

type Quiz = {
  _id: string;
  title: string;
  durationMinutes: number;
  difficulty?: string;
  language?: "en" | "hi";
  questions?: Array<{ _id: string }>;
};

const ATTEMPTED_KEY = "tb_attempted_quizzes";

const TABS = [
  { id: "pre", label: "Full Mock (Pre)" },
  { id: "mains", label: "Full Mock (Mains)" },
  { id: "sectional", label: "Sectional Mocks" },
  { id: "pyp", label: "Previous Year Papers" }
];

export default function SscCglMocksList() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [mocks, setMocks] = useState<Quiz[]>([]); // All mocks
  const [attemptedQuizzesMap, setAttemptedQuizzesMap] = useState<Record<string, string>>({}); // quizId -> attemptId
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pre");

  useEffect(() => {
    if (!user?.id) return;

    // Fetch submitted attempts directly from MongoDB
    apiRequest<any[]>(`/api/attempts?status=submitted`)
      .then(attempts => {
        if (!Array.isArray(attempts)) return;
      const map: Record<string, string> = {};
        attempts.forEach(attempt => {
          // Robustly handle cases where quizId might be populated or just an ID
          const qId = typeof attempt.quizId === 'object' ? attempt.quizId?._id : attempt.quizId;
          const aId = attempt._id;
          if (qId) map[String(qId)] = String(aId);
        });
        setAttemptedQuizzesMap(map);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    apiRequest<{ mocks: Quiz[] }>("/api/ai/ssc-cgl/mocks")
      .then((data) => {
        setMocks(data.mocks || []);
      })
      .catch((err: any) => {
        notify(err.message || "Failed to load mocks");
        setMocks([]);
      })
      .finally(() => setLoading(false));
  }, [notify]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC]">
        <div className="text-center">
          <div className="text-lg text-ink/60">Loading SSC CGL mocks...</div>
        </div>
      </div>
    );
  }

  // Currently, all mocks are categorized under "Full Mock (Pre)" as per requirements
  const filteredMocks = activeTab === "pre" ? mocks : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-12">
      {/* Standalone Header with Back Button */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link 
            to="/"
            className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors group"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">SSC CGL Test Series</h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_350px] gap-8 items-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              SSC CGL Mock Test Series 2024
            </h1>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                {mocks.length} Total Tests
              </div>
              <div className="flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-blue-600" />
                English & Hindi
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                60 Mins Duration
              </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
              The Staff Selection Commission (SSC) Combined Graduate Level (CGL) is a prestigious national-level exam for Group B and C posts in Government Ministries. Our mock series is meticulously designed by experts to reflect the latest TCS pattern, covering Reasoning, Quant, English, and GA with 100% accurate solutions.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <Trophy className="w-5 h-5" /> Why F64 Academy?
            </div>
            <ul className="space-y-2.5">
              {[
                "Real TCS Exam Interface",
                "Detailed Sectional Analytics",
                "Bilingual Questions (EN/HI)",
                "Performance Ranking among Peers"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2 text-xs font-bold text-blue-700">
                  <div className="w-1 h-1 bg-blue-400 rounded-full" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section/Tab Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex items-center overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? "text-blue-600 border-blue-600 bg-blue-50/50"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {filteredMocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Info className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Mocks in this Section</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              We are working on adding more tests for {TABS.find(t => t.id === activeTab)?.label}. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {TABS.find(t => t.id === activeTab)?.label}
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md">
                  {filteredMocks.length} Tests
                </span>
              </h2>
              <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                Latest TCS Pattern 2024
              </div>
            </div>

            {filteredMocks.map((mock) => {
              const attemptedAttemptId = attemptedQuizzesMap[mock._id];
              const isAttempted = !!attemptedAttemptId;
              return (
                <div
                  key={mock._id}
                  className="p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                     <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{mock.title}</div>
                        {mock.language === "hi" && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                            🇮🇳 हिन्दी
                          </div>
                        )}
                        {isAttempted ? (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 
                            Attempted
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                            <Circle className="h-3.5 w-3.5" /> 
                            Unattempted
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-6 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {mock.durationMinutes} Mins
                        </div>
                        <div className="flex items-center gap-2">
                          <Info className="h-3.5 w-3.5 text-slate-400" />
                          {mock.questions?.length ?? 0} Questions
                        </div>
                        {mock.difficulty && (
                          <div className="uppercase tracking-widest text-orange-600">
                            {mock.difficulty}
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      to={isAttempted ? `/student/mock-analytics/${attemptedAttemptId}?quizId=${mock._id}` : `/student/serious-mock/${mock._id}`}
                      className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                        isAttempted 
                        ? "bg-slate-800 text-white hover:bg-black" 
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_14px_rgba(37,99,235,0.3)]"
                      }`}
                      state={{ startFullscreen: true }}
                    >
                      {isAttempted ? "Review" : "Start"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
