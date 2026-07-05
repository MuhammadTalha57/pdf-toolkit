import { X } from "lucide-react";

type PageThumbnailProps = {
  src: string;
  label: string;
  onRemove?: () => void;
  isBlank?: boolean;
};

export default function PageThumbnail({
  src,
  label,
  onRemove,
  isBlank,
}: PageThumbnailProps) {
  return (
    <div className="paper-corner group relative overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="transition-standard absolute top-1.5 left-1.5 z-10 rounded-full bg-ink/70 p-1 text-white opacity-0 hover:bg-danger group-hover:opacity-100"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
      <div className="flex aspect-3/4 items-center justify-center bg-paper p-2">
        {isBlank ? (
          <div className="h-full w-full rounded border border-dashed border-line bg-surface" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- data URLs from canvas, not a static asset
          <img
            src={src}
            alt={label}
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}
      </div>
      <p className="border-t border-line py-1 text-center font-mono text-[11px] text-ink-soft">
        {label}
      </p>
    </div>
  );
}