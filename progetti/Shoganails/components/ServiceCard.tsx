import type { Service } from "@/lib/services";

export default function ServiceCard({
  service,
  highlighted = false,
}: {
  service: Service;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
        highlighted
          ? "border-coral-300 bg-gradient-to-r from-coral-50 to-rose-50 shadow-sm"
          : "border-marble-200 bg-white/70"
      }`}
    >
      <div>
        <p className="font-display text-lg font-semibold text-stone-800">
          {service.nome}
        </p>
        <p className="text-sm text-stone-500">{service.descrizione}</p>
      </div>
      <p className="whitespace-nowrap font-display text-xl font-semibold text-coral-700">
        {service.prezzoChf} CHF
      </p>
    </div>
  );
}
