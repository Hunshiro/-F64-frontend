import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";

type Section = {
  _id: string;
  title: string;
  order: number;
};

export default function AdminSections() {
  const { id } = useParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sections", id],
    queryFn: () => apiRequest<{ items: Section[] }>(`/api/sections?courseId=${id}`),
    enabled: Boolean(id)
  });

  const sections = data?.items || [];
  const [orders, setOrders] = useState<Record<string, number>>({});

  const createSection = useMutation({
    mutationFn: (payload: { courseId: string; title: string; order: number }) =>
      apiRequest("/api/sections", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      notify("Section added");
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["sections", id] });
    },
    onError: (err: Error) => notify(err.message)
  });

  const reorder = useMutation({
    mutationFn: (payload: { courseId: string; orders: { id: string; order: number }[] }) =>
      apiRequest("/api/sections/reorder", { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      notify("Section order saved");
      queryClient.invalidateQueries({ queryKey: ["sections", id] });
    },
    onError: (err: Error) => notify(err.message)
  });

  const orderPayload = useMemo(
    () => sections.map((s) => ({ id: s._id, order: orders[s._id] ?? s.order })),
    [orders, sections]
  );

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/60">Courses / Curriculum</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-2xl">Course Curriculum</div>
          <div className="text-sm text-ink/60">Create sections and add quizzes inside each section.</div>
        </div>
        <Link className="px-4 py-2 rounded-lg bg-blue-600 text-white" to={`/admin/courses/${id}/quizzes`}>
          Add Quiz
        </Link>
      </div>

      <div className="rounded-2xl border bg-white/80 p-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-blue-600 font-semibold">Step 2 of 4</div>
          <div className="text-ink/60">50% Complete</div>
        </div>
        <div className="h-2 rounded-full bg-black/10">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: "50%" }} />
        </div>
        <div className="grid grid-cols-4 text-xs text-ink/60">
          <div>1. Basic Info</div>
          <div className="text-blue-600 font-semibold">2. Curriculum</div>
          <div>3. Pricing & Settings</div>
          <div>4. Review & Publish</div>
        </div>
      </div>

      <Card title="Add Section">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="px-3 py-2 rounded-lg border flex-1"
            placeholder="Section name (e.g. Quantitative Aptitude)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="px-3 py-2 rounded-lg bg-accent text-white"
            onClick={() => id && createSection.mutate({ courseId: id, title, order: sections.length + 1 })}
          >
            Add Section
          </button>
        </div>
      </Card>

      <Card title="Manage Sections">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {!isLoading && sections.length === 0 && (
          <EmptyState title="No sections yet" description="Add a section to start adding quizzes." />
        )}
        {!isLoading && sections.length > 0 && (
          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s._id} className="flex items-center gap-3 p-3 rounded-lg border">
                <input
                  className="w-20 px-2 py-1 rounded border"
                  type="number"
                  value={orders[s._id] ?? s.order}
                  onChange={(e) => setOrders((o) => ({ ...o, [s._id]: Number(e.target.value) }))}
                />
                <div className="flex-1">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-ink/60">Section order: {orders[s._id] ?? s.order}</div>
                </div>
                <Link className="px-3 py-2 rounded-lg border text-sm" to={`/admin/courses/${id}/quizzes?sectionId=${s._id}`}>
                  Manage Quizzes
                </Link>
              </div>
            ))}
            <button
              className="px-3 py-2 rounded-lg border"
              onClick={() => id && reorder.mutate({ courseId: id, orders: orderPayload })}
            >
              Save Order
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
