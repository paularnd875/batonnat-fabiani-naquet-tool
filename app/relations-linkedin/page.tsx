import type { Metadata } from "next";

// Outil de classement LinkedIn (déclinaison swipe-avocats dédiée Fabiani-Naquet)
const TOOL_URL = "https://swipe-avocats-fabiani.vercel.app/c/YSCb4UmbKB";

export const metadata: Metadata = {
  title: "Classer mes relations LinkedIn — Bâtonnat Fabiani-Naquet 2026",
  description:
    "Retrouvez les avocats du Barreau de Paris parmi vos relations LinkedIn et classez-les en quelques minutes.",
};

const steps = [
  { n: "1", t: "Exportez vos relations", d: "Demandez l'archive « Relations » de votre compte LinkedIn (vous la recevez par email)." },
  { n: "2", t: "Importez le fichier", d: "Déposez le .zip (ou Connections.csv) dans l'outil — il est lu dans votre navigateur." },
  { n: "3", t: "Classez & appelez", d: "Carte par carte : C1 / C2 / C3 / Soutien public / Blacklist, avec les coordonnées pour appeler." },
];

export default function RelationsLinkedInPage() {
  return (
    <main style={{ fontFamily: "var(--font-inter)", color: "var(--fn-black)", background: "var(--fn-white)", minHeight: "100vh" }}>
      {/* Barre de marque */}
      <header className="flex items-center h-[70px] px-6 sm:px-8 bg-white border-b-[3px] border-black">
        <span className="font-bold uppercase tracking-[0.02em] text-[0.95rem] sm:text-[1.1rem]">
          Bâtonnat Fabiani-Naquet 2026
        </span>
        {/* Rappel Mondrian */}
        <span className="ml-auto flex items-stretch h-[70px]">
          <span className="w-3 sm:w-5" style={{ background: "var(--fn-red)" }} />
          <span className="w-3 sm:w-5" style={{ background: "var(--fn-blue)" }} />
          <span className="w-3 sm:w-5" style={{ background: "var(--fn-yellow)" }} />
        </span>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 sm:py-14">
        {/* Hero */}
        <div className="border-l-4 pl-4 mb-8" style={{ borderColor: "var(--fn-red)" }}>
          <p className="uppercase tracking-wide text-sm font-semibold" style={{ color: "var(--fn-red)" }}>
            Mobilisation des avocats parisiens
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold leading-tight">
            Retrouvez les avocats parmi vos relations LinkedIn
          </h1>
          <p className="mt-3 text-[1.05rem]" style={{ color: "var(--fn-gray-dark)" }}>
            En quelques minutes, l&apos;outil identifie les avocats du Barreau de Paris présents dans votre
            réseau LinkedIn. Vous les classez ensuite carte par carte, et vous disposez de leurs
            coordonnées pour les appeler.
          </p>
        </div>

        {/* Étapes */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border-2 p-4" style={{ borderColor: "var(--fn-black)", background: "var(--fn-gray-light)" }}>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white mb-3"
                style={{ background: s.n === "1" ? "var(--fn-red)" : s.n === "2" ? "var(--fn-blue)" : "var(--fn-yellow)", color: s.n === "3" ? "var(--fn-black)" : "#fff" }}
              >
                {s.n}
              </div>
              <div className="font-semibold mb-1">{s.t}</div>
              <div className="text-sm" style={{ color: "var(--fn-gray-medium)" }}>{s.d}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href={TOOL_URL}
          className="block w-full text-center rounded-xl text-white font-bold text-lg px-6 py-4 no-underline transition-colors"
          style={{ background: "var(--fn-red)" }}
        >
          Ouvrir l&apos;outil de classement →
        </a>
        <p className="mt-3 text-sm text-center" style={{ color: "var(--fn-gray-medium)" }}>
          🔒 Accès protégé : saisissez le mot de passe qui vous a été communiqué. Vos relations
          non-avocates ne sont pas conservées.
        </p>
      </div>
    </main>
  );
}
