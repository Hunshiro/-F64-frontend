import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import { apiRequest } from "../../lib/api";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest<{ items: any[] }>("/api/courses")
  });
  const { data: analyticsData } = useQuery({
    queryKey: ["admin-attempt-analytics"],
    queryFn: () =>
      apiRequest<{
        metrics: {
          submittedAttempts: number;
          uniqueStudents: number;
          avgScore: number;
          avgAccuracy: number;
          bestScore: number;
        };
        attempts: Array<{
          attemptId: string;
          studentName: string;
          studentEmail: string;
          quizTitle: string;
          durationMinutes: number;
          score: number;
          accuracy: number;
          timeTakenSeconds: number;
          submittedAt: string;
        }>;
      }>("/api/analytics/admin-attempts")
  });

  const courses = data?.items || [];
  const published = courses.filter((c) => c.status === "published").length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => String(c.title || "").toLowerCase().includes(q));
  }, [courses, search]);

  const metrics = analyticsData?.metrics;
  const attempts = analyticsData?.attempts || [];
  const totalStudents = metrics?.uniqueStudents || 0;
  const submittedAttempts = metrics?.submittedAttempts || 0;

  const formatNumber = (n: number) => n.toLocaleString();
  const filteredAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attempts;
    return attempts.filter((attempt) =>
      [attempt.studentName, attempt.studentEmail, attempt.quizTitle]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [attempts, search]);

  const formatSeconds = (seconds: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}m ${remainder}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-xl font-display">Dashboard Overview</div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/70">
          <svg className="h-4 w-4 text-ink/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            className="bg-transparent outline-none text-sm w-64"
            placeholder="Search data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link className="px-4 py-2 rounded-lg bg-blue-600 text-white" to="/admin/courses/new">
          + Create New Course
        </Link>
        <Link className="px-4 py-2 rounded-lg border bg-white" to="/admin/ssc-cgl-mock-studio">
          SSC CGL AI Mock Studio
        </Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border bg-white/80">
          <div className="text-xs uppercase tracking-widest text-ink/40">Attempted Students</div>
          <div className="text-2xl font-semibold mt-2">{formatNumber(totalStudents)}</div>
          <div className="mt-3 h-2 rounded-full bg-black/10">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: "70%" }} />
          </div>
        </div>
        <div className="p-4 rounded-2xl border bg-white/80">
          <div className="text-xs uppercase tracking-widest text-ink/40">Submitted Attempts</div>
          <div className="text-2xl font-semibold mt-2">{formatNumber(submittedAttempts)}</div>
          <div className="mt-3 h-2 rounded-full bg-black/10">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: "55%" }} />
          </div>
        </div>
        <div className="p-4 rounded-2xl border bg-white/80">
          <div className="text-xs uppercase tracking-widest text-ink/40">Average Score</div>
          <div className="text-2xl font-semibold mt-2">{(metrics?.avgScore || 0).toFixed(2)}</div>
          <div className="mt-3 h-2 rounded-full bg-black/10">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, metrics?.avgScore || 0))}%` }} />
          </div>
        </div>
        <div className="p-4 rounded-2xl border bg-white/80">
          <div className="text-xs uppercase tracking-widest text-ink/40">Average Accuracy</div>
          <div className="text-2xl font-semibold mt-2">{(metrics?.avgAccuracy || 0).toFixed(1)}%</div>
          <div className="mt-3 h-2 rounded-full bg-black/10">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, metrics?.avgAccuracy || 0))}%` }} />
          </div>
        </div>
      </div>

      <Card title="Recent Courses">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-ink/60">Showing top {Math.min(filtered.length, 4)} courses</div>
          <Link className="text-sm text-blue-600" to="/admin/courses">
            View All
          </Link>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-ink/60">
              <tr className="text-left">
                <th className="py-2">Course Title</th>
                <th className="py-2">Date Created</th>
                <th className="py-2">Status</th>
                <th className="py-2">Enrollments</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 4).map((c: any) => {
                const created = new Date(c.createdAt || Date.now()).toLocaleDateString();
                const enrollments = (String(c.title || "").length * 97) % 2400;
                return (
                  <tr key={c._id} className="border-t">
                    <td className="py-3 font-medium">{c.title}</td>
                    <td className="py-3">{created}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          c.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {c.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="py-3">{formatNumber(enrollments)}</td>
                    <td className="py-3 text-right">
                      <Link className="text-blue-600 text-xs" to={`/admin/courses/${c._id}/sections`}>
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-ink/60" colSpan={5}>
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Attempted Students">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-ink/60">
            Recent submitted attempts with marks, accuracy, and test details.
          </div>
          <div className="text-sm text-ink/60">Best score: {(metrics?.bestScore || 0).toFixed(2)}</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-ink/60">
              <tr className="text-left">
                <th className="py-2">Student</th>
                <th className="py-2">Quiz</th>
                <th className="py-2">Marks</th>
                <th className="py-2">Accuracy</th>
                <th className="py-2">Time</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.slice(0, 12).map((attempt) => (
                <tr key={attempt.attemptId} className="border-t">
                  <td className="py-3">
                    <div className="font-medium">{attempt.studentName}</div>
                    <div className="text-xs text-ink/60">{attempt.studentEmail || "No email"}</div>
                  </td>
                  <td className="py-3">{attempt.quizTitle}</td>
                  <td className="py-3 font-medium">{attempt.score.toFixed(2)}</td>
                  <td className="py-3">{attempt.accuracy.toFixed(1)}%</td>
                  <td className="py-3">{formatSeconds(attempt.timeTakenSeconds)}</td>
                  <td className="py-3">{new Date(attempt.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
              {filteredAttempts.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-ink/60" colSpan={6}>
                    No submitted attempts found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Need help with AI Training?">
          <div className="text-sm text-ink/70 mb-4">
            Your documentation provides step-by-step guides for training your custom models on exam data.
          </div>
          <button className="px-3 py-2 rounded-lg border text-sm">Learn More</button>
        </Card>
        <Card title="System Update">
          <div className="text-sm text-ink/70 mb-4">
            Version 2.4 is live. New quiz analytics are now available in your course settings.
          </div>
          <button className="px-3 py-2 rounded-lg border text-sm">Dismiss</button>
        </Card>
      </div>
    </div>
  );
}
