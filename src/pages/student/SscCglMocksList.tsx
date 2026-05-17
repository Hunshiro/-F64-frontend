import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";
import { ArrowRight, Clock, CheckCircle2, Circle } from "lucide-react";

type Quiz = {
  _id: string;
  title: string;
  durationMinutes: number;
  difficulty?: string;
  questions?: Array<{ _id: string }>;
};

const ATTEMPTED_KEY = "tb_attempted_quizzes";

export default function SscCglMocksList() {
  const { notify } = useToast();
  const [mocks, setMocks] = useState<Quiz[]>([]);
  const [attemptedIds, setAttemptedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load attempted quiz IDs from localStorage
    const raw = localStorage.getItem(ATTEMPTED_KEY);
    if (raw) {
      try {
        const ids = JSON.parse(raw) as string[];
        setAttemptedIds(new Set(ids));
      } catch {
        // ignore
      }
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-ink">
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div>
            <div className="font-display text-2xl">SSC CGL Published Mocks</div>
            <div className="text-sm text-ink/60 mt-1">
              {mocks.length} mock{mocks.length !== 1 ? "s" : ""} available
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {mocks.length === 0 ? (
          <Card title="No Mocks Available">
            <div className="text-center py-8">
              <div className="text-ink/60">No published SSC CGL mocks yet. Check back soon!</div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {mocks.map((mock) => {
              const isAttempted = attemptedIds.has(mock._id);
              return (
                <div
                  key={mock._id}
                  className="p-5 rounded-2xl border bg-white hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="font-display text-lg font-semibold">{mock.title}</div>
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

                      <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {mock.durationMinutes} minutes
                        </div>
                        <div>{mock.questions?.length || 100} questions</div>
                        {mock.difficulty && <div>Difficulty: {mock.difficulty}</div>}
                      </div>
                    </div>

                    <Link
                      to={`/student/serious-mock/${mock._id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition whitespace-nowrap"
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
