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
    lg: "text-2xl sm:text-3xl leading-tight",
  }[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center max-w-full px-2", className)}>
      <div className={cn("font-black tracking-tight text-primary-deep italic", text)}>
        {inline ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
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
            "mt-1 font-serif italic tracking-normal bg-gradient-to-r from-sky-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent font-bold text-center max-w-full leading-normal px-1",
            size === "lg" ? "text-xs sm:text-sm" : size === "md" ? "text-[10px] sm:text-[11px]" : "text-[9px] sm:text-[10px]",
          )}
        >
          {branding.tagline}
        </p>
      )}
    </div>
  );
}
