import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  Bookmark,
  Brain,
  Briefcase,
  Check,
  ChevronRight,
  Compass,
  Crown,
  FileDown,
  Fingerprint,
  GraduationCap,
  Heart,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Slider } from "../components/ui/slider";
import {
  ai,
  AssessmentAnswer,
  AssessmentQuestions,
  AssessmentReport as AssessmentReportData,
  Comparison,
  Major,
} from "../services/api";
import { BottomTabs, Logo, StatusBar, TopBar, useNav } from "./shell";

const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`rounded-2xl bg-white p-4 shadow-[0_2px_14px_rgba(11,21,51,0.05)] ${className}`}>
    {children}
  </div>
);

export function HomeDash() {
  const { go, t, td, profileCompletion, user, profile, langCode } = useNav();
  const dnaReport = (() => {
    const p = profile as Record<string, unknown>;
    const byLang = (p.assessmentReportByLang ?? {}) as Partial<
      Record<"en" | "ar", AssessmentReportData>
    >;
    return byLang[langCode] ?? (p.assessmentReport as AssessmentReportData | undefined);
  })();
  const displayName =
    user?.name ||
    (typeof (profile as Record<string, unknown>).fullName === "string"
      ? ((profile as Record<string, unknown>).fullName as string)
      : "");
  // Per-user activity feed. Populated once user actions are tracked server-side.
  const recentActivity: [string, string][] = [];
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-slate-500">{t("good_morning")}</p>
            {displayName && (
              <h2 className="text-[var(--brand-navy)]">{displayName}</h2>
            )}
          </div>
          <button onClick={() => go("notifications")} className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
            <Bell size={18} className="text-[var(--brand-navy)]" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--brand-purple)]" />
          </button>
        </div>

        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-slate-500">{t("profile_completion")}</p>
              <p className="text-[var(--brand-navy)]" style={{ fontWeight: 700, fontSize: 22 }}>{profileCompletion}%</p>
            </div>
            <div className="text-[12px] text-[var(--brand-blue)]">{t("complete")}</div>
          </div>
          <Progress value={profileCompletion} className="mt-3 h-2" />
        </Card>

        <div
          onClick={() => go(dnaReport ? "assessmentReport" : "assessment")}
          className="mt-4 cursor-pointer rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-purple))" }}
        >
          <div className="flex items-center gap-2 text-[13px] text-blue-100">
            {dnaReport ? <Fingerprint size={15} /> : <Sparkles size={15} />} {t("ai_assessment")}
          </div>
          <h3 className="mt-1 text-white">{dnaReport ? dnaReport.archetype?.title || t("career_dna") : t("start_assessment")}</h3>
          <p className="mt-1 text-[13px] text-blue-100/90">{dnaReport ? dnaReport.archetype?.tagline || t("career_dna") : t("assessment_desc")}</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-[13px]">
            {dnaReport ? t("dna_view") : t("begin_now")} <ArrowRight size={15} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionCard icon={GraduationCap} label={t("view_matches")} onClick={() => go("results")} />
          <ActionCard icon={Route} label={t("career_roadmap")} onClick={() => go("report")} />
          <ActionCard icon={Briefcase} label={t("job_market")} onClick={() => go("market")} />
          <ActionCard icon={Award} label={t("scholarships")} onClick={() => go("scholarships")} />
        </div>

        <div
          onClick={() => go("universities")}
          className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-blue))" }}
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white" style={{ fontWeight: 600 }}>{t("leb_unis_title")}</p>
            <p className="text-[12px] text-blue-100/85">{t("leb_unis_home_desc")}</p>
          </div>
          <ChevronRight size={18} />
        </div>

        <Card className="mt-4" >
          <div className="flex items-center gap-2 text-[13px] text-[var(--brand-purple)]">
            <Brain size={16} /> {t("daily_insight")}
          </div>
          <p className="mt-2 text-[14px] text-slate-700">
{t("insight_body")}
          </p>
        </Card>

        <div className="mt-5 flex items-center justify-between">
          <h3>{t("recent_activity")}</h3>
        </div>
        <div className="mt-2 space-y-2">
          {recentActivity.map(([label, time]) => (
            <Card key={label} className="flex items-center justify-between py-3">
              <span className="text-[14px] text-slate-700">{td(label)}</span>
              <span className="text-[12px] text-slate-400">{td(time)}</span>
            </Card>
          ))}
        </div>

        <div
          onClick={() => go("premium")}
          className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-white"
          style={{ background: "linear-gradient(135deg, var(--brand-navy), #29388a)" }}
        >
          <Crown size={26} className="text-amber-300" />
          <div className="flex-1">
            <p className="text-white" style={{ fontWeight: 600 }}>{t("upgrade_premium")}</p>
            <p className="text-[12px] text-blue-100/80">{t("premium_desc")}</p>
          </div>
          <ChevronRight size={18} />
        </div>
      </div>
      <BottomTabs />
    </div>
  );
}

function ActionCard({ icon: Icon, label, onClick }: { icon: typeof Route; label: string; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="cursor-pointer">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef2ff]">
        <Icon size={18} className="text-[var(--brand-blue)]" />
      </div>
      <p className="mt-3 text-[13px] text-slate-700" style={{ fontWeight: 500 }}>{label}</p>
    </Card>
  );
}

