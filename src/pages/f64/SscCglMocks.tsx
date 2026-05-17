import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../lib/auth";
import { ArrowLeft, Play, Clock, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { Card } from "../../components/Card";

type QuizSummary = {
  _id: string;
  title: string;
  durationMinutes: number;
  instructions?: string;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  questions: any[];
};

type AttemptStatus = {
  quizId: string;
  isAttempted: boolean;
  score?: number;
  totalMarks?: number;
  accuracy?: number;
};

export default function SscCglMocks() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [attemptStatuses, setAttemptStatuses] = useState<Record<string, AttemptStatus>>({});
  const [loading, setLoading] = useState(true);
  const attemptedKey = "tb_attempted_quizzes";

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      // Get all published SSC CGL quizzes
      const response = await apiRequest<{ items: QuizSummary[] }>("/api/quizzes?status=published", {
        method: "GET"
      });
      
      const publishedQuizzes = (response.items || []).filter(q => q.status === "published");
      setQuizzes(publishedQuizzes);

      // Load attempt status from localStorage and backend
      const attemptedQuizzes = localStorage.getItem(attemptedKey);
      const attemptedIds = attemptedQuizzes ? JSON.parse(attemptedQuizzes) : [];
      
      const statuses: Record<string, AttemptStatus> = {};
      for (const quiz of publishedQuizzes) {
        statuses[quiz._id] = {
          quizId: quiz._id,
          isAttempted: attemptedIds.includes(quiz._id)
        };
      }
      setAttemptStatuses(statuses);
    } catch (err: any) {
      notify(err.message || "Failed to load mocks");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === "easy") return "text-green-600 bg-green-50";
    if (diff === "medium") return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">SSC CGL Mock Tests</h1>
            <p className="text-slate-600">Practice with our comprehensive mock test series</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-600 mb-2">Total Mocks</div>
            <div className="text-3xl font-bold text-slate-900">{quizzes.length}</div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-600 mb-2">Attempted</div>
            <div className="text-3xl font-bold text-slate-900">
              {Object.values(attemptStatuses).filter(s => s.isAttempted).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="text-sm text-slate-600 mb-2">Not Attempted</div>
            <div className="text-3xl font-bold text-slate-900">
              {Object.values(attemptStatuses).filter(s => !s.isAttempted).length}
            </div>
          </div>
        </div>

        {/* Mocks List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Mocks</h2>
          <div className="grid gap-4">
            {quizzes.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <Lock size={32} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600">No published mocks available yet</p>
                </div>
              </Card>
            ) : (
              quizzes.map((quiz) => {
                const status = attemptStatuses[quiz._id];
                const questionsCount = quiz.questions?.length || 0;
                const totalMarks = quiz.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 0;

                return (
                  <Card key={quiz._id} className="hover:shadow-md transition-shadow">
                    <div className="p-6 flex items-start justify-between gap-4 flex-col md:flex-row">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3 flex-wrap">
                          <h3 className="text-xl font-bold text-slate-900">{quiz.title}</h3>
                          {status?.isAttempted && (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                              <CheckCircle2 size={14} />
                              Attempted
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${getDifficultyColor(quiz.difficulty)}`}>
                            {quiz.difficulty}
                          </span>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-blue-600" />
                            <span>{quiz.durationMinutes} minutes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={16} className="text-blue-600" />
                            <span>{questionsCount} questions</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-600">★</span>
                            <span>{totalMarks} marks</span>
                          </div>
                        </div>

                        {/* Instructions preview */}
                        {quiz.instructions && (
                          <p className="text-sm text-slate-600 line-clamp-2">{quiz.instructions}</p>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => navigate(`/ssc-cgl/attempt/${quiz._id}`)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors whitespace-nowrap"
                      >
                        <Play size={18} />
                        {status?.isAttempted ? "Retake" : "Start"}
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Sectional info */}
        <div className="mt-12 bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">SSC CGL Structure</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { section: "Reasoning", time: "15 min", marks: "25" },
              { section: "Quantitative Aptitude", time: "15 min", marks: "25" },
              { section: "English", time: "15 min", marks: "25" },
              { section: "General Awareness", time: "15 min", marks: "25" }
            ].map((info) => (
              <div key={info.section} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-2">{info.section}</div>
                <div className="text-sm text-slate-600">
                  <div>⏱️ {info.time}</div>
                  <div>⭐ {info.marks} marks</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
