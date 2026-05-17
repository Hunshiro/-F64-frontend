import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";

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
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card p-8 w-full max-w-md">
        <div className="font-display text-2xl mb-4">Login</div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="w-full px-3 py-2 rounded-lg border" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-lg border" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full py-2 rounded-lg bg-accent text-white">Sign in</button>
        </form>
        <div className="text-sm mt-4">No account? <Link className="text-accent" to="/signup">Sign up</Link></div>
      </div>
    </div>
  );
}
