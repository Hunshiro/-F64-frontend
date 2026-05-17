import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../components/Toast";

export default function Signup() {
  const { signup } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(name, email, password, role);
      notify("Account created");
      navigate("/");
    } catch (err: any) {
      notify(err.message || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card p-8 w-full max-w-md">
        <div className="font-display text-2xl mb-4">Create account</div>
        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="w-full px-3 py-2 rounded-lg border" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-lg border" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 rounded-lg border" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="w-full px-3 py-2 rounded-lg border" value={role} onChange={(e) => setRole(e.target.value as any)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
          <button className="w-full py-2 rounded-lg bg-accent text-white">Sign up</button>
        </form>
        <div className="text-sm mt-4">Already have an account? <Link className="text-accent" to="/login">Login</Link></div>
      </div>
    </div>
  );
}
