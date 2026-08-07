import { Award, Building2, Calendar, ChevronDown, ClipboardList, Globe, GraduationCap, MapPin, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { LEBANON_UNIVERSITIES, LebUniversity, TuitionTier } from "../data/lebanon-universities";
import { StatusBar, TopBar, useNav } from "./shell";

type TypeFilter = "All" | "Public" | "Private";

function rankStyle(rank: number): string {
  if (rank === 1) return "linear-gradient(135deg,#f59e0b,#f97316)"; // gold
  if (rank === 2) return "linear-gradient(135deg,#64748b,#94a3b8)"; // silver
  if (rank === 3) return "linear-gradient(135deg,#b45309,#d97706)"; // bronze
  return "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))";
}

function tierStyle(tier: TuitionTier): string {
  switch (tier) {
    case "Low":
      return "bg-emerald-100 text-emerald-700";
    case "Moderate":
      return "bg-sky-100 text-sky-700";
    case "High":
      return "bg-amber-100 text-amber-700";
    case "Premium":
      return "bg-rose-100 text-rose-700";
  }
}

export function Universities() {
  const { go, t, lang } = useNav();
  const ar = lang === "AR";
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("All");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEBANON_UNIVERSITIES.filter((u) => {
      if (type !== "All" && u.type !== type) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.nameAr.includes(query.trim()) ||
        u.acronym.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q) ||
        u.cityAr.includes(query.trim())
      );
    }).sort((a, b) => a.rank - b.rank);
  }, [query, type]);

  const typeLabel = (ty: TypeFilter) =>
    ty === "All" ? t("cat_all") : ty === "Public" ? t("uni_public") : t("uni_private");

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <TopBar
        title={t("leb_unis_title")}
        onBack={() => go("home")}
        action={<GraduationCap size={18} className="text-[var(--brand-purple)]" />}
      />
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-1">
        {/* Hero */}
        <div
          className="rounded-2xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-purple))" }}
        >
          <div className="flex items-center gap-2 text-[13px] text-blue-100">
            <Award size={15} /> {t("leb_unis_badge")}
          </div>
          <p className="mt-1 text-white" style={{ fontWeight: 700, fontSize: 20 }}>
            {LEBANON_UNIVERSITIES.length} {t("leb_unis_count")}
          </p>
          <p className="mt-1 text-[13px] text-blue-100/90">{t("leb_unis_sub")}</p>
        </div>

        {/* Search */}
        <div className="mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("leb_unis_search")}
            className="w-full bg-transparent text-[14px] outline-none"
          />
        </div>

        {/* Type filter */}
        <div className="mt-3 flex gap-2">
          {(["All", "Public", "Private"] as TypeFilter[]).map((ty) => (
            <button
              key={ty}
              onClick={() => setType(ty)}
              className={`rounded-full px-4 py-1.5 text-[13px] transition ${
                type === ty
                  ? "bg-[var(--brand-blue)] text-white"
                  : "bg-white text-slate-500 shadow-sm"
              }`}
              style={{ fontWeight: type === ty ? 600 : 500 }}
            >
              {typeLabel(ty)}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[12px] text-slate-400">{t("leb_unis_tap_hint")}</p>

        {/* List */}
        <div className="mt-4 space-y-3">
          {list.map((u) => (
            <UniversityCard key={u.rank} u={u} ar={ar} t={t} />
          ))}          {list.length === 0 && (
            <p className="mt-8 text-center text-[14px] text-slate-400">{t("leb_unis_empty")}</p>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">{t("leb_unis_note")}</p>
      </div>
    </div>
  );
}

function UniversityCard({
  u,
  ar,
  t,
}: {
  u: LebUniversity;
  ar: boolean;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const name = ar ? u.nameAr : u.name;
  const city = ar ? u.cityAr : u.city;
  const fields = ar ? u.fieldsAr : u.fields;
  const description = ar ? u.descriptionAr : u.description;
  const admission = ar ? u.admissionAr : u.admission;
  const isTop = u.rank <= 3;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_14px_rgba(11,21,51,0.05)]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 text-start">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] text-white"
          style={{ background: rankStyle(u.rank), fontWeight: 700 }}
        >
          {u.rank}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>
              {name}
            </span>
            {u.acronym && (
              <span className="text-[12px] text-slate-400">({u.acronym})</span>
            )}
            {isTop && <Badge className="bg-amber-100 text-amber-700">{t("top_pick")}</Badge>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-[var(--brand-blue)]" />
              {city}
            </span>
            <span className="flex items-center gap-1">
              <Building2 size={12} className="text-[var(--brand-purple)]" />
              {u.type === "Public" ? t("uni_public") : t("uni_private")}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400" />
              {u.founded}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {fields.map((f) => (
              <span
                key={f}
                className="rounded-full bg-[#eef2ff] px-2.5 py-0.5 text-[11px] text-[var(--brand-blue)]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[13px] leading-relaxed text-slate-600">{description}</p>

          <div className="mt-3 rounded-xl bg-[#f8faff] p-3">
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>
              <Wallet size={13} className="text-emerald-500" /> {t("uni_tuition")}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
              <span>{u.tuitionRange}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${tierStyle(u.tuitionTier)}`}>
                {t(`tier_${u.tuitionTier.toLowerCase()}`)}
              </span>
            </div>
          </div>

          <div className="mt-2 rounded-xl bg-[#f8faff] p-3">
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--brand-navy)]" style={{ fontWeight: 600 }}>
              <ClipboardList size={13} className="text-[var(--brand-blue)]" /> {t("uni_admission")}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{admission}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
            <span className="text-slate-500">
              <span className="text-[var(--brand-purple)]">{t("uni_founded")}:</span> {u.founded}
            </span>
            {u.website && (
              <a
                href={`https://${u.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[var(--brand-blue)]"
                style={{ fontWeight: 600 }}
              >
                <Globe size={13} /> {t("uni_visit_site")}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

