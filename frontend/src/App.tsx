import { useEffect, useState } from "react";
import { fetchAnalysis } from "./api";
import type { Analysis } from "./types";
import { byUrgency } from "./lib";
import { Header } from "./components/Header";
import { Briefing } from "./components/Briefing";
import { Flags } from "./components/Flags";
import { SituationCard } from "./components/SituationCard";
import { Handled } from "./components/Handled";

function SectionTitle({ children, accent }: { children: string; accent: string }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
      <span className={`h-3.5 w-1 rounded-full ${accent}`} />
      {children}
    </h2>
  );
}

export default function App() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis().then(setAnalysis).catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10 text-center text-slate-600">
        <p className="font-semibold text-red-600">Couldn't load the briefing.</p>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm">Run <code>python analyze.py</code> to generate the analysis.</p>
      </div>
    );
  }
  if (!analysis) {
    return <div className="p-10 text-center text-slate-400">Loading your briefing…</div>;
  }

  const decide = analysis.situations.filter((s) => s.category === "decide").sort(byUrgency);
  const delegate = analysis.situations.filter((s) => s.category === "delegate").sort(byUrgency);
  const handled = analysis.situations.filter((s) => s.category === "ignore");
  const ignored = analysis.messages.filter((m) => m.category === "ignore");
  const now = analysis.generated_at;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6">
        <Header analysis={analysis} />
        <Briefing briefing={analysis.briefing} />
        <Flags flags={analysis.flags} />

        <section className="mb-6">
          <SectionTitle accent="bg-red-500">Needs your decision</SectionTitle>
          <div className="space-y-2.5">
            {decide.map((s) => (
              <SituationCard key={s.id} situation={s} messages={analysis.messages} now={now} />
            ))}
          </div>
        </section>

        {delegate.length > 0 && (
          <section className="mb-6">
            <SectionTitle accent="bg-sky-500">Delegate</SectionTitle>
            <div className="space-y-2.5">
              {delegate.map((s) => (
                <SituationCard key={s.id} situation={s} messages={analysis.messages} now={now} />
              ))}
            </div>
          </section>
        )}

        {handled.length > 0 && (
          <section className="mb-6">
            <SectionTitle accent="bg-emerald-500">Handled by the team — no action needed</SectionTitle>
            <div className="space-y-2.5">
              {handled.map((s) => (
                <SituationCard key={s.id} situation={s} messages={analysis.messages} now={now} />
              ))}
            </div>
          </section>
        )}

        <Handled messages={ignored} />

        <footer className="mt-8 text-center text-xs text-slate-400">
          AI Chief of Staff · {analysis.stats.total} messages triaged across email, Slack &amp; WhatsApp
        </footer>
      </div>
    </div>
  );
}
