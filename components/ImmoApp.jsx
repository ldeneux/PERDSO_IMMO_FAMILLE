"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import jsPDF from "jspdf";
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
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function formatEUR(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n || 0));
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
  { key: "suivi", label: "Suivi des écritures", icon: BookOpen, soon: true },
  { key: "synthese", label: "Synthèse", icon: BarChart3, soon: true },
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
        {activeTab === "suivi" && <SoonTab title="Suivi des écritures" desc="Le suivi détaillé des loyers, charges et taxes par bien arrive dans une prochaine étape." />}
        {activeTab === "synthese" && <SoonTab title="Synthèse" desc="Le tableau coût / gain par bien arrive dans une prochaine étape." />}
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

/* ---------------- CONTACTS ---------------- */

function ContactsTab({ contacts }) {
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");

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

      <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
        {contacts.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">Aucun contact pour l'instant.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <th className="px-4 py-2 font-medium">Nom</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Téléphone</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {contacts.map((c) => (
                <tr key={c.id} onClick={() => setEditing(c)} className="cursor-pointer hover:bg-stone-50">
                  <td className="px-4 py-2.5 text-stone-800">{c.civilite ? `${c.civilite} ` : ""}{c.first_name} {c.last_name}</td>
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
                if (!firstName.trim() || !lastName.trim()) { setError("Prénom et nom sont obligatoires."); return; }
                onSave({ civilite: civilite || null, first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim() || null, phone: phone.trim() || null, address: address.trim() || null, type, notes: notes.trim() || null });
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
              {activeBauxByBien[b.id] ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5">Loué</span>
              ) : (
                <span className="text-[10px] text-stone-500 bg-stone-100 rounded px-1.5 py-0.5">Libre</span>
              )}
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
  const [dateAcquisition, setDateAcquisition] = useState(bien?.date_acquisition || "");
  const [prixAchat, setPrixAchat] = useState(bien?.prix_achat != null ? String(bien.prix_achat) : "");
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
            <label className="text-xs text-stone-500 block mb-1">Date d'acquisition</label>
            <input type="date" value={dateAcquisition} onChange={(e) => setDateAcquisition(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-stone-500 block mb-1">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">Prix d'achat (€)</label>
            <input type="number" min="0" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} className="w-full px-2.5 py-1.5 rounded-md border border-stone-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  name: name.trim(), address: address.trim() || null, type,
                  date_acquisition: dateAcquisition || null,
                  prix_achat: prixAchat ? parseFloat(prixAchat) : null,
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

/* ---------------- BAUX (CONTRATS) ---------------- */

function generateContractPdf(bail, bien, locataire) {
  const doc = new jsPDF();
  const marginX = 20;
  let y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CONTRAT DE LOCATION", 105, y, { align: "center" });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Entre les soussignés :", marginX, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Le Bailleur :", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(bail.bailleur_nom || "________________________________", marginX + 28, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Le Locataire :", marginX, y);
  doc.setFont("helvetica", "normal");
  const civ = locataire.civilite ? `${locataire.civilite} ` : "";
  doc.text(`${civ}${locataire.first_name} ${locataire.last_name}`, marginX + 28, y);
  y += 6;
  if (locataire.address) { doc.text(`Domicilié(e) : ${locataire.address}`, marginX + 28, y); y += 6; }
  if (locataire.email || locataire.phone) {
    doc.text(`Contact : ${locataire.email || "-"}  ${locataire.phone || ""}`, marginX + 28, y);
    y += 6;
  }
  y += 6;

  doc.text("Il a été convenu ce qui suit :", marginX, y);
  y += 10;

  function article(title, lines) {
    doc.setFont("helvetica", "bold");
    doc.text(title, marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    lines.forEach((line) => {
      const split = doc.splitTextToSize(line, 170);
      doc.text(split, marginX, y);
      y += 6 * split.length;
    });
    y += 4;
  }

  article("Article 1 — Objet du contrat", [
    `Le bailleur loue au locataire le bien désigné ci-après : ${bien.name}${bien.address ? `, situé ${bien.address}` : ""}.`,
  ]);

  article("Article 2 — Durée", [
    `Le présent contrat prend effet le ${formatDateFR(bail.date_debut)}` +
      (bail.date_fin ? ` et se termine le ${formatDateFR(bail.date_fin)}.` : ", pour une durée indéterminée."),
  ]);

  const total = Number(bail.loyer_hors_charges || 0) + Number(bail.charges || 0);
  article("Article 3 — Loyer et charges", [
    `Le loyer mensuel hors charges est fixé à ${formatEUR(bail.loyer_hors_charges)}.`,
    `Les charges mensuelles s'élèvent à ${formatEUR(bail.charges)}, soit un total mensuel de ${formatEUR(total)}.`,
    `Le loyer est exigible le ${bail.jour_paiement} de chaque mois.`,
  ]);

  article("Article 4 — Dépôt de garantie", [
    `Un dépôt de garantie de ${formatEUR(bail.depot_garantie)} est versé par le locataire à la signature du présent contrat.`,
  ]);

  if (bail.notes) {
    article("Article 5 — Conditions particulières", [bail.notes]);
  }

  y += 10;
  doc.text(`Fait à ________________________, le ${formatDateFR(todayISO())}`, marginX, y);
  y += 20;
  doc.text("Le Bailleur", marginX, y);
  doc.text("Le Locataire", 120, y);
  y += 25;
  doc.text("Signature :", marginX, y);
  doc.text("Signature :", 120, y);

  doc.setFontSize(8);
  doc.setTextColor(140);
  const disclaimer = doc.splitTextToSize(
    "Ce document est un récapitulatif des conditions convenues entre les parties. Il ne remplace pas un contrat de bail conforme à la réglementation en vigueur (notamment la loi du 6 juillet 1989 pour les locations vides). Il est recommandé de faire vérifier ce document par un professionnel avant signature.",
    170
  );
  doc.text(disclaimer, marginX, 280);

  doc.save(`contrat-${bien.name.replace(/[^a-z0-9]/gi, "_")}-${locataire.last_name}.pdf`);
}

function BauxTab({ baux, biens, contacts, bienById, contactById }) {
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");

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

      <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
        {baux.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">Aucun contrat pour l'instant.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                <th className="px-4 py-2 font-medium">Bien</th>
                <th className="px-4 py-2 font-medium">Locataire</th>
                <th className="px-4 py-2 font-medium text-right">Loyer + charges</th>
                <th className="px-4 py-2 font-medium">Début</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {baux.map((b) => {
                const bien = bienById[b.bien_id];
                const loc = contactById[b.locataire_id];
                return (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <td className="px-4 py-2.5 text-stone-800 cursor-pointer" onClick={() => setEditing(b)}>{bien?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-stone-600 cursor-pointer" onClick={() => setEditing(b)}>{loc ? `${loc.first_name} ${loc.last_name}` : "—"}</td>
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
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
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