export function Assessment() {
  const { go, t, updateProfile, profile, langCode, recommendations } = useNav();
  const [data, setData] = useState<AssessmentQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [val, setVal] = useState(3);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);

  // A digest of everything the AI already concluded about this student, so the
  // assessment is built on top of that knowledge (not from scratch).
  const knowledge = useMemo(
    () =>
      recommendations
        ? {
            summary: recommendations.summary,
            strengths: recommendations.strengths,
            gaps: recommendations.gaps,
            recommendedMajors: (recommendations.majors ?? []).map((m) => m.name),
          }
        : undefined,
    [recommendations]
  );

  // Generate an assessment tailored to what the AI already knows about the user.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setI(0);
    setAnswers([]);
    ai
      .assessmentQuestions(profile, langCode, knowledge)
      .then((res) => {
        if (!active) return;
        const qs = Array.isArray(res?.questions)
          ? res.questions.filter((q) => q && typeof q.prompt === "string")
          : [];
        if (qs.length === 0) throw new Error("empty");
        setData({ intro: res.intro ?? "", questions: qs });
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(t("assessment_error"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode]);

  if (loading) return <AssessmentGenerating />;

  if (error || !data) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <TopBar title={t("ai_assessment")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-50">
            <AlertTriangle size={26} className="text-rose-500" />
          </div>
          <p className="text-[14px] text-slate-600">{error ?? t("assessment_error")}</p>
          <Button onClick={() => go("assessment")}>{t("retry")}</Button>
        </div>
      </div>
    );
  }

  const questions = data.questions;
  const q = questions[i];
  const last = i === questions.length - 1;
  const scaleLabels = q.scaleLabels ?? { low: "1", high: "5" };

  const record = (answer: string) => {
    const entry: AssessmentAnswer = { question: q.prompt, answer, dimension: q.dimension };
    const nextAnswers = [...answers, entry];
    setAnswers(nextAnswers);
    if (last) {
      updateProfile({ assessment: nextAnswers });
      go("assessmentReport", { answers: nextAnswers }, { replace: true });
    } else {
      setI(i + 1);
      setVal(3);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("ai_assessment")} action={<button onClick={() => go("home")} className="text-[12px] text-slate-400">{t("save_exit")}</button>} />
      <div className="px-5">
        <Progress value={((i + 1) / questions.length) * 100} className="h-2" />
        <p className="mt-1.5 text-[12px] text-slate-400">{t("question")} {i + 1} {t("of")} {questions.length}</p>
      </div>
      {data.intro && i === 0 && (
        <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-2xl bg-[#f3edff] p-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <p className="text-[13px] text-[var(--brand-navy)]">{data.intro}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {q.dimension && (
          <span className="inline-block rounded-full bg-[#eef2ff] px-2.5 py-1 text-[11px] text-[var(--brand-blue)]" style={{ fontWeight: 600 }}>
            {q.dimension}
          </span>
        )}
        <h2 className="mb-5 mt-2">{q.prompt}</h2>
        {q.type === "choice" && q.options && q.options.length > 0 ? (
          <div className="space-y-3">
            {q.options.map((o) => (
              <button
                key={o}
                onClick={() => record(o)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-start text-[14px] text-slate-700 hover:border-[var(--brand-blue)]"
              >
                {o}
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <Slider value={[val]} min={1} max={5} step={1} onValueChange={(v) => setVal(v[0])} />
            <div className="mt-3 flex justify-between text-[12px] text-slate-400">
              <span>{scaleLabels.low}</span>
              <span>{scaleLabels.high}</span>
            </div>
            <p className="mt-1 text-center text-[var(--brand-blue)]" style={{ fontWeight: 700, fontSize: 22 }}>{val}/5</p>
          </div>
        )}
      </div>
      <div className="px-5 pb-10">
        {q.type === "scale" && (
          <Button
            className="w-full"
            onClick={() => record(`${val}/5 (${scaleLabels.low} → ${scaleLabels.high})`)}
          >
            {last ? t("see_my_dna") : t("next_question")}
          </Button>
        )}
      </div>
    </div>
  );
}

// Immersive generating screen while the AI designs the tailored assessment.
function AssessmentGenerating() {
  const { t } = useNav();
  const [p, setP] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setP((v) => Math.min(v + 3, 96)), 90);
    return () => clearInterval(iv);
  }, []);
  const steps = [
    { key: "asm_step_read", at: 30 },
    { key: "asm_step_design", at: 65 },
    { key: "asm_step_tailor", at: 100 },
  ];
  return (
    <GeneratingView
      title={t("asm_building")}
      subtitle={<p className="mt-1.5 text-[13px] text-blue-100/80">{t("asm_building_sub")}</p>}
      steps={steps.map((s) => ({ label: t(s.key), at: s.at }))}
      progress={p}
      hint={t("gen_wait_hint")}
    />
  );
}

// Immersive generating screen while the AI writes the Career DNA report.
function AssessmentReportGenerating() {
  const { t } = useNav();
  const [p, setP] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setP((v) => Math.min(v + 3, 96)), 90);
    return () => clearInterval(iv);
  }, []);
  const steps = [
    { key: "dna_step_analyze", at: 28 },
    { key: "dna_step_profile", at: 60 },
    { key: "dna_step_write", at: 100 },
  ];
  return (
    <GeneratingView
      title={t("dna_building")}
      subtitle={<p className="mt-1.5 text-[13px] text-blue-100/80">{t("dna_building_sub")}</p>}
      steps={steps.map((s) => ({ label: t(s.key), at: s.at }))}
      progress={p}
      hint={t("gen_wait_hint")}
    />
  );
}

function ScoreBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full"
        style={{ width: `${v}%`, background: "linear-gradient(90deg,var(--brand-blue),var(--brand-purple))" }}
      />
    </div>
  );
}

