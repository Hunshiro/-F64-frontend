import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { apiRequest } from "../../lib/api";
import { useToast } from "../../components/Toast";

type Question = {
  _id: string;
  subject?: string;
  visualPdfUrl?: string;
  visualPageNumber?: number;
  visualNote?: string;
  text: string;
  imageUrl?: string;
  options: string[];
  correctOptions: number[];
  explanation?: string;
};

type Quiz = {
  _id: string;
  title: string;
  instructions?: string;
  timingMode: "aggregate" | "sectional";
  durationMinutes: number;
  sectionTimeMinutes?: number;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published";
  questions: Question[];
};

export default function AdminQuizPreview() {
  const { id } = useParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz", id],
    queryFn: () => apiRequest<Quiz>(`/api/quizzes/${id}`),
    enabled: Boolean(id)
  });
  const publish = useMutation({
    mutationFn: () => apiRequest(`/api/quizzes/${id}/publish`, { method: "PATCH" }),
    onSuccess: () => {
      notify("Quiz published");
      queryClient.invalidateQueries({ queryKey: ["quiz", id] });
    },
    onError: (err: Error) => notify(err.message)
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return <EmptyState title="Quiz not found" description="Please go back and select a quiz." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-2xl">{data.title}</div>
        <div className="flex items-center gap-2">
          {data.status !== "published" && (
            <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={() => publish.mutate()}>
              Publish Mock
            </button>
          )}
          <Link className="px-3 py-2 rounded-lg border" to="/admin/courses">
            Back to courses
          </Link>
        </div>
      </div>

      <Card title="Overview">
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div>Difficulty: {data.difficulty}</div>
          <div>Status: {data.status}</div>
          <div>
            Timing: {data.timingMode === "aggregate" ? "Aggregate" : "Sectional"}
          </div>
          <div>Duration: {data.durationMinutes} min</div>
          {data.timingMode === "sectional" && (
            <div>Section Time: {data.sectionTimeMinutes || 0} min</div>
          )}
          <div>Questions: {data.questions?.length || 0}</div>
        </div>
      </Card>

      {data.instructions && (
        <Card title="Instructions">
          <div className="text-sm whitespace-pre-wrap">{data.instructions}</div>
        </Card>
      )}

      <Card title="Questions">
        <div className="space-y-4">
          {data.questions?.map((q, idx) => (
            <div key={q._id} className="p-4 rounded-lg border">
              <div className="font-medium mb-2">
                Q{idx + 1}. {q.text}
              </div>
              {q.subject && <div className="mb-2 text-xs uppercase tracking-wide text-ink/50">{q.subject}</div>}
              {q.imageUrl && (
                <div className="mb-3 rounded-lg border border-border overflow-hidden bg-white max-w-md">
                  <img
                    src={q.imageUrl}
                    alt={`Q${idx + 1} Visual`}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
              )}
              {q.visualPdfUrl && q.visualPageNumber && (
                <div className="mb-3 overflow-hidden rounded-lg border bg-slate-50">
                  <div className="border-b bg-white px-3 py-2 text-xs font-medium">
                    Visual source page {q.visualPageNumber}
                  </div>
                  <iframe
                    title={`Preview visual page ${q.visualPageNumber}`}
                    className="h-72 w-full"
                    src={`${q.visualPdfUrl}#page=${q.visualPageNumber}`}
                  />
                  {q.visualNote && <div className="border-t bg-white px-3 py-2 text-xs text-ink/60">{q.visualNote}</div>}
                </div>
              )}
              <ul className="space-y-1 text-sm">
                {q.options.map((opt, i) => (
                  <li
                    key={i}
                    className={
                      q.correctOptions.includes(i)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-black/70 dark:text-white/70"
                    }
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                  </li>
                ))}
              </ul>
              {q.explanation && (
                <div className="mt-2 text-xs text-black/60 dark:text-white/60">
                  Explanation: {q.explanation}
                </div>
              )}
            </div>
          ))}
          {(!data.questions || data.questions.length === 0) && (
            <EmptyState title="No questions yet" description="Generate or add questions first." />
          )}
        </div>
      </Card>
    </div>
  );
}
