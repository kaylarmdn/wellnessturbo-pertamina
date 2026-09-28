import { branding } from "@/config/branding";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return null;
}

export function BrandLogo({
  className,
  showTagline = true,
  size = "md",
  inline = false,
}: {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
}) {
  const text = {
    sm: "text-base leading-snug",
    md: "text-xl leading-snug",
    lg: "text-3xl leading-tight sm:text-4xl sm:leading-tight",
  }[size];

  return (
    <div className={cn("inline-block text-center", className)}>
      <div className={cn("font-black tracking-tight text-primary-deep italic", text)}>
        {inline ? (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span>{branding.appNameLines[0]}</span>
            <span className="text-primary">{branding.appNameLines[1]}</span>
          </div>
        ) : (
          <>
            <div>{branding.appNameLines[0]}</div>
            <div className="text-primary">{branding.appNameLines[1]}</div>
          </>
        )}
      </div>
      {showTagline && (
        <p
          className={cn(
            "mt-1 font-serif italic tracking-wide bg-gradient-to-r from-sky-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent font-bold whitespace-nowrap",
            size === "lg" ? "text-sm sm:text-base" : "text-[11px]",
          )}
        >
          {branding.tagline}
        </p>
      )}
    </div>
  );
}
