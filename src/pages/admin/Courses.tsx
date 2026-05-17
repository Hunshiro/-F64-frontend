import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { apiRequest } from "../../lib/api";

type Course = {
  _id: string;
  title: string;
  examType: string;
  status: "draft" | "published";
  priceType: "free" | "paid";
  createdAt: string;
};

export default function AdminCourses() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest<{ items: Course[] }>("/api/courses")
  });

  const courses = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-2xl">Courses</div>
        <Link className="px-3 py-2 rounded-lg bg-accent text-white" to="/admin/courses/new">New Course</Link>
      </div>
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}
      {error && <EmptyState title="Failed to load" description="Please refresh and try again." />}
      {!isLoading && !error && courses.length === 0 && (
        <EmptyState title="No courses yet" description="Create your first course to start building quizzes." />
      )}
      {!isLoading && !error && courses.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Card key={c._id} title={c.title}>
              <div className="flex flex-wrap gap-2 text-xs text-black/60 dark:text-white/60">
                <span className="px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">{c.examType}</span>
                <span className="px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">{c.priceType}</span>
                <span className="px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">{c.status}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Link className="px-3 py-2 rounded-lg border" to={`/admin/courses/${c._id}/sections`}>Sections</Link>
                <Link className="px-3 py-2 rounded-lg border" to={`/admin/courses/${c._id}/quizzes`}>Quizzes</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
