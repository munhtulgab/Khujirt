"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { refreshSite } from "@/app/admin/actions";

/* ---------------------------------------------------------------- API */

type Status = "new" | "read" | "answered" | "spam";

interface Message {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  locale: "mn" | "en";
  status: Status;
  createdAt: number;
}

interface AdminProduct {
  slug: string;
  nameMn: string;
  nameEn: string;
  descriptionMn: string;
  descriptionEn: string;
  category: string;
  packaging: "pet" | "glass";
  volumes: string[];
  image: string;
  shopUrl: string;
  sortOrder: number;
  active: boolean;
}

interface Facts {
  since: number;
  mineralCount: number;
  additives: number;
}

class ApiError extends Error {
  constructor(public status: number, public code: string, public fields: string[] = []) {
    super(code);
  }
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, String(data?.error ?? "error"), Array.isArray(data?.fields) ? data.fields : []);
  return data as T;
}

function errorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "Сүлжээний алдаа. Дахин оролдоно уу.";
  switch (err.code) {
    case "invalid_credentials":
      return "Нэвтрэх нэр эсвэл нууц үг буруу байна.";
    case "too_many_attempts":
      return "Олон удаа буруу оролдлоо. 15 минутын дараа дахин оролдоно уу.";
    case "not_configured":
      return "Өгөгдлийн сан холбогдоогүй байна (Vercel дээр CLOUDFLARE_API_TOKEN).";
    case "unauthorized":
      return "Нэвтрэх хугацаа дууссан. Дахин нэвтэрнэ үү.";
    case "wrong_password":
      return "Одоогийн нууц үг буруу байна.";
    case "invalid":
      return "Зарим талбар буруу бөглөгдсөн байна.";
    default:
      return "Алдаа гарлаа. Дахин оролдоно уу.";
  }
}

/* ---------------------------------------------------------------- shell */

const TABS = [
  { id: "messages", label: "Зурвас" },
  { id: "products", label: "Бүтээгдэхүүн" },
  { id: "facts", label: "Тоон баримт" },
  { id: "password", label: "Нууц үг" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function AdminApp() {
  const [user, setUser] = useState<string | null | undefined>(undefined); // undefined = checking
  const [tab, setTab] = useState<Tab>("messages");
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    api<{ username: string }>("/me")
      .then((d) => setUser(d.username))
      .catch(() => setUser(null));
  }, []);

  const signedOut = useCallback(() => setUser(null), []);

  async function logout() {
    await api("/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
  }

  if (user === undefined) {
    return <div className="grid min-h-dvh place-items-center text-ink-soft">Ачаалж байна…</div>;
  }
  if (user === null) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/khujirt-logo.webp" alt="Хужирт" className="h-9 w-auto" />
          <span className="rounded-full bg-navy px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-white">Админ</span>
          <div className="ml-auto flex items-center gap-3 text-[14px]">
            <span className="hidden text-ink-soft sm:inline">{user}</span>
            <a href="/mn" target="_blank" rel="noreferrer" className="font-medium text-sky hover:underline">
              Сайт
            </a>
            <button onClick={logout} className="rounded-full border border-navy/15 px-4 py-2 font-medium text-navy hover:bg-sky-50">
              Гарах
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-5" aria-label="Админ хэсгүүд">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`relative shrink-0 px-3 pb-3 pt-1 text-[14.5px] font-medium transition-colors ${
                tab === t.id ? "text-navy" : "text-ink-soft hover:text-navy"
              }`}
            >
              {t.label}
              {t.id === "messages" && newCount > 0 && (
                <span className="ml-1.5 rounded-full bg-red px-1.5 py-0.5 text-[11px] font-semibold text-white">{newCount}</span>
              )}
              {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-red" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "messages" && <Messages onSignedOut={signedOut} onNewCount={setNewCount} />}
        {tab === "products" && <Products onSignedOut={signedOut} />}
        {tab === "facts" && <FactsEditor onSignedOut={signedOut} />}
        {tab === "password" && <Password />}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- sign-in */

function Login({ onLogin }: { onLogin: (user: string) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const d = await api<{ username: string }>("/login", {
        method: "POST",
        body: { username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") },
      });
      onLogin(d.username);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[28px] bg-white p-8 shadow-[0_30px_80px_-40px_rgb(14_47_82/0.45)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/khujirt-logo.webp" alt="Хужирт" className="mx-auto h-14 w-auto" />
        <h1 className="mt-6 text-center font-display text-[22px] font-semibold text-navy">Админ хэсэг</h1>
        <p className="mt-1 text-center text-[14px] text-ink-soft">Зурвас, бүтээгдэхүүн, тоон баримт</p>
        <label className="mt-8 grid gap-2">
          <span className="text-[13.5px] font-medium text-navy">Нэвтрэх нэр</span>
          <input className="field" name="username" autoComplete="username" required autoFocus />
        </label>
        <label className="mt-4 grid gap-2">
          <span className="text-[13.5px] font-medium text-navy">Нууц үг</span>
          <input className="field" name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={busy} className="btn btn-red mt-7 w-full justify-center disabled:opacity-70">
          {busy ? "Шалгаж байна…" : "Нэвтрэх"}
        </button>
        <p role="alert" className="mt-4 min-h-5 text-center text-[14px] font-medium text-red-deep">
          {error}
        </p>
      </form>
    </main>
  );
}

/* ---------------------------------------------------------------- shared bits */

function useLoad<T>(load: () => Promise<T>, onSignedOut: () => void) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    setError("");
    load()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onSignedOut();
        else setError(errorText(err));
      });
  }, [load, onSignedOut]);
  useEffect(reload, [reload]);
  return { data, setData, error, reload };
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] bg-white p-5 shadow-[0_20px_60px_-42px_rgb(14_47_82/0.5)] sm:p-6 ${className}`}>{children}</section>;
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[24px] font-semibold text-navy">{title}</h1>
      {note && <p className="mt-1 max-w-[70ch] text-[14.5px] text-ink-soft">{note}</p>}
    </div>
  );
}

