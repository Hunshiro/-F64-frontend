import { Card } from "../../components/Card";

export default function StudentCourse() {
  return (
    <div className="space-y-4">
      <div className="font-display text-2xl">Banking PO Master</div>
      <Card title="Sections">
        <div className="space-y-2">
          <div className="p-3 rounded-lg border">Quantitative Aptitude - 12 quizzes</div>
          <div className="p-3 rounded-lg border">Reasoning - 8 quizzes</div>
          <div className="p-3 rounded-lg border">English - 6 quizzes</div>
        </div>
      </Card>
    </div>
  );
}
