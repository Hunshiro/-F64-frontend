import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, apiUpload } from "../../lib/api";
import { useToast } from "../../components/Toast";

type UploadKey =
  | "reasoningPdf"
  | "quantPdf"
  | "englishPdf"
  | "gaPdf";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};


type SectionGenerationResult = {

  subject: string;
  generatedCount: number;
  provider: string;
  extractedTextLength: number;
};

type PreviewQuestion = {
  section: string;
  question: string;
  extractedTextLength?: number;
  options?: string[];
  correctOptions?: number[];
};

type BuilderResult = {
  quizId: string;
  questionCount: number;
  sectionResults: SectionGenerationResult[];
};

const uploadSequence: {
  key: UploadKey;
  label: string;
  prompt: string;
}[] = [
  {
    key: "reasoningPdf",
    label: "Reasoning PDF",
    prompt:
      "Upload the Reasoning PDF first."
  },
  {
    key: "quantPdf",
    label: "Quantitative Aptitude PDF",
    prompt:
      "Great. Now upload the Quantitative Aptitude PDF."
  },
  {
    key: "englishPdf",
    label: "English PDF",
    prompt:
      "Nice. Upload the English Comprehension PDF."
  },
  {
    key: "gaPdf",
    label: "General Awareness PDF",
    prompt:
      "Finally, upload the General Awareness PDF."
  }
];

