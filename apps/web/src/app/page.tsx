import { Combine, Scissors, LayoutGrid } from "lucide-react";
import ToolCard from "@/components/ToolCard";

const tools = [
  {
    href: "/merge",
    icon: Combine,
    title: "Merge",
    description: "Combine several PDFs into one, in the order you chose.",
  },
  {
    href: "/split",
    icon: Scissors,
    title: "Split",
    description: "Pull specific page ranges out into their wn files.",
  },
  {
    href: "/organize",
    icon: LayoutGrid,
    title: "Organize",
    description: "Drag pages into order, remove pages, or insert blanks.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-14 text-center">
        <h1 className="font-display text-5xl leading-tight text-ink italic sm:text-6xl">
          Every page, exactly where it belongs.
        </h1>"
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          Merge, split, and reorganize PDFs in a few clicks. No account, no watermark, nothing kept longer than it takes to process.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key = {tool.href} {...tool} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 py-16 sm:grid-cols-3">
          <div>
            <p className="font-mono text-xs text-mark">01</p>
            <h3 className="mt-2 font-medium text-ink">Drop your file</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a tool and add the PDF you&apos;re working with.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-mark">02</p>
            <h3 className="mt-2 font-medium text-ink">Set it up</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Choose page order, ranges, or what to remove.
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-mark">03</p>
            <h3 className="mt-2 font-medium text-ink">Download</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Get your finished file straight back, ready to use.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}