export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-soft sm:flex-row">
        <p className="font-mono text-xs">
          Files are processed on request and never kept longer than needed.
        </p>
      </div>
    </footer>
  );
}