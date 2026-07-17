const GRADIENTS = [
  "from-rose-200 via-coral-100 to-marble-100",
  "from-coral-200 via-rose-100 to-marble-50",
  "from-marble-200 via-coral-100 to-rose-100",
  "from-rose-100 via-marble-100 to-coral-200",
  "from-coral-100 via-marble-50 to-rose-200",
  "from-marble-100 via-rose-100 to-coral-100",
];

export default function GalleryPlaceholder({ index }: { index: number }) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <div
      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} shadow-sm`}
    >
      <span className="text-3xl" aria-hidden="true">
        💅
      </span>
      <span className="sr-only">Foto di esempio, in arrivo le foto reali</span>
    </div>
  );
}