// The flagship "Career DNA" report — generated from the assessment answers.
export function AssessmentReport() {
  const { go, t, payload, profile, langCode, updateProfile, recommendations } = useNav();
  const answers = (payload as { answers?: AssessmentAnswer[] } | null)?.answers;
  const hasFreshAnswers = Array.isArray(answers) && answers.length > 0;
  const knowledge = useMemo(
    () =>
      recommendations
        ? {
            summary: recommendations.summary,
            strengths: recommendations.strengths,
            gaps: recommendations.gaps,
            recommendedMajors: (recommendations.majors ?? []).map((m) => m.name),
          }
        : undefined,
    [recommendations]
  );

  const [report, setReport] = useState<AssessmentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Language handling follows the professional i18n pattern: the report is
  // GENERATED once (canonical), and other languages are produced by TRANSLATING
  // that canonical report — scores/archetype stay identical, only the prose is
  // localized — then cached per language so switching is instant.
  useEffect(() => {
    let active = true;
    const p = profile as Record<string, unknown>;
    const byLang = (p.assessmentReportByLang ?? {}) as Partial<
      Record<"en" | "ar", AssessmentReportData>
    >;
    const baseLang = (p.assessmentReportBaseLang ?? null) as "en" | "ar" | null;
    const legacy = p.assessmentReport as AssessmentReportData | undefined;
    const savedAnswers = p.assessment as AssessmentAnswer[] | undefined;
    const answersToUse = hasFreshAnswers
      ? (answers as AssessmentAnswer[])
      : Array.isArray(savedAnswers) && savedAnswers.length > 0
      ? savedAnswers
      : undefined;

    const generate = (ans: AssessmentAnswer[]) => {
      setLoading(true);
      setError(null);
      ai
        .assessmentReport(profile, ans, langCode, knowledge)
        .then((res) => {
          if (!active) return;
          setReport(res);
          setLoading(false);
          updateProfile({
            assessmentReportByLang: { ...byLang, [langCode]: res },
            assessmentReportBaseLang: langCode,
            assessmentReport: res,
          });
        })
        .catch(() => {
          if (!active) return;
          setError(t("assessment_error"));
          setLoading(false);
        });
    };

    const translate = (canonical: AssessmentReportData) => {
      setLoading(true);
      setError(null);
      ai
        .translate<AssessmentReportData>(canonical, langCode)
        .then((res) => {
          if (!active) return;
          setReport(res);
          setLoading(false);
          updateProfile({
            assessmentReportByLang: { ...byLang, [langCode]: res },
            assessmentReport: res,
          });
        })
        .catch(() => {
          if (!active) return;
          // Degrade gracefully: show the canonical rather than nothing.
          setReport(canonical);
          setLoading(false);
        });
    };

    // 1) Fresh answers from just finishing the assessment → generate a new
    //    canonical report in the current language.
    if (hasFreshAnswers && answersToUse) {
      generate(answersToUse);
      return () => {
        active = false;
      };
    }

    // 2) Already localized in this language → show instantly.
    if (byLang[langCode]) {
      setReport(byLang[langCode] ?? null);
      setLoading(false);
      setError(null);
      return;
    }

    // 3) We have a canonical report in another language → translate it.
    const canonical = baseLang ? byLang[baseLang] : legacy;
    if (canonical) {
      translate(canonical);
      return () => {
        active = false;
      };
    }

    // 4) No report yet but we have saved answers → generate one.
    if (answersToUse) {
      generate(answersToUse);
      return () => {
        active = false;
      };
    }

    // 5) Nothing to show.
    setError(t("assessment_error"));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode]);

  if (loading) return <AssessmentReportGenerating />;

  if (error || !report) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <TopBar title={t("career_dna")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-50">
            <AlertTriangle size={26} className="text-rose-500" />
          </div>
          <p className="text-[14px] text-slate-600">{error ?? t("assessment_error")}</p>
          <Button onClick={() => go("assessment")}>{t("start_assessment")}</Button>
        </div>
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(report.readinessScore ?? 0)));

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("career_dna")} action={<button onClick={() => go("assessment")} className="flex items-center gap-1 text-[12px] text-slate-400"><RefreshCw size={13} /> {t("retake")}</button>} />

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
        {/* Hero: archetype + readiness */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(150deg, var(--brand-navy), var(--brand-blue) 70%, var(--brand-purple))" }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center gap-2 text-[12px] text-blue-100">
            <Fingerprint size={16} /> {t("career_dna")}
          </div>
          <h1 className="mt-2 text-white" style={{ fontSize: 26 }}>{report.archetype?.title}</h1>
          <p className="mt-1 text-[13px] text-blue-100/90">{report.archetype?.tagline}</p>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15" style={{ fontWeight: 800, fontSize: 20 }}>
              {score}
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-white" style={{ fontWeight: 600 }}>{t("dna_readiness")}</p>
              <p className="text-[12px] text-blue-100/85">{t("dna_readiness_sub")}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <Card className="mt-4">
            <div className="flex items-center gap-2 text-[13px] text-[var(--brand-purple)]">
              <Brain size={16} /> {t("dna_summary")}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-700">{report.summary}</p>
          </Card>
        )}

        {/* Dimensions */}
        {report.dimensions?.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2">{t("dna_dimensions")}</h3>
            <div className="space-y-3">
              {report.dimensions.map((d) => (
                <Card key={d.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{d.name}</span>
                    <span className="text-[13px] text-[var(--brand-blue)]" style={{ fontWeight: 700 }}>{Math.round(d.score)}</span>
                  </div>
                  <ScoreBar value={d.score} />
                  <p className="mt-2 text-[13px] text-slate-600">{d.insight}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & blind spots */}
        {report.strengths?.length > 0 && (
          <Card className="mt-5">
            <div className="flex items-center gap-2 text-[13px] text-emerald-600">
              <Lightbulb size={16} /> {t("dna_strengths")}
            </div>
            <ul className="mt-2 space-y-2">
              {report.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-[14px] text-slate-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {s}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {report.blindSpots?.length > 0 && (
          <Card className="mt-4">
            <div className="flex items-center gap-2 text-[13px] text-amber-600">
              <AlertTriangle size={16} /> {t("dna_blindspots")}
            </div>
            <ul className="mt-2 space-y-2">
              {report.blindSpots.map((s) => (
                <li key={s} className="flex gap-2 text-[14px] text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> {s}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Work values */}
        {report.workValues?.length > 0 && (
          <Card className="mt-4">
            <div className="flex items-center gap-2 text-[13px] text-rose-500">
              <Heart size={16} /> {t("dna_values")}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.workValues.map((v) => (
                <span key={v} className="rounded-full bg-[#f3edff] px-3 py-1.5 text-[13px] text-[var(--brand-navy)]">{v}</span>
              ))}
            </div>
          </Card>
        )}

        {/* Directions */}
        {report.directions?.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2">{t("dna_directions")}</h3>
            <div className="space-y-3">
              {report.directions.map((d, idx) => (
                <Card key={d.title} className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[var(--brand-blue)]">
                    {idx === 0 ? <Compass size={18} /> : <span style={{ fontWeight: 700 }}>{idx + 1}</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{d.title}</p>
                    <p className="mt-0.5 text-[13px] text-slate-600">{d.why}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        {report.nextSteps?.length > 0 && (
          <Card className="mt-5">
            <div className="flex items-center gap-2 text-[13px] text-[var(--brand-blue)]">
              <Route size={16} /> {t("dna_next")}
            </div>
            <ol className="mt-2 space-y-2">
              {report.nextSteps.map((s, idx) => (
                <li key={s} className="flex gap-2.5 text-[14px] text-slate-700">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-[11px] text-white" style={{ fontWeight: 700 }}>{idx + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}


// Shared immersive "AI is working" screen — reused by profile generation and
// by the comparison generator so every generating state looks identical.
function GeneratingView({
  title,
  subtitle,
  steps,
  progress,
  hint,
}: {
  title: string;
  subtitle?: React.ReactNode;
  steps: { label: string; at: number }[];
  progress: number;
  hint: string;
}) {
  const activeIndex = steps.findIndex((s) => progress < s.at);
  return (
    <div
      className="relative flex h-full flex-col overflow-hidden px-8 py-14"
      style={{ background: "linear-gradient(160deg, var(--brand-navy), #1a2c66 60%, #241a66)" }}
    >
      {/* soft glow accents */}
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-[var(--brand-blue)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-[var(--brand-purple)]/25 blur-3xl" />

      {/* animated brain orb */}
      <div className="flex flex-col items-center">
        <div className="relative grid h-28 w-28 place-items-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-[var(--brand-purple)]/30" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-white/10" />
          <div
            className="grid h-20 w-20 place-items-center rounded-full shadow-lg"
            style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}
          >
            <Brain size={40} className="text-white" />
          </div>
        </div>
        <h1 className="mt-6 text-white" style={{ fontSize: 22 }}>
          {title}
        </h1>
        {subtitle}
      </div>

      {/* generation checklist */}
      <div className="mt-10 space-y-3">
        {steps.map((s, i) => {
          const complete = progress >= s.at;
          const active = !complete && i === activeIndex;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all"
              style={{
                borderColor: complete || active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                background: complete || active ? "rgba(255,255,255,0.08)" : "transparent",
                opacity: complete || active ? 1 : 0.5,
              }}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all"
                style={{
                  background: complete
                    ? "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                {complete ? (
                  <Check size={15} className="text-white" />
                ) : active ? (
                  <Loader2 size={15} className="animate-spin text-white" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                )}
              </span>
              <span
                className="text-[14px] transition-colors"
                style={{ color: complete || active ? "#fff" : "rgba(255,255,255,0.7)" }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* progress bar + hint */}
      <div className="mt-auto">
        <div className="mb-2 flex items-center justify-between text-[12px] text-blue-100/80">
          <span>{hint}</span>
          <span className="text-white">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/15" />
      </div>
    </div>
  );
}

export function Analyzing() {
  const { go, t, generateRecommendations, loadMarket, recStatus, marketStatus, user, profile } = useNav();
  const [p, setP] = useState(0);
  const [done, setDone] = useState(false);

  const displayName =
    user?.name ||
    (typeof (profile as Record<string, unknown>).fullName === "string"
      ? ((profile as Record<string, unknown>).fullName as string)
      : "");

  // The generation checklist. Each item completes as the progress bar passes it.
  const steps = [
    { key: "gen_step_profile", at: 14 },
    { key: "gen_step_match", at: 36 },
    { key: "gen_step_majors", at: 60 },
    { key: "gen_step_market", at: 82 },
    { key: "gen_step_roadmap", at: 100 },
  ];

  // Kick off the real AI generation once, on mount — everything in one shot.
  // Only generate what hasn't been generated yet, so we never re-run it.
  useEffect(() => {
    if (recStatus !== "ready") generateRecommendations();
    if (marketStatus !== "ready") loadMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the progress bar; hold near the end until the AI responds.
  useEffect(() => {
    const iv = setInterval(
      () => setP((v) => Math.min(v + 2, done ? 100 : 92)),
      70
    );
    return () => clearInterval(iv);
  }, [done]);

  // When the AI finishes (or fails), finish the bar then enter the dashboard.
  useEffect(() => {
    if (recStatus === "ready" || recStatus === "error") {
      setDone(true);
    }
  }, [recStatus]);

  // Only move on once the bar has visually reached 100%.
  useEffect(() => {
    if (done && p >= 100) {
      const to = setTimeout(() => go("home"), 700);
      return () => clearTimeout(to);
    }
  }, [done, p, go]);

  // The active step is the first one the bar hasn't passed yet.
  return (
    <GeneratingView
      title={done ? t("gen_ready") : t("analyzing_title")}
      subtitle={
        displayName ? (
          <p className="mt-1.5 text-[13px] text-blue-100/80">
            {t("gen_for")} <span className="text-white">{displayName}</span>
          </p>
        ) : undefined
      }
      steps={steps.map((s) => ({ label: t(s.key), at: s.at }))}
      progress={p}
      hint={t("gen_wait_hint")}
    />
  );
}

export function Results() {
  const { go, t, td, recommendations, recStatus, recError, generateRecommendations } = useNav();
  const majors = recommendations?.majors ?? [];

  // If the user lands here without generated recommendations, generate them.
  useEffect(() => {
    if (recStatus === "idle") generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recStatus]);

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("your_results")} onBack={() => go("home")} action={<Sparkles size={18} className="text-[var(--brand-purple)]" />} />
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-1">
        {recStatus === "loading" && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="grid h-14 w-14 animate-pulse place-items-center rounded-full" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
              <Sparkles size={22} className="text-white" />
            </div>
            <p className="text-[14px] text-slate-500">{t("analyzing_sub")}</p>
          </div>
        )}

        {recStatus === "error" && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-rose-500">{recError ?? t("results_error")}</p>
            <Button onClick={() => generateRecommendations()}>{t("retry")}</Button>
          </div>
        )}

        {recStatus === "ready" && recommendations && (
          <>
            <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--brand-blue), var(--brand-purple))" }}>
              <div className="flex items-center gap-2 text-[13px] text-blue-100"><Target size={15} /> {t("profile_summary")}</div>
              <p className="mt-2 text-[14px] text-white/95">{recommendations.summary}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card>
                <p className="text-[13px] text-emerald-600" style={{ fontWeight: 600 }}>{t("strengths")}</p>
                <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
                  {recommendations.strengths.map((s) => <li key={s}>• {s}</li>)}
                </ul>
              </Card>
              <Card>
                <p className="text-[13px] text-amber-600" style={{ fontWeight: 600 }}>{t("skill_gaps")}</p>
                <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
                  {recommendations.gaps.map((g) => <li key={g}>• {g}</li>)}
                </ul>
              </Card>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <h3>{t("top5")}</h3>
              <button onClick={() => go("compare")} className="text-[12px] text-[var(--brand-blue)]">{t("compare")}</button>
            </div>
            <div className="mt-3 space-y-3">
              {majors.map((m) => <MajorCard key={m.id} m={m} />)}
            </div>

            {recommendations.roadmap?.length ? (
              <div className="mt-6">
                <h3>{t("your_roadmap")}</h3>
                <p className="mb-3 text-[12px] text-slate-400">{t("roadmap_sub")}</p>
                <div className="space-y-3">
                  {recommendations.roadmap.map((ph, i) => (
                    <Card key={`${i}-${ph.phase}`}>
                      <div className="flex items-start gap-3">
                        <div
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] text-white"
                          style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))", fontWeight: 700 }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(ph.phase)}</span>
                            <span className="text-[11px] text-[var(--brand-blue)]">{td(ph.timeframe)}</span>
                          </div>
                          {ph.focus && <p className="mt-0.5 text-[12px] text-slate-500">{td(ph.focus)}</p>}
                          <ul className="mt-2 space-y-1 text-[13px] text-slate-600">
                            {ph.actions.map((a) => (
                              <li key={a} className="flex gap-2"><Route size={13} className="mt-0.5 shrink-0 text-[var(--brand-purple)]" />{td(a)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}

            {recommendations.topUniversities?.length ? (
              <div className="mt-6">
                <h3>{t("top_unis_title")}</h3>
                <p className="mb-3 text-[12px] text-slate-400">{t("top_unis_sub")}</p>
                <div className="space-y-3">
                  {[...recommendations.topUniversities]
                    .sort((a, b) => a.rank - b.rank)
                    .map((u) => {
                      const isTop = u.rank === 1;
                      return (
                        <Card key={`${u.rank}-${u.name}`}>
                          <div className="flex items-start gap-3">
                            <div
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] text-white"
                              style={{
                                background: isTop
                                  ? "linear-gradient(135deg,#f59e0b,#f97316)"
                                  : "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))",
                                fontWeight: 700,
                              }}
                            >
                              {u.rank}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{u.name}</span>
                                {isTop && <Badge className="bg-amber-100 text-amber-700">{t("top_pick")}</Badge>}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                                {u.city && (
                                  <span className="flex items-center gap-1"><MapPin size={12} className="text-[var(--brand-blue)]" />{td(u.city)}</span>
                                )}
                                {u.type && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                    {/Public/i.test(u.type) ? t("uni_public") : /Private/i.test(u.type) ? t("uni_private") : td(u.type)}
                                  </span>
                                )}
                              </div>
                              {u.strongFields?.length ? (
                                <p className="mt-1.5 text-[12px] text-slate-500">
                                  <span className="text-[var(--brand-purple)]">{t("uni_strong_in")}:</span> {u.strongFields.map((f) => td(f)).join("، ")}
                                </p>
                              ) : null}
                              {u.note && <p className="mt-1 text-[12px] text-slate-500">{td(u.note)}</p>}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function MatchRing({ value }: { value: number }) {
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r="24" fill="none" stroke="#eef2ff" strokeWidth="5" />
        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--brand-blue)" strokeWidth="5"
          strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - value / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[12px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{value}%</span>
    </div>
  );
}

function MajorCard({ m }: { m: Major }) {
  const { go, t, td, toggleSaveMajor, isMajorSaved } = useNav();
  const saved = isMajorSaved(m.id);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <MatchRing value={m.match} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px]">{td(m.name)}</h3>
            <Badge variant="secondary" className="bg-[#eef2ff] text-[var(--brand-blue)]">{td(m.category)}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">{td(m.why)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {m.skills.slice(0, 3).map((s) => (
          <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">{td(s)}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
        <Stat label={t("local")} value={`${m.localDemand}%`} />
        <Stat label={t("global")} value={`${m.globalDemand}%`} />
        <Stat label={t("salary")} value={td(m.salary)} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={() => go("major", m)}>{t("view_details")}</Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => toggleSaveMajor(m)}
          aria-label={t("add_shortlist")}
          className={saved ? "border-[var(--brand-blue)] text-[var(--brand-blue)]" : ""}
        >
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        </Button>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <p className="text-slate-400">{label}</p>
      <p className="text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function normalizeUnis(list: unknown): { rank: number; name: string; note: string }[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((u, i) => {
      if (typeof u === "string") return { rank: i + 1, name: u, note: "" };
      const o = (u ?? {}) as { rank?: number; name?: string; note?: string };
      return { rank: typeof o.rank === "number" ? o.rank : i + 1, name: o.name ?? "", note: o.note ?? "" };
    })
    .filter((u) => u.name)
    .sort((a, b) => a.rank - b.rank);
}

export function MajorDetails() {
  const { payload, go, t, td, recommendations, toggleSaveMajor, isMajorSaved } = useNav();
  const majors = recommendations?.majors ?? [];
  const fromPayload = payload as Major | null;
  const m = fromPayload && typeof fromPayload.id === "string" && fromPayload.name ? fromPayload : majors[0];
  if (!m) return null;
  const saved = isMajorSaved(m.id);
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar
        title={td(m.name)}
        action={
          <button onClick={() => toggleSaveMajor(m)} aria-label={t("add_shortlist")}>
            <Bookmark size={18} className="text-[var(--brand-blue)]" fill={saved ? "currentColor" : "none"} />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
          <MatchRing value={m.match} />
          <div>
            <h2>{td(m.name)}</h2>
            <p className="text-[13px] text-slate-500">{td(m.duration)} · {td(m.difficulty)}</p>
          </div>
        </div>

        <Section title={t("overview")}><p className="text-[14px] text-slate-600">{td(m.overview)}</p></Section>
        <Section title={t("best_fit")}><p className="text-[14px] text-slate-600">{td(m.personality)}</p></Section>
        <Section title={t("subjects_req")}><Tags items={m.subjects} /></Section>
        <Section title={t("skills_needed")}><Tags items={m.skills} /></Section>
        <Section title={t("possible_careers")}><Tags items={m.careers} /></Section>
        <Section title={t("uni_ranking")}>
          <p className="mb-2.5 text-[12px] text-slate-400">{t("uni_ranking_sub")}</p>
          <div className="space-y-2">
            {normalizeUnis(m.universities).map((u) => (
              <div key={`${u.rank}-${u.name}`} className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-[0_2px_10px_rgba(11,21,51,0.05)]">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] text-white"
                  style={{
                    background:
                      u.rank === 1
                        ? "linear-gradient(135deg,#f59e0b,#f97316)"
                        : "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))",
                    fontWeight: 700,
                  }}
                >
                  {u.rank}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <GraduationCap size={14} className="shrink-0 text-[var(--brand-blue)]" />
                    <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(u.name)}</span>
                    {u.rank === 1 && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">{t("top_pick")}</Badge>
                    )}
                  </div>
                  {u.note && <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{td(u.note)}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title={t("job_outlook")}>
          <div className="flex items-center gap-2 text-[14px] text-emerald-600"><TrendingUp size={16} /> {t("strong_demand")} — {m.globalDemand}% {t("global_demand_txt")}</div>
        </Section>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card>
            <p className="text-[13px] text-emerald-600" style={{ fontWeight: 600 }}>{t("pros")}</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-slate-600">{m.pros.map((p) => <li key={p}>+ {td(p)}</li>)}</ul>
          </Card>
          <Card>
            <p className="text-[13px] text-rose-500" style={{ fontWeight: 600 }}>{t("cons")}</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-slate-600">{m.cons.map((c) => <li key={c}>− {td(c)}</li>)}</ul>
          </Card>
        </div>
        <Section title={t("courses_sug")}><Tags items={m.courses} /></Section>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-black/5 bg-white p-4">
        <Button
          className="flex-1"
          variant={saved ? "outline" : "default"}
          onClick={() => toggleSaveMajor(m)}
        >
          <Bookmark size={16} className="mr-1" fill={saved ? "currentColor" : "none"} />
          {saved ? t("in_shortlist") : t("add_shortlist")}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => go("compare", { focusId: m.id })}>{t("compare")}</Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-5"><h3 className="mb-2 text-[15px]">{title}</h3>{children}</div>;
}
function Tags({ items }: { items: string[] }) {
  const { td } = useNav();
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => <span key={it} className="rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] text-[var(--brand-blue)]">{td(it)}</span>)}
    </div>
  );
}

// Comparison generating screen — same immersive look as profile generation.
function CompareGenerating() {
  const { t } = useNav();
  const [p, setP] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setP((v) => Math.min(v + 2, 96)), 70);
    return () => clearInterval(iv);
  }, []);
  const steps = [
    { label: t("cmp_step_read"), at: 22 },
    { label: t("cmp_step_criteria"), at: 48 },
    { label: t("cmp_step_score"), at: 74 },
    { label: t("cmp_step_verdict"), at: 100 },
  ];
  return (
    <GeneratingView
      title={t("compare_loading")}
      subtitle={<p className="mt-1.5 text-[13px] text-blue-100/80">{t("compare_loading_sub")}</p>}
      steps={steps}
      progress={p}
      hint={t("gen_wait_hint")}
    />
  );
}

export function Compare() {
  const { payload, t, td, profile, langCode, recommendations, savedMajors } = useNav();

  // Candidate pool = the student's saved shortlist + their AI recommendations
  // (deduped). The student chooses which of these to put head-to-head.
  const candidates = useMemo(() => {
    const map = new Map<string, Major>();
    [...savedMajors, ...(recommendations?.majors ?? [])].forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values());
  }, [savedMajors, recommendations]);

  const MIN = 2;

  // Optional "focus" major: when Compare is opened from a specific major page,
  // that major is the anchor — always included and the analysis centers on it.
  const focusId = (payload as { focusId?: string } | null)?.focusId;
  const anchor = candidates.find((c) => c.id === focusId) ?? null;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [data, setData] = useState<Comparison | null>(null);
  const [comparedKey, setComparedKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Keep a valid default selection as candidates load. In focus mode the anchor
  // is pinned and compared against every other candidate; otherwise default to 3.
  useEffect(() => {
    const a = candidates.find((c) => c.id === focusId) ?? null;
    setSelectedIds((prev) => {
      const valid = prev.filter((id) => candidates.some((c) => c.id === id));
      if (valid.length >= MIN) {
        if (a && !valid.includes(a.id)) return [a.id, ...valid];
        return valid;
      }
      if (a) return [a.id, ...candidates.filter((c) => c.id !== a.id).map((c) => c.id)];
      return candidates.slice(0, 3).map((m) => m.id);
    });
  }, [candidates, focusId]);

  // Anchor always first so it reads as the main subject of the comparison.
  const selectedMajors = [
    ...(anchor && selectedIds.includes(anchor.id) ? [anchor] : []),
    ...candidates.filter((c) => selectedIds.includes(c.id) && c.id !== anchor?.id),
  ];
  const names = selectedMajors.map((m) => m.name);
  const focusName = anchor?.name;
  const selectionKey = names.join("|");
  const canCompare = names.length >= MIN;
  const dirty = comparedKey !== selectionKey;

  const run = () => {
    if (!canCompare) return;
    const compareNames = names;
    setLoading(true);
    setError(false);
    ai
      .compare(profile, compareNames, langCode, focusName)
      .then((c) => {
        setData(c);
        setComparedKey(compareNames.join("|"));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  // Auto-run the first comparison, and re-run on language change.
  useEffect(() => {
    if (canCompare) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode]);
  useEffect(() => {
    if (!data && !loading && canCompare) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const toggle = (id: string) => {
    if (anchor && id === anchor.id) return; // the focus major stays pinned
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= MIN) return prev; // keep the minimum of two
        return prev.filter((x) => x !== id);
      }
      return [...prev, id]; // no upper limit — compare against as many as you like
    });
  };

  const headers = data?.majors ?? names;
  const best = data ? headers.findIndex((n) => n === data.verdict.bestFor) : -1;

  // While the AI builds the comparison, show the shared generating screen.
  if (loading) return <CompareGenerating />;

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("compare_title")} />
      <div className="flex-1 overflow-auto px-4 pb-10 pt-2">
        {candidates.length < 2 ? (
          <div className="mt-20 flex flex-col items-center px-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef2ff]"><Sparkles size={24} className="text-[var(--brand-blue)]" /></div>
            <p className="mt-4 text-[15px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{t("compare_need_two")}</p>
            <p className="mt-1 text-[13px] text-slate-500">{t("compare_need_two_sub")}</p>
          </div>
        ) : (
          <>
            {/* Major picker — the student decides what goes head-to-head */}
            <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <p className="text-[13px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{anchor ? t("compare_focus_title") : t("compare_pick_title")}</p>
              <p className="mt-0.5 text-[12px] text-slate-500">{anchor ? `${t("compare_focus_hint")} · ${td(anchor.name)}` : t("compare_pick_hint")}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {candidates.map((m) => {
                  const on = selectedIds.includes(m.id);
                  const isAnchor = anchor?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      disabled={isAnchor}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition ${isAnchor ? "border-transparent text-white" : on ? "border-[var(--brand-blue)] bg-[#eef2ff] text-[var(--brand-blue)]" : "border-slate-200 bg-white text-slate-600"}`}
                      style={isAnchor ? { background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))", fontWeight: 600 } : on ? { fontWeight: 600 } : undefined}
                    >
                      {isAnchor ? <Target size={13} /> : on && <Check size={13} />}
                      {td(m.name)}
                    </button>
                  );
                })}
              </div>
              <Button className="mt-3 w-full" disabled={!canCompare || (!dirty && !!data) || loading} onClick={run}>
                {loading ? t("compare_loading") : dirty || !data ? `${t("compare_run")} (${names.length})` : t("compare_done")}
              </Button>
            </div>

            {error || !data ? (
              <div className="mt-16 flex flex-col items-center px-6 text-center">
                <p className="text-[14px] text-slate-600">{t("compare_error")}</p>
                <Button className="mt-4" onClick={run}>{t("retry")}</Button>
              </div>
            ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#eef2ff] px-3 py-2">
              <Sparkles size={14} className="text-[var(--brand-blue)]" />
              <span className="text-[12px] text-[var(--brand-blue)]" style={{ fontWeight: 600 }}>{t("compare_ai_badge")}</span>
            </div>

            {/* Contenders */}
            <div className="mb-3 flex flex-wrap gap-2">
              {headers.map((n, i) => {
                const isFocus = focusName && n === focusName;
                return (
                  <div key={n} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]" style={i === best ? { background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))", color: "#fff", fontWeight: 600 } : isFocus ? { background: "#fff", color: "var(--brand-blue)", fontWeight: 600, boxShadow: "inset 0 0 0 1.5px var(--brand-blue)" } : { background: "#f1f5f9", color: "#334155" }}>
                    {i === best ? <Award size={13} /> : isFocus ? <Target size={13} /> : null}
                    <span>{n}</span>
                  </div>
                );
              })}
            </div>

            {/* Criterion cards */}
            <div className="space-y-2.5">
              {data.rows.map((row) => (
                <div key={row.criterion} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <p className="mb-2 text-[12px] text-slate-400" style={{ fontWeight: 600 }}>{row.criterion}</p>
                  <div className="space-y-1.5">
                    {headers.map((n, i) => {
                      const win = row.winner === i;
                      return (
                        <div key={n} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${win ? "bg-[#eef2ff]" : "bg-slate-50"}`}>
                          <span className={`text-[13px] ${win ? "text-[var(--brand-navy)]" : "text-slate-500"}`} style={win ? { fontWeight: 600 } : undefined}>{n}</span>
                          <span className={`flex shrink-0 items-center gap-1 text-[13px] ${win ? "text-[var(--brand-blue)]" : "text-slate-700"}`} style={win ? { fontWeight: 700 } : undefined}>
                            {row.values[i] ?? "—"}
                            {win && <Check size={14} className="text-[var(--brand-blue)]" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--brand-blue)]/20 bg-gradient-to-br from-[#eef2ff] to-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
                  <Award size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">{t("compare_verdict")}</p>
                  <p className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{data.verdict.bestFor}</p>
                </div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">{data.verdict.reason}</p>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">{t("compare_footnote")}</p>
          </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---- Printable PDF document -------------------------------------------------
// Escapes user/AI text before it is injected into the print document, so the
// generated HTML can never be broken (or abused) by the model's output.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Persistent cache for localized profile-snapshot values, keyed per user, so a
// value the student typed in one language is translated at most once — never
// re-requested on refresh.
const SNAP_LOC_KEY = "tjq.report.snaploc";
function loadSnapLoc(uid: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`${SNAP_LOC_KEY}:${uid}`);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
function saveSnapLoc(uid: string, map: Record<string, string>) {
  try {
    localStorage.setItem(`${SNAP_LOC_KEY}:${uid}`, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

type ReportModel = {
  rtl: boolean;
  brandName: string;
  docTitle: string;
  preparedForLabel: string;
  studentName: string;
  dateStr: string;
  snapshotTitle: string;
  snapshot: { label: string; value: string }[];
  readiness?: { label: string; score: number; archetype?: string; tagline?: string };
  summaryTitle: string;
  summary: string;
  strengthsTitle: string;
  strengths: string[];
  growthTitle: string;
  growth: string[];
  majorsTitle: string;
  majors: { name: string; match: number; meta: string; why: string; skills: string[]; careers: string[] }[];
  roadmapTitle: string;
  roadmap: { phase: string; timeframe: string; focus: string; actions: string[] }[];
  unisTitle: string;
  unis: { rank: number; name: string; city: string; note: string }[];
  nextStepsTitle: string;
  nextSteps: string[];
  footer: string;
  labels: { keySkills: string; careers: string };
};

function buildReportHtml(m: ReportModel): string {
  const e = escapeHtml;
  const li = (arr: string[]) => arr.filter(Boolean).map((x) => `<li>${e(x)}</li>`).join("");
  const chips = (arr: string[]) =>
    arr.filter(Boolean).map((x) => `<span class="chip">${e(x)}</span>`).join("");

  const snapshot = m.snapshot
    .filter((s) => s.value)
    .map((s) => `<div class="snap"><span class="snap-l">${e(s.label)}</span><span class="snap-v">${e(s.value)}</span></div>`)
    .join("");

  const readiness = m.readiness
    ? `<div class="ready">
         <div class="ring"><span>${m.readiness.score}</span><small>/100</small></div>
         <div class="ready-txt">
           ${m.readiness.archetype ? `<div class="ready-arch">${e(m.readiness.archetype)}</div>` : ""}
           ${m.readiness.tagline ? `<div class="ready-tag">${e(m.readiness.tagline)}</div>` : ""}
         </div>
       </div>`
    : "";

  const majors = m.majors
    .map(
      (mj) => `<div class="major">
        <div class="major-head"><span class="major-name">${e(mj.name)}</span><span class="major-match">${mj.match}%</span></div>
        ${mj.meta ? `<div class="major-meta">${e(mj.meta)}</div>` : ""}
        ${mj.why ? `<p class="major-why">${e(mj.why)}</p>` : ""}
        ${mj.skills.length ? `<div class="lbl">${e(m.labels.keySkills)}</div><div class="chips">${chips(mj.skills)}</div>` : ""}
        ${mj.careers.length ? `<div class="lbl">${e(m.labels.careers)}</div><div class="chips">${chips(mj.careers)}</div>` : ""}
      </div>`
    )
    .join("");

  const roadmap = m.roadmap
    .map(
      (ph, i) => `<div class="phase">
        <div class="phase-num">${i + 1}</div>
        <div class="phase-body">
          <div class="phase-title">${e(ph.phase)} ${ph.timeframe ? `<span class="phase-time">· ${e(ph.timeframe)}</span>` : ""}</div>
          ${ph.focus ? `<div class="phase-focus">${e(ph.focus)}</div>` : ""}
          ${ph.actions.length ? `<ul>${li(ph.actions)}</ul>` : ""}
        </div>
      </div>`
    )
    .join("");

  const unis = m.unis
    .map(
      (u) => `<div class="uni">
        <span class="uni-rank">${u.rank}</span>
        <div><div class="uni-name">${e(u.name)}${u.city ? ` <span class="uni-city">· ${e(u.city)}</span>` : ""}</div>${u.note ? `<div class="uni-note">${e(u.note)}</div>` : ""}</div>
      </div>`
    )
    .join("");

  const align = m.rtl ? "right" : "left";
  return `<!doctype html>
<html dir="${m.rtl ? "rtl" : "ltr"}" lang="${m.rtl ? "ar" : "en"}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${e(m.docTitle)} — ${e(m.studentName)}</title>
<style>
  :root { --navy:#0b1533; --blue:#3557ff; --purple:#7c4dff; --ink:#1f2740; --muted:#6b7280; --line:#e7ebf5; }
  * { box-sizing: border-box; }
  html,body { margin:0; padding:0; }
  body { font-family: "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, "Noto Naskh Arabic", sans-serif; color: var(--ink); text-align:${align}; line-height:1.55; font-size:13px; background:#fff; }
  .page { max-width: 760px; margin: 0 auto; padding: 28px 34px 40px; }
  .cover { background: linear-gradient(135deg, var(--navy), #1a2c66 60%, #241a66); color:#fff; border-radius: 18px; padding: 26px 28px; }
  .brand { font-weight:700; letter-spacing:.5px; opacity:.85; font-size:12px; text-transform:uppercase; }
  .cover h1 { margin: 10px 0 6px; font-size: 26px; line-height:1.2; }
  .cover .prepared { font-size: 14px; opacity:.95; }
  .cover .date { margin-top:2px; font-size:12px; opacity:.7; }
  section { margin-top: 22px; page-break-inside: avoid; }
  h2 { font-size: 15px; color: var(--navy); margin: 0 0 10px; padding-bottom:6px; border-bottom: 2px solid var(--line); }
  h3 { font-size: 13px; color: var(--navy); margin: 0 0 6px; }
  p { margin: 0 0 8px; }
  ul { margin: 4px 0 0; padding-inline-start: 18px; }
  li { margin: 2px 0; }
  .snapshot { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .snap { display:flex; justify-content: space-between; gap:10px; border-bottom:1px dashed var(--line); padding:5px 0; }
  .snap-l { color: var(--muted); } .snap-v { font-weight:600; }
  .ready { display:flex; align-items:center; gap:16px; background:#f5f7ff; border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
  .ring { width:72px; height:72px; flex:0 0 auto; border-radius:50%; display:grid; place-items:center; color:#fff; background: linear-gradient(135deg,var(--blue),var(--purple)); }
  .ring span { font-size:24px; font-weight:800; line-height:1; }
  .ring small { font-size:10px; opacity:.85; }
  .ready-arch { font-weight:700; font-size:15px; color:var(--navy); }
  .ready-tag { color: var(--muted); font-size:12.5px; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  ul.ok li::marker { color:#16a34a; } ul.warn li::marker { color:#d97706; } ul.steps li::marker { color: var(--blue); }
  .major { border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:10px; }
  .major-head { display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .major-name { font-weight:700; font-size:14px; color:var(--navy); }
  .major-match { font-weight:800; color: var(--blue); }
  .major-meta { color: var(--muted); font-size:11.5px; margin-top:2px; }
  .major-why { margin-top:6px; }
  .lbl { font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; color:var(--muted); margin-top:8px; }
  .chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .chip { background:#eef2ff; color:#3a4a8a; border-radius:999px; padding:3px 9px; font-size:11px; }
  .roadmap .phase { display:flex; gap:12px; margin-bottom:12px; }
  .phase-num { flex:0 0 auto; width:26px; height:26px; border-radius:50%; background: linear-gradient(135deg,var(--blue),var(--purple)); color:#fff; display:grid; place-items:center; font-weight:700; font-size:13px; }
  .phase-title { font-weight:700; color:var(--navy); } .phase-time { color:var(--muted); font-weight:500; }
  .phase-focus { color: var(--muted); font-size:12px; margin-top:1px; }
  .uni { display:flex; gap:12px; align-items:flex-start; padding:9px 0; border-bottom:1px dashed var(--line); }
  .uni-rank { flex:0 0 auto; width:24px; height:24px; border-radius:50%; background:var(--navy); color:#fff; display:grid; place-items:center; font-size:12px; font-weight:700; }
  .uni-name { font-weight:600; color:var(--navy); } .uni-city { color:var(--muted); font-weight:400; } .uni-note { color:var(--muted); font-size:12px; }
  footer { margin-top:28px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:11px; text-align:center; }
  @page { size: A4; margin: 14mm; }
  @media print { .page { padding: 0; max-width:none; } .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="page">
    <header class="cover">
      <div class="brand">${e(m.brandName)}</div>
      <h1>${e(m.docTitle)}</h1>
      <div class="prepared">${e(m.preparedForLabel)} <strong>${e(m.studentName)}</strong></div>
      <div class="date">${e(m.dateStr)}</div>
    </header>
    ${snapshot ? `<section><h2>${e(m.snapshotTitle)}</h2><div class="snapshot">${snapshot}</div></section>` : ""}
    ${m.readiness ? `<section><h2>${e(m.readiness.label)}</h2>${readiness}</section>` : ""}
    ${m.summary ? `<section><h2>${e(m.summaryTitle)}</h2><p>${e(m.summary)}</p></section>` : ""}
    ${m.strengths.length || m.growth.length
      ? `<section class="two-col">
          ${m.strengths.length ? `<div><h3>${e(m.strengthsTitle)}</h3><ul class="ok">${li(m.strengths)}</ul></div>` : ""}
          ${m.growth.length ? `<div><h3>${e(m.growthTitle)}</h3><ul class="warn">${li(m.growth)}</ul></div>` : ""}
        </section>`
      : ""}
    ${majors ? `<section><h2>${e(m.majorsTitle)}</h2>${majors}</section>` : ""}
    ${roadmap ? `<section><h2>${e(m.roadmapTitle)}</h2><div class="roadmap">${roadmap}</div></section>` : ""}
    ${unis ? `<section><h2>${e(m.unisTitle)}</h2><div class="unis">${unis}</div></section>` : ""}
    ${m.nextSteps.length ? `<section><h2>${e(m.nextStepsTitle)}</h2><ul class="steps">${li(m.nextSteps)}</ul></section>` : ""}
    <footer>${e(m.footer)}</footer>
  </div>
  <script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},350);});</script>
</body>
</html>`;
}

export function Report() {
  const { t, td, rtl, langCode, recommendations, recStatus, recError, generateRecommendations, profile, user } = useNav();
  const uid = user?.id ?? "guest";
  const [exporting, setExporting] = useState(false);
  const [locValues, setLocValues] = useState<Record<string, string>>(() => loadSnapLoc(uid));

  const p = profile as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string).trim() : "");
  const dna = (() => {
    const byLang = (p.assessmentReportByLang ?? {}) as Partial<Record<"en" | "ar", AssessmentReportData>>;
    return byLang[langCode] ?? (p.assessmentReport as AssessmentReportData | undefined);
  })();

  const studentName = user?.name || str("fullName") || "—";
  const dateStr = new Date().toLocaleDateString(langCode === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Reach the report from anywhere: if nothing has been generated yet, start it.
  useEffect(() => {
    if (recStatus === "idle" && !recommendations) generateRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const majors = recommendations?.majors ?? [];
  const roadmap = recommendations?.roadmap ?? [];
  const unis = [...(recommendations?.topUniversities ?? [])].sort((a, b) => a.rank - b.rank);
  const strengths = recommendations?.strengths ?? [];
  const gaps = recommendations?.gaps ?? [];
  const nextSteps = dna?.nextSteps?.length ? dna.nextSteps : gaps;

  const snapshotFields: { label: string; value: string }[] = [
    { label: td("Age"), value: str("age") },
    { label: td("Education level"), value: td(str("educationLevel")) },
    { label: td("Current major (if any)"), value: td(str("currentMajor")) },
    { label: td("School / University"), value: td(str("school")) },
    { label: td("Country"), value: td(str("country")) },
    { label: td("City"), value: td(str("city")) },
  ].filter((f) => f.value);

  // Localize the values the student typed to the display language. Info entered
  // in Arabic must still read correctly in an English report (and vice-versa).
  // td() handles known terms cheaply; anything still in the "wrong" script is
  // translated by the AI once and cached per language.
  const snapSig = snapshotFields.map((f) => f.value).join("|");
  useEffect(() => {
    const isForeign = (v: string) => {
      const ar = /[\u0600-\u06FF]/.test(v);
      return langCode === "en" ? ar : /[A-Za-z]/.test(v) && !ar;
    };
    const pending = Array.from(
      new Set(
        snapshotFields
          .map((f) => f.value)
          .filter((v) => v && !/^\d+$/.test(v) && isForeign(v) && locValues[`${langCode}:${v}`] === undefined)
      )
    );
    if (pending.length === 0) return;
    let active = true;
    (async () => {
      try {
        const out = await ai.translate<string[]>(pending, langCode);
        if (!active) return;
        setLocValues((prev) => {
          const next = { ...prev };
          pending.forEach((v, i) => {
            next[`${langCode}:${v}`] = out[i] ?? v;
          });
          saveSnapLoc(uid, next);
          return next;
        });
      } catch {
        /* keep the raw value on failure */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode, snapSig]);

  const localize = (v: string) => locValues[`${langCode}:${v}`] ?? v;

  const majorMeta = (m: Major) =>
    [td(m.difficulty), m.duration ? td(m.duration) : "", m.salary ? `${td(m.salary)} salary` : ""]
      .filter(Boolean)
      .join(" · ");

  const handleExport = () => {
    if (!recommendations || exporting) return;
    setExporting(true);
    try {
      const model: ReportModel = {
        rtl,
        brandName: "TawjihIQ",
        docTitle: t("rpt_doc_title"),
        preparedForLabel: t("rpt_prepared_for"),
        studentName,
        dateStr,
        snapshotTitle: t("rpt_snapshot"),
        snapshot: snapshotFields.map((f) => ({ label: f.label, value: localize(f.value) })),
        readiness:
          dna && typeof dna.readinessScore === "number"
            ? {
                label: t("dna_readiness"),
                score: Math.max(0, Math.min(100, Math.round(dna.readinessScore))),
                archetype: dna.archetype?.title,
                tagline: dna.archetype?.tagline,
              }
            : undefined,
        summaryTitle: t("rpt_exec_summary"),
        summary: recommendations.summary ?? "",
        strengthsTitle: t("strengths"),
        strengths,
        growthTitle: t("rpt_growth"),
        growth: gaps,
        majorsTitle: t("top_recommended"),
        majors: majors.slice(0, 5).map((m) => ({
          name: td(m.name),
          match: m.match,
          meta: majorMeta(m),
          why: td(m.why),
          skills: (m.skills ?? []).map((s) => td(s)),
          careers: (m.careers ?? []).map((c) => td(c)),
        })),
        roadmapTitle: t("roadmap"),
        roadmap: roadmap.map((ph) => ({
          phase: td(ph.phase),
          timeframe: td(ph.timeframe),
          focus: td(ph.focus),
          actions: (ph.actions ?? []).map((a) => td(a)),
        })),
        unisTitle: t("rpt_universities"),
        unis: unis.map((u) => ({ rank: u.rank, name: td(u.name), city: td(u.city), note: td(u.note) })),
        nextStepsTitle: t("rpt_next_steps"),
        nextSteps: nextSteps.map((s) => td(s)),
        footer: t("rpt_footer"),
        labels: { keySkills: t("rpt_key_skills"), careers: t("rpt_careers") },
      };
      const win = window.open("", "_blank", "width=820,height=1000");
      if (!win) {
        setExporting(false);
        return;
      }
      win.document.open();
      win.document.write(buildReportHtml(model));
      win.document.close();
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  // ---- Empty / loading / error states -------------------------------------
  if (recStatus === "loading" || (recStatus === "idle" && !recommendations)) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <TopBar title={t("career_roadmap")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
            <Loader2 size={26} className="animate-spin text-white" />
          </div>
          <p className="text-[15px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{t("rpt_generating")}</p>
          <p className="text-[13px] text-slate-500">{t("rpt_generate_desc")}</p>
        </div>
      </div>
    );
  }

  if (recStatus === "error" || !recommendations) {
    return (
      <div className="flex h-full flex-col">
        <StatusBar />
        <TopBar title={t("career_roadmap")} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100">
            <Route size={26} className="text-[var(--brand-blue)]" />
          </div>
          <p className="text-[16px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{t("rpt_generate_title")}</p>
          <p className="text-[13px] text-slate-500">{recError ?? t("rpt_generate_desc")}</p>
          <Button onClick={() => generateRecommendations()}>
            <Sparkles size={16} className="mr-1" /> {t("rpt_generate_btn")}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Full report --------------------------------------------------------
  const readinessScore =
    dna && typeof dna.readinessScore === "number"
      ? Math.max(0, Math.min(100, Math.round(dna.readinessScore)))
      : null;

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar title={t("career_roadmap")} />
      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-1">
        {/* Cover */}
        <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--brand-navy), #1a2c66 60%, #241a66)" }}>
          <div className="flex items-center justify-between">
            <Logo size={22} light />
            <span className="text-[11px] text-blue-100/80">{dateStr}</span>
          </div>
          <h2 className="mt-4 text-white" style={{ fontSize: 20 }}>{t("rpt_doc_title")}</h2>
          <p className="mt-1 text-[13px] text-blue-100/90">{t("rpt_prepared_for")} <span className="text-white" style={{ fontWeight: 700 }}>{studentName}</span></p>
        </div>

        {/* Profile snapshot */}
        {snapshotFields.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-[14px]">{t("rpt_snapshot")}</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {snapshotFields.map((f) => (
                <div key={f.label} className="flex justify-between gap-2 border-b border-dashed border-slate-100 py-1">
                  <span className="text-[12px] text-slate-500">{f.label}</span>
                  <span className="text-[12px] text-slate-700" style={{ fontWeight: 600 }}>{localize(f.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career readiness */}
        {readinessScore !== null && (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-white" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}>
              <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{readinessScore}</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">{t("dna_readiness")}</p>
              {dna?.archetype?.title && <p className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{dna.archetype.title}</p>}
              {dna?.archetype?.tagline && <p className="text-[12px] text-slate-500">{dna.archetype.tagline}</p>}
            </div>
          </div>
        )}

        {/* Executive summary */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-[14px]">{t("rpt_exec_summary")}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{recommendations.summary}</p>
        </div>

        {/* Strengths & growth */}
        {(strengths.length > 0 || gaps.length > 0) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {strengths.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[13px] text-emerald-600" style={{ fontWeight: 600 }}>{t("strengths")}</p>
                <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
                  {strengths.map((s) => <li key={s} className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />{s}</li>)}
                </ul>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[13px] text-amber-600" style={{ fontWeight: 600 }}>{t("rpt_growth")}</p>
                <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
                  {gaps.map((g) => <li key={g} className="flex gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />{g}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Top majors */}
        {majors.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[15px]">{t("top_recommended")}</h3>
            <div className="mt-2 space-y-3">
              {majors.slice(0, 5).map((m) => (
                <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 700 }}>{td(m.name)}</span>
                    <span className="text-[14px] text-[var(--brand-blue)]" style={{ fontWeight: 800 }}>{m.match}%</span>
                  </div>
                  {majorMeta(m) && <p className="mt-0.5 text-[11px] text-slate-400">{majorMeta(m)}</p>}
                  {m.why && <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{td(m.why)}</p>}
                  {(m.skills?.length ?? 0) > 0 && (
                    <>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">{t("rpt_key_skills")}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {m.skills.map((s) => <span key={s} className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[11px] text-[#3a4a8a]">{td(s)}</span>)}
                      </div>
                    </>
                  )}
                  {(m.careers?.length ?? 0) > 0 && (
                    <>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-400">{t("rpt_careers")}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {m.careers.map((c) => <span key={c} className="rounded-full bg-[#f3edff] px-2 py-0.5 text-[11px] text-[#5b3a8a]">{td(c)}</span>)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roadmap */}
        {roadmap.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[15px]">{t("roadmap")}</h3>
            <div className="mt-2 space-y-3">
              {roadmap.map((ph, i) => (
                <div key={`${i}-${ph.phase}`} className="flex gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] text-white" style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))", fontWeight: 700 }}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-[13px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>
                      {td(ph.phase)} <span className="text-slate-400" style={{ fontWeight: 400 }}>· {td(ph.timeframe)}</span>
                    </p>
                    {ph.focus && <p className="text-[12px] text-slate-500">{td(ph.focus)}</p>}
                    <ul className="mt-1 space-y-0.5 text-[12px] text-slate-600">
                      {ph.actions.map((a) => <li key={a} className="flex gap-1.5"><Route size={12} className="mt-0.5 shrink-0 text-[var(--brand-purple)]" />{td(a)}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Universities */}
        {unis.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[15px]">{t("rpt_universities")}</h3>
            <div className="mt-2 space-y-2">
              {unis.map((u) => (
                <div key={`${u.rank}-${u.name}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-navy)] text-[12px] text-white" style={{ fontWeight: 700 }}>{u.rank}</div>
                  <div className="flex-1">
                    <p className="text-[13px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>{td(u.name)}{u.city && <span className="text-slate-400" style={{ fontWeight: 400 }}> · {td(u.city)}</span>}</p>
                    {u.note && <p className="text-[12px] text-slate-500">{td(u.note)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        {nextSteps.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-[14px]">{t("rpt_next_steps")}</h3>
            <ul className="mt-2 space-y-1.5 text-[13px] text-slate-600">
              {nextSteps.map((s) => <li key={s} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-[var(--brand-blue)]" />{td(s)}</li>)}
            </ul>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-400">{t("rpt_footer")}</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex gap-3 border-t border-black/5 bg-white p-4">
        <Button className="flex-1" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 size={16} className="mr-1 animate-spin" /> : <FileDown size={16} className="mr-1" />}
          {t("export_pdf")}
        </Button>
      </div>
    </div>
  );
}
