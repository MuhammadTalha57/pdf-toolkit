import Image from "next/image";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl italic tracking-tight text-ink flex">
          <Image src="/favicon.ico" alt="PDF-Toolkit logo" width={30} height={15} quality={100} />
          <div>PDF-Toolkit</div>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-ink-soft">
          <Link href="/merge" className="transition-standard hover:text-ink">Merge</Link>
          <Link href="/split" className="transition-standard hover:text-ink">Split</Link>
          <Link href="/organize" className="transition-standard hover:text-ink">Organize</Link>
         <a 
            href="https://github.com/MuhammadTalha57/pdf-toolkit"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub  size={25} color="black" />
          </a>
        </nav>
      </div>
    </header>
  );
}