"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Navbar() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    async function handleLogout() {
        await logout();
        router.push("/");
    }

    return (
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <Link href="/" className="font-display text-2xl italic tracking-tight text-ink flex">
                    <Image src="/favicon.ico" alt="PDF-Toolkit logo" width={30} height={15} quality={100} />
                    <div>PDF-Toolkit</div>
                </Link>
                <nav className="flex items-center gap-5 text-sm text-ink-soft">
                    <Link href="/merge" className="transition-standard hover:text-ink">Merge</Link>
                    <Link href="/split" className="transition-standard hover:text-ink">Split</Link>
                    <Link href="/organize" className="transition-standard hover:text-ink">Organize</Link>

                    {!loading && user && (
                        <>
                            <Link href="/history" className="transition-standard hover:text-ink">
                                History
                            </Link>
                            <span className="hidden font-mono text-xs text-ink-soft sm:inline">
                                {user.email}
                            </span>
                            <button
                                onClick={() => void handleLogout()}
                                className="transition-standard hover:text-ink"
                            >
                                Log out
                            </button>
                        </>
                    )}

                    {!loading && !user && (
                        <>
                            <Link href="/login" className="transition-standard hover:text-ink">
                                Log in
                            </Link>
                            <Link
                                href="/signup"
                                className="transition-standard rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90"
                            >
                                Sign up
                            </Link>
                        </>
                    )}

                    <a
                        href="https://github.com/MuhammadTalha57/pdf-toolkit"
                        target="_blank"
                        rel="noreferrer"
                    >
                        <FaGithub size={25} color="black" />
                    </a>
                </nav>
            </div>
        </header>
    );
}
