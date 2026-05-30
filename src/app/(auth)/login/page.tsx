"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type ResolvedAccount =
  | { type: "platform"; id: "platform"; label: string }
  | {
      type: "tenant";
      id: string;
      tenantId: string;
      label: string;
      mfaRequired: boolean;
      mfaEnrolled: boolean;
    };

type Step = "credentials" | "select" | "totp" | "enroll";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");

  const [accounts, setAccounts] = useState<ResolvedAccount[]>([]);
  const [account, setAccount] = useState<ResolvedAccount | null>(null);
  const [code, setCode] = useState("");
  const [enroll, setEnroll] = useState<{ qrDataUrl: string; secret: string } | null>(null);

  const router = useRouter();

  function reset() {
    setStep("credentials");
    setAccounts([]);
    setAccount(null);
    setCode("");
    setEnroll(null);
    setError("");
  }

  async function doSignIn(acc: ResolvedAccount, totp?: string) {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      accountId: acc.id,
      totp: totp ?? "",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      if (totp !== undefined) {
        setError("Ongeldige of verlopen code. Probeer het opnieuw.");
      } else {
        setError("Inloggen mislukt. Probeer het opnieuw.");
      }
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function proceedWithAccount(acc: ResolvedAccount) {
    setAccount(acc);
    setError("");
    if (acc.type === "platform" || !acc.mfaRequired) {
      await doSignIn(acc);
      return;
    }
    if (acc.mfaEnrolled) {
      setCode("");
      setStep("totp");
      return;
    }
    // Verplichte 2FA maar nog niet gekoppeld → koppelstap starten
    setLoading(true);
    const res = await fetch("/api/auth/mfa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, accountId: acc.id }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Kon 2FA-koppeling niet starten");
      return;
    }
    const data = await res.json();
    setEnroll({ qrDataUrl: data.qrDataUrl, secret: data.secret });
    setCode("");
    setStep("enroll");
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ongeldig e-mailadres of wachtwoord");
      return;
    }
    const data = await res.json();
    const list: ResolvedAccount[] = data.accounts;
    setAccounts(list);
    // Altijd de klant-selectiestap tonen — ook bij één account — zodat de
    // gebruiker bewust een omgeving kiest vóórdat de onboarding-wizard kan
    // verschijnen. Auto-proceed bij één match sloeg die keuze ten onrechte over.
    setStep("select");
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    await doSignIn(account, code);
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/mfa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, accountId: account.id, code }),
    });
    if (!res.ok) {
      setLoading(false);
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ongeldige code. Probeer het opnieuw.");
      return;
    }
    setLoading(false);
    // Koppeling gelukt → meteen inloggen met dezelfde code
    await doSignIn(account, code);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-700 to-forest-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">TAAS</h1>
          <p className="text-slate-500 text-sm mt-1">Rhoost Test Tool</p>
        </div>

        {/* Stap 1: e-mail + wachtwoord */}
        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="naam@organisatie.nl"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner label="Inloggen..." /> : "Inloggen"}
            </button>
          </form>
        )}

        {/* Stap 2: klant kiezen */}
        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Kies bij welke omgeving u wilt inloggen.
            </p>
            <div className="space-y-2">
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => proceedWithAccount(acc)}
                  disabled={loading}
                  className="w-full flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-4 py-3 text-left hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-medium text-sm">
                      {acc.label.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{acc.label}</span>
                      <span className="block text-xs text-slate-400">
                        {acc.type === "platform" ? "Platformbeheer" : "Klantomgeving"}
                        {acc.type === "tenant" && acc.mfaRequired ? " · 2FA vereist" : ""}
                      </span>
                    </span>
                  </span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">← Terug</button>
          </div>
        )}

        {/* Stap 3: 2FA-code invoeren */}
        {step === "totp" && (
          <form onSubmit={handleTotp} className="space-y-4">
            <p className="text-sm text-slate-600">
              Voer de 6-cijferige code uit uw authenticator-app in voor <strong>{account?.label}</strong>.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verificatiecode</label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input tracking-widest text-center text-lg"
                placeholder="000000"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner label="Verifiëren..." /> : "Verifiëren"}
            </button>
            <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">← Terug</button>
          </form>
        )}

        {/* Stap 4: 2FA koppelen (eerste keer) */}
        {step === "enroll" && enroll && (
          <form onSubmit={handleEnroll} className="space-y-4">
            <p className="text-sm text-slate-600">
              Voor <strong>{account?.label}</strong> is twee-factor-authenticatie verplicht.
              Scan de QR-code met Microsoft Authenticator (of een vergelijkbare app) en voer de code in.
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enroll.qrDataUrl} alt="QR-code voor authenticator" className="w-44 h-44 border border-slate-200 rounded-lg" />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Kan de QR niet gescand worden? Voer deze sleutel handmatig in:</p>
              <code className="text-xs break-all text-slate-600 font-mono">{enroll.secret}</code>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verificatiecode</label>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input tracking-widest text-center text-lg"
                placeholder="000000"
                required
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Spinner label="Koppelen..." /> : "Koppelen en inloggen"}
            </button>
            <button type="button" onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">← Terug</button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Neem contact op met uw beheerder voor toegang
        </p>
      </div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <>
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </>
  );
}
