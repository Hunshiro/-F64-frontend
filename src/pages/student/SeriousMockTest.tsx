import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/Card";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../lib/auth";
import { apiRequest } from "../../lib/api";
import { Maximize2, Minimize2, X, ArrowLeft, User, Info, BarChart3, CheckCircle2, AlertCircle } from "lucide-react";

type Question = {
  _id: string;
  subject?: string;
  visualPdfUrl?: string;
  visualPageNumber?: number;
  visualNote?: string;
  imageUrl?: string;
  text: string;
  text_hi?: string;
  options: string[];
  options_hi?: string[];
  correctOptions: number[];
  type: "single" | "multi";
  marks: number;
  negativeMarks: number;
  explanation?: string;
  explanation_hi?: string;
};

type Quiz = {
  _id: string;
  title: string;
  durationMinutes: number;
  instructions?: string;
  questions: Question[];
  showAnswersAfterSubmit: boolean;
};

type SubmitResponse = {
  attempt: { _id: string; status: "submitted" };
  result: { score: number; accuracy: number };
  review?: Array<{
    questionId: string;
    selectedOptions: number[];
    correctOptions: number[];
    options: string[];
    text: string;
    explanation?: string;
  }>;
};

const ORDER = [
  "Reasoning",
  "Quantitative Aptitude",
  "English Comprehension",
  "General Awareness"
] as const;

type SectionKey = (typeof ORDER)[number];

