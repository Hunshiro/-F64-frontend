import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { apiRequest } from "../../lib/api";

type CoursePayload = {
  title: string;
  examType: "Banking" | "Insurance" | "SSC" | "Railway" | "State" | "Others";
  description: string;
  thumbnail?: string;
  priceType: "free" | "paid";
  status: "draft" | "published";
};

export default function AdminCourseEditor() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [form, setForm] = useState<CoursePayload>({
    title: "",
    examType: "Banking",
    description: "",
    thumbnail: "",
    priceType: "free",
    status: "draft"
  });

  const createCourse = useMutation({
    mutationFn: (payload: CoursePayload) =>
      apiRequest("/api/courses", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (data: any) => {
      notify("Course created");
      navigate(`/admin/courses/${data._id}/sections`);
    },
    onError: (err: Error) => notify(err.message)
  });

  const setField = (key: keyof CoursePayload, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = (status: "draft" | "published") => {
    if (!form.title.trim()) {
      notify("Course name is required");
      return;
    }
    const payload: CoursePayload = {
      ...form,
      status
    };
    if (!payload.thumbnail?.trim()) {
      delete (payload as any).thumbnail;
    }
    createCourse.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/60">Courses / Create New Course</div>
      <div>
        <div className="font-display text-2xl">Create New Course</div>
        <div className="text-sm text-ink/60">
          Configure the core details of your competitive exam preparation course.
        </div>
      </div>

      <div className="rounded-2xl border bg-white/80 p-5 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-blue-600 font-semibold">Step 1 of 4</div>
          <div className="text-ink/60">25% Complete</div>
        </div>
        <div className="h-2 rounded-full bg-black/10">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: "25%" }} />
        </div>
        <div className="grid grid-cols-4 text-xs text-ink/60">
          <div className="text-blue-600 font-semibold">1. Basic Info</div>
          <div>2. Curriculum</div>
          <div>3. Pricing & Settings</div>
          <div>4. Review & Publish</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <Card title="General Information">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/50">Course Title</div>
                <input
                  className="mt-2 w-full px-3 py-2 rounded-lg border"
                  placeholder="e.g. UPSC Civil Services 2024 - Comprehensive Batch"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink/50">Category</div>
                  <select
                    className="mt-2 w-full px-3 py-2 rounded-lg border"
                    value={form.examType}
                    onChange={(e) => setField("examType", e.target.value)}
                  >
                    <option value="Banking">Banking</option>
                    <option value="SSC">SSC</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Railway">Railway</option>
                    <option value="State">State</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-ink/50">Price Type</div>
                  <select
                    className="mt-2 w-full px-3 py-2 rounded-lg border"
                    value={form.priceType}
                    onChange={(e) => setField("priceType", e.target.value)}
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/50">Course Description</div>
                <textarea
                  className="mt-2 w-full px-3 py-2 rounded-lg border"
                  placeholder="Describe what students will learn, exam patterns covered, and key features."
                  rows={5}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card title="Access & Pricing">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/50">Course Price</div>
                <input className="mt-2 w-full px-3 py-2 rounded-lg border" placeholder="$ 0.00" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/50">Validity Period</div>
                <div className="mt-2 flex gap-2">
                  <input className="w-24 px-3 py-2 rounded-lg border" placeholder="12" />
                  <select className="flex-1 px-3 py-2 rounded-lg border">
                    <option>Months</option>
                    <option>Weeks</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
              Tip: Offering a 12-month validity period is a popular choice for exam courses.
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Course Thumbnail">
            <div className="rounded-2xl border-2 border-dashed p-5 text-center text-sm text-ink/60">
              <div className="h-12 w-12 rounded-full bg-blue-50 mx-auto mb-3 flex items-center justify-center">
                ⬆️
              </div>
              Drag and drop file
              <div className="text-xs text-ink/40">Recommended: 1280x720px (JPG, PNG)</div>
              <div className="mt-3">
                <input
                  className="w-full px-3 py-2 rounded-lg border"
                  placeholder="Thumbnail URL"
                  value={form.thumbnail}
                  onChange={(e) => setField("thumbnail", e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card title="Course Visibility">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">Public Status</div>
                <div className="text-xs text-ink/60">Make course visible on store</div>
              </div>
              <button
                className={`h-6 w-11 rounded-full relative ${form.status === "published" ? "bg-blue-600" : "bg-black/20"}`}
                onClick={() => setForm((f) => ({ ...f, status: f.status === "published" ? "draft" : "published" }))}
                type="button"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    form.status === "published" ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </Card>

          <div className="rounded-2xl border bg-slate-900 text-white p-5">
            <div className="font-medium">Need help?</div>
            <div className="text-xs text-white/70 mt-2">
              Check our documentation for best practices on course creation or reach out to support.
            </div>
            <button className="mt-4 px-3 py-2 rounded-lg bg-white/10 text-sm">View Guide</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <button className="text-sm text-ink/60">Discard Changes</button>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded-lg border text-sm"
            onClick={() => handleSave("draft")}
            disabled={createCourse.isPending}
          >
            Save as Draft
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            onClick={() => handleSave(form.status)}
            disabled={createCourse.isPending}
          >
            Next: Curriculum
          </button>
        </div>
      </div>
    </div>
  );
}
