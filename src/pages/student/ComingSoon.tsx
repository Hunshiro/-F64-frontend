import { useLocation } from "react-router-dom";
import { Card } from "../../components/Card";

const COPY: Record<string, { title: string; body: string }> = {
  "/student/ai-assistant": {
    title: "AI Assistant",
    body: "This section is coming soon."
  },
  "/student/performance": {
    title: "Performance",
    body: "This section is coming soon."
  },
  "/student/exam-coming-soon": {
    title: "Exam Mock",
    body: "This exam mock is coming soon."
  }
};

export default function StudentComingSoon() {
  const location = useLocation();
  const content = COPY[location.pathname] || {
    title: "Coming Soon",
    body: "This section is coming soon."
  };

  return (
    <div className="max-w-3xl">
      <Card title={content.title}>
        <div className="py-8 text-sm text-ink/70">{content.body}</div>
      </Card>
    </div>
  );
}
