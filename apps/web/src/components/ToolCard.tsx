import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type ToolCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function ToolCard({
  href,
  icon: Icon,
  title,
  description,
}: ToolCardProps) {
  return (
    <Link
      href={href}
      className="paper-corner transition-standard group flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon size={22} strokeWidth={1.75} />
        </span>
        <ArrowUpRight
          size={18}
          className="transition-standard text-ink-soft/0 group-hover:text-ink-soft"
        />
      </div>
      <div>
        <h3 className="font-display text-2xl italic text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      </div>
    </Link>
  );
}