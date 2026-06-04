import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { fetchAnalysis, runAnalysis } from "./api";
import type { Analysis, Tab } from "./types";
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
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("brief");

  useEffect(() => {
    fetchAnalysis().then(setAnalysis).catch((e) => setError(String(e)));
  }, []);

  async function handleReanalyze() {
    setProcessing(true);
    setProcessError(null);
    try {
      setAnalysis(await runAnalysis());
      setActiveTab("brief");
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-10 text-center text-slate-600">
        <p className="font-semibold text-red-600">Couldn't load your briefing.</p>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm">
          Run <code>python analyze.py</code> to generate the analysis.
        </p>
      </div>
    );
  }
  if (!analysis) {
    return <div className="p-10 text-center text-slate-400">Loading your briefing…</div>;
  }

  const decide = analysis.situations.filter((s) => s.category === "decide").sort(byUrgency);
  const delegate = analysis.situations.filter((s) => s.category === "delegate").sort(byUrgency);
  const review = analysis.situations.filter((s) => s.category === "ignore"); // team-handled threads
  const ignored = analysis.messages.filter((m) => m.category === "ignore"); // individual noise
  const now = analysis.generated_at;

  const counts = {
    decide: decide.length,
    delegate: delegate.length,
    flags: analysis.flags.length,
    review: review.length,
    others: ignored.length,
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* sticky header */}
      <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
          <Header
            morningOf={analysis.morning_of}
            generatedAt={analysis.generated_at}
            readTimeSeconds={analysis.briefing.read_time_seconds}
            counts={counts}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onReanalyze={handleReanalyze}
            processing={processing}
          />
        </div>
      </div>

      {/* tab content */}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {processError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-none" />
            <div>
              <span className="font-semibold">Couldn't refresh. </span>
              {processError}
            </div>
          </div>
        )}

        {activeTab === "brief" && <Briefing briefing={analysis.briefing} />}

        {activeTab === "decide" && (
          <section>
            <SectionTitle accent="bg-red-500">Your decisions</SectionTitle>
            {decide.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No decisions needed today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {decide.map((s) => (
                  <SituationCard
                    key={s.id}
                    situation={s}
                    messages={analysis.messages}
                    now={now}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "delegate" && (
          <section>
            <SectionTitle accent="bg-sky-500">To delegate</SectionTitle>
            {delegate.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nothing to delegate today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {delegate.map((s) => (
                  <SituationCard
                    key={s.id}
                    situation={s}
                    messages={analysis.messages}
                    now={now}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "flags" && (
          <Flags flags={analysis.flags} messages={analysis.messages} />
        )}

        {activeTab === "review" && (
          <section>
            <SectionTitle accent="bg-emerald-500">
              Handled by your team — review if needed
            </SectionTitle>
            {review.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nothing to review today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {review.map((s) => (
                  <SituationCard
                    key={s.id}
                    situation={s}
                    messages={analysis.messages}
                    now={now}
                    noteBox
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "others" && <Handled messages={ignored} defaultOpen />}

        <footer className="mt-10 text-center text-xs text-slate-400">
          AI Chief of Staff · {analysis.stats.total} messages triaged across email, Slack &amp;
          WhatsApp
        </footer>
      </div>
    </div>
  );
}
