import { Compass, Route, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Slider } from "../components/ui/slider";
import { useFields, useSkills } from "../services/api";
import { StatusBar, useNav } from "./shell";

const slides = [
  { icon: Compass, titleKey: "ob1_title", bodyKey: "ob1_body" },
  { icon: Target, titleKey: "ob2_title", bodyKey: "ob2_body" },
  { icon: Route, titleKey: "ob3_title", bodyKey: "ob3_body" },
];

export function Onboarding() {
  const { go, t } = useNav();
  const [i, setI] = useState(0);
  const Slide = slides[i];
  const Icon = Slide.icon;
  const last = i === slides.length - 1;
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex justify-end px-7 pt-1">
        <button onClick={() => go("setup")} className="text-[13px] text-slate-400">{t("skip")}</button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8">
        <div
          className="grid h-52 w-52 place-items-center rounded-full"
          style={{ background: "linear-gradient(135deg, #eef2ff, #f3edff)" }}
        >
          <Icon size={78} className="text-[var(--brand-blue)]" strokeWidth={1.4} />
        </div>
        <div className="text-center">
          <h1 style={{ fontSize: 24 }}>{t(Slide.titleKey)}</h1>
          <p className="mt-3 text-[14px] text-slate-500">{t(Slide.bodyKey)}</p>
        </div>
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className="h-2 rounded-full transition-all"
              style={{
                width: idx === i ? 22 : 8,
                background: idx === i ? "var(--brand-blue)" : "#cbd5e1",
              }}
            />
          ))}
        </div>
      </div>
      <div className="px-7 pb-10">
        <Button className="w-full" onClick={() => (last ? go("setup") : setI(i + 1))}>
          {last ? t("get_started") : t("next")}
        </Button>
      </div>
    </div>
  );
}

const stepKeys = ["personal_info", "academic_bg", "interests_goals", "skills_assess", "personality_style"];
const steps = ["Personal", "Academic", "Interests", "Skills", "Personality"];

