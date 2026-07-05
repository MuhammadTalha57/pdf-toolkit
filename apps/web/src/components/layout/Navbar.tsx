import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl italic tracking-tight text-ink">
          Folio
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-soft">
          <Link href="/merge" className="transition-standard hover:text-ink">Merge</Link>
          <Link href="/split" className="transition-standard hover:text-ink">Split</Link>
          <Link href="/organize" className="transition-standard hover:text-ink">Organize</Link>
         <a 
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-4 py-1.5 font-medium text-ink transition-standard hover:border-ink"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}