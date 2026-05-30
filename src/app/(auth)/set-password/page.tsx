"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }
    if (password !== confirm) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Er ging iets mis");
    }
  }

  if (!token) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
        Geen geldige uitnodigingslink. Vraag je beheerder om een nieuwe uitnodiging.
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
        Wachtwoord ingesteld. Je wordt doorgestuurd naar het inlogscherm…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">
          Nieuw wachtwoord
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          placeholder="••••••••"
          minLength={8}
          required
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
          Bevestig wachtwoord
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Bezig…" : "Wachtwoord instellen"}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-700 to-forest-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Wachtwoord instellen</h1>
          <p className="text-slate-500 text-sm mt-1">TAAS Testbeheer</p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Laden…</p>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
