import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      notify("Welcome back");
      navigate("/");
    } catch (err: any) {
      notify(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 bg-slate-50/50 outline-none transition-all" 
              placeholder="Email Address" 
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
            Sign In
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="text-sm text-center mt-8 font-medium text-slate-500">
          New to F64 Academy? <Link className="text-blue-600 hover:underline" to="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}
