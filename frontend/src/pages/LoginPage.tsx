import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C9A24B]/15 text-sm font-semibold text-[#C9A24B]">
            S
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-medium tracking-tight text-[#1C1C1A]">
              Sweevo
            </h1>
            <p className="text-sm text-[#1C1C1A]/50">Sign in to your account</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-black/5 bg-white p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-[#1C1C1A]/80"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              required
              autoComplete="email"
              className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none placeholder:text-[#1C1C1A]/35 focus:border-[#C9A24B]/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-[#1C1C1A]/80"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="rounded-md border border-black/10 px-3 py-2 text-sm outline-none placeholder:text-[#1C1C1A]/35 focus:border-[#C9A24B]/60"
            />
          </div>

          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex items-center justify-center rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
