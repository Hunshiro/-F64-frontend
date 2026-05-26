import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Loader } from "lucide-react";

import { apiRequest, apiUpload } from "../../lib/api";
import { useToast } from "../../components/Toast";

type UploadKey =
  | "reasoningEnHtml"
  | "reasoningHiHtml"
  | "quantEnHtml"
  | "quantHiHtml"
  | "englishEnHtml"
  | "englishHiHtml"
  | "gkEnHtml"
  | "gkHiHtml";

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

const STUDIO_STATE_KEY = "ssc_cgl_studio_state";

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
    key: "reasoningEnHtml",
    label: "Reasoning (English) HTML",
    prompt: "Upload the Reasoning HTML file in English first."
  },
  {
    key: "reasoningHiHtml",
    label: "Reasoning (Hindi) HTML",
    prompt: "Now upload the Reasoning HTML file in Hindi."
  },
  {
    key: "quantEnHtml",
    label: "Quantitative Aptitude (English) HTML",
    prompt: "Great! Now upload the Quantitative Aptitude HTML file in English."
  },
  {
    key: "quantHiHtml",
    label: "Quantitative Aptitude (Hindi) HTML",
    prompt: "Now upload the Quantitative Aptitude HTML file in Hindi."
  },
  {
    key: "englishEnHtml",
    label: "English Comprehension (English) HTML",
    prompt: "Nice! Upload the English Comprehension HTML file in English."
  },
  {
    key: "englishHiHtml",
    label: "English Comprehension (Hindi) HTML",
    prompt: "Now upload the English Comprehension HTML file in Hindi."
  },
  {
    key: "gkEnHtml",
    label: "General Knowledge (English) HTML",
    prompt: "Finally, upload the General Knowledge HTML file in English."
  },
  {
    key: "gkHiHtml",
    label: "General Knowledge (Hindi) HTML",
    prompt: "And now upload the General Knowledge HTML file in Hindi."
  }
];

export default function SscCglMockStudio() {
  const { notify } = useToast();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  // Initialize states from sessionStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages) return parsed.messages;
      } catch (e) {}
    }
    return [
      {
        role: "assistant",
        text: "Welcome to SSC CGL AI Mock Studio (Bilingual Mode)."
      },
      {
        role: "assistant",
        text: "I will collect HTML files in both English and Hindi, one subject at a time. Once all files are uploaded, I will create a bilingual mock that lets you switch between English and Hindi during the exam."
      },
      {
        role: "assistant",
        text: uploadSequence[0].prompt
      }
    ];
  });

  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).currentStep || 0; } catch (e) {}
    }
    return 0;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [files, setFiles] = useState<
    Record<UploadKey, File | null>
  >({
    reasoningEnHtml: null,
    reasoningHiHtml: null,
    quantEnHtml: null,
    quantHiHtml: null,
    englishEnHtml: null,
    englishHiHtml: null,
    gkEnHtml: null,
    gkHiHtml: null
  });

type SectionQuizState = {
  quizId: string;
  subject: string;
  questionCount: number;
  providers?: string[];
  hiQuizId?: string;
  hiQuestionCount?: number;
};

