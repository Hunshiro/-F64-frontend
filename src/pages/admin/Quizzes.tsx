import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { apiRequest, apiUpload } from "../../lib/api";

type Section = {
  _id: string;
  title: string;
  order: number;
};

type Quiz = {
  _id: string;
  title: string;
  status: "draft" | "published";
  difficulty: "easy" | "medium" | "hard";
  durationMinutes: number;
};

type QuestionForm = {
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
  negativeMarks: number;
  explanation: string;
};

type QuestionDraft = QuestionForm & {
  saved?: boolean;
};

export default function AdminQuizzes() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("");
  const [quizForm, setQuizForm] = useState({
    title: "",
    durationMinutes: 60,
    negativeMarking: 1,
    difficulty: "medium",
    status: "draft",
    timingMode: "aggregate",
    sectionTimeMinutes: 20,
    instructions: "",
    showAnswersAfterSubmit: true,
    randomizeQuestions: true
  });

  const emptyQuestion: QuestionDraft = {
    text: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    marks: 4,
    negativeMarks: 1,
    explanation: ""
  };
  const [drafts, setDrafts] = useState<QuestionDraft[]>([emptyQuestion]);
  const [activeDraft, setActiveDraft] = useState(0);

  const [aiForm, setAiForm] = useState({
    instructions: "",
    timingMode: "aggregate",
    durationMinutes: 60,
    sectionTimeMinutes: 20,
    questionsLimit: 10
  });
  const [aiFile, setAiFile] = useState<File | null>(null);

  const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections", id],
    queryFn: () => apiRequest<{ items: Section[] }>(`/api/sections?courseId=${id}`),
    enabled: Boolean(id)
  });
  const sections = sectionsData?.items || [];

  useEffect(() => {
    const fromQuery = searchParams.get("sectionId");
    if (fromQuery) setSelectedSection(fromQuery);
  }, [searchParams]);

  const activeSection = useMemo(() => {
    if (selectedSection) return selectedSection;
    return sections[0]?._id || "";
  }, [selectedSection, sections]);

  const { data: quizzesData, isLoading: quizzesLoading } = useQuery({
    queryKey: ["quizzes", activeSection],
    queryFn: () => apiRequest<{ items: Quiz[] }>(`/api/quizzes?sectionId=${activeSection}`),
    enabled: Boolean(activeSection)
  });

  const quizzes = quizzesData?.items || [];

  useEffect(() => {
    if (!selectedQuiz && quizzes.length) {
      setSelectedQuiz(quizzes[0]._id);
    }
  }, [quizzes, selectedQuiz]);

  const createQuiz = useMutation({
    mutationFn: (payload: any) => apiRequest("/api/quizzes", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (data: any) => {
      notify("Quiz created");
      queryClient.invalidateQueries({ queryKey: ["quizzes", activeSection] });
      setQuizForm((f) => ({ ...f, title: "" }));
      if (data?._id) setSelectedQuiz(data._id);
    },
    onError: (err: Error) => notify(err.message)
  });

  const deleteQuiz = useMutation({
    mutationFn: (quizId: string) => apiRequest(`/api/quizzes/${quizId}`, { method: "DELETE" }),
    onSuccess: () => {
      notify("Quiz deleted");
      queryClient.invalidateQueries({ queryKey: ["quizzes", activeSection] });
    },
    onError: (err: Error) => notify(err.message)
  });

  const createQuestion = useMutation({
    mutationFn: (payload: any) => apiRequest("/api/questions", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      notify("Question added");
      setDrafts((prev) =>
        prev.map((d, idx) => (idx === activeDraft ? { ...d, saved: true } : d))
      );
    },
    onError: (err: Error) => notify(err.message)
  });

  const handleCreateQuiz = () => {
    if (!activeSection) {
      notify("Select a section first");
      return;
    }
    if (!quizForm.title.trim()) {
      notify("Quiz title is required");
      return;
    }
    createQuiz.mutate({
      sectionId: activeSection,
      ...quizForm,
      durationMinutes: Number(quizForm.durationMinutes),
      negativeMarking: Number(quizForm.negativeMarking)
    });
  };

  const handleAddQuestion = () => {
    if (!selectedQuiz) {
      notify("Select a quiz first");
      return;
    }
    const current = drafts[activeDraft];
    if (!current?.text.trim()) {
      notify("Question text is required");
      return;
    }
    const cleanedOptions = current.options.map((o) => o.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      notify("Add at least two options");
      return;
    }
    const correctOptions = [Math.min(current.correctIndex, cleanedOptions.length - 1)];
    createQuestion.mutate({
      quizId: selectedQuiz,
      text: current.text,
      options: cleanedOptions,
      correctOptions,
      type: "single",
      marks: Number(current.marks),
      negativeMarks: Number(current.negativeMarks),
      explanation: current.explanation
    });
  };

  const handleAiGenerate = async () => {
    try {
      if (!activeSection) {
        notify("Select a section first");
        return;
      }
      const res = await apiRequest<any>("/api/quizzes", {
        method: "POST",
        body: JSON.stringify({
          sectionId: activeSection,
          title: `AI Quiz - ${new Date().toLocaleDateString()}`,
          durationMinutes: aiForm.durationMinutes,
          timingMode: aiForm.timingMode,
          sectionTimeMinutes: aiForm.sectionTimeMinutes,
          instructions: aiForm.instructions,
          status: "draft",
          difficulty: "medium",
          negativeMarking: 0,
          randomizeQuestions: true,
          showAnswersAfterSubmit: true
        })
      });

      const formData = new FormData();
      formData.append("quizId", res._id);
      formData.append("instructions", aiForm.instructions);
      formData.append("timingMode", aiForm.timingMode);
      formData.append("durationMinutes", String(aiForm.durationMinutes));
      formData.append("sectionTimeMinutes", String(aiForm.sectionTimeMinutes));
      formData.append("questionsLimit", String(aiForm.questionsLimit));
      if (aiFile) formData.append("file", aiFile);

      const result = await apiUpload<{ usedAi?: boolean; aiProvider?: string }>(
        "/api/questions/ai-generate",
        formData
      );
      if (result?.usedAi) {
        notify(`AI quiz generated (${result.aiProvider || "ai"})`);
      } else {
        notify("Quiz generated (fallback mode)");
      }
      queryClient.invalidateQueries({ queryKey: ["quizzes", activeSection] });
    } catch (err: any) {
      notify(err.message || "AI generation failed");
    }
  };

  const savedCount = drafts.filter((d) => d.saved).length;
  const totalMarks = drafts.reduce((sum, d) => (d.saved ? sum + (Number(d.marks) || 0) : sum), 0);

  return (
    <div className="space-y-6">
      <div className="text-sm text-ink/60">Courses / Curriculum / Quiz Builder</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-2xl">Custom Quiz Builder</div>
          <div className="text-sm text-ink/60">Build questions manually or from PDF.</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border text-sm">Save Draft</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Publish Quiz</button>
        </div>
      </div>

      <Card title="Select Section">
        {sectionsLoading && <Skeleton className="h-10" />}
        {!sectionsLoading && sections.length === 0 && (
          <EmptyState title="No sections" description="Create sections first before adding quizzes." />
        )}
        {!sectionsLoading && sections.length > 0 && (
          <select
            className="px-3 py-2 rounded-lg border w-full md:w-80"
            value={activeSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
          </select>
        )}
      </Card>

      <div className="grid lg:grid-cols-[280px_1fr_320px] gap-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-ink/40">General Config</div>
            <div>
              <div className="text-xs text-ink/60">Quiz Title</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                placeholder="e.g. JEE Advanced Mock - Physics"
                value={quizForm.title}
                onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <div className="text-xs text-ink/60">Subject</div>
              <input className="mt-2 w-full px-3 py-2 rounded-lg border" placeholder="Physics" />
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-ink/40">Time & Marking</div>
            <div>
              <div className="text-xs text-ink/60">Duration (Minutes)</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                type="number"
                value={quizForm.durationMinutes}
                onChange={(e) => setQuizForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-ink/60">Correct</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                type="number"
                value={drafts[activeDraft]?.marks ?? 0}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((d, idx) =>
                      idx === activeDraft ? { ...d, marks: Number(e.target.value), saved: false } : d
                    )
                  )
                }
              />
            </div>
            <div>
              <div className="text-xs text-ink/60">Wrong</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                type="number"
                value={drafts[activeDraft]?.negativeMarks ?? 0}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((d, idx) =>
                      idx === activeDraft ? { ...d, negativeMarks: Number(e.target.value), saved: false } : d
                    )
                  )
                }
              />
            </div>
          </div>
            <div className="flex items-center justify-between text-sm">
              <span>Negative Marking</span>
              <input
                type="checkbox"
                checked={quizForm.negativeMarking > 0}
                onChange={(e) => setQuizForm((f) => ({ ...f, negativeMarking: e.target.checked ? 1 : 0 }))}
              />
            </div>
          </div>
          <div className="rounded-2xl border bg-blue-50 p-4 text-xs text-blue-700">
            Summary
            <div className="mt-2 space-y-1 text-blue-800">
              <div>Questions Added: {savedCount}</div>
              <div>Total Marks: {totalMarks}</div>
              <div>Difficulty: Mixed</div>
            </div>
          </div>
        </aside>

        <main className="space-y-4">
          <Card title="Add Questions">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-widest text-ink/40">
                Question {String(activeDraft + 1).padStart(2, "0")} • MCQ
              </div>
              <div className="text-xs text-ink/60">Custom Quiz Builder</div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {drafts.map((d, idx) => (
                <button
                  key={idx}
                  className={`h-9 w-9 rounded-lg text-xs font-semibold border ${
                    idx === activeDraft
                      ? "bg-blue-600 text-white border-blue-600"
                      : d.saved
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white"
                  }`}
                  onClick={() => setActiveDraft(idx)}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                className="px-3 py-2 rounded-lg border text-xs"
                onClick={() => {
                  setDrafts((prev) => [...prev, { ...emptyQuestion }]);
                  setActiveDraft(drafts.length);
                }}
              >
                + Add
              </button>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-ink/40">Question Stem</div>
              <textarea
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                rows={4}
                placeholder="Type your question..."
                value={drafts[activeDraft]?.text || ""}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((d, idx) => (idx === activeDraft ? { ...d, text: e.target.value, saved: false } : d))
                  )
                }
              />
            </div>
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {(drafts[activeDraft]?.options || ["", "", "", ""]).map((opt, idx) => (
                <button
                  type="button"
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left ${
                    drafts[activeDraft]?.correctIndex === idx ? "border-blue-600 bg-blue-50" : ""
                  }`}
                  onClick={() =>
                    setDrafts((prev) =>
                      prev.map((d, i) => (i === activeDraft ? { ...d, correctIndex: idx, saved: false } : d))
                    )
                  }
                >
                  <span className="h-6 w-6 rounded-full border flex items-center justify-center">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    className="flex-1 bg-transparent outline-none"
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...(drafts[activeDraft]?.options || ["", "", "", ""])];
                      next[idx] = e.target.value;
                      setDrafts((prev) =>
                        prev.map((d, i) => (i === activeDraft ? { ...d, options: next, saved: false } : d))
                      );
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-ink/40">Solution Explanation</div>
              <textarea
                className="mt-2 w-full px-3 py-2 rounded-lg border"
                rows={3}
                placeholder="Add explanation..."
                value={drafts[activeDraft]?.explanation || ""}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((d, idx) => (idx === activeDraft ? { ...d, explanation: e.target.value, saved: false } : d))
                  )
                }
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                className="px-4 py-2 rounded-lg border"
                onClick={() => {
                  setDrafts((prev) => [...prev, { ...emptyQuestion }]);
                  setActiveDraft(drafts.length);
                }}
              >
                Add New Question
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleAddQuestion}>
                Save Question
              </button>
            </div>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card title="AI Power Tools">
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-ink/50">Generate by Topic</div>
                <input
                  className="mt-2 w-full px-3 py-2 rounded-lg border"
                  placeholder="e.g. Thermodynamics"
                  value={aiForm.instructions}
                  onChange={(e) => setAiForm((f) => ({ ...f, instructions: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <button
                    key={level}
                    className={`px-3 py-2 rounded-lg border ${
                      aiForm.instructions && level === "hard" ? "bg-blue-600 text-white" : ""
                    }`}
                    type="button"
                  >
                    {level.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={handleAiGenerate}>
                Generate Questions
              </button>
            </div>
          </Card>
          <Card title="Generate from PDF">
            <div className="space-y-3 text-sm">
              <input
                className="w-full px-3 py-2 rounded-lg border"
                type="file"
                accept="application/pdf"
                onChange={(e) => setAiFile(e.target.files?.[0] || null)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="px-3 py-2 rounded-lg border"
                  type="number"
                  placeholder="Questions"
                  value={aiForm.questionsLimit}
                  onChange={(e) => setAiForm((f) => ({ ...f, questionsLimit: Number(e.target.value) }))}
                />
                <input
                  className="px-3 py-2 rounded-lg border"
                  type="number"
                  placeholder="Duration"
                  value={aiForm.durationMinutes}
                  onChange={(e) => setAiForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                />
              </div>
              <button className="w-full px-4 py-2 rounded-lg border" onClick={handleAiGenerate}>
                Upload PDF & Generate
              </button>
            </div>
          </Card>
        </aside>
      </div>

      <Card title="Quiz List">
        {quizzesLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        )}
        {!quizzesLoading && (quizzesData?.items?.length || 0) === 0 && (
          <EmptyState title="No quizzes yet" description="Create a quiz or use AI to generate one." />
        )}
        {!quizzesLoading && (quizzesData?.items?.length || 0) > 0 && (
          <div className="space-y-2">
            {quizzesData?.items?.map((q) => (
              <div key={q._id} className="p-3 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="font-medium">{q.title}</div>
                  <div className="text-xs text-black/60 dark:text-white/60">
                    {q.difficulty} - {q.durationMinutes} min - {q.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link className="px-3 py-2 rounded-lg border text-sm" to={`/admin/quizzes/${q._id}/preview`}>
                    Preview
                  </Link>
                  <button
                    className="px-3 py-2 rounded-lg border text-sm"
                    onClick={() => {
                      const ok = window.confirm("Delete this quiz? This will remove all questions and attempts.");
                      if (ok) deleteQuiz.mutate(q._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
