import { branding } from "@/config/branding";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return null;
}

export function BrandLogo({
  className,
  showTagline = true,
  size = "md",
}: {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const text = {
    sm: "text-base leading-snug",
    md: "text-xl leading-snug",
    lg: "text-4xl leading-tight sm:text-5xl sm:leading-tight",
  }[size];

  return (
    <div className={cn("inline-block", className)}>
      <div className={cn("font-black tracking-tight text-primary-deep italic", text)}>
        <div>{branding.appNameLines[0]}</div>
        <div className="text-primary">{branding.appNameLines[1]}</div>
      </div>
      {showTagline && (
        <p
          className={cn(
            "mt-1.5 font-serif italic tracking-wide bg-gradient-to-r from-sky-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent font-bold",
            size === "lg" ? "text-base sm:text-lg" : "text-[11px]",
          )}
        >
          {branding.tagline}
        </p>
      )}
    </div>
  );
}
