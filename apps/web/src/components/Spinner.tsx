import { Loader2 } from "lucide-react";


export default function Spinner({label}: {label?: string}) {
    return (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 size={16} className="animate-spin" />
            {label && <span>{label}</span>}
        </div>
    );
}