function Notice({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  return <p className={`text-[14px] font-medium ${ok ? "text-[#2b7a24]" : "text-red-deep"}`}>{text}</p>;
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`grid content-start gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-[13px] font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}

/* ---------------------------------------------------------------- messages */

const STATUS_LABEL: Record<Status, string> = { new: "Шинэ", read: "Уншсан", answered: "Хариулсан", spam: "Спам" };
const STATUS_STYLE: Record<Status, string> = {
  new: "bg-red text-white",
  read: "bg-sky-100 text-navy",
  answered: "bg-leaf-50 text-[#2b7a24]",
  spam: "bg-navy/10 text-ink-soft",
};
// 2026-11-12 19:29, Ulaanbaatar time
const DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const formatDate = (seconds: number) => DATE.format(new Date(seconds * 1000)).replace(",", "");

function Messages({ onSignedOut, onNewCount }: { onSignedOut: () => void; onNewCount: (n: number) => void }) {
  const [filter, setFilter] = useState<Status | "">("");
  const load = useCallback(
    () => api<{ messages: Message[]; counts: Partial<Record<Status, number>> }>(`/messages${filter ? `?status=${filter}` : ""}`),
    [filter],
  );
  const { data, error, reload } = useLoad(load, onSignedOut);
  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  useEffect(() => onNewCount(counts.new ?? 0), [counts.new, onNewCount]);

  async function setStatus(id: number, status: Status) {
    try {
      await api(`/messages/${id}`, { method: "PATCH", body: { status } });
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onSignedOut();
    }
  }

  return (
    <>
      <Heading title="Ирсэн зурвас" note="Сайтын «Холбоо барих» маягтаар ирсэн зурвасууд, шинэ нь эхэндээ." />
      <div className="mb-5 flex flex-wrap gap-2">
        {(["", "new", "read", "answered", "spam"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${
              filter === s ? "bg-navy text-white" : "bg-white text-navy hover:bg-sky-100"
            }`}
          >
            {s ? STATUS_LABEL[s] : "Бүгд"} <span className="opacity-60">{s ? counts[s] ?? 0 : total}</span>
          </button>
        ))}
      </div>
      <Notice text={error} />
      {data && data.messages.length === 0 && (
        <Card className="text-center text-ink-soft">Энд зурвас алга байна.</Card>
      )}
      <div className="grid gap-4">
        {data?.messages.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-[14rem] flex-1">
                <p className="text-[16.5px] font-semibold text-navy">{m.name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-4 text-[14px]">
                  {m.email && (
                    <a className="text-sky hover:underline" href={`mailto:${m.email}`}>
                      {m.email}
                    </a>
                  )}
                  {m.phone && (
                    <a className="text-sky hover:underline" href={`tel:${m.phone.replace(/\s/g, "")}`}>
                      {m.phone}
                    </a>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-ink-soft">
                <span className="uppercase">{m.locale}</span>
                <time dateTime={new Date(m.createdAt * 1000).toISOString()}>{formatDate(m.createdAt)}</time>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[m.status]}`}>{STATUS_LABEL[m.status]}</span>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-navy/90">{m.message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABEL) as Status[])
                .filter((s) => s !== m.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(m.id, s)}
                    className="rounded-full border border-navy/12 px-3 py-1.5 text-[13px] font-medium text-navy hover:bg-sky-50"
                  >
                    {STATUS_LABEL[s]} гэж тэмдэглэх
                  </button>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- products */

function Products({ onSignedOut }: { onSignedOut: () => void }) {
  const load = useCallback(() => api<{ products: AdminProduct[] }>("/products"), []);
  const { data, setData, error } = useLoad(load, onSignedOut);

  return (
    <>
      <Heading
        title="Бүтээгдэхүүн"
        note="Нэр, тайлбар, савлагааны хэмжээ, дараалал, харагдах эсэхийг засна. Хадгалсны дараа сайт шууд шинэчлэгдэнэ."
      />
      <Notice text={error} />
      <div className="grid gap-5">
        {data?.products.map((p) => (
          <ProductEditor
            key={p.slug}
            product={p}
            onSignedOut={onSignedOut}
            onSaved={(saved) => setData((d) => (d ? { products: d.products.map((x) => (x.slug === saved.slug ? saved : x)) } : d))}
          />
        ))}
      </div>
    </>
  );
}

function ProductEditor({
  product,
  onSaved,
  onSignedOut,
}: {
  product: AdminProduct;
  onSaved: (p: AdminProduct) => void;
  onSignedOut: () => void;
}) {
  const [draft, setDraft] = useState(product);
  const [volumes, setVolumes] = useState(product.volumes.join(", "));
  const [note, setNote] = useState<{ text: string; ok?: boolean }>({ text: "" });
  const [bad, setBad] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const invalid = (k: string) => (bad.includes(k) ? true : undefined);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote({ text: "" });
    setBad([]);
    try {
      const { product: saved } = await api<{ product: AdminProduct }>(`/products/${product.slug}`, {
        method: "PATCH",
        body: {
          nameMn: draft.nameMn,
          nameEn: draft.nameEn,
          descriptionMn: draft.descriptionMn,
          descriptionEn: draft.descriptionEn,
          volumes: volumes.split(",").map((v) => v.trim()).filter(Boolean),
          sortOrder: Number.isFinite(draft.sortOrder) ? Math.round(draft.sortOrder) : 0,
          active: draft.active,
          image: draft.image,
          shopUrl: draft.shopUrl,
        },
      });
      onSaved(saved);
      setDraft(saved);
      setVolumes(saved.volumes.join(", "));
      const refreshed = await refreshSite().catch(() => false);
      setNote({ text: refreshed ? "Хадгаллаа. Сайт шинэчлэгдлээ." : "Хадгаллаа. Сайт 10 минутын дотор шинэчлэгдэнэ.", ok: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSignedOut();
      if (err instanceof ApiError) setBad(err.fields);
      setNote({ text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save}>
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.image} alt="" className="h-24 w-16 shrink-0 object-contain" referrerPolicy="no-referrer" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold text-navy">{product.nameMn}</p>
            <p className="text-[13px] text-ink-soft">
              {product.slug} · {product.packaging === "glass" ? "шилэн сав" : "PET сав"} · {product.category}
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[14px] font-medium text-navy">
            <input type="checkbox" className="size-4 accent-[#3ea535]" checked={draft.active} onChange={(e) => set("active", e.target.checked)} />
            Сайтад харагдана
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Нэр (MN)">
            <input className="field" value={draft.nameMn} maxLength={120} aria-invalid={invalid("nameMn")} onChange={(e) => set("nameMn", e.target.value)} />
          </Field>
          <Field label="Нэр (EN)">
            <input className="field" value={draft.nameEn} maxLength={120} aria-invalid={invalid("nameEn")} onChange={(e) => set("nameEn", e.target.value)} />
          </Field>
          <Field label="Тайлбар (MN)">
            <textarea className="field min-h-24 resize-y" value={draft.descriptionMn} maxLength={1000} onChange={(e) => set("descriptionMn", e.target.value)} />
          </Field>
          <Field label="Тайлбар (EN)">
            <textarea className="field min-h-24 resize-y" value={draft.descriptionEn} maxLength={1000} onChange={(e) => set("descriptionEn", e.target.value)} />
          </Field>
          <Field label="Савлагааны хэмжээ (таслалаар)">
            <input className="field" value={volumes} placeholder="330 мл, 500 мл, 1.5 л" aria-invalid={invalid("volumes")} onChange={(e) => setVolumes(e.target.value)} />
          </Field>
          <Field label="Дараалал (бага нь эхэндээ)">
            <input
              className="field"
              type="number"
              min={0}
              max={100000}
              value={draft.sortOrder}
              aria-invalid={invalid("sortOrder")}
              onChange={(e) => set("sortOrder", Number(e.target.value))}
            />
          </Field>
          <Field label="Зургийн хаяг (https)">
            <input className="field" type="url" value={draft.image} aria-invalid={invalid("image")} onChange={(e) => set("image", e.target.value)} />
          </Field>
          <Field label="gem.mn холбоос (https)">
            <input className="field" type="url" value={draft.shopUrl} aria-invalid={invalid("shopUrl")} onChange={(e) => set("shopUrl", e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className="btn btn-red disabled:opacity-70">
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </button>
          <Notice {...note} />
        </div>
      </form>
    </Card>
  );
}

/* ---------------------------------------------------------------- facts */

const FACT_LABELS: Record<keyof Facts, string> = {
  since: "Үйлдвэрлэж эхэлсэн он",
  mineralCount: "Эрдэс бодисын тоо",
  additives: "Нэмэлт бодис",
};

function FactsEditor({ onSignedOut }: { onSignedOut: () => void }) {
  const load = useCallback(() => api<{ facts: Facts }>("/facts"), []);
  const { data, setData, error } = useLoad(load, onSignedOut);
  const [note, setNote] = useState<{ text: string; ok?: boolean }>({ text: "" });
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setNote({ text: "" });
    try {
      const saved = await api<{ facts: Facts }>("/facts", { method: "PATCH", body: data.facts });
      setData(saved);
      const refreshed = await refreshSite().catch(() => false);
      setNote({ text: refreshed ? "Хадгаллаа. Сайт шинэчлэгдлээ." : "Хадгаллаа. Сайт 10 минутын дотор шинэчлэгдэнэ.", ok: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSignedOut();
      setNote({ text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Heading title="Тоон баримт" note="Сайтын «Тоогоор» хэсэгт харагдах тоонууд." />
      <Notice text={error} />
      {data && (
        <Card className="max-w-2xl">
          <form onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(Object.keys(FACT_LABELS) as (keyof Facts)[]).map((k) => (
                <Field key={k} label={FACT_LABELS[k]}>
                  <input
                    className="field"
                    type="number"
                    min={0}
                    max={1000000}
                    value={data.facts[k]}
                    onChange={(e) => setData({ facts: { ...data.facts, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) } })}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={busy} className="btn btn-red disabled:opacity-70">
                {busy ? "Хадгалж байна…" : "Хадгалах"}
              </button>
              <Notice {...note} />
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- password */

function Password() {
  const [note, setNote] = useState<{ text: string; ok?: boolean }>({ text: "" });
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const next = String(form.get("new") ?? "");
    if (next !== String(form.get("repeat") ?? "")) return setNote({ text: "Шинэ нууц үг таарахгүй байна." });
    if (next.length < 8) return setNote({ text: "Шинэ нууц үг дор хаяж 8 тэмдэгт байна." });
    setBusy(true);
    setNote({ text: "" });
    try {
      await api("/password", { method: "POST", body: { current: String(form.get("current") ?? ""), new: next } });
      formEl.reset();
      setNote({ text: "Нууц үг солигдлоо.", ok: true });
    } catch (err) {
      setNote({ text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Heading title="Нууц үг солих" note="Анхны «admin123» нууц үгийг 8-аас дээш тэмдэгттэй, таахад хэцүү үгээр солихыг зөвлөж байна." />
      <Card className="max-w-md">
        <form onSubmit={save} className="grid gap-4">
          <Field label="Одоогийн нууц үг">
            <input className="field" name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Шинэ нууц үг">
            <input className="field" name="new" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Шинэ нууц үг (дахин)">
            <input className="field" name="repeat" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={busy} className="btn btn-red disabled:opacity-70">
              {busy ? "Сольж байна…" : "Солих"}
            </button>
            <Notice {...note} />
          </div>
        </form>
      </Card>
    </>
  );
}
