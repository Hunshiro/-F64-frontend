import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { Mail, Lock, User, UserCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) return notify("Please select your gender");
    
    try {
      await signup(name, email, password, role, gender);
      notify("Welcome to F64 Academy!");
      navigate("/");
    } catch (err: any) {
      notify(err.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="w-full max-w-[440px] bg-white rounded-[32px] border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Join F64 Academy Test Series</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="relative">
            <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50/50 outline-none transition-all" 
              placeholder="Full Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required
            />
          </div>

          <div className="relative">
            <UserCircle className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <select 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50/50 outline-none appearance-none transition-all"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50/50 outline-none transition-all" 
              placeholder="Email Address" 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50/50 outline-none transition-all" 
              placeholder="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>

          <button className="group w-full py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            Create Account
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="text-sm text-center mt-6 font-medium text-slate-500">
          Already have an account? <Link className="text-blue-600 hover:underline" to="/login">Login now</Link>
        </div>
      </div>
    </div>
  );
}
