"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  LogOut,
  Users,
  Home,
  FileText,
  BookOpen,
  BarChart3,
  Download,
  Landmark,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function formatEUR(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n || 0));
}
function formatEUR2(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
}
function formatDateFR(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const NAV_ITEMS = [
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "biens", label: "Biens", icon: Home },
  { key: "baux", label: "Contrats", icon: FileText },
  { key: "suivi", label: "Suivi des écritures", icon: BookOpen },
  { key: "synthese", label: "Synthèse", icon: BarChart3 },
  { key: "remboursements", label: "Remboursements", icon: Landmark },
  { key: "simulation-vente", label: "Simulation Vente", icon: Calculator },
  { key: "simulation-lmnp", label: "Simulation LMNP", icon: TrendingUp },
];

export default function ImmoApp({ session }) {
  const [activeTab, setActiveTab] = useState("contacts");
  const [contacts, setContacts] = useState([]);
  const [biens, setBiens] = useState([]);
  const [baux, setBaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: c }, { data: b }, { data: bx }] = await Promise.all([
        supabase.from("contacts").select("*").order("last_name", { ascending: true }),
        supabase.from("biens").select("*").order("name", { ascending: true }),
        supabase.from("baux").select("*").order("date_debut", { ascending: false }),
      ]);
      setContacts(c || []);
      setBiens(b || []);
      setBaux(bx || []);
      setErrorMsg("");
    } catch (e) {
      setErrorMsg("Impossible de charger les données. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("immo-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "biens" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "baux" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAll]);

  const bienById = useMemo(() => Object.fromEntries(biens.map((b) => [b.id, b])), [biens]);
  const contactById = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts]);

  async function logout() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <div className="w-full min-h-screen flex items-center justify-center text-stone-400 text-sm font-sans">Chargement…</div>;
  }

  return (
    <div className="w-full min-h-screen bg-stone-50 font-sans text-stone-900 flex">
      <aside className="w-56 shrink-0 bg-stone-100 border-r border-stone-200 min-h-screen p-4 hidden sm:flex flex-col">
        <div className="mb-6 px-1">
          <p className="font-serif text-lg text-blue-900">Immo famille</p>
          <p className="text-xs text-stone-500 truncate">{session.user.email}</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-md ${
                  active ? "bg-blue-900 text-white" : "text-stone-600 hover:bg-stone-200"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.soon && <span className="text-[10px] text-stone-400">bientôt</span>}
              </button>
            );
          })}
        </nav>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-stone-500 px-3 py-2 rounded-md hover:bg-stone-200">
          <LogOut size={16} /> Déconnexion
        </button>
      </aside>

      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-stone-100 border-t border-stone-200 flex z-10 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] shrink-0 px-2 ${active ? "text-blue-900" : "text-stone-500"}`}
            >
              <Icon size={18} />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 pb-16 sm:pb-0">
        {errorMsg && (
          <div className="m-5 sm:m-8 sm:mb-0 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{errorMsg}</div>
        )}

        {activeTab === "contacts" && <ContactsTab contacts={contacts} baux={baux} />}
        {activeTab === "biens" && <BiensTab biens={biens} baux={baux} />}
        {activeTab === "baux" && <BauxTab baux={baux} biens={biens} contacts={contacts} bienById={bienById} contactById={contactById} />}
        {activeTab === "suivi" && <SuiviTab biens={biens} baux={baux} contacts={contacts} bienById={bienById} />}
        {activeTab === "synthese" && <SyntheseTab biens={biens} />}
        {activeTab === "remboursements" && <RemboursementsTab />}
        {activeTab === "simulation-vente" && <SimulationVenteTab biens={biens} />}
        {activeTab === "simulation-lmnp" && <SimulationLmnpTab biens={biens} />}
      </main>
    </div>
  );
}

function SoonTab({ title, desc }) {
  return (
    <div className="max-w-2xl mx-auto p-5 sm:p-8">
      <h1 className="font-serif text-2xl text-blue-900 tracking-tight">{title}</h1>
      <p className="text-stone-500 text-sm mt-2">{desc}</p>
    </div>
  );
}

/* ---------------- SYNTHÈSE ---------------- */

function SyntheseTab({ biens }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBienId, setSelectedBienId] = useState(biens[0]?.id || null);

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase.from("ecritures_locatives").select("*").order("date", { ascending: true });
    if (!error) setEntries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel("synthese-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ecritures_locatives" }, fetchEntries)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchEntries]);

  useEffect(() => {
    if (!selectedBienId && biens.length) setSelectedBienId(biens[0].id);
  }, [biens, selectedBienId]);

  const bien = biens.find((b) => b.id === selectedBienId);
  const bienEntries = entries.filter((e) => e.bien_id === selectedBienId);

  const { years, categories, table, totalsByCategory, grandTotal } = useMemo(() => {
    const yearsSet = new Set();
    const catsSet = new Set();
    const map = {}; // year -> category -> signed amount
    bienEntries.forEach((e) => {
      const year = e.date.slice(0, 4);
      yearsSet.add(year);
      catsSet.add(e.categorie);
      const signed = (e.type === "credit" ? 1 : -1) * Number(e.amount);
      map[year] = map[year] || {};
      map[year][e.categorie] = (map[year][e.categorie] || 0) + signed;
    });
    const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    const categories = Array.from(catsSet).sort();
    const totalsByCategory = {};
    let grandTotal = 0;
    categories.forEach((c) => { totalsByCategory[c] = 0; });
    years.forEach((y) => {
      categories.forEach((c) => {
        const v = map[y]?.[c] || 0;
        totalsByCategory[c] += v;
        grandTotal += v;
      });
    });
    return { years, categories, table: map, totalsByCategory, grandTotal };
  }, [bienEntries]);

  const acquisitionCost = bien
    ? Number(bien.montant_pret || 0) + Number(bien.apport || 0)
    : 0;
  const gainCoutPct = acquisitionCost > 0 ? (grandTotal / acquisitionCost) * 100 : null;
  const coutFinal = acquisitionCost - grandTotal;
  const nbYears = years.length || 1;
  const cashflowMoyenAnnuel = grandTotal / nbYears;
  const loyerTotal = (totalsByCategory["Loyer"] || 0) + (totalsByCategory["Variable"] || 0) + (totalsByCategory["RBE"] || 0);
  const rendementBrut = acquisitionCost > 0 && nbYears > 0 ? ((loyerTotal / nbYears) / acquisitionCost) * 100 : null;

  if (loading) return <div className="p-8 text-sm text-stone-400">Chargement…</div>;

  return (
    <div className="max-w-5xl mx-auto p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Synthèse</h1>
        <p className="text-stone-500 text-sm mt-1">Coût / gain par bien, année par année.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <aside className="sm:w-64 shrink-0 space-y-1">
          {biens.length === 0 && <p className="text-sm text-stone-400">Aucun bien.</p>}
          {biens.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBienId(b.id)}
              className={`w-full text-left text-sm px-3 py-2 rounded-md ${selectedBienId === b.id ? "bg-blue-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"}`}
            >
              {b.name}
            </button>
          ))}
        </aside>

        {!bien ? (
          <div className="flex-1 text-sm text-stone-400 py-8 text-center">Sélectionne un bien.</div>
        ) : (
          <div className="flex-1 min-w-0 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SyntheseMetric label="Gain cumulé" value={formatEUR(grandTotal)} tone={grandTotal >= 0 ? "emerald" : "rose"} />
              <SyntheseMetric label="Coût d'acquisition" value={formatEUR(acquisitionCost)} tone="stone" />
              <SyntheseMetric label="Gain / Coût" value={gainCoutPct != null ? `${gainCoutPct.toFixed(1)} %` : "—"} tone={gainCoutPct != null && gainCoutPct >= 0 ? "emerald" : "rose"} />
              <SyntheseMetric label="Coût final net" value={formatEUR(coutFinal)} tone={coutFinal <= 0 ? "emerald" : "amber"} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SyntheseMetric label="Cash-flow net moyen / an" value={formatEUR(cashflowMoyenAnnuel)} tone={cashflowMoyenAnnuel >= 0 ? "emerald" : "rose"} small />
              <SyntheseMetric label="Rendement brut estimé" value={rendementBrut != null ? `${rendementBrut.toFixed(1)} % / an` : "—"} tone="sky" small />
              <SyntheseMetric label="Nombre d'années suivies" value={String(years.length)} tone="stone" small />
            </div>

            <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-stone-400 py-8 text-center">Aucune écriture pour ce bien.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                      <th className="px-3 py-2 font-medium">Année</th>
                      {categories.map((c) => <th key={c} className="px-3 py-2 font-medium text-right">{c}</th>)}
                      <th className="px-3 py-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {years.map((y) => {
                      const rowTotal = categories.reduce((s, c) => s + (table[y]?.[c] || 0), 0);
                      return (
                        <tr key={y}>
                          <td className="px-3 py-2 text-stone-700 font-medium">{y}</td>
                          {categories.map((c) => {
                            const v = table[y]?.[c] || 0;
                            return (
                              <td key={c} className={`px-3 py-2 text-right font-mono text-xs ${v > 0 ? "text-emerald-700" : v < 0 ? "text-rose-700" : "text-stone-300"}`}>
                                {v !== 0 ? formatEUR(v) : "—"}
                              </td>
                            );
                          })}
                          <td className={`px-3 py-2 text-right font-mono font-medium ${rowTotal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatEUR(rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-200 bg-stone-50">
                      <td className="px-3 py-2 font-semibold text-stone-800">Total</td>
                      {categories.map((c) => (
                        <td key={c} className={`px-3 py-2 text-right font-mono text-xs font-semibold ${totalsByCategory[c] > 0 ? "text-emerald-700" : totalsByCategory[c] < 0 ? "text-rose-700" : "text-stone-300"}`}>
                          {formatEUR(totalsByCategory[c])}
                        </td>
                      ))}
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${grandTotal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatEUR(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <p className="text-xs font-medium text-stone-600 mb-3">Coûts d'acquisition</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <CoutLigne label="Immobilier" value={bien.prix_achat} />
                <CoutLigne label="Notaire" value={bien.prix_notaire} />
                <CoutLigne label="Mobilier" value={bien.prix_mobilier} />
                <CoutLigne label="Apport" value={bien.apport} />
                <CoutLigne label="Montant emprunté" value={bien.montant_pret} />
                <CoutLigne label="Coût total (Emprunt + Apport — couvre immobilier, notaire, mobilier, intérêts)" value={acquisitionCost} bold />
              </div>
              <p className="text-[11px] text-stone-400 mt-3">Modifiable dans l'onglet Biens, fiche du bien.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SyntheseMetric({ label, value, tone, small }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-3">
      <p className="text-[11px] text-stone-500 mb-1">{label}</p>
      <p className={`font-mono ${small ? "text-sm" : "text-lg"} text-${tone}-700`}>{value}</p>
    </div>
  );
}

function CoutLigne({ label, value, bold }) {
  return (
    <div className={bold ? "font-semibold text-stone-800" : "text-stone-600"}>
      <p className="text-[11px] text-stone-400">{label}</p>
      <p className="font-mono">{value != null ? formatEUR(value) : "—"}</p>
    </div>
  );
}

/* ---------------- REMBOURSEMENTS (prêts) ---------------- */

function RemboursementsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("remboursements_pret").select("*").order("rang", { ascending: true });
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const labels = useMemo(() => Array.from(new Set(rows.map((r) => r.bien_label))), [rows]);
  useEffect(() => { if (!selected && labels.length) setSelected(labels[0]); }, [labels, selected]);

  const filtered = rows.filter((r) => r.bien_label === selected);
  const capitalRestant = filtered.length ? filtered[filtered.length - 1].capital_restant_du : 0;
  const totalInterets = filtered.reduce((s, r) => s + Number(r.part_interets), 0);
  const dateFin = filtered.length ? filtered[filtered.length - 1].date_echeance : null;

  if (loading) return <div className="p-8 text-sm text-stone-400">Chargement…</div>;

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Remboursements</h1>
        <p className="text-stone-500 text-sm mt-1">Échéanciers de prêt, restants à courir.</p>
      </div>

      <div className="flex gap-2">
        {labels.map((l) => (
          <button
            key={l}
            onClick={() => setSelected(l)}
            className={`px-3 py-1.5 rounded-full text-sm border ${selected === l ? "bg-blue-900 text-white border-blue-900" : "bg-white text-stone-600 border-stone-300 hover:bg-stone-100"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400">Aucune donnée.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <SyntheseMetric label="Capital restant dû (dernière ligne connue)" value={formatEUR(capitalRestant)} tone="stone" />
            <SyntheseMetric label="Intérêts restants (sur les lignes ci-dessous)" value={formatEUR(totalInterets)} tone="amber" />
            <SyntheseMetric label="Échéance finale connue" value={dateFin ? formatDateFR(dateFin) : "—"} tone="sky" small />
          </div>
          <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="px-3 py-2 font-medium">Rang</th>
                  <th className="px-3 py-2 font-medium">Échéance</th>
                  <th className="px-3 py-2 font-medium text-right">Montant</th>
                  <th className="px-3 py-2 font-medium text-right">Capital amorti</th>
                  <th className="px-3 py-2 font-medium text-right">Intérêts</th>
                  <th className="px-3 py-2 font-medium text-right">Capital restant dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-1.5 text-stone-500 text-xs">{r.rang}</td>
                    <td className="px-3 py-1.5 text-stone-600 text-xs">{formatDateFR(r.date_echeance)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{formatEUR2(r.montant)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-emerald-700">{formatEUR2(r.capital_amorti)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-amber-700">{formatEUR2(r.part_interets)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs text-stone-700">{formatEUR2(r.capital_restant_du)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- SIMULATION VENTE (plus-value immobilière) ---------------- */

function abattementIR(years) {
  if (years < 6) return 0;
  if (years >= 22) return 1;
  return Math.min((years - 5) * 0.06, 0.96);
}
function abattementPS(years) {
  if (years < 6) return 0;
  if (years >= 30) return 1;
  if (years <= 21) return (years - 5) * 0.0165;
  return 0.28 + (years - 22) * 0.09;
}
function yearsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1), b = new Date(d2);
  let years = b.getFullYear() - a.getFullYear();
  const anniversaryPassed = (b.getMonth() > a.getMonth()) || (b.getMonth() === a.getMonth() && b.getDate() >= a.getDate());
  if (!anniversaryPassed) years -= 1;
  return Math.max(0, years);
}

function SimulationVenteTab({ biens }) {
  const [bienId, setBienId] = useState(biens[0]?.id || "");
  const bien = biens.find((b) => b.id === bienId);

  const [prixAchat, setPrixAchat] = useState("");
  const [fraisNotaire, setFraisNotaire] = useState("");
  const [tauxTravaux, setTauxTravaux] = useState("15");
  const [dateAchat, setDateAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [tauxAgence, setTauxAgence] = useState("5");
  const [dateVente, setDateVente] = useState(todayISO());
  const [capitalRestantDu, setCapitalRestantDu] = useState("");
  const [leveeHypotheque, setLeveeHypotheque] = useState("");
  const [donationUsufruit, setDonationUsufruit] = useState("");
  const [rachatSci, setRachatSci] = useState("");

  useEffect(() => {
    if (bien) {
      setPrixAchat(bien.prix_achat != null ? String(bien.prix_achat) : "");
      setFraisNotaire(bien.prix_notaire != null ? String(bien.prix_notaire) : "");
      setDateAchat(bien.date_acquisition || "");
      setCapitalRestantDu(bien.montant_pret != null ? String(bien.montant_pret) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bienId]);

  const n = (v) => parseFloat(v) || 0;
  const travauxMontant = n(prixAchat) * (n(tauxTravaux) / 100);
  const coutAcquisition = n(prixAchat) + n(fraisNotaire) + travauxMontant;
  const fraisAgenceMontant = n(prixVente) * (n(tauxAgence) / 100);
  const netVendeur = n(prixVente) - fraisAgenceMontant;
  const plusValueBrute = netVendeur - coutAcquisition;
  const dureeDetention = yearsBetween(dateAchat, dateVente);
  const abIR = abattementIR(dureeDetention);
  const abPS = abattementPS(dureeDetention);
  const plusValueImposableIR = Math.max(0, plusValueBrute * (1 - abIR));
  const plusValueImposablePS = Math.max(0, plusValueBrute * (1 - abPS));
  const impotRevenu = plusValueImposableIR * 0.19;
  const prelevementsSociaux = plusValueImposablePS * 0.172;
  const fraisAnnexes = n(leveeHypotheque) + n(donationUsufruit) + n(rachatSci);
  const netPercu = netVendeur - impotRevenu - prelevementsSociaux - fraisAnnexes - n(capitalRestantDu);

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Simulation Vente</h1>
        <p className="text-stone-500 text-sm mt-1">Calcul de la plus-value immobilière et du net perçu à la revente.</p>
        <p className="text-xs text-stone-400 mt-1">
          Basé sur le régime fiscal standard des plus-values immobilières (biens autres que résidence principale) :
          abattement pour durée de détention, exonération totale d'impôt sur le revenu après 22 ans, de prélèvements
          sociaux après 30 ans.
        </p>
      </div>

      <div>
        <label className="text-xs text-stone-500 block mb-1">Bien</label>
        <select value={bienId} onChange={(e) => setBienId(e.target.value)} className="w-full sm:w-80 px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {biens.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
          <p className="text-xs font-medium text-stone-600">Achat</p>
          <SimField label="Prix d'achat (€)" value={prixAchat} onChange={setPrixAchat} />
          <SimField label="Frais de notaire (€)" value={fraisNotaire} onChange={setFraisNotaire} />
          <SimField label="Forfait travaux (% du prix d'achat)" value={tauxTravaux} onChange={setTauxTravaux} suffix="%" />
          <p className="text-xs text-stone-400">Montant travaux : {formatEUR(travauxMontant)}</p>
          <SimField label="Date d'achat" value={dateAchat} onChange={setDateAchat} type="date" />
          <p className="text-sm font-medium text-stone-700 pt-2 border-t border-stone-100">Coût d'acquisition total : <span className="font-mono">{formatEUR(coutAcquisition)}</span></p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
          <p className="text-xs font-medium text-stone-600">Vente</p>
          <SimField label="Prix de vente (€)" value={prixVente} onChange={setPrixVente} />
          <SimField label="Frais d'agence (%)" value={tauxAgence} onChange={setTauxAgence} suffix="%" />
          <p className="text-xs text-stone-400">Montant agence : {formatEUR(fraisAgenceMontant)}</p>
          <SimField label="Date de vente" value={dateVente} onChange={setDateVente} type="date" />
          <SimField label="Capital restant dû (€)" value={capitalRestantDu} onChange={setCapitalRestantDu} />
          <p className="text-sm font-medium text-stone-700 pt-2 border-t border-stone-100">Net vendeur : <span className="font-mono">{formatEUR(netVendeur)}</span></p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
        <p className="text-xs font-medium text-stone-600">Frais annexes (optionnel)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SimField label="Levée d'hypothèque (€)" value={leveeHypotheque} onChange={setLeveeHypotheque} />
          <SimField label="Donation usufruit (€)" value={donationUsufruit} onChange={setDonationUsufruit} />
          <SimField label="Rachat de parts SCI (€)" value={rachatSci} onChange={setRachatSci} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <p className="text-xs font-medium text-stone-600 mb-3">Plus-value et fiscalité — durée de détention : {dureeDetention} ans</p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-stone-100">
            <tr><td className="py-1.5 text-stone-600">Plus-value brute</td><td className="py-1.5 text-right font-mono">{formatEUR(plusValueBrute)}</td></tr>
            <tr><td className="py-1.5 text-stone-600">Abattement impôt sur le revenu</td><td className="py-1.5 text-right font-mono">{(abIR * 100).toFixed(1)} %</td></tr>
            <tr><td className="py-1.5 text-stone-600">Impôt sur le revenu (19%)</td><td className="py-1.5 text-right font-mono text-rose-700">-{formatEUR(impotRevenu)}</td></tr>
            <tr><td className="py-1.5 text-stone-600">Abattement prélèvements sociaux</td><td className="py-1.5 text-right font-mono">{(abPS * 100).toFixed(1)} %</td></tr>
            <tr><td className="py-1.5 text-stone-600">Prélèvements sociaux (17,2%)</td><td className="py-1.5 text-right font-mono text-rose-700">-{formatEUR(prelevementsSociaux)}</td></tr>
            <tr><td className="py-1.5 text-stone-600">Frais annexes</td><td className="py-1.5 text-right font-mono text-rose-700">-{formatEUR(fraisAnnexes)}</td></tr>
            <tr><td className="py-1.5 text-stone-600">Capital restant dû</td><td className="py-1.5 text-right font-mono text-rose-700">-{formatEUR(n(capitalRestantDu))}</td></tr>
            <tr className="border-t-2 border-stone-200"><td className="py-2 font-semibold text-stone-800">Net perçu</td><td className={`py-2 text-right font-mono font-semibold ${netPercu >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatEUR(netPercu)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimField({ label, value, onChange, type = "number", suffix }) {
  return (
    <div>
      <label className="text-xs text-stone-500 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

/* ---------------- SIMULATION LMNP ---------------- */

function SimulationLmnpTab({ biens }) {
  const [bienId, setBienId] = useState(biens[0]?.id || "");
  const bien = biens.find((b) => b.id === bienId);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [valeurImmo, setValeurImmo] = useState("");
  const [valeurMobilier, setValeurMobilier] = useState("");
  const [dureeImmo, setDureeImmo] = useState("20");
  const [dureeMobilier, setDureeMobilier] = useState("10");

  useEffect(() => {
    if (bien) {
      setValeurImmo(bien.prix_achat != null ? String(bien.prix_achat) : "");
      setValeurMobilier(bien.prix_mobilier != null ? String(bien.prix_mobilier) : "");
    }
  }, [bienId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ecritures_locatives").select("*").order("date", { ascending: true });
      setEntries(data || []);
      setLoading(false);
    })();
  }, []);

  const n = (v) => parseFloat(v) || 0;
  const dotationImmo = n(dureeImmo) > 0 ? n(valeurImmo) / n(dureeImmo) : 0;
  const dotationMobilier = n(dureeMobilier) > 0 ? n(valeurMobilier) / n(dureeMobilier) : 0;
  const amortissementDispoAnnuel = dotationImmo + dotationMobilier;

  const bienEntries = entries.filter((e) => e.bien_id === bienId);
  const years = Array.from(new Set(bienEntries.map((e) => e.date.slice(0, 4)))).sort();

  const table = useMemo(() => {
    let report = 0;
    return years.map((y) => {
      const revenus = bienEntries.filter((e) => e.date.slice(0, 4) === y && e.type === "credit").reduce((s, e) => s + Number(e.amount), 0);
      const charges = bienEntries.filter((e) => e.date.slice(0, 4) === y && e.type === "debit").reduce((s, e) => s + Number(e.amount), 0);
      const resultatAvant = revenus - charges;
      const amortissementDispo = amortissementDispoAnnuel + report;
      const amortissementDeduit = Math.max(0, Math.min(resultatAvant, amortissementDispo));
      report = amortissementDispo - amortissementDeduit;
      const resultatNet = Math.max(0, resultatAvant - amortissementDeduit);
      return { year: y, revenus, charges, resultatAvant, amortissementDeduit, reportCumule: report, resultatNet };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years.join(","), amortissementDispoAnnuel]);

  if (loading) return <div className="p-8 text-sm text-stone-400">Chargement…</div>;

  return (
    <div className="max-w-5xl mx-auto p-5 sm:p-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Simulation LMNP</h1>
        <p className="text-stone-500 text-sm mt-1">Amortissement comptable (régime réel) vs revenus/charges réels du Suivi.</p>
        <p className="text-xs text-stone-400 mt-1">L'amortissement ne peut jamais créer de déficit fiscal : l'excédent non utilisé une année est reporté indéfiniment sur les années suivantes.</p>
      </div>

      <div>
        <label className="text-xs text-stone-500 block mb-1">Bien</label>
        <select value={bienId} onChange={(e) => setBienId(e.target.value)} className="w-full sm:w-80 px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {biens.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <SimField label="Valeur immobilier amortissable (€)" value={valeurImmo} onChange={setValeurImmo} />
        <SimField label="Durée amortissement immo (ans)" value={dureeImmo} onChange={setDureeImmo} />
        <SimField label="Valeur mobilier (€)" value={valeurMobilier} onChange={setValeurMobilier} />
        <SimField label="Durée amortissement mobilier (ans)" value={dureeMobilier} onChange={setDureeMobilier} />
      </div>
      <p className="text-xs text-stone-500">Dotation annuelle disponible : {formatEUR(amortissementDispoAnnuel)} ({formatEUR(dotationImmo)} immobilier + {formatEUR(dotationMobilier)} mobilier)</p>

      <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
        {table.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">Aucune écriture pour ce bien dans le Suivi.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <th className="px-3 py-2 font-medium">Année</th>
                <th className="px-3 py-2 font-medium text-right">Revenus</th>
                <th className="px-3 py-2 font-medium text-right">Charges</th>
                <th className="px-3 py-2 font-medium text-right">Résultat avant amort.</th>
                <th className="px-3 py-2 font-medium text-right">Amort. déduit</th>
                <th className="px-3 py-2 font-medium text-right">Amort. reporté cumulé</th>
                <th className="px-3 py-2 font-medium text-right">Résultat net imposable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.map((row) => (
                <tr key={row.year}>
                  <td className="px-3 py-2 text-stone-700 font-medium">{row.year}</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">{formatEUR(row.revenus)}</td>
                  <td className="px-3 py-2 text-right font-mono text-rose-700">{formatEUR(row.charges)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${row.resultatAvant >= 0 ? "text-stone-700" : "text-rose-700"}`}>{formatEUR(row.resultatAvant)}</td>
                  <td className="px-3 py-2 text-right font-mono text-stone-500">{formatEUR(row.amortissementDeduit)}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-700">{formatEUR(row.reportCumule)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-stone-800">{formatEUR(row.resultatNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}



function useSortSearch(list, getters, defaultKey) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState("asc");
  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }
  const visible = useMemo(() => {
    let out = list;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((item) => Object.values(getters).some((g) => String(g(item) ?? "").toLowerCase().includes(q)));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const getter = getters[sortKey];
    return [...out].sort((a, b) => {
      const av = getter ? getter(a) : "";
      const bv = getter ? getter(b) : "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [list, search, sortKey, sortDir, getters]);
  return { search, setSearch, sortKey, sortDir, handleSort, visible };
}

function SortableTh({ label, sortKeyName, sortKey, sortDir, onSort, align, className = "" }) {
  const active = sortKey === sortKeyName;
  return (
    <th
      onClick={() => onSort(sortKeyName)}
      className={`px-4 py-2 font-medium cursor-pointer select-none hover:text-stone-700 ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

function ContactsTab({ contacts }) {
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");

  const getters = useMemo(() => ({
    nom: (c) => c.societe || `${c.last_name} ${c.first_name}`,
    type: (c) => c.type,
    email: (c) => c.email,
    phone: (c) => c.phone,
  }), []);
  const { search, setSearch, sortKey, sortDir, handleSort, visible } = useSortSearch(contacts, getters, "nom");

  async function save(fields, id) {
    const { error } = id
      ? await supabase.from("contacts").update(fields).eq("id", id)
      : await supabase.from("contacts").insert(fields);
    if (error) { setError("Impossible d'enregistrer ce contact."); return false; }
    setError("");
    return true;
  }
  async function remove(id) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) { setError("Ce contact est lié à un contrat : supprimez ou modifiez le contrat d'abord."); return false; }
    setError("");
    return true;
  }

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Contacts</h1>
          <p className="text-stone-500 text-sm mt-1">Locataires, propriétaires et autres contacts.</p>
        </div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-xs font-medium bg-blue-900 text-white px-3 py-1.5 rounded-md hover:bg-blue-950">
          <Plus size={14} /> Ajouter un contact
        </button>
      </div>
      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un contact..."
        className="w-full px-3 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">Aucun contact.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <SortableTh label="Nom" sortKeyName="nom" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Type" sortKeyName="type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Email" sortKeyName="email" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Téléphone" sortKeyName="phone" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((c) => (
                <tr key={c.id} onClick={() => setEditing(c)} className="cursor-pointer hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-800">{c.societe ? c.societe : `${c.civilite ? `${c.civilite} ` : ""}${c.first_name} ${c.last_name}`}</td>
                  <td className="px-4 py-2.5 text-stone-500 capitalize">{c.type}</td>
                  <td className="px-4 py-2.5 text-stone-500">{c.email || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-500">{c.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-stone-300"><Pencil size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined && (
        <ContactModal
          contact={editing}
          onCancel={() => setEditing(undefined)}
          onSave={async (fields) => { const ok = await save(fields, editing?.id); if (ok) setEditing(undefined); }}
          onDelete={editing ? async () => { const ok = await remove(editing.id); if (ok) setEditing(undefined); } : null}
        />
      )}
    </div>
  );
}

function ContactModal({ contact, onCancel, onSave, onDelete }) {
  const isNew = !contact;
  const [civilite, setCivilite] = useState(contact?.civilite || "");
  const [firstName, setFirstName] = useState(contact?.first_name || "");
  const [lastName, setLastName] = useState(contact?.last_name || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [address, setAddress] = useState(contact?.address || "");
  const [type, setType] = useState(contact?.type || "locataire");
  const [societe, setSociete] = useState(contact?.societe || "");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center p-4 z-20">
      <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-stone-700">{isNew ? "Nouveau contact" : "Modifier le contact"}</h4>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700" aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Civilité</label>
            <select value={civilite} onChange={(e) => setCivilite(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">—</option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="locataire">Locataire</option>
              <option value="proprietaire">Propriétaire</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Société (si applicable, ex: Vacancéole)</label>
            <input value={societe} onChange={(e) => setSociete(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Prénom</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Nom</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Téléphone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5"><Trash2 size={14} /> Supprimer</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-100">Annuler</button>
            <button
              onClick={() => {
                if (!societe.trim() && (!firstName.trim() || !lastName.trim())) { setError("Prénom et nom (ou société) sont obligatoires."); return; }
                onSave({ civilite: civilite || null, first_name: firstName.trim(), last_name: lastName.trim(), societe: societe.trim() || null, email: email.trim() || null, phone: phone.trim() || null, address: address.trim() || null, type, notes: notes.trim() || null });
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-900 text-white hover:bg-blue-950"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- BIENS ---------------- */

function BiensTab({ biens, baux }) {
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");
  const STATUT_LABELS = { libre: "Libre", loue: "Loué", vendu: "Vendu" };
  const STATUT_TONES = { libre: "text-stone-500 bg-stone-100", loue: "text-emerald-700 bg-emerald-50", vendu: "text-amber-700 bg-amber-50" };
  const activeBauxByBien = useMemo(() => {
    const m = {};
    baux.forEach((b) => { if (b.statut === "actif") m[b.bien_id] = (m[b.bien_id] || 0) + 1; });
    return m;
  }, [baux]);

  async function save(fields, id) {
    const { error } = id
      ? await supabase.from("biens").update(fields).eq("id", id)
      : await supabase.from("biens").insert(fields);
    if (error) { setError("Impossible d'enregistrer ce bien."); return false; }
    setError("");
    return true;
  }
  async function remove(id) {
    const { error } = await supabase.from("biens").delete().eq("id", id);
    if (error) { setError("Ce bien est lié à un contrat : supprimez ou modifiez le contrat d'abord."); return false; }
    setError("");
    return true;
  }

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Biens</h1>
          <p className="text-stone-500 text-sm mt-1">Appartements, garages, parkings…</p>
        </div>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1 text-xs font-medium bg-blue-900 text-white px-3 py-1.5 rounded-md hover:bg-blue-950">
          <Plus size={14} /> Ajouter un bien
        </button>
      </div>
      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {biens.length === 0 && <p className="text-sm text-stone-400 py-8 text-center sm:col-span-2">Aucun bien pour l'instant.</p>}
        {biens.map((b) => (
          <button key={b.id} onClick={() => setEditing(b)} className="text-left bg-white rounded-lg border border-stone-200 p-4 hover:border-blue-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-stone-800 font-medium">{b.name}</p>
                <p className="text-xs text-stone-500 capitalize">{b.type}</p>
              </div>
              <span className={`text-[10px] rounded px-1.5 py-0.5 ${STATUT_TONES[b.statut] || STATUT_TONES.libre}`}>{STATUT_LABELS[b.statut] || "Libre"}</span>
            </div>
            {b.address && <p className="text-xs text-stone-400 mt-2">{b.address}</p>}
          </button>
        ))}
      </div>

      {editing !== undefined && (
        <BienModal
          bien={editing}
          onCancel={() => setEditing(undefined)}
          onSave={async (fields) => { const ok = await save(fields, editing?.id); if (ok) setEditing(undefined); }}
          onDelete={editing ? async () => { const ok = await remove(editing.id); if (ok) setEditing(undefined); } : null}
        />
      )}
    </div>
  );
}

function BienModal({ bien, onCancel, onSave, onDelete }) {
  const isNew = !bien;
  const [name, setName] = useState(bien?.name || "");
  const [address, setAddress] = useState(bien?.address || "");
  const [type, setType] = useState(bien?.type || "autre");
  const [statut, setStatut] = useState(bien?.statut || "libre");
  const [surfaceM2, setSurfaceM2] = useState(bien?.surface_m2 != null ? String(bien.surface_m2) : "");
  const [complementDesignation, setComplementDesignation] = useState(bien?.complement_designation || "");
  const [dateAcquisition, setDateAcquisition] = useState(bien?.date_acquisition || "");
  const [prixAchat, setPrixAchat] = useState(bien?.prix_achat != null ? String(bien.prix_achat) : "");
  const [prixNotaire, setPrixNotaire] = useState(bien?.prix_notaire != null ? String(bien.prix_notaire) : "");
  const [prixMobilier, setPrixMobilier] = useState(bien?.prix_mobilier != null ? String(bien.prix_mobilier) : "");
  const [apport, setApport] = useState(bien?.apport != null ? String(bien.apport) : "");
  const [montantPret, setMontantPret] = useState(bien?.montant_pret != null ? String(bien.montant_pret) : "");
  const [notes, setNotes] = useState(bien?.notes || "");
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center p-4 z-20">
      <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-stone-700">{isNew ? "Nouveau bien" : "Modifier le bien"}</h4>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700" aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Garage N°12 Caluire" className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
              <option value="garage">Garage</option>
              <option value="parking">Parking</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Statut</label>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="libre">Libre</option>
              <option value="loue">Loué</option>
              <option value="vendu">Vendu</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date d'acquisition</label>
            <input type="date" value={dateAcquisition} onChange={(e) => setDateAcquisition(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Surface (m²)</label>
            <input type="number" min="0" value={surfaceM2} onChange={(e) => setSurfaceM2(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Prix immobilier (€)</label>
            <input type="number" min="0" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-600 mb-2">Coûts d'acquisition (pour la Synthèse)</p>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Frais de notaire (€)</label>
            <input type="number" min="0" value={prixNotaire} onChange={(e) => setPrixNotaire(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Mobilier (€)</label>
            <input type="number" min="0" value={prixMobilier} onChange={(e) => setPrixMobilier(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Apport (€)</label>
            <input type="number" min="0" value={apport} onChange={(e) => setApport(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Montant emprunté (€)</label>
            <input type="number" min="0" value={montantPret} onChange={(e) => setMontantPret(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Désignation complémentaire (bâtiment, étage, équipements...)</label>
            <textarea value={complementDesignation} onChange={(e) => setComplementDesignation(e.target.value)} rows={2} placeholder="Bâtiment A, 8ème étage, cave n°59, ascenseur, chauffage collectif..." className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5"><Trash2 size={14} /> Supprimer</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-100">Annuler</button>
            <button
              onClick={() => {
                if (!name.trim()) { setError("Le nom est obligatoire."); return; }
                onSave({
                  name: name.trim(), address: address.trim() || null, type, statut,
                  surface_m2: surfaceM2 ? parseFloat(surfaceM2) : null,
                  complement_designation: complementDesignation.trim() || null,
                  date_acquisition: dateAcquisition || null,
                  prix_achat: prixAchat ? parseFloat(prixAchat) : null,
                  prix_notaire: prixNotaire ? parseFloat(prixNotaire) : null,
                  prix_mobilier: prixMobilier ? parseFloat(prixMobilier) : null,
                  apport: apport ? parseFloat(apport) : null,
                  montant_pret: montantPret ? parseFloat(montantPret) : null,
                  notes: notes.trim() || null,
                });
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-900 text-white hover:bg-blue-950"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SUIVI DES ÉCRITURES ---------------- */

const CATEGORIES_SUIVI = ["Loyer", "Variable", "Charges", "Taxe Foncière", "Assurance", "Compta", "TVA", "Impot", "Caution", "Divers"];

function SuiviTab({ biens, baux, contacts, bienById }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBien, setFilterBien] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase.from("ecritures_locatives").select("*").order("date", { ascending: false });
    if (!error) setEntries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel("suivi-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ecritures_locatives" }, fetchEntries)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchEntries]);

  async function save(fields, id) {
    const query = id
      ? supabase.from("ecritures_locatives").update(fields).eq("id", id).select().single()
      : supabase.from("ecritures_locatives").insert(fields).select().single();
    const { data, error } = await query;
    if (error) { setError("Impossible d'enregistrer cette écriture."); return null; }
    setError("");
    return data;
  }
  async function remove(id) {
    const { error } = await supabase.from("ecritures_locatives").delete().eq("id", id);
    if (error) { setError("Impossible de supprimer cette écriture."); return false; }
    setError("");
    return true;
  }

  function bailAndLocataireFor(entry) {
    let bail = entry.bail_id ? baux.find((b) => b.id === entry.bail_id) : null;
    if (!bail) {
      const candidates = baux.filter((b) => b.bien_id === entry.bien_id);
      bail = candidates.find((b) => entry.date >= b.date_debut && (!b.date_fin || entry.date <= b.date_fin)) || candidates[0] || null;
    }
    const locataire = bail ? contacts.find((c) => c.id === bail.locataire_id) : null;
    return { bail, locataire };
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const totalsByBien = useMemo(() => {
    const m = {};
    entries.forEach((e) => {
      if (!m[e.bien_id]) m[e.bien_id] = { credit: 0, debit: 0 };
      m[e.bien_id][e.type] += Number(e.amount);
    });
    return m;
  }, [entries]);

  const visible = useMemo(() => {
    let list = filterBien ? entries.filter((e) => e.bien_id === filterBien) : entries;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) =>
        e.label.toLowerCase().includes(q) ||
        e.categorie.toLowerCase().includes(q) ||
        (bienById[e.bien_id]?.name || "").toLowerCase().includes(q) ||
        (e.reference_paiement || "").toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "bien": av = bienById[a.bien_id]?.name || ""; bv = bienById[b.bien_id]?.name || ""; break;
        case "categorie": av = a.categorie; bv = b.categorie; break;
        case "label": av = a.label; bv = b.label; break;
        case "amount": av = Number(a.amount) * (a.type === "credit" ? 1 : -1); bv = Number(b.amount) * (b.type === "credit" ? 1 : -1); break;
        case "reference": av = a.reference_paiement || ""; bv = b.reference_paiement || ""; break;
        default: av = a.date; bv = b.date;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [entries, filterBien, search, sortKey, sortDir, bienById]);

  if (loading) return <div className="p-8 text-sm text-stone-400">Chargement…</div>;

  function SortableTh({ label, sortKeyName, align }) {
    const active = sortKey === sortKeyName;
    return (
      <th
        onClick={() => handleSort(sortKeyName)}
        className={`px-4 py-2 font-medium cursor-pointer select-none hover:text-stone-700 ${align === "right" ? "text-right" : "text-left"}`}
      >
        {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </th>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-5 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Suivi des écritures</h1>
          <p className="text-stone-500 text-sm mt-1">Loyers, charges, taxes et autres mouvements par bien.</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          disabled={!biens.length}
          className="flex items-center gap-1 text-xs font-medium bg-blue-900 text-white px-3 py-1.5 rounded-md hover:bg-blue-950 disabled:opacity-40"
        >
          <Plus size={14} /> Ajouter une écriture
        </button>
      </div>
      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}

      <div className="flex flex-col sm:flex-row gap-4">
        <aside className="sm:w-64 shrink-0 space-y-1">
          <button
            onClick={() => setFilterBien(null)}
            className={`w-full flex items-center justify-between text-left text-sm px-3 py-2 rounded-md ${filterBien === null ? "bg-blue-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"}`}
          >
            <span>Tous les biens</span>
            <span className={filterBien === null ? "text-blue-100" : "text-stone-400"}>{entries.length}</span>
          </button>
          {biens.map((b) => {
            const t = totalsByBien[b.id] || { credit: 0, debit: 0 };
            const net = t.credit - t.debit;
            return (
              <button
                key={b.id}
                onClick={() => setFilterBien(b.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-md ${filterBien === b.id ? "bg-blue-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{b.name}</span>
                </div>
                <span className={`text-xs ${filterBien === b.id ? "text-blue-100" : net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatEUR(net)} net
                </span>
              </button>
            );
          })}
        </aside>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (libellé, catégorie, bien, référence...)"
            className="w-full px-3 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
            {visible.length === 0 ? (
              <p className="text-sm text-stone-400 py-8 text-center">Aucune écriture.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                    <SortableTh label="Date" sortKeyName="date" />
                    <SortableTh label="Bien" sortKeyName="bien" />
                    <SortableTh label="Catégorie" sortKeyName="categorie" />
                    <SortableTh label="Libellé" sortKeyName="label" />
                    <SortableTh label="Réf. paiement" sortKeyName="reference" />
                    <SortableTh label="Montant" sortKeyName="amount" align="right" />
                    <th className="px-4 py-2 font-medium w-24">Document</th>
                    <th className="px-4 py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {visible.map((e) => {
                    const isCredit = e.type === "credit";
                    const { bail, locataire } = bailAndLocataireFor(e);
                    const bien = bienById[e.bien_id];
                    const canDoc = bien && (e.categorie === "Loyer" || e.categorie === "Variable" || e.categorie === "Caution");
                    const isPaid = !!e.reference_paiement;
                    return (
                      <tr key={e.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-stone-500 text-xs cursor-pointer" onClick={() => setEditing(e)}>{formatDateFR(e.date)}</td>
                        <td className="px-4 py-2.5 text-stone-700 cursor-pointer" onClick={() => setEditing(e)}>{bien?.name || "—"}</td>
                        <td className="px-4 py-2.5 text-stone-500 text-xs cursor-pointer" onClick={() => setEditing(e)}>{e.categorie}</td>
                        <td className="px-4 py-2.5 text-stone-600 cursor-pointer" onClick={() => setEditing(e)}>{e.label}</td>
                        <td className="px-4 py-2.5 text-stone-400 text-xs cursor-pointer" onClick={() => setEditing(e)}>{e.reference_paiement || "—"}</td>
                        <td className={`px-4 py-2.5 text-right font-mono cursor-pointer ${isCredit ? "text-emerald-700" : "text-rose-700"}`} onClick={() => setEditing(e)}>
                          {isCredit ? "+" : "-"}{formatEUR(Number(e.amount))}
                        </td>
                        <td className="px-4 py-2.5">
                          {canDoc && (
                            <button
                              onClick={() =>
                                e.categorie === "Caution"
                                  ? generateCautionReceiptPdf(e, bien, bail, locataire)
                                  : isPaid
                                  ? generateQuittancePdf(e, bien, bail, locataire)
                                  : generateAvisEcheancePdf(e, bien, bail, locataire)
                              }
                              className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-950"
                            >
                              <Download size={12} />
                              {e.categorie === "Caution" ? "Reçu" : isPaid ? "Quittance" : "Avis"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-stone-300 cursor-pointer" onClick={() => setEditing(e)}><Pencil size={14} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editing !== undefined && (
        <EcritureModal
          entry={editing}
          biens={biens}
          baux={baux}
          onCancel={() => setEditing(undefined)}
          onSave={async (fields) => {
            const saved = await save(fields, editing?.id);
            if (saved) {
              setEditing(undefined);
              if (saved.reference_paiement) {
                const bien = bienById[saved.bien_id];
                if (bien) {
                  const { bail, locataire } = bailAndLocataireFor(saved);
                  if (saved.categorie === "Caution") generateCautionReceiptPdf(saved, bien, bail, locataire);
                  else if (saved.categorie === "Loyer" || saved.categorie === "Variable") generateQuittancePdf(saved, bien, bail, locataire);
                }
              }
            }
          }}
          onDelete={editing ? async () => { const ok = await remove(editing.id); if (ok) setEditing(undefined); } : null}
        />
      )}
    </div>
  );
}

function EcritureModal({ entry, biens, baux, onCancel, onSave, onDelete }) {
  const isNew = !entry;
  const [bienId, setBienId] = useState(entry?.bien_id || biens[0]?.id || "");
  const [bailId, setBailId] = useState(entry?.bail_id || "");
  const [categorie, setCategorie] = useState(entry?.categorie || CATEGORIES_SUIVI[0]);
  const [label, setLabel] = useState(entry?.label || "");
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [type, setType] = useState(entry?.type || "debit");
  const [date, setDate] = useState(entry?.date || todayISO());
  const [referencePaiement, setReferencePaiement] = useState(entry?.reference_paiement || "");
  const [datePaiement, setDatePaiement] = useState(entry?.date_paiement || "");
  const [error, setError] = useState("");

  const bauxForBien = baux.filter((b) => b.bien_id === bienId);

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center p-4 z-20">
      <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-stone-700">{isNew ? "Nouvelle écriture" : "Modifier l'écriture"}</h4>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700" aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Bien</label>
            <select value={bienId} onChange={(e) => { setBienId(e.target.value); setBailId(""); }} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {biens.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {bauxForBien.length > 0 && (
            <div className="sm:col-span-2">
              <label className="text-xs text-stone-500 block mb-1">Bail lié (optionnel)</label>
              <select value={bailId} onChange={(e) => setBailId(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">—</option>
                {bauxForBien.map((b) => <option key={b.id} value={b.id}>Bail du {formatDateFR(b.date_debut)}{b.date_fin ? ` au ${formatDateFR(b.date_fin)}` : ""}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-stone-500 block mb-1">Catégorie</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CATEGORIES_SUIVI.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="debit">Débit (dépense)</option>
              <option value="credit">Crédit (recette)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Libellé</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Montant (€)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date (terme / échéance)</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-600 mb-2">Paiement (pour la quittance)</p>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Référence de paiement</label>
            <input value={referencePaiement} onChange={(e) => setReferencePaiement(e.target.value)} placeholder="VH11503GERARC601" className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date de paiement</label>
            <input type="date" value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5"><Trash2 size={14} /> Supprimer</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-100">Annuler</button>
            <button
              onClick={() => {
                const amt = parseFloat(amount);
                if (!label.trim()) { setError("Entrez un libellé."); return; }
                if (!(amt > 0)) { setError("Entrez un montant supérieur à 0."); return; }
                if (!date) { setError("Entrez une date."); return; }
                onSave({ bien_id: bienId, bail_id: bailId || null, categorie, label: label.trim(), amount: amt, type, date, reference_paiement: referencePaiement.trim() || null, date_paiement: datePaiement || null });
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-900 text-white hover:bg-blue-950"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- BAUX (CONTRATS) ---------------- */

const BAILLEUR_DEFAULT = "Mme MAIELLARO-DENEUX Virginie";
const BAILLEUR_ADDRESS_DEFAULT = "543 route des Echets, 01700 Miribel, France";
const NAVY = [30, 41, 82];
const NAVY_LIGHT = [230, 234, 244];

function pdfDoc() {
  return new jsPDF();
}

function addLetterhead(doc, title, subtitle) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 105, 13, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(subtitle, 105, 20, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text(
    "Soumis au titre Ier bis de la loi du 6 juillet 1989 tendant à améliorer les rapports locatifs",
    105, 32, { align: "center" }
  );
  doc.setTextColor(0, 0, 0);
  return 40;
}

function makeSectionWriter(doc, startY) {
  let y = startY;
  const marginX = 18;
  const maxWidth = 174;
  const labelColWidth = 42;

  function ensureSpace(lines = 1) {
    if (y + lines * 5 > 275) {
      doc.addPage();
      y = 20;
    }
  }
  function heading(text) {
    ensureSpace(2);
    doc.setFillColor(...NAVY_LIGHT);
    doc.rect(marginX, y - 4.5, maxWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(text.toUpperCase(), marginX + 2, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
  }
  function field(label, value) {
    ensureSpace();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${label} :`, marginX, y);
    doc.setFont("helvetica", "normal");
    const split = doc.splitTextToSize(String(value ?? ""), maxWidth - labelColWidth);
    doc.text(split, marginX + labelColWidth, y);
    y += 5 * split.length;
  }
  function paragraph(text) {
    ensureSpace();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const split = doc.splitTextToSize(text, maxWidth);
    split.forEach((line) => {
      ensureSpace();
      doc.text(line, marginX, y);
      y += 5;
    });
  }
  function bullet(text) {
    ensureSpace();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const split = doc.splitTextToSize(text, maxWidth - 5);
    doc.text("•", marginX, y);
    doc.text(split, marginX + 4, y);
    y += 5 * split.length;
  }
  function financeTable(rows) {
    ensureSpace(rows.length + 2);
    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: 18 },
      tableWidth: maxWidth,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9.5, cellPadding: 2.2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 64, halign: "right" } },
      head: [["Montant des paiements", ""]],
      body: rows,
      didParseCell: (data) => {
        if (data.row.raw[0] && String(data.row.raw[0]).startsWith("Total")) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [245, 246, 250];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }
  function spacer(h = 3) { y += h; }
  function getY() { return y; }
  function setY(v) { y = v; }

  return { heading, field, paragraph, bullet, financeTable, spacer, getY, setY, marginX, maxWidth, doc };
}

function locataireDisplayName(c) {
  if (!c) return "________________________________";
  if (c.societe) return `${c.societe}${c.first_name || c.last_name ? `, représentée par ${c.civilite ? `${c.civilite} ` : ""}${c.first_name} ${c.last_name}` : ""}`;
  return `${c.civilite ? `${c.civilite} ` : ""}${c.first_name} ${c.last_name}`;
}

function signatureBlock(w, y0) {
  const { doc, marginX } = w;
  w.setY(y0);
  w.spacer(6);
  if (w.getY() > 250) { doc.addPage(); w.setY(20); }
  const y = w.getY();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait à ________________________, le ${formatDateFR(todayISO())}, en 2 exemplaires.`, marginX, y);

  const boxY = y + 6;
  const boxW = 80, boxH = 32;
  doc.setDrawColor(180);
  doc.roundedRect(marginX, boxY, boxW, boxH, 1, 1);
  doc.roundedRect(marginX + 94, boxY, boxW, boxH, 1, 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LE BAILLEUR", marginX + 3, boxY + 6);
  doc.text("LE LOCATAIRE", marginX + 97, boxY + 6);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text('Signature précédée de la mention', marginX + 3, boxY + 12);
  doc.text('manuscrite « Lu et approuvé »', marginX + 3, boxY + 16);
  doc.text('Signature précédée de la mention', marginX + 97, boxY + 12);
  doc.text('manuscrite « Lu et approuvé »', marginX + 97, boxY + 16);
}

function addPageNumbers(doc) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} / ${total}`, 192, 290, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

/* -------- Modèle Garage (fidèle à "Bail location Garage") -------- */

function generateGarageContractPdf(bail, bien, locataire) {
  const doc = pdfDoc();
  const startY = addLetterhead(doc, "Contrat de Location", "Garage");
  const w = makeSectionWriter(doc, startY);

  w.heading("Désignation des parties");
  w.field("Le bailleur", bail.bailleur_nom || BAILLEUR_DEFAULT);
  w.field("Adresse", BAILLEUR_ADDRESS_DEFAULT);
  w.spacer(2);
  w.field("Le locataire", locataireDisplayName(locataire));
  if (locataire?.address) w.field("Adresse", locataire.address);
  if (locataire?.phone) w.field("Téléphone", locataire.phone);
  if (locataire?.email) w.field("Email", locataire.email);
  w.spacer(2);
  w.paragraph('Ensemble dénommés les « Parties ». Il a été convenu ce qui suit :');

  w.spacer(4);
  w.heading("Conditions financières");
  const total = Number(bail.loyer_hors_charges) + Number(bail.charges);
  w.financeTable([
    ["Loyer hors charges", formatEUR2(bail.loyer_hors_charges)],
    ["Provision sur charges", formatEUR2(bail.charges)],
    ["Total mensuel", formatEUR2(total)],
    ["Dépôt de garantie", formatEUR2(bail.depot_garantie)],
  ]);
  w.paragraph(`Paiement d'avance, en totalité, le ${bail.jour_paiement} de chaque mois, entre les mains du bailleur.`);

  w.spacer(3);
  w.heading("Désignation des locaux");
  w.field("Bien", bien.name);
  if (bien.surface_m2) w.field("Surface", `${bien.surface_m2} m²`);
  if (bien.address) w.field("Adresse", bien.address);
  if (bien.complement_designation) w.field("Détails", bien.complement_designation);

  w.spacer(3);
  w.heading("Durée et renouvellement");
  w.paragraph(
    `Le présent bail est conclu pour une durée d'une année. Il prendra effet le ${formatDateFR(bail.date_debut)}` +
    (bail.date_fin ? ` et se terminera le ${formatDateFR(bail.date_fin)}.` : `.`) +
    " À défaut de résiliation donnée dans les formes prescrites par le présent bail, ce dernier sera ensuite renouvelé par tacite reconduction par période d'un an."
  );

  w.spacer(3);
  w.heading("Charges et taxes");
  w.paragraph(`Les charges et taxes sont payables d'avance et en totalité le ${bail.jour_paiement} de chaque mois, entre les mains du bailleur (versement RIB). Le montant de la taxe foncière est intégralement à la charge du propriétaire.`);

  w.spacer(3);
  w.heading("Dépôt de garantie");
  w.paragraph(`Le preneur verse, à la signature du présent contrat, un dépôt de garantie de ${formatEUR2(bail.depot_garantie)}, lequel ne sera pas productif d'intérêts. Ce dépôt sera remboursé à la fin de la location, après remise des équipements et déduction faite des éventuelles réparations locatives à effectuer.`);

  w.spacer(3);
  w.heading("Destination des locaux");
  w.paragraph("Le garage, objet du présent contrat, est loué à des fins de stationnement ou de stockage de matériel. Toute autre utilisation ou toute sous-location nécessite l'accord écrit préalable du bailleur.");

  w.spacer(3);
  w.heading("Résiliation du contrat");
  w.paragraph("Il peut être mis fin au présent contrat par l'une ou l'autre des parties, à tout moment, à la condition de respecter un délai de préavis d'1 mois. Le congé devra être notifié par lettre recommandée avec demande d'avis de réception.");

  w.spacer(3);
  w.heading("Obligations du locataire");
  w.bullet("Payer le loyer et les charges aux termes convenus.");
  w.bullet("Utiliser le garage conformément à sa destination (stockage, stationnement).");
  w.bullet("Répondre des dégradations et pertes survenues durant la location.");
  w.bullet("Entretenir le garage et restituer les équipements en fin de bail.");
  w.bullet("Ne pas transformer le garage sans accord écrit du bailleur, ni le sous-louer.");

  w.spacer(3);
  w.heading("Clause résolutoire et clause pénale");
  w.paragraph("Tout retard de paiement entraîne une majoration de 10% des sommes dues. Le bail sera résilié de plein droit 2 mois après un commandement de payer resté sans effet.");

  if (bail.notes) {
    w.spacer(3);
    w.heading("Conditions particulières");
    w.paragraph(bail.notes);
  }

  signatureBlock(w, w.getY() + 4);
  addPageNumbers(doc);

  doc.save(`contrat-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${(locataire?.last_name || locataire?.societe || "locataire").replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

/* -------- Modèle Logement non meublé (fidèle à "Bail location non meublée") -------- */

function generateResidentialContractPdf(bail, bien, locataire) {
  const doc = pdfDoc();
  const startY = addLetterhead(doc, "Contrat de Location", "Logement non meublé");
  const w = makeSectionWriter(doc, startY);

  w.heading("Désignation des parties");
  w.field("Le bailleur", bail.bailleur_nom || BAILLEUR_DEFAULT);
  w.field("Adresse", BAILLEUR_ADDRESS_DEFAULT);
  w.spacer(2);
  w.field("Le locataire", locataireDisplayName(locataire));
  if (locataire?.address) w.field("Adresse", locataire.address);
  if (locataire?.phone) w.field("Téléphone", locataire.phone);
  if (locataire?.email) w.field("Email", locataire.email);
  w.spacer(2);
  w.paragraph('Ensemble dénommés les « Parties ». Il a été convenu ce qui suit :');

  w.spacer(4);
  w.heading("Conditions financières");
  const total = Number(bail.loyer_hors_charges) + Number(bail.charges);
  w.financeTable([
    ["Loyer hors charges", formatEUR2(bail.loyer_hors_charges)],
    ["Provision sur charges", formatEUR2(bail.charges)],
    ["Total mensuel", formatEUR2(total)],
    ["Dépôt de garantie", formatEUR2(bail.depot_garantie)],
  ]);

  w.spacer(3);
  w.heading("Désignation des locaux");
  w.field("Bien", bien.name);
  if (bien.surface_m2) w.field("Surface habitable", `${bien.surface_m2} m²`);
  if (bien.address) w.field("Adresse", bien.address);
  if (bien.complement_designation) w.field("Détails", bien.complement_designation);
  w.paragraph("Loué à usage de résidence principale. Le locataire déclare parfaitement connaître les lieux pour les avoir vus et visités, et reconnaît qu'ils sont en bon état d'usage et d'entretien.");

  w.spacer(3);
  w.heading("Durée et renouvellement");
  w.paragraph(
    `Durée du contrat : 3 ans (6 ans si le bailleur est une personne morale), reconductible par tacite reconduction. ` +
    `Date de départ du bail : ${formatDateFR(bail.date_debut)}.` +
    (bail.date_fin ? ` Date de fin de bail : ${formatDateFR(bail.date_fin)}.` : "")
  );
  w.paragraph("Le locataire peut mettre fin au bail à tout moment après avoir donné congé. Le bailleur peut mettre fin au bail à son échéance, après avoir donné congé, pour reprendre le logement, le vendre, ou pour motif légitime et sérieux.");

  w.spacer(3);
  w.heading("Assurance multirisque habitation");
  w.paragraph("Le locataire est tenu de s'assurer contre les risques locatifs et d'en justifier à la remise des clés puis chaque année à la demande du bailleur.");

  w.spacer(3);
  w.heading("Le loyer — révision");
  w.paragraph(`Le loyer est payable d'avance le ${bail.jour_paiement} de chaque mois. Il sera indexé chaque année, à la date anniversaire du contrat, sur l'indice de référence des loyers (IRL).`);

  w.spacer(3);
  w.heading("Les charges");
  w.paragraph("Le locataire s'oblige à acquitter les charges, prestations et impositions récupérables mises à sa charge, sous forme de provisions mensuelles régularisées chaque année conformément à l'article 23 de la loi du 6 juillet 1989.");

  w.spacer(3);
  w.heading("Dépôt de garantie");
  w.paragraph(`Le locataire verse ce jour un dépôt de garantie de ${formatEUR2(bail.depot_garantie)} (un mois de loyer hors charges). Il sera restitué sans intérêt en fin de bail, dans un délai d'1 mois si l'état des lieux de sortie est conforme, ou de 2 mois dans le cas contraire.`);

  w.spacer(3);
  w.heading("Résiliation du contrat");
  w.paragraph("Par le locataire : à tout moment, moyennant un préavis de 3 mois (réduit à 1 mois dans certains cas prévus par la loi). Par le bailleur : à l'expiration du bail, moyennant un préavis de 6 mois. Le congé est notifié par lettre recommandée avec accusé de réception.");

  w.spacer(3);
  w.heading("Obligations des parties");
  w.paragraph("Outre les obligations prévues par la loi du 6 juillet 1989, le bailleur délivre gratuitement une quittance au locataire sur demande. Le locataire doit laisser visiter les lieux en cas de congé ou de mise en vente, et ne peut sous-louer sans accord écrit préalable du bailleur.");

  w.spacer(3);
  w.heading("Clause de solidarité");
  w.paragraph("En cas de pluralité de locataires, il y a solidarité et indivisibilité entre eux pour le paiement de toutes les sommes dues en application du présent bail.");

  w.spacer(3);
  w.heading("Clause résolutoire");
  w.paragraph("À défaut de paiement du loyer, des charges, ou du dépôt de garantie, le bail sera résilié de plein droit 2 mois après un commandement de payer resté sans effet.");

  w.spacer(3);
  w.heading("Élection de domicile");
  w.paragraph("Pour l'exécution des présentes, le bailleur fait élection de domicile en son domicile (ou celui de son mandataire), et le locataire dans les lieux loués.");

  if (bail.notes) {
    w.spacer(3);
    w.heading("Conditions particulières");
    w.paragraph(bail.notes);
  }

  w.spacer(3);
  w.heading("Pièces annexées au contrat");
  w.paragraph("État des lieux établi contradictoirement lors de la remise des clefs. Le cas échéant, acte de caution solidaire.");

  signatureBlock(w, w.getY() + 4);
  addPageNumbers(doc);

  doc.save(`contrat-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${(locataire?.last_name || locataire?.societe || "locataire").replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

function generateContractPdf(bail, bien, locataire) {
  if (bien.type === "garage" || bien.type === "parking") {
    generateGarageContractPdf(bail, bien, locataire);
  } else {
    generateResidentialContractPdf(bail, bien, locataire);
  }
}

/* -------- Avis d'échéance / Quittance / Reçu de caution -------- */

const MOIS_NOMS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
function periodeLabel(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return `${MOIS_NOMS[m - 1]} ${y}`.toUpperCase();
}

function partiesBlock(w, bail, bien, locataire) {
  w.field("Bailleur", bail?.bailleur_nom || BAILLEUR_DEFAULT);
  w.field("Adresse bailleur", BAILLEUR_ADDRESS_DEFAULT);
  w.spacer(2);
  w.field("Locataire / Destinataire", locataireDisplayName(locataire));
  if (locataire?.address) w.field("Adresse", locataire.address);
  w.spacer(3);
  w.heading("Locaux concernés");
  w.field("Bien", bien.name);
  if (bien.address) w.field("Adresse", bien.address);
}

function detailLoyerRows(entry, bail) {
  if (bail && (Number(bail.loyer_hors_charges) > 0 || Number(bail.charges) > 0)) {
    const total = Number(bail.loyer_hors_charges) + Number(bail.charges);
    return [
      ["Loyer nu", formatEUR2(bail.loyer_hors_charges)],
      ["Charges / provisions de charges", formatEUR2(bail.charges)],
      ["Montant total du terme", formatEUR2(total)],
    ];
  }
  return [["Montant total du terme", formatEUR2(entry.amount)]];
}

function generateAvisEcheancePdf(entry, bien, bail, locataire) {
  const doc = pdfDoc();
  const startY = addLetterhead(doc, "Avis d'échéance de loyer", periodeLabel(entry.date));
  const w = makeSectionWriter(doc, startY);

  w.heading("Désignation des parties");
  partiesBlock(w, bail, bien, locataire);

  w.spacer(4);
  w.heading("Somme à payer");
  w.paragraph(`Au premier jour de la période de : ${periodeLabel(entry.date)}${bail ? `, soit le ${bail.jour_paiement} du mois` : ""}.`);
  w.financeTable(detailLoyerRows(entry, bail));

  w.spacer(4);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.text("Cet avis ne peut en aucun cas faire office de quittance.", w.marginX, w.getY());
  w.spacer(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait à Lyon, le ${formatDateFR(todayISO())}`, w.marginX, w.getY());

  addPageNumbers(doc);
  doc.save(`avis-echeance-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${entry.date}.pdf`);
}

function generateQuittancePdf(entry, bien, bail, locataire) {
  const doc = pdfDoc();
  const startY = addLetterhead(doc, "Quittance de loyer", periodeLabel(entry.date));
  const w = makeSectionWriter(doc, startY);

  w.heading("Désignation des parties");
  partiesBlock(w, bail, bien, locataire);

  w.spacer(4);
  w.heading("Règlement reçu");
  const paiementTxt = entry.reference_paiement
    ? `La somme de ${formatEUR2(entry.amount)} a été reçue par virement bancaire, référence ${entry.reference_paiement}${entry.date_paiement ? `, le ${formatDateFR(entry.date_paiement)}` : ""}.`
    : `La somme de ${formatEUR2(entry.amount)} a été reçue en règlement du terme ci-dessous.`;
  w.paragraph(paiementTxt);
  w.paragraph(`En paiement du terme de : ${periodeLabel(entry.date)}.`);
  w.financeTable(detailLoyerRows(entry, bail));

  w.spacer(4);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(110);
  const disclaimer = doc.splitTextToSize(
    "Le paiement de la présente n'emporte pas présomption de paiement des termes antérieurs. Cette quittance annule tous les reçus qui auraient pu être donnés pour acompte versé sur le présent terme. En cas de congé précédemment donné, cette quittance représenterait l'indemnité d'occupation et ne saurait être considérée comme un titre d'occupation. Sous réserve d'encaissement.",
    w.maxWidth
  );
  doc.text(disclaimer, w.marginX, w.getY());
  doc.setTextColor(0, 0, 0);
  w.setY(w.getY() + 5 * disclaimer.length + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait à Lyon, le ${formatDateFR(entry.date_paiement || todayISO())}`, w.marginX, w.getY());

  addPageNumbers(doc);
  doc.save(`quittance-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${entry.date}.pdf`);
}

function generateCautionReceiptPdf(entry, bien, bail, locataire) {
  const doc = pdfDoc();
  const startY = addLetterhead(doc, "Reçu de dépôt de garantie", bien.name);
  const w = makeSectionWriter(doc, startY);

  w.heading("Désignation des parties");
  partiesBlock(w, bail, bien, locataire);

  w.spacer(4);
  w.heading("Dépôt reçu");
  const paiementTxt = entry.reference_paiement
    ? `La somme de ${formatEUR2(entry.amount)} a été reçue par virement bancaire, référence ${entry.reference_paiement}${entry.date_paiement ? `, le ${formatDateFR(entry.date_paiement)}` : ""}.`
    : `La somme de ${formatEUR2(entry.amount)} a été reçue au titre du dépôt de garantie.`;
  w.paragraph(paiementTxt);
  w.paragraph("Le dépôt de garantie ne produit pas d'intérêts. Il sera remboursé, lorsqu'il sera payable, minoré des éventuelles retenues prévues au contrat de bail, dans les conditions et délais fixés par la réglementation en vigueur.");

  w.spacer(6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fait à Lyon, le ${formatDateFR(entry.date_paiement || todayISO())}`, w.marginX, w.getY());

  addPageNumbers(doc);
  doc.save(`recu-caution-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${entry.date}.pdf`);
}


function BauxTab({ baux, biens, contacts, bienById, contactById }) {
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");

  const getters = useMemo(() => ({
    bien: (b) => bienById[b.bien_id]?.name,
    locataire: (b) => { const l = contactById[b.locataire_id]; return l ? (l.societe || `${l.last_name} ${l.first_name}`) : ""; },
    loyer: (b) => Number(b.loyer_hors_charges) + Number(b.charges),
    debut: (b) => b.date_debut,
    statut: (b) => b.statut,
  }), [bienById, contactById]);
  const { search, setSearch, sortKey, sortDir, handleSort, visible } = useSortSearch(baux, getters, "debut");

  async function save(fields, id) {
    const { error } = id
      ? await supabase.from("baux").update(fields).eq("id", id)
      : await supabase.from("baux").insert(fields);
    if (error) { setError("Impossible d'enregistrer ce contrat."); return false; }
    setError("");
    return true;
  }
  async function remove(id) {
    const { error } = await supabase.from("baux").delete().eq("id", id);
    if (error) { setError("Impossible de supprimer ce contrat."); return false; }
    setError("");
    return true;
  }

  return (
    <div className="max-w-4xl mx-auto p-5 sm:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-blue-900 tracking-tight">Contrats</h1>
          <p className="text-stone-500 text-sm mt-1">Baux liant un contact à un bien.</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          disabled={!biens.length || !contacts.length}
          className="flex items-center gap-1 text-xs font-medium bg-blue-900 text-white px-3 py-1.5 rounded-md hover:bg-blue-950 disabled:opacity-40"
        >
          <Plus size={14} /> Nouveau contrat
        </button>
      </div>
      {(!biens.length || !contacts.length) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Ajoute au moins un bien et un contact avant de créer un contrat.
        </p>
      )}
      {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un contrat..."
        className="w-full px-3 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">Aucun contrat.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <SortableTh label="Bien" sortKeyName="bien" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Locataire" sortKeyName="locataire" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Loyer + charges" sortKeyName="loyer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <SortableTh label="Début" sortKeyName="debut" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableTh label="Statut" sortKeyName="statut" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-2 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((b) => {
                const bien = bienById[b.bien_id];
                const loc = contactById[b.locataire_id];
                return (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <td className="px-4 py-2.5 text-stone-800 cursor-pointer" onClick={() => setEditing(b)}>{bien?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-600 cursor-pointer" onClick={() => setEditing(b)}>{loc ? (loc.societe || `${loc.first_name} ${loc.last_name}`) : "—"}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-stone-700 cursor-pointer" onClick={() => setEditing(b)}>
                      {formatEUR(Number(b.loyer_hors_charges) + Number(b.charges))}
                    </td>
                    <td className="px-4 py-2.5 text-stone-500 text-xs cursor-pointer" onClick={() => setEditing(b)}>{formatDateFR(b.date_debut)}</td>
                    <td className="px-4 py-2.5 text-xs cursor-pointer" onClick={() => setEditing(b)}>
                      <span className={`px-1.5 py-0.5 rounded ${b.statut === "actif" ? "text-emerald-700 bg-emerald-50" : "text-stone-500 bg-stone-100"}`}>
                        {b.statut === "actif" ? "Actif" : "Terminé"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {bien && loc && (
                        <button
                          onClick={() => generateContractPdf(b, bien, loc)}
                          className="flex items-center gap-1 text-xs text-blue-800 hover:text-blue-950"
                        >
                          <Download size={13} /> PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing !== undefined && (
        <BailModal
          bail={editing}
          biens={biens}
          contacts={contacts}
          onCancel={() => setEditing(undefined)}
          onSave={async (fields) => { const ok = await save(fields, editing?.id); if (ok) setEditing(undefined); }}
          onDelete={editing ? async () => { const ok = await remove(editing.id); if (ok) setEditing(undefined); } : null}
        />
      )}
    </div>
  );
}

function BailDocuments({ bailId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const fetchDocs = useCallback(async () => {
    const { data, error } = await supabase.from("bail_documents").select("*").eq("bail_id", bailId).order("document_date", { ascending: true });
    if (!error) setDocs(data || []);
    setLoading(false);
  }, [bailId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleUpload() {
    if (!file) { setError("Choisis un fichier."); return; }
    if (!title.trim()) { setError("Donne un titre au document."); return; }
    setUploading(true);
    setError("");
    const path = `${bailId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) { setError("Échec de l'envoi du fichier."); setUploading(false); return; }
    const { error: insertError } = await supabase.from("bail_documents").insert({
      bail_id: bailId, title: title.trim(), document_date: docDate || null, storage_path: path,
    });
    setUploading(false);
    if (insertError) { setError("Fichier envoyé mais impossible d'enregistrer la fiche."); return; }
    setTitle(""); setDocDate(""); setFile(null);
    fetchDocs();
  }

  async function handleDownload(doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) { setError("Impossible de générer le lien de téléchargement."); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function handleDeleteDoc(doc) {
    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("bail_documents").delete().eq("id", doc.id);
    fetchDocs();
  }

  return (
    <div className="border-t border-stone-100 pt-3">
      <p className="text-xs font-medium text-stone-600 mb-2">Documents attachés (bail d'origine, avenants...)</p>
      {loading ? (
        <p className="text-xs text-stone-400">Chargement…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-stone-400 mb-2">Aucun document pour l'instant.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-xs bg-stone-50 border border-stone-200 rounded-md px-2.5 py-1.5">
              <button onClick={() => handleDownload(d)} className="flex items-center gap-1.5 text-blue-800 hover:text-blue-950 min-w-0">
                <Download size={12} />
                <span className="truncate">{d.title}{d.document_date ? ` — ${formatDateFR(d.document_date)}` : ""}</span>
              </button>
              <button onClick={() => handleDeleteDoc(d)} className="text-stone-400 hover:text-rose-600 shrink-0" aria-label="Supprimer le document">
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-[10px] text-stone-500 block mb-0.5">Titre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bail d'origine" className="px-2 py-1 rounded border border-stone-300 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 block mb-0.5">Date (optionnel)</label>
          <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="px-2 py-1 rounded border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-[10px] text-stone-500 block mb-0.5">Fichier</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
        </div>
        <button onClick={handleUpload} disabled={uploading} className="px-2.5 py-1.5 text-xs rounded-md border border-blue-300 text-blue-800 hover:bg-blue-50 disabled:opacity-50">
          {uploading ? "Envoi…" : "Ajouter"}
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function BailModal({ bail, biens, contacts, onCancel, onSave, onDelete }) {
  const isNew = !bail;
  const [bienId, setBienId] = useState(bail?.bien_id || biens[0]?.id || "");
  const [locataireId, setLocataireId] = useState(bail?.locataire_id || contacts[0]?.id || "");
  const [bailleurNom, setBailleurNom] = useState(bail?.bailleur_nom || "");
  const [dateDebut, setDateDebut] = useState(bail?.date_debut || todayISO());
  const [dateFin, setDateFin] = useState(bail?.date_fin || "");
  const [loyer, setLoyer] = useState(bail ? String(bail.loyer_hors_charges) : "");
  const [charges, setCharges] = useState(bail ? String(bail.charges) : "0");
  const [depot, setDepot] = useState(bail ? String(bail.depot_garantie) : "0");
  const [jourPaiement, setJourPaiement] = useState(bail?.jour_paiement || 1);
  const [statut, setStatut] = useState(bail?.statut || "actif");
  const [notes, setNotes] = useState(bail?.notes || "");
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 bg-stone-900/40 flex items-center justify-center p-4 z-20">
      <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-stone-700">{isNew ? "Nouveau contrat" : "Modifier le contrat"}</h4>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-700" aria-label="Fermer"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">Bien</label>
            <select value={bienId} onChange={(e) => setBienId(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {biens.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Locataire</label>
            <select value={locataireId} onChange={(e) => setLocataireId(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.societe || `${c.first_name} ${c.last_name}`}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Nom du bailleur (pour le PDF)</label>
            <input value={bailleurNom} onChange={(e) => setBailleurNom(e.target.value)} placeholder="Ton nom" className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date de début</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Date de fin (optionnel)</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Loyer hors charges (€)</label>
            <input type="number" min="0" step="0.01" value={loyer} onChange={(e) => setLoyer(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Charges (€)</label>
            <input type="number" min="0" step="0.01" value={charges} onChange={(e) => setCharges(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Dépôt de garantie (€)</label>
            <input type="number" min="0" step="0.01" value={depot} onChange={(e) => setDepot(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Jour de paiement</label>
            <input type="number" min="1" max="31" value={jourPaiement} onChange={(e) => setJourPaiement(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Statut</label>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="actif">Actif</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Conditions particulières (optionnel)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {!isNew && <BailDocuments bailId={bail.id} />}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {onDelete ? (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-2 py-1.5"><Trash2 size={14} /> Supprimer</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-md border border-stone-300 hover:bg-stone-100">Annuler</button>
            <button
              onClick={() => {
                if (!bienId || !locataireId) { setError("Choisissez un bien et un locataire."); return; }
                if (!dateDebut) { setError("La date de début est obligatoire."); return; }
                const d = parseInt(jourPaiement, 10);
                if (!(d >= 1 && d <= 31)) { setError("Le jour de paiement doit être entre 1 et 31."); return; }
                onSave({
                  bien_id: bienId, locataire_id: locataireId, bailleur_nom: bailleurNom.trim() || null,
                  date_debut: dateDebut, date_fin: dateFin || null,
                  loyer_hors_charges: parseFloat(loyer) || 0, charges: parseFloat(charges) || 0,
                  depot_garantie: parseFloat(depot) || 0, jour_paiement: d, statut, notes: notes.trim() || null,
                });
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-900 text-white hover:bg-blue-950"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
