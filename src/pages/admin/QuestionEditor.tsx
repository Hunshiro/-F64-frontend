import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { useToast } from "../../components/Toast";
import { apiRequest, apiUpload } from "../../lib/api";



import { ArrowLeft, Save, ChevronLeft, ChevronRight } from "lucide-react";

type Question = {
  _id: string;
  text: string;
  options: string[];
  correctOptions: number[];
  type: "single" | "multi";
  marks: number;
  negativeMarks: number;
  explanation?: string;
  subject?: string;
  visualPdfUrl?: string;
  visualPageNumber?: number;
  visualNote?: string;
  imageUrl?: string;
};


type Quiz = {
  _id: string;
  title: string;
  questions: string[];
};

export default function QuestionEditor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => apiRequest<{ quiz: Quiz; questions: Question[] }>(`/api/quizzes/${quizId}/with-questions`),
    enabled: Boolean(quizId)
  });

  const quiz = quizData?.quiz;
  const questions = quizData?.questions || [];
  const currentQuestion = questions[currentIndex] || null;

  useEffect(() => {
    if (currentQuestion) {
      setEditedQuestion({ ...currentQuestion });
    }
  }, [currentIndex, currentQuestion]);

  const updateQuestion = useMutation({

    mutationFn: (payload: any) =>
      apiRequest(`/api/questions/${editedQuestion?._id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      notify("Question updated");
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
    },
    onError: (err: Error) => notify(err.message)
  });

  const handleSave = () => {
    if (!editedQuestion) return;
    updateQuestion.mutate({
      text: editedQuestion.text,
      options: editedQuestion.options,
      correctOptions: editedQuestion.correctOptions,
      explanation: editedQuestion.explanation,
      type: editedQuestion.type,
      marks: editedQuestion.marks,
      negativeMarks: editedQuestion.negativeMarks,
      imageUrl: editedQuestion.imageUrl
    });
  };


  const handleOptionChange = (idx: number, value: string) => {
    if (!editedQuestion) return;
    const newOptions = [...editedQuestion.options];
    newOptions[idx] = value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const handleCorrectOptionToggle = (idx: number) => {
    if (!editedQuestion) return;
    let newCorrectOptions = [...editedQuestion.correctOptions];
    if (editedQuestion.type === "single") {
      newCorrectOptions = [idx];
    } else {
      if (newCorrectOptions.includes(idx)) {
        newCorrectOptions = newCorrectOptions.filter(i => i !== idx);
      } else {
        newCorrectOptions.push(idx);
      }
      newCorrectOptions.sort((a, b) => a - b);
    }
    setEditedQuestion({ ...editedQuestion, correctOptions: newCorrectOptions });
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  if (quizLoading) return <Skeleton />;
  if (!quiz) return <EmptyState title="Quiz not found" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
              <ArrowLeft size={20} /> Back
            </button>
            <h1 className="text-3xl font-bold">{quiz.title}</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>

        {editedQuestion ? (
          <div className="space-y-6">
            {/* Question Text */}
            <Card className="p-6">
              <label className="block text-sm font-semibold mb-2">Question Text</label>
              <textarea
                value={editedQuestion.text}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, text: e.target.value })}
                className="w-full h-32 p-3 bg-muted border border-border rounded-lg text-sm font-mono"
              />

              {/* Image container just below question text */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold">Question Image</label>
                <div>
                  <input
                    id="question-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const uploaded = await apiUpload<{ url: string }>("/api/uploads/image", fd);
                        setEditedQuestion((prev) => (prev ? { ...prev, imageUrl: uploaded.url } : prev));
                      } catch (err: any) {
                        notify(err.message || "Image upload failed");
                      } finally {
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>


                {editedQuestion.imageUrl ? (
                  <div className="mt-2 rounded-xl border border-border overflow-hidden bg-white">
                    <img
                      src={editedQuestion.imageUrl}
                      alt="Question visual"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No image uploaded.
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("question-image-upload") as HTMLInputElement | null;
                      input?.click();
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold"
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditedQuestion({ ...editedQuestion, imageUrl: "" })}
                    disabled={!editedQuestion.imageUrl}
                    className="px-4 py-2 rounded-lg bg-muted border border-border hover:bg-muted/80 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Card>

            {/* Question Metadata */}
            <Card className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Type</label>
                <select
                  value={editedQuestion.type}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, type: e.target.value as "single" | "multi" })}
                  className="w-full p-2 bg-muted border border-border rounded-lg text-sm"
                >
                  <option value="single">Single Select</option>
                  <option value="multi">Multiple Select</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Subject</label>
                <input type="text" value={editedQuestion.subject || ""} disabled className="w-full p-2 bg-muted/50 border border-border rounded-lg text-sm opacity-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Marks</label>
                <input
                  type="number"
                  value={editedQuestion.marks}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, marks: Number(e.target.value) })}
                  className="w-full p-2 bg-muted border border-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Negative Marks</label>
                <input
                  type="number"
                  value={editedQuestion.negativeMarks}
                  onChange={(e) => setEditedQuestion({ ...editedQuestion, negativeMarks: Number(e.target.value) })}
                  className="w-full p-2 bg-muted border border-border rounded-lg text-sm"
                />
              </div>
            </Card>

            {/* Options */}
            <Card className="p-6">
              <label className="block text-sm font-semibold mb-4">Options</label>
              <div className="space-y-3">
                {editedQuestion.options.map((opt, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <button
                      onClick={() => handleCorrectOptionToggle(idx)}
                      className={`mt-3 px-3 py-1.5 rounded text-sm font-medium transition ${
                        editedQuestion.correctOptions.includes(idx)
                          ? "bg-green-500/20 text-green-600 border border-green-500"
                          : "bg-muted border border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <textarea
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 p-3 bg-muted border border-border rounded-lg text-sm font-mono"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Explanation */}
            <Card className="p-6">
              <label className="block text-sm font-semibold mb-2">Explanation</label>
              <textarea
                value={editedQuestion.explanation || ""}
                onChange={(e) => setEditedQuestion({ ...editedQuestion, explanation: e.target.value })}
                className="w-full h-24 p-3 bg-muted border border-border rounded-lg text-sm font-mono"
              />
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={updateQuestion.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
              >
                <Save size={18} /> {updateQuestion.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <EmptyState title="No questions found" />
        )}
      </div>
    </div>
  );
}