export function Setup() {
  const { go, t, td, updateProfile, profile, user } = useNav();
  const { data: skillsList } = useSkills();
  const { data: fieldChips } = useFields();
  const [step, setStep] = useState(0);
  const [text, setText] = useState<Record<string, string>>(() => {
    const p = profile as Record<string, unknown>;
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as string[]).join(", ") : "");
    return {
      fullName: str("fullName") || user?.name || "",
      age: str("age"),
      country: str("country"),
      city: str("city"),
      school: str("school"),
      educationLevel: str("educationLevel"),
      preferredLanguage: str("preferredLanguage"),
      currentMajor: str("currentMajor"),
      schoolSystem: str("schoolSystem"),
      gpa: str("gpa"),
      favoriteSubjects: list("favoriteSubjects"),
      weakSubjects: list("weakSubjects"),
      interests: list("interests"),
      curiousCareers: list("curiousCareers"),
      futureCountry: str("futureCountry"),
    };
  });
  const [chips, setChips] = useState<string[]>(() =>
    Array.isArray((profile as Record<string, unknown>).fields)
      ? ((profile as Record<string, unknown>).fields as string[])
      : ["Technology"]
  );
  const [work, setWork] = useState<string>(() => {
    const w = (profile as Record<string, unknown>).workStyle;
    return typeof w === "string" && w ? w : "Hybrid";
  });
  const [personality, setPersonality] = useState<Record<string, string>>(() => {
    const p = (profile as Record<string, unknown>).personality;
    return p && typeof p === "object" && !Array.isArray(p)
      ? { ...(p as Record<string, string>) }
      : {};
  });
  const [skills, setSkills] = useState<Record<string, number>>(() => {
    const s = (profile as Record<string, unknown>).skills;
    return s && typeof s === "object" && !Array.isArray(s)
      ? { ...(s as Record<string, number>) }
      : {};
  });
  const [error, setError] = useState<string | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setText((p) => ({ ...p, [key]: e.target.value }));
  };

  useEffect(() => {
    setSkills((prev) => {
      const next = { ...prev };
      for (const s of skillsList) if (!(s in next)) next[s] = 3;
      return next;
    });
  }, [skillsList]);

  const toggleChip = (c: string) => {
    setError(null);
    setChips((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  };

  const splitList = (v?: string) =>
    (v ?? "")
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const finish = () => {
    updateProfile({
      fullName: text.fullName ?? "",
      age: text.age ?? "",
      country: text.country ?? "",
      city: text.city ?? "",
      school: text.school ?? "",
      educationLevel: text.educationLevel ?? "",
      preferredLanguage: text.preferredLanguage ?? "",
      currentMajor: text.currentMajor ?? "",
      schoolSystem: text.schoolSystem ?? "",
      gpa: text.gpa ?? "",
      favoriteSubjects: splitList(text.favoriteSubjects),
      weakSubjects: splitList(text.weakSubjects),
      interests: splitList(text.interests),
      curiousCareers: splitList(text.curiousCareers),
      futureCountry: text.futureCountry ?? "",
      fields: chips,
      workStyle: work,
      skills,
      personality,
    });
    go("analyzing");
  };

  const next = () => {
    if (!stepValid()) {
      setError(t("err_fill_all"));
      return;
    }
    if (step === 0 && !ageValid()) {
      setError(t("err_age"));
      return;
    }
    setError(null);
    if (step === steps.length - 1) finish();
    else setStep(step + 1);
  };

  const personalityKeys = ["Introvert", "Practical", "Structured", "Independent", "Fast learner"];

  const ageValid = (): boolean => {
    const n = Number(text.age);
    return !!text.age?.trim() && Number.isFinite(n) && n >= 10 && n <= 70;
  };

  const stepValid = (): boolean => {
    const filled = (k: string) => !!text[k]?.trim();
    switch (step) {
      case 0:
        return ["fullName", "age", "country", "city", "preferredLanguage"].every(filled);
      case 1:
        return ["educationLevel", "school", "currentMajor", "schoolSystem", "gpa", "favoriteSubjects", "weakSubjects"].every(filled);
      case 2:
        return filled("interests") && filled("curiousCareers") && filled("futureCountry") && chips.length > 0 && !!work;
      case 3:
        return skillsList.length > 0 && skillsList.every((s) => typeof skills[s] === "number");
      case 4:
        return personalityKeys.every((k) => !!personality[k]);
      default:
        return true;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="px-7 pt-2">
        <div className="mb-2 flex items-center justify-between text-[13px] text-slate-500">
          <span>{t("step_of")} {step + 1} {t("of")} {steps.length}</span>
          <span>{t(stepKeys[step])}</span>
        </div>
        <Progress value={((step + 1) / steps.length) * 100} className="h-2" />
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-5">
        {step === 0 && (
          <div className="space-y-4">
            <h1 style={{ fontSize: 22 }}>{t("personal_info")}</h1>
            <Field required label="Full name" placeholder="Full name" value={text.fullName} onChange={set("fullName")} />
            <div className="grid grid-cols-2 gap-3">
              <Field required type="number" min={10} max={70} inputMode="numeric" label="Age" placeholder="18" value={text.age} onChange={set("age")} />
              <Field required label="Country" placeholder="Lebanon" value={text.country} onChange={set("country")} />
            </div>
            <Field required label="City" placeholder="Beirut" value={text.city} onChange={set("city")} />
            <Field required label="Preferred language" placeholder="English" value={text.preferredLanguage} onChange={set("preferredLanguage")} />
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h1 style={{ fontSize: 22 }}>{t("academic_bg")}</h1>
            <Field required label="Education level" placeholder="High school - Grade 12" value={text.educationLevel} onChange={set("educationLevel")} />
            <Field required label="School / University" placeholder="International College" value={text.school} onChange={set("school")} />
            <Field required label="Current major (if any)" placeholder="Not decided" value={text.currentMajor} onChange={set("currentMajor")} />
            <Field required label="School system" placeholder="Lebanese Baccalaureate" value={text.schoolSystem} onChange={set("schoolSystem")} />
            <Field required label="GPA / average" placeholder="16 / 20" value={text.gpa} onChange={set("gpa")} />
            <Field required label="Favorite subjects" placeholder="Math, Physics, English" value={text.favoriteSubjects} onChange={set("favoriteSubjects")} />
            <Field required label="Weak subjects" placeholder="Chemistry" value={text.weakSubjects} onChange={set("weakSubjects")} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <h1 style={{ fontSize: 22 }}>{t("interests_goals")}</h1>
            <Field required label="Topics I enjoy" placeholder="Coding, startups, design" value={text.interests} onChange={set("interests")} />
            <Field required label="Careers I'm curious about" placeholder="Software engineer, founder" value={text.curiousCareers} onChange={set("curiousCareers")} />
            <div>
              <Label className="mb-2 block">{t("preferred_fields")} <span className="text-rose-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {fieldChips.map((c) => (
                  <Chip key={c} active={chips.includes(c)} onClick={() => toggleChip(c)}>{td(c)}</Chip>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">{t("work_style")} <span className="text-rose-500">*</span></Label>
              <div className="flex flex-wrap gap-2">
                {["Office", "Remote", "Field", "Hybrid"].map((w) => (
                  <Chip key={w} active={work === w} onClick={() => { setError(null); setWork(w); }}>{td(w)}</Chip>
                ))}
              </div>
            </div>
            <Field required label="Preferred future country" placeholder="Gulf, Europe, Canada..." value={text.futureCountry} onChange={set("futureCountry")} />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <h1 style={{ fontSize: 22 }}>{t("skills_assess")}</h1>
            <p className="text-[13px] text-slate-500">{t("rate_yourself")}</p>
            {skillsList.map((s) => (
              <div key={s}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-slate-700">{td(s)}</span>
                  <span className="text-[var(--brand-blue)]" style={{ fontWeight: 600 }}>{skills[s] ?? 3}</span>
                </div>
                <Slider
                  value={[skills[s] ?? 3]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(v) => setSkills((p) => ({ ...p, [s]: v[0] }))}
                />
              </div>
            ))}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <h1 style={{ fontSize: 22 }}>{t("personality_style")}</h1>
            {[
              ["Introvert", "Extrovert"],
              ["Practical", "Theoretical"],
              ["Structured", "Flexible"],
              ["Independent", "Team-oriented"],
              ["Fast learner", "Deep learner"],
            ].map(([a, b]) => (
              <div key={a} className="grid grid-cols-2 gap-3">
                {[a, b].map((opt) => {
                  const sel = personality[a] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => { setError(null); setPersonality((p) => ({ ...p, [a]: opt })); }}
                      className={`rounded-2xl border p-4 text-start text-[14px] transition ${
                        sel
                          ? "border-[var(--brand-blue)] bg-[#eef2ff] text-[var(--brand-navy)]"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {td(opt)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-7 pt-1">
        {error && <p className="mb-2 text-center text-[13px] text-rose-500">{error}</p>}
      </div>
      <div className="flex gap-3 px-7 pb-10 pt-1">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>{t("back")}</Button>
        )}
        <Button className="flex-1" onClick={next}>
          {step === steps.length - 1 ? t("finish_setup") : t("continue")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  required,
  type,
  min,
  max,
  inputMode,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const { td } = useNav();
  return (
    <div className="space-y-1.5">
      <Label>
        {td(label)}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      <Input
        type={type}
        min={min}
        max={max}
        inputMode={inputMode}
        placeholder={td(placeholder)}
        value={value ?? ""}
        onChange={onChange}
      />
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
        active
          ? "bg-[var(--brand-blue)] text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
