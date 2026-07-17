import { NuovaSettimana } from "@/components/admin/NuovaSettimana";

export default function SettimanaPage() {
  return (
    <section>
      <h2 className="font-display text-xl text-stone-800">Nuova settimana</h2>
      <p className="mt-1 text-sm text-stone-500">
        Carica la foto del foglio turni per generare gli orari liberi della
        settimana corrente.
      </p>
      <div className="mt-4">
        <NuovaSettimana />
      </div>
    </section>
  );
}