export default function SscCglMockStudio() {
  const { notify } = useToast();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        role: "assistant",
        text:
          "Welcome to SSC CGL AI Mock Studio."
      },
      {
        role: "assistant",
        text:
          "I will collect PDFs one-by-one and generate a live preview automatically."
      },
      {
        role: "assistant",
        text: uploadSequence[0].prompt
      }
    ]);

  const [currentStep, setCurrentStep] =
    useState(0);

  const [isGenerating, setIsGenerating] =
    useState(false);



  const [files, setFiles] = useState<
    Record<UploadKey, File | null>
  >({
    reasoningPdf: null,
    quantPdf: null,
    englishPdf: null,
    gaPdf: null
  });

  // kept for optional future preview; section cards are the primary UI in this phase
  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>([]);


  type SectionQuizState = {
    quizId: string;
    subject: string;
    questionCount: number;
    providers?: string[];
  };

  const [sectionQuizzes, setSectionQuizzes] = useState<
    Partial<Record<UploadKey, SectionQuizState>>
  >({});

  const [verified, setVerified] = useState<Partial<Record<UploadKey, boolean>>>({});

  const [fullMockQuizId, setFullMockQuizId] = useState<string | null>(null);


  const currentUpload =
    uploadSequence[currentStep];

  const validatePdf = (
    file: File
  ) => {
    if (
      file.type !== "application/pdf"
    ) {
      notify(
        "Only PDF files allowed"
      );

      return false;
    }

    if (
      file.size >
      25 * 1024 * 1024
    ) {
      notify(
        "PDF size exceeds 25MB"
      );

      return false;
    }

    return true;
  };

  const generateRealPreview = async (file: File, sectionName: string, key: UploadKey) => {
    const formData = new FormData();
    // preview endpoint expects an uploaded field under the key matching its multer config
    formData.append(key, file);
    formData.append("subject", sectionName);

    // preview endpoint is POST-only; force POST explicitly
    const data = await apiRequest<{
      extractedTextLength: number;
      questions: any[];
      message?: string;
    }>("/api/ai/ssc-cgl/preview-section", {
      method: "POST",
      body: formData
    });


    const newPreviews = data.questions.map((q: any) => ({
      section: sectionName,
      question: q.text,
      extractedTextLength: data.extractedTextLength,
      options: q.options,
      correctOptions: q.correctOptions,
    }));

    if (data.questions.length === 0) {
      setPreviewQuestions((prev) => [
        ...prev,
        {
          section: sectionName,
          question:
            data.message ||
            "Failed to generate preview question from this PDF.",
          extractedTextLength: data.extractedTextLength,
        },
      ]);
    } else {
      setPreviewQuestions((prev) => [...prev, ...newPreviews]);
    }

    return data.extractedTextLength;
  };

  const generateSectionQuiz = async (file: File, subjectLabel: string) => {
    const formData = new FormData();
    // backend route expects: upload.single("file")
    formData.append("file", file);
    formData.append("subject", subjectLabel);

    // IMPORTANT: ensure this is POST, not a GET
    const data = await apiUpload<{
      quizId: string;
      subject: string;
      questionCount: number;
      providers?: string[];
      durationMs: number;
    }>("/api/ai/ssc-cgl/section-quiz", formData);

    return data;
  };


  const handleFileUpload =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      try {
        const file =
          event.target.files?.[0];

        if (
          !file ||
          !currentUpload
        ) {
          return;
        }

        if (!validatePdf(file)) {
          return;
        }

        setFiles((prev) => ({
          ...prev,
          [currentUpload.key]: file
        }));

        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            text:
              `Uploaded ${file.name}`
          }
        ]);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              `Analyzing ${currentUpload.label}...`
          }
        ]);

        const charCount = await generateRealPreview(
          file,
          currentUpload.label,
          currentUpload.key
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text:
              charCount > 10
                ? `${currentUpload.label} preview ready. (Extracted ${charCount} chars)`
                : `⚠️ ${currentUpload.label}: Extraction failed. The PDF contains only ${charCount} characters. The section quiz generation may fail.`,
          },
        ]);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `Generating ${currentUpload.label} section quiz (25 questions)...`,
          },
        ]);

        const sectionData = await generateSectionQuiz(
          file,
          currentUpload.label
        );

        setSectionQuizzes((prev) => ({
          ...prev,
          [currentUpload.key]: {
            quizId: sectionData.quizId,
            subject: currentUpload.label,
            questionCount: sectionData.questionCount ?? sectionData.questionCount,
            providers: sectionData.providers,
          },
        }));

        setVerified((prev) => ({
          ...prev,
          [currentUpload.key]: false,
        }));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `✅ ${currentUpload.label} section quiz generated (${sectionData.questionCount} questions).`,
          },
        ]);


        const nextStep =
          currentStep + 1;

        if (
          nextStep <
          uploadSequence.length
        ) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text:
                uploadSequence[
                  nextStep
                ].prompt
            }
          ]);

          setCurrentStep(nextStep);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text:
                "All PDFs uploaded successfully. Ready to generate full mock."
            }
          ]);
        }
      } catch (err: any) {
        console.error(err);

        notify(
          err.message ||
            "Upload failed"
        );
      }
    };

  const handleGenerateMock = async () => {
    try {
      setIsGenerating(true);

      const sectionOrder: UploadKey[] = [
        "reasoningPdf",
        "quantPdf",
        "englishPdf",
        "gaPdf"
      ];

      const sectionQuizIds = sectionOrder
        .map((k) => sectionQuizzes[k]?.quizId)
        .filter(Boolean) as string[];

      if (sectionQuizIds.length !== 4) {
        notify("Generate all 4 section quizzes first");
        return;
      }

      if (!sectionOrder.every((k) => verified[k])) {
        notify("Verify all 4 sections first");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Combining sections into full SSC CGL mock (100 questions)..."
        }
      ]);

      const data = await apiRequest<{
        fullMockQuizId: string;
        sectionQuizzes: { _id: string; title: string; questionCount: number }[];
        totalQuestionCount: number;
      }>("/api/ai/ssc-cgl/combine-sections", {
        method: "POST",
        body: JSON.stringify({ sectionQuizIds })
      });


      setFullMockQuizId(data.fullMockQuizId);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `✅ Full mock created (${data.totalQuestionCount} questions).`
        }
      ]);

      notify("SSC CGL full mock created");

    } catch (err: any) {
      console.error(err);
      notify(err.message || "Mock generation failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Mock generation failed."
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };


  const allUploaded =
    Object.values(files).every(Boolean);

  const sectionOrder: UploadKey[] = ["reasoningPdf", "quantPdf", "englishPdf", "gaPdf"];
  const allSectionsReady = sectionOrder.every((k) => Boolean(sectionQuizzes[k]?.quizId));
  const allSectionsVerified = sectionOrder.every((k) => Boolean(verified[k]));


  return (
    <div className="min-h-screen bg-[#f4f7fb]">

      <div className="mx-auto flex h-screen max-w-[1800px] flex-col overflow-hidden lg:flex-row">

        {/* LEFT CHAT PANEL */}

        <div className="flex h-[45vh] flex-col border-b bg-white lg:h-full lg:w-[400px] lg:border-b-0 lg:border-r">

          {/* HEADER */}

          <div className="border-b px-5 py-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white shadow">
                AI
              </div>

              <div>
                <div className="text-lg font-semibold">
                  SSC CGL Mock Studio
                </div>

                <div className="text-sm text-gray-500">
                  AI Guided Mock Creation
                </div>
              </div>
            </div>
          </div>

          {/* CHAT */}

          <div className="flex-1 overflow-y-auto px-4 py-5">

            <div className="space-y-3">

              {messages.map(
                (
                  message,
                  index
                ) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role ===
                        "user"
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 bg-gray-50"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* FOOTER */}

          <div className="border-t bg-white p-4">

            {!allUploaded ? (
              <>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  accept=".pdf"
                  onChange={
                    handleFileUpload
                  }
                />

                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Upload{" "}
                  {
                    currentUpload?.label
                  }
                </button>
              </>
            ) : (
                <button
                  disabled={
                    isGenerating || !allSectionsReady || !allSectionsVerified
                  }
                  onClick={handleGenerateMock}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-medium text-white transition ${
                    isGenerating || !allSectionsReady || !allSectionsVerified
                      ? "cursor-not-allowed bg-gray-400"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {isGenerating
                    ? "Generating..."
                    : "Generate Full Mock"}
                </button>

            )}
          </div>
        </div>

        {/* RIGHT PREVIEW PANEL */}

        <div className="flex-1 overflow-y-auto">

          {/* TOPBAR */}

          <div className="sticky top-0 z-10 border-b bg-[#f4f7fb]/90 backdrop-blur">

            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

              <div>

                <div className="text-2xl font-semibold">
                  Section Cards Preview
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  Upload PDFs one-by-one to generate 4 separate section quizzes.
                </div>
              </div>

              {fullMockQuizId && (
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/admin/quizzes/${fullMockQuizId}/edit-questions`}
                    className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-amber-700"
                  >
                    Edit Full Mock
                  </Link>
                  <Link
                    to={`/admin/quizzes/${fullMockQuizId}/preview`}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-700"
                  >
                    Open Full Preview
                  </Link>
                  <Link
                    to={`/student/serious-mock/${fullMockQuizId}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-green-700"
                  >
                    Start Serious Mock
                  </Link>
                </div>
              )}
            </div>
          </div>


          {/* CONTENT */}

          <div className="p-4 sm:p-5 lg:p-6">

            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {(
                  [
                    { key: "reasoningPdf" as UploadKey, label: "Reasoning" },
                    { key: "quantPdf" as UploadKey, label: "Quantitative Aptitude" },
                    { key: "englishPdf" as UploadKey, label: "English Comprehension" },
                    { key: "gaPdf" as UploadKey, label: "General Awareness" }
                  ] as const
                ).map((s) => {
                  const q = sectionQuizzes[s.key];
                  const isDone = Boolean(q?.quizId);
                  const isVerified = Boolean(verified[s.key]);

                  return (
                    <div
                      key={s.key}
                      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {s.label}
                        </div>
                        <div className="text-xs text-gray-400">
                          {isDone ? (isVerified ? "Verified" : "Generated") : "Pending"}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-gray-800">
                          {isDone ? (
                            <>
                              <div className="font-semibold">Quiz ID</div>
                              <div className="text-[11px] font-mono text-gray-500 break-all">
                                {q?.quizId}
                              </div>
                              <div className="mt-2">
                                Questions: <span className="font-semibold">{q?.questionCount ?? 0}</span>
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-500">Upload the PDF to generate this section quiz.</div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {isDone ? (
                            <Link
                              to={`/admin/quizzes/${q!.quizId}/edit-questions`}
                              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
                            >
                              Edit
                            </Link>
                          ) : (
                            <div />
                          )}

                          <button
                            disabled={!isDone}
                            onClick={() =>
                              setVerified((prev) => ({
                                ...prev,
                                [s.key]: !prev[s.key],
                              }))
                            }
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-medium shadow-sm transition ${
                              !isDone
                                ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                                : isVerified
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          >
                            {isVerified ? "Verified" : "Verify"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!fullMockQuizId && (
                <div className="flex h-[120px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white text-center px-6">
                  <div className="text-lg font-semibold text-gray-700">
                    Generate Full Mock when all sections are verified
                  </div>
                  <div className="mt-1 max-w-xl text-sm text-gray-500">
                    After you upload all 4 PDFs and verify each section, click “Generate Full Mock” in the left panel.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
    
  );
}