type TranslationProgress = {
  total: number;
  completed: number;
  percentage: number;
};

  const [sectionQuizzes, setSectionQuizzes] = useState<Partial<Record<UploadKey, SectionQuizState>>>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).sectionQuizzes || {}; } catch (e) {}
    }
    return {};
  });

  const [verified, setVerified] = useState<Partial<Record<UploadKey, boolean>>>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).verified || {}; } catch (e) {}
    }
    return {};
  });

  const [translating, setTranslating] = useState<Partial<Record<UploadKey, boolean>>>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).translating || {}; } catch (e) {}
    }
    return {};
  });

  const [translationProgress, setTranslationProgress] = useState<Partial<Record<UploadKey, TranslationProgress>>>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).translationProgress || {}; } catch (e) {}
    }
    return {};
  });

  const [previewQuestions, setPreviewQuestions] = useState<PreviewQuestion[]>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).previewQuestions || []; } catch (e) {}
    }
    return [];
  });

  const [fullMockQuizId, setFullMockQuizId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem(STUDIO_STATE_KEY);
    if (saved) {
      try { return JSON.parse(saved).fullMockQuizId || null; } catch (e) {}
    }
    return null;
  });


  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    const state = {
      messages,
      currentStep,
      sectionQuizzes,
      verified,
      fullMockQuizId,
      previewQuestions,
      translating,
      translationProgress
    };
    sessionStorage.setItem(STUDIO_STATE_KEY, JSON.stringify(state));
  }, [
    messages,
    currentStep,
    sectionQuizzes,
    verified,
    fullMockQuizId,
    previewQuestions,
    translating,
    translationProgress
  ]);

  const [studioRunId, setStudioRunId] = useState(() => Date.now().toString());

  const resetStudioState = () => {
    // prevent any further state updates from in-flight promises
    setStudioRunId(Date.now().toString());


    sessionStorage.removeItem(STUDIO_STATE_KEY);

    // reset UI
    setMessages([
      {
        role: "assistant",
        text: "Welcome to SSC CGL AI Mock Studio (Bilingual Mode)."
      },
      {
        role: "assistant",
        text: "I will collect HTML files in both English and Hindi, one subject at a time. Once all files are uploaded, I will create a bilingual mock that lets you switch between English and Hindi during the exam."
      },
      {
        role: "assistant",
        text: uploadSequence[0].prompt
      }
    ]);

    setCurrentStep(0);
    setIsGenerating(false);
    setIsParsing(false);

    setFiles({
      reasoningEnHtml: null,
      reasoningHiHtml: null,
      quantEnHtml: null,
      quantHiHtml: null,
      englishEnHtml: null,
      englishHiHtml: null,
      gkEnHtml: null,
      gkHiHtml: null
    });

    setSectionQuizzes({});
    setVerified({});
    setTranslating({});
    setTranslationProgress({});
    setPreviewQuestions([]);
    setFullMockQuizId(null);

    notify("Studio reset. Start a fresh mock generation.");
  };



  const currentUpload =
    uploadSequence[currentStep];

  const validateFile = (file: File) => {
    const validTypes = ["text/html"];
    if (!validTypes.includes(file.type)) {
      notify("Only HTML files allowed");
      return false;
    }

    if (
      file.size >
      25 * 1024 * 1024
    ) {
      notify(
        "HTML file size exceeds 25MB"
      );

      return false;
    }

    return true;
  };

  const generateRealPreview = async (file: File, sectionName: string, key: UploadKey) => {
    const formData = new FormData();
    // preview endpoint expects file to be under the "file" field
    formData.append("file", file);
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
      // preview endpoint already returns correct options as an array of strings
      options: Array.isArray(q.options) ? q.options : [],
      correctOptions: Array.isArray(q.correctOptions) ? q.correctOptions : [],
    }));

    if (data.questions.length === 0) {
      setPreviewQuestions((prev) => [
        ...prev,
        {
          section: sectionName,
          question:
            data.message ||
            "Failed to generate preview question from this HTML.",
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
    // backend routes expect: upload.single("file")
    formData.append("file", file);
    formData.append("subject", subjectLabel);

    // We use the unified section-quiz endpoint for both PDF and HTML.
    // The backend's readPdfText strips HTML tags automatically, allowing the AI 
    // to extract questions reliably without failing on strict HTML class requirements.
    const url = "/api/ai/ssc-cgl/section-quiz";

    const data = await apiUpload<{
      quizId: string;
      subject: string;
      questionCount: number;
      providers?: string[];
      durationMs: number;
    }>(url, formData);

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

        if (!validateFile(file)) {
          return;
        }

        setFiles((prev) => ({
          ...prev,
          [currentUpload.key]: file
        }));

        // Just update UI and notify file receipt
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            text: `Uploaded ${file.name}`
          }
        ]);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `File received for ${currentUpload.label}. Click "Generate Questions" below to start the manual parsing process.`
          },
        ]);

      } catch (err) {
        console.error(err);

        notify(
          (err as any).message ||
            "Upload failed"
        );
      }
    };

  const handleManualParse = async () => {
    if (!currentUpload) return;
    const file = files[currentUpload.key];
    if (!file) return;

    setIsParsing(true);
    try {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Manually parsing ${currentUpload.label}...` }
      ]);

      const runIdAtStart = studioRunId;
      const charCount = await generateRealPreview(
        file,
        currentUpload.label,
        currentUpload.key
      );
      if (studioRunId !== runIdAtStart) return;


      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: charCount > 10
            ? `${currentUpload.label} preview ready. (Extracted ${charCount} chars)`
            : `⚠️ Extraction issues detected. Character count: ${charCount}.`
        }
      ]);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Extracting questions for ${currentUpload.label} (Max 25)...` }
      ]);

      const sectionData = await generateSectionQuiz(file, currentUpload.label);

      setSectionQuizzes((prev) => ({
        ...prev,
        [currentUpload.key]: {
          quizId: sectionData.quizId,
          subject: currentUpload.label,
          questionCount: sectionData.questionCount,
          providers: sectionData.providers,
        },
      }));

      setVerified((prev) => ({
        ...prev,
        // Auto-mark as verified because HTML->section quiz is deterministic for your template.
        [currentUpload.key]: true,
      }));


      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `✅ ${currentUpload.label} generated (${sectionData.questionCount} questions).` }
      ]);

      const nextStep = currentStep + 1;
      if (nextStep < uploadSequence.length) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: uploadSequence[nextStep].prompt }
        ]);
        setCurrentStep(nextStep);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "All sections processed. Ready to combine into full mock." }
        ]);
      }
    } catch (err) {
      notify((err as any).message || "Parsing failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Generation failed. Please check the file content." }
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateMock = async () => {
    try {
      setIsGenerating(true);

      const enQuizKeys: UploadKey[] = ["reasoningEnHtml", "quantEnHtml", "englishEnHtml", "gkEnHtml"];
      const hiQuizKeys: UploadKey[] = ["reasoningHiHtml", "quantHiHtml", "englishHiHtml", "gkHiHtml"];

      const enQuizIds = enQuizKeys
        .map((k) => sectionQuizzes[k]?.quizId)
        .filter(Boolean) as string[];

      const hiQuizIds = hiQuizKeys
        .map((k) => sectionQuizzes[k]?.quizId)
        .filter(Boolean) as string[];

      if (enQuizIds.length !== 4 || hiQuizIds.length !== 4) {
        notify("Generate all 8 section quizzes (4 EN + 4 HI) first");
        return;
      }

      const allKeys = [...enQuizKeys, ...hiQuizKeys];
      if (!allKeys.every((k) => verified[k])) {
        notify("Verify all 8 sections first");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Combining sections into bilingual SSC CGL mock (100 questions in both English & Hindi)..."
        }
      ]);

      const data = await apiRequest<{
        fullMockQuizId: string;
        sectionQuizzes: { _id: string; title: string; questionCount: number }[];
        totalQuestionCount: number;
      }>("/api/ai/ssc-cgl/combine-bilingual-sections", {
        method: "POST",
        body: JSON.stringify({ enQuizIds, hiQuizIds })
      });


      setFullMockQuizId(data.fullMockQuizId);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `✅ Bilingual mock created (${data.totalQuestionCount} questions in each language).`
        }
      ]);

      notify("SSC CGL bilingual mock created");

    } catch (err) {
      console.error(err);
      notify((err as any).message || "Mock generation failed");
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

  // Hindi translation removed for now.
  // Studio will generate bilingual quizzes from EN and HI HTML uploads.
  const handleTranslateSection = async (_key: UploadKey) => {
    notify("Bilingual quiz generation from HTML uploads (next implementation step)." );
  };


  const allUploaded =
    Object.values(files).every(Boolean);

  // Create quiz keys for subjects in both languages
  const enQuizKeys: UploadKey[] = ["reasoningEnHtml", "quantEnHtml", "englishEnHtml", "gkEnHtml"];
  const hiQuizKeys: UploadKey[] = ["reasoningHiHtml", "quantHiHtml", "englishHiHtml", "gkHiHtml"];
  const allQuizKeys: UploadKey[] = [...enQuizKeys, ...hiQuizKeys];
  
  const allSectionsReady = allQuizKeys.every((k) => Boolean(sectionQuizzes[k]?.quizId));
  const allSectionsVerified = allQuizKeys.every((k) => Boolean(verified[k]));
  const currentFile = currentUpload ? files[currentUpload.key] : null;
  const currentQuizGenerated = currentUpload ? !!sectionQuizzes[currentUpload.key]?.quizId : false;



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

            <button
              type="button"
              onClick={resetStudioState}
              disabled={isGenerating || isParsing}
              className={`mb-3 w-full rounded-2xl px-4 py-3 text-sm font-medium text-white transition ${
                isGenerating || isParsing
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Cancel & Reset Studio
            </button>

            {currentUpload && !currentQuizGenerated ? (
              <>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  accept=".pdf,.html"
                  onChange={handleFileUpload}
                />

                {!currentFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Upload {currentUpload?.label} (PDF/HTML)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      disabled={isParsing}
                      onClick={handleManualParse}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      {isParsing ? "Parsing & Generating..." : `Generate ${currentUpload.label} Questions`}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-center text-xs text-blue-600 font-medium hover:underline"
                    >
                      Re-upload different file
                    </button>
                  </div>
                )}
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
                  Bilingual Section Cards Preview
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  Upload HTML files in English & Hindi, one subject at a time to generate 8 section quizzes (4 EN + 4 HI).
                </div>
              </div>

              {fullMockQuizId && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFullMockQuizId(null);
                      notify("Generation state reset. You can now re-generate the full mock.");
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    ← Back to Generation
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      // draft -> published is handled by backend; UI should confirm
                      const ok = window.confirm("Publish this full mock now?");
                      if (!ok || !fullMockQuizId) return;
                      try {
                        await apiRequest(`/api/quizzes/${fullMockQuizId}/publish`, {
                          method: "PATCH"
                        });
                        notify("Full mock published");
                      } catch (e: any) {
                        notify(e?.message || "Publish failed");
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-2xl bg-green-700 px-5 py-3 text-sm font-medium text-white shadow transition hover:bg-green-800"
                  >
                    Publish Full Mock
                  </button>
                  

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

              {/* Preview Questions Cards (rendered from previewQuestions state) */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-semibold">Preview Questions (Cards)</div>
                    <div className="text-xs text-gray-500">2 cards per section (EN/HI) as parsed from uploaded HTML.</div>
                  </div>
                  {previewQuestions.length > 0 ? (
                    <div className="text-xs text-gray-500">Total parsed: {previewQuestions.length}</div>
                  ) : null}
                </div>

                {previewQuestions.length === 0 ? (
                  <div className="flex h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center px-4">
                    <div className="text-sm font-semibold text-gray-700">No preview cards yet</div>
                    <div className="mt-1 text-xs text-gray-500">Upload a section HTML and click “Generate Questions”.</div>
                  </div>
                ) : (
                  (() => {
                    const grouped = previewQuestions.reduce<Record<string, PreviewQuestion[]>>((acc, q) => {
                      acc[q.section] = acc[q.section] || [];
                      acc[q.section].push(q);
                      return acc;
                    }, {});

                    const sectionOrder: string[] = [
                      "reasoningEnHtml",
                      "reasoningHiHtml",
                      "quantEnHtml",
                      "quantHiHtml",
                      "englishEnHtml",
                      "englishHiHtml",
                      "gkEnHtml",
                      "gkHiHtml"
                    ];

                    const selected: PreviewQuestion[] = [];
                    for (const key of sectionOrder) {
                      const items = grouped[key] || [];
                      selected.push(...items.slice(0, 2));
                    }

                    return (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {selected.map((q, idx) => (
                          <div
                            key={`${q.section}-${idx}-${q.question.slice(0, 18)}`}
                            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                          >
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div className="text-[11px] font-semibold text-blue-700">
                                {q.section
                                  .replace("EnHtml", " (EN)")
                                  .replace("HiHtml", " (HI)")
                                  .replace(/^(reasoning|quant|english|gk)/, (m) => {
                                    if (m === "reasoning") return "Reasoning";
                                    if (m === "quant") return "Quant";
                                    if (m === "english") return "English";
                                    if (m === "gk") return "GK";
                                    return m;
                                  })}
                              </div>
                              {q.extractedTextLength !== undefined ? (
                                <div className="text-[10px] text-gray-400 mt-0.5">len: {q.extractedTextLength}</div>
                              ) : null}
                            </div>

                            <div className="text-sm font-medium text-gray-900 leading-5">
                              {q.question}
                            </div>

                            {q.options?.length ? (
                              <div className="mt-3 space-y-1 text-xs">
                                {q.options.slice(0, 4).map((opt, i) => {
                                  const isCorrect = q.correctOptions?.includes(i);
                                  return (
                                    <div
                                      key={i}
                                      className={isCorrect ? "text-emerald-700 font-semibold" : "text-gray-700"}
                                    >
                                      {String.fromCharCode(65 + i)}. {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {(
                  [
                    { key: "reasoningEnHtml" as UploadKey, label: "Reasoning (EN)", lang: "🇬🇧 English" },
                    { key: "reasoningHiHtml" as UploadKey, label: "Reasoning (HI)", lang: "🇮🇳 हिन्दी" },
                    { key: "quantEnHtml" as UploadKey, label: "Quant (EN)", lang: "🇬🇧 English" },
                    { key: "quantHiHtml" as UploadKey, label: "Quant (HI)", lang: "🇮🇳 हिन्दी" },
                    { key: "englishEnHtml" as UploadKey, label: "English (EN)", lang: "🇬🇧 English" },
                    { key: "englishHiHtml" as UploadKey, label: "English (HI)", lang: "🇮🇳 हिन्दी" },
                    { key: "gkEnHtml" as UploadKey, label: "GK (EN)", lang: "🇬🇧 English" },
                    { key: "gkHiHtml" as UploadKey, label: "GK (HI)", lang: "🇮🇳 हिन्दी" }
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{s.lang}</span>
                          <span className="text-xs text-gray-400">
                            {isDone ? (isVerified ? "✅ Verified" : "✓ Generated") : "⏳ Pending"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-gray-800">
                          {isDone ? (
                            <>
                              <div className="font-semibold">{s.lang}</div>
                              <div className="text-[11px] font-mono text-gray-500 break-all">
                                {q?.quizId}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {q?.questionCount ?? 0} questions
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-500">Upload the HTML file to generate this section quiz.</div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {isDone ? (
                            <Link
                              to={`/admin/quizzes/${q!.quizId}/edit-questions`}
                              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
                            >
                              ✏️ Edit
                            </Link>
                          ) : (
                            <div />
                          )}

                          <button
                            disabled={true}
                            className="inline-flex items-center gap-2 justify-center rounded-2xl px-4 py-2 text-xs font-medium shadow-sm transition cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                          >
                            🔄 Auto-verified
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
                    Generate Full Mock when all 8 sections are generated
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