function formatMMSS(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export default function SeriousMockTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();

  // For bilingual mocks we may need to route to the Hindi quiz id.
  const [enQuizId, setEnQuizId] = useState<string | null>(null);
  const [hiQuizId, setHiQuizId] = useState<string | null>(null);

  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [agreed, setAgreed] = useState(false);

  // sectional timer state
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  // section order index (0..3).
  const [sectionIndex, setSectionIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0); // index within active section
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  
  // Use a ref to always have access to the latest answers in timers/effects
  const answersRef = useRef<Record<string, number[]>>({});
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const activeSection = ORDER[sectionIndex];
  const SECTION_TIME_SECONDS = 15 * 60;

  const sectionQuestions = useMemo(() => {
    const q = quiz?.questions || [];
    const map = new Map<SectionKey, Question[]>();
    ORDER.forEach((s) => map.set(s, []));
    
    // Divide questions by position: 0-24: Reasoning, 25-49: Quant, 50-74: English, 75-99: GA
    q.forEach((question, index) => {
      let section: SectionKey;
      if (index < 25) {
        section = "Reasoning";
      } else if (index < 50) {
        section = "Quantitative Aptitude";
      } else if (index < 75) {
        section = "English Comprehension";
      } else {
        section = "General Awareness";
      }
      map.get(section)!.push(question);
    });
    
    return map;
  }, [quiz]);

  const activeQuestions = sectionQuestions.get(activeSection) || [];
  const activeQuestion = activeQuestions[activeIndex];

  // Check for existing attempt to enable Review Mode
  useEffect(() => {
    if (!id || !user || isStarted || submitted) return;

    // Verify attempt status with MongoDB
    apiRequest<any[]>(`/api/attempts?quizId=${id}&status=submitted`)
      .then(attempts => {
        const myAttempt = attempts.find(a => (a.userId?._id || a.userId) === user.id);
        if (myAttempt) {
          navigate(`/student/mock-analytics/${myAttempt._id}?quizId=${id}`, { replace: true });
        }
      })
      .catch(() => {});
  }, [id, user, isStarted, submitted, navigate]);

  useEffect(() => {
    if (!id || id === "0") return;

    // Load the quiz first (assume `id` might be either EN or HI for bilingual mocks).
    apiRequest<Quiz>(`/api/quizzes/${id}`)
      .then((data) => {
        setQuiz(data);
        // Keep track of both ids for language routing.
        if ((data as any)?.language === "hi") {
          setHiQuizId(data._id);
          // If this is a translated quiz, translatedFromQuizId points to the EN quiz.
          const fromEn = (data as any).translatedFromQuizId;
          setEnQuizId(fromEn ? String(fromEn) : null);
          setLanguage("hi");
        } else {
          setEnQuizId(data._id);
          // We don't know hiQuizId unless this is the hi quiz response.
          setHiQuizId(null);
          setLanguage("en");
        }
      })
      .catch((err: any) => notify(err.message || "Failed to load quiz"));
  }, [id, notify]);

  const toggleFullscreen = async () => {
    try {
      if (!fullscreenMode) {
        await document.documentElement.requestFullscreen();
        setFullscreenMode(true);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setFullscreenMode(false);
      }
    } catch (err) {
      notify("Fullscreen not supported or denied");
    }
  };

  const handleBack = () => {
    if (isStarted && !submitted) {
      setShowExitModal(true);
    } else {
      navigate("/student/ssc-cgl-mocks");
    }
  };

  const handlePause = async () => {
    if (!attemptId) return;
    setIsPaused(true);
    setShowExitModal(false);
    try {
      await autosave(answers);
      notify("Exam state saved. You can resume later from the dashboard.");
      navigate("/student/ssc-cgl-mocks");
    } catch (err: any) {
      notify(err.message || "Failed to pause exam");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (fullscreenMode) {
          setFullscreenMode(false);
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreenMode]);

  useEffect(() => {
    if (!isStarted || submitted) return;
    setActiveIndex(0);
    setSectionTimeLeft(SECTION_TIME_SECONDS);
  }, [isStarted, submitted]);

  // sectional countdown
  useEffect(() => {
    if (!isStarted || submitted || sectionTimeLeft === null) return;
    if (sectionTimeLeft <= 0) {
      const isLastSection = sectionIndex >= ORDER.length - 1;
      if (isLastSection) {
        void handleSubmit();
        return;
      }
      const nextSectionIndex = sectionIndex + 1;
      setSectionIndex(nextSectionIndex);
      setActiveIndex(0);
      setSectionTimeLeft(SECTION_TIME_SECONDS);
      return;
    }

    const t = window.setInterval(() => {
      setSectionTimeLeft((p) => (p === null ? p : p - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [isStarted, submitted, sectionTimeLeft, sectionIndex]);

  useEffect(() => {
    if (!isStarted || !activeQuestion) return;
    setVisited((prev) => {
      if (prev.has(activeQuestion._id)) return prev;
      const next = new Set(prev);
      next.add(activeQuestion._id);
      return next;
    });
  }, [activeQuestion, isStarted]);

  useEffect(() => {
    if (submitted) {
      const qId = quiz?._id || id;
      navigate(`/student/mock-analytics/${submitted.attempt._id}?quizId=${qId}`, { replace: true });
    }
  }, [submitted, navigate, quiz, id]);

  // Resolve hi/en quiz ids for bilingual full mocks.
  // backend creates separate quizzes: EN has language="en", HI has language="hi" and translatedFromQuizId=EN quiz id.
  const switchQuizByLanguage = async (nextLang: "en" | "hi") => {
    setLanguage(nextLang);

    if (nextLang === "hi") {
      if (hiQuizId) {
        navigate(`/student/serious-mock/${hiQuizId}`);
        return;
      }

      // EN -> HI: ask backend for mapped HI quiz id
      if (enQuizId) {
        try {
          const mapped = await apiRequest<{ hiQuizId: string }>(
            `/api/ai/ssc-cgl/bilingual-map/${enQuizId}`,
            { method: "GET" }
          );
          setHiQuizId(mapped.hiQuizId);
          navigate(`/student/serious-mock/${mapped.hiQuizId}`);
          return;
        } catch (e: any) {
          notify(e?.message || "Hindi version not found for this mock");
          return;
        }
      }

      notify("Hindi version not found for this mock (enQuizId missing)");
      return;
    }

    // nextLang === "en"
    if (enQuizId) {
      navigate(`/student/serious-mock/${enQuizId}`);
    } else {
      notify("English version not found for this mock");
    }
  };

  const autosave = async (nextAnswers: Record<string, number[]>) => {
    if (!attemptId) return;
    const payload = Object.entries(nextAnswers).map(([questionId, selectedOptions]) => ({
      questionId,
      selectedOptions
    }));
    try {
      await apiRequest(`/api/attempts/${attemptId}/autosave`, {
        method: "PATCH",
        body: JSON.stringify({ answers: payload })
      });
    } catch {
      // silent
    }
  };

  const toggleOption = (question: Question, optionIndex: number) => {
    if (submitted) return; // Prevent changing answers after submission
    setAnswers((prev) => {
      const existing = prev[question._id] || [];
      let next: number[] = [];
      if (question.type === "multi") {
        next = existing.includes(optionIndex)
          ? existing.filter((i) => i !== optionIndex)
          : [...existing, optionIndex];
      } else {
        next = [optionIndex];
      }
      const updated = { ...prev, [question._id]: next };
      void autosave(updated);
      return updated;
    });
  };

  const clearResponse = () => {
    if (submitted) return; // Prevent clearing answers after submission
    if (!activeQuestion) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[activeQuestion._id];
      void autosave(next);
      return next;
    });
  };

  const toggleMarkForReview = () => {
    if (submitted) return; // Prevent marking for review after submission
    if (!activeQuestion) return;
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(activeQuestion._id)) next.delete(activeQuestion._id);
      else next.add(activeQuestion._id);
      return next;
    });
  };

  const handleStart = async () => {
    if (!quiz?._id) return;
    try {
      const attempt = await apiRequest<{ _id: string }>("/api/attempts/start", {
        method: "POST",
        body: JSON.stringify({ quizId: quiz._id })
      });

      setAttemptId(attempt._id);
      setIsStarted(true);

      setSectionIndex(0);
      setActiveIndex(0);
      setSectionTimeLeft(SECTION_TIME_SECONDS);

      setVisited(new Set());
      setAnswers({});
    } catch (err: any) {
      notify(err.message || "Failed to start attempt");
    }
  };


  const handleSubmit = async () => {
    if (!attemptId) return;
    setIsSubmitting(true);
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, selectedOptions]) => ({
        questionId,
        selectedOptions
      }));
      const result = await apiRequest<SubmitResponse>(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: payload })
      });
      setSubmitted(result);
      setIsStarted(false);
      setSectionTimeLeft(null);

      notify("Exam submitted");

    } catch (err: any) {
      notify(err.message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canNavigatePrevNext = activeQuestions.length > 0;

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isStarted && !submitted) {
    // sectionTimeLeft is set only after start
    return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f4f7fa] font-sans text-slate-900">
      {/* Header */}
      <div className="flex-none bg-[#0b4d92] text-white px-6 py-2.5 flex justify-between items-center border-b-4 border-[#08376a]">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wider">Combined Graduate Level Examination</h1>
          <p className="text-[10px] opacity-80 font-bold uppercase">Staff Selection Commission</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title={fullscreenMode ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {fullscreenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <div className="text-right">
            <div className="text-sm font-bold bg-white/10 px-3 py-1 rounded">Time Left: 00:00:00</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Instructions Body */}
        <div className="flex-1 overflow-y-auto bg-white p-8 border-r border-gray-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-[#0b4d92] border-b-2 border-[#0b4d92] inline-block mb-6 uppercase">
              {language === 'hi' ? 'सामान्य अनुदेश' : 'General Instructions'}
            </h2>
            
            <div className="text-sm space-y-6 text-slate-700 leading-relaxed">
              {language === 'hi' ? (
                <>
                  <p className="font-bold underline">कृपया निम्नलिखित निर्देशों को ध्यान से पढ़ें:</p>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>सर्वर पर घड़ी सेट की जाएगी। स्क्रीन के ऊपरी दाएं कोने में उलटी गिनती घड़ी आपके लिए परीक्षा पूरी करने के लिए उपलब्ध शेष समय प्रदर्शित करेगी।</li>
                    <li>स्क्रीन के दाईं ओर प्रदर्शित प्रश्न पैलेट प्रत्येक प्रश्न की स्थिति को निम्न प्रतीकों का उपयोग करके दिखाएगा:
                      <ul className="mt-3 space-y-2.5 ml-2">
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-white flex-none"></span> आपने अभी तक प्रश्न नहीं देखा है।</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-red-600 rounded-b-full flex-none"></span> आपने प्रश्न का उत्तर नहीं दिया है।</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-green-600 rounded-lg flex-none"></span> आपने प्रश्न का उत्तर दे दिया है।</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-purple-600 rounded-t-full flex-none"></span> आपने प्रश्न का उत्तर नहीं दिया है पर प्रश्न को पुनर्विचार के लिए चिह्नित किया है।</li>
                      </ul>
                    </li>
                    <li>परीक्षा की अवधि 60 मिनट है।</li>
                    <li>प्रत्येक गलत उत्तर के लिए 0.5 अंकों का नकारात्मक अंकन होगा।</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold underline">Please read the following instructions carefully:</p>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.</li>
                    <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
                      <ul className="mt-3 space-y-2.5 ml-2">
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-white flex-none"></span> You have not visited the question yet.</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-red-600 rounded-b-full flex-none"></span> You have not answered the question.</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-green-600 rounded-lg flex-none"></span> You have answered the question.</li>
                        <li className="flex items-center gap-3"><span className="w-6 h-6 border border-gray-300 bg-purple-600 rounded-t-full flex-none"></span> You have NOT answered the question, but have marked the question for review.</li>
                      </ul>
                    </li>
                    <li>The duration of the examination is 60 minutes.</li>
                    <li>There will be negative marking of 0.5 marks for each wrong answer.</li>
                  </ol>
                </>
              )}
            </div>

            {/* Sectional Details Table */}
            <div className="mt-8 overflow-hidden rounded border border-gray-300">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#edf3fa] text-slate-700">
                    <th className="border-b border-r border-gray-300 px-4 py-2.5 text-left font-black uppercase text-[10px] tracking-tighter">Subject</th>
                    <th className="border-b border-r border-gray-300 px-4 py-2.5 text-center font-black uppercase text-[10px] tracking-tighter">Questions</th>
                    <th className="border-b border-r border-gray-300 px-4 py-2.5 text-center font-black uppercase text-[10px] tracking-tighter">Max Marks</th>
                    <th className="border-b border-gray-300 px-4 py-2.5 text-center font-black uppercase text-[10px] tracking-tighter">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDER.map((section) => (
                    <tr key={section} className="border-b border-gray-200 hover:bg-slate-50 transition-colors">
                      <td className="border-r border-gray-200 px-4 py-2.5 font-bold text-[#0b4d92]">{section}</td>
                      <td className="border-r border-gray-200 px-4 py-2.5 text-center font-medium">25</td>
                      <td className="border-r border-gray-200 px-4 py-2.5 text-center font-medium">50</td>
                      <td className="px-4 py-2.5 text-center font-bold text-red-600">15 Minutes</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border-r border-gray-300 px-4 py-3 uppercase tracking-wider">Total</td>
                    <td className="border-r border-gray-300 px-4 py-3 text-center">100</td>
                    <td className="border-r border-gray-300 px-4 py-3 text-center">200</td>
                    <td className="px-4 py-3 text-center text-red-600 uppercase">60 Minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Candidate Info */}
        <div className="w-[320px] flex-none bg-[#edf3fa] p-8 flex flex-col items-center border-l border-gray-300">
          <div className="w-32 h-40 bg-white border border-gray-300 mb-6 flex items-center justify-center shadow-sm rounded">
            <User className="w-20 h-20 text-slate-300" />
          </div>
          <div className="w-full space-y-5">
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Candidate Name</div>
              <div className="text-sm font-bold text-[#0b4d92]">{user?.name || "Candidate"}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</div>
              <div className="text-sm font-bold text-slate-800">{quiz.title}</div>
            </div>
            
            <div className="pt-6 border-t border-gray-300">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Select Default Language</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => switchQuizByLanguage("en")} 
                  className={`flex-1 py-1.5 text-xs font-bold border-2 transition-all rounded ${language === 'en' ? 'bg-[#0b4d92] text-white border-[#0b4d92]' : 'bg-white text-slate-600 border-gray-300 hover:border-slate-400'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => switchQuizByLanguage("hi")} 
                  className={`flex-1 py-1.5 text-xs font-bold border-2 transition-all rounded ${language === 'hi' ? 'bg-[#0b4d92] text-white border-[#0b4d92]' : 'bg-white text-slate-600 border-gray-300 hover:border-slate-400'}`}
                >
                  हिन्दी
                </button>
              </div>
              <p className="mt-2 text-[9px] text-red-600 font-bold italic text-center">
                * Please note all questions will appear in your default language first.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Declaration */}
      <div className="flex-none p-5 bg-[#f8f9fa] border-t border-gray-300 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-5">
          <label className="flex items-start gap-4 cursor-pointer group max-w-2xl">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0b4d92] focus:ring-[#0b4d92] transition-all"
            />
            <span className="text-[11px] text-slate-600 font-bold leading-relaxed group-hover:text-slate-900 transition-colors">
              I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. I declare that I am not in possession of any prohibited items and I will follow the rules and regulations of the examination.
            </span>
          </label>
          
          <div className="flex gap-4">
            {attemptId ? (
              <button 
                onClick={() => navigate(`/student/mock-analytics/${attemptId}?quizId=${id}`)}
                className="px-12 py-3 font-bold uppercase tracking-widest text-sm rounded transition-all shadow-md bg-emerald-600 text-white hover:bg-emerald-700 transform active:scale-95"
              >
                Review Last Attempt
              </button>
            ) : null}
            <button 
              onClick={handleStart}
              disabled={!agreed}
              className={`px-12 py-3 font-bold uppercase tracking-widest text-sm rounded transition-all shadow-md ${
                agreed ? 'bg-[#0b4d92] text-white hover:bg-[#08376a] transform active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {attemptId ? 'Retake Exam' : 'I am ready to begin'}
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-pulse">
          <p className="text-slate-600 font-medium">Redirecting to analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${fullscreenMode ? "bg-gray-100" : "bg-gray-50"} text-slate-900 font-sans`}>
      <div className="flex-none border-b border-gray-300 bg-[#f8f9fa] shadow-sm">
        <div className="w-full px-6 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors mr-2">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <div className="text-xl font-bold text-[#0b4d92]">SSC CGL Tier-I Mock Test</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{quiz.title}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Time Left</div>
                  <div className="font-mono text-2xl font-bold text-red-600 leading-none">
                    {formatMMSS(sectionTimeLeft ?? SECTION_TIME_SECONDS)}
                  </div>
              </div>

              <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
                <button
                  onClick={() => switchQuizByLanguage("en")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    language === "en" ? "bg-[#0b4d92] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => switchQuizByLanguage("hi")}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    language === "hi" ? "bg-[#0b4d92] text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  HI
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1">
            {ORDER.map((s) => {
              const isActive = s === activeSection;
              return (
                <div
                  key={s}
                  className={`px-4 py-1.5 text-xs font-bold border-t-4 transition-all uppercase ${
                    isActive
                      ? "border-[#0b4d92] bg-white text-[#0b4d92]"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  {s}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0">
        <div className="flex flex-col border-r border-gray-300 bg-white min-h-0">
          <div className="flex-none px-6 py-2 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700">Question No. {activeIndex + 1}</span>
            <button className="flex items-center gap-1 text-xs text-[#0b4d92] font-bold">
              <Info className="w-3 h-3" /> Report Error
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {activeQuestion ? (
              <div className="space-y-8">
                <div className="text-lg font-medium leading-relaxed text-slate-800">
                  {language === "hi" ? (activeQuestion.text_hi || activeQuestion.text) : activeQuestion.text}
                </div>

                {activeQuestion.imageUrl && (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm max-w-md mx-auto">
                    <img
                      src={activeQuestion.imageUrl}
                      alt="Question Visualization"
                      className="w-full h-auto max-h-[250px] object-contain"
                    />
                  </div>
                )}

                {activeQuestion.visualPdfUrl && activeQuestion.visualPageNumber && (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-50 shadow-sm max-w-3xl mx-auto">
                    <div className="border-b bg-white px-4 py-2 text-xs font-bold text-slate-500 uppercase text-center">
                      Visual reference from source (Page {activeQuestion.visualPageNumber})
                    </div>
                    <iframe
                      title={`Visual reference page ${activeQuestion.visualPageNumber}`}
                      className="w-full h-[400px]"
                      src={`${activeQuestion.visualPdfUrl}#page=${activeQuestion.visualPageNumber}&toolbar=0&navpanes=0`}
                    />
                    {activeQuestion.visualNote && (
                      <div className="border-t bg-white px-4 py-2 text-xs text-slate-500 italic">
                        Note: {activeQuestion.visualNote}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {(language === "hi" ? (activeQuestion.options_hi || activeQuestion.options) : activeQuestion.options).map((opt, idx) => {
                    const selected = (answers[activeQuestion._id] || []).includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleOption(activeQuestion, idx)}
                        className={`group flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                          selected ? "border-[#0b4d92] bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          selected ? "bg-[#0b4d92] border-[#0b4d92] text-white" : "border-gray-400 text-slate-500"
                        }`}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-none p-4 border-t border-gray-300 bg-slate-50 flex flex-wrap gap-2 justify-between shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2">
              {!submitted && ( // Only show if not submitted
                <button
                  onClick={toggleMarkForReview}
                  className="px-6 py-2 border-2 border-[#0b4d92] text-[#0b4d92] bg-white text-sm font-bold rounded shadow-sm hover:bg-blue-50"
                >
                  Mark for Review & Next
                </button>
              )}
              <button
                onClick={clearResponse} // Clear response should still work
                disabled={submitted} // Disable if submitted
                className="px-6 py-2 border-2 border-slate-300 text-slate-600 bg-white text-sm font-bold rounded shadow-sm hover:bg-slate-100"
              >
                Clear Response
              </button>
            </div>
            <div className="flex gap-2">
              {!submitted && ( // Only show if not submitted
                <button
                  onClick={() => window.confirm("Are you sure you want to finish this section? You cannot return to it.") && setSectionTimeLeft(0)}
                  disabled={isSubmitting}
                  className="px-6 py-2 border-2 border-orange-500 text-orange-600 bg-white text-sm font-bold rounded shadow-sm hover:bg-orange-50"
                >
                  Finish Section
                </button>
              )}
              <button
                onClick={() => setActiveIndex(i => Math.min(activeQuestions.length - 1, i + 1))}
                className="px-8 py-2 bg-[#0b4d92] text-white text-sm font-bold rounded shadow-sm hover:bg-[#08376a]"
              >
                Save & Next
              </button>
            </div>
          </div>
        </div>

        <aside className="flex flex-col bg-[#edf3fa] min-h-0">
          <div className="flex-none p-4 bg-white border-b border-gray-300 flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 border rounded-md flex items-center justify-center">
              <User className="w-10 h-10 text-slate-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase">Candidate Name</span>
              <span className="text-sm font-bold text-slate-800">{user?.name || "Candidate"}</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">ID: {(user as any)?._id?.slice?.(-8) || ""}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-2">
              {activeQuestions.map((q, idx) => {
                const isAnswered = (answers[q._id] || []).length > 0;
                const isMarked = markedForReview.has(q._id);
                const isWasVisited = visited.has(q._id);
                const isCurrent = idx === activeIndex;

                let statusClass = "bg-white text-slate-600 border-gray-300"; // Not Visited
                if (isMarked) {
                  statusClass = "bg-purple-600 text-white border-purple-600 rounded-b-none rounded-t-full"; // Marked
                } else if (isAnswered) {
                  statusClass = "bg-green-600 text-white border-green-600 rounded-lg"; // Answered
                } else if (isWasVisited) {
                  statusClass = "bg-red-600 text-white border-red-600 rounded-b-full rounded-t-none"; // Not Answered
                }

                return (
                  <button
                    key={q._id}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-10 w-10 flex items-center justify-center text-xs font-bold border transition-all ${statusClass} ${
                      isCurrent ? "ring-2 ring-blue-800 ring-offset-2 scale-110 z-10" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3 bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-5 h-5 bg-green-600 rounded-sm"></div> Answered
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-5 h-5 bg-red-600 rounded-b-full"></div> Not Answered
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-5 h-5 bg-white border border-gray-300"></div> Not Visited
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <div className="w-5 h-5 bg-purple-600 rounded-t-full"></div> Marked for Review
              </div>
            </div>
          </div>

          <div className="flex-none p-4 border-t border-gray-300 bg-white">
            <button
              onClick={() => setShowExitModal(true)}
              className="w-full py-2 bg-slate-800 text-white text-sm font-bold rounded shadow hover:bg-black"
            >
              Submit Exam
            </button>
          </div>
        </aside>
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Exit Exam?</h2>
            <p className="text-ink/70 mb-6">Choose what you'd like to do:</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowExitModal(false);
                  void handleSubmit();
                }}
                className="w-full px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              >
                Submit Exam Now
              </button>
              <button
                onClick={handlePause}
                className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Pause & Resume Later
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full px-4 py-3 rounded-lg border font-semibold hover:bg-gray-50 transition"
              >
                Continue Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
