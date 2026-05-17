import { Card } from "../../components/Card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const scoreData = [
  { name: "Mon", score: 42 },
  { name: "Tue", score: 55 },
  { name: "Wed", score: 61 },
  { name: "Thu", score: 68 },
  { name: "Fri", score: 73 }
];

const sectionData = [
  { name: "QA", accuracy: 78 },
  { name: "Reasoning", accuracy: 84 },
  { name: "English", accuracy: 72 }
];

export default function AnalyticsOverview() {
  return (
    <div className="space-y-4">
      <div className="font-display text-2xl">Performance Analytics</div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Score Trend">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#1F8A70" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Section Accuracy">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#F2C14E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
