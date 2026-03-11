import { type ElementType } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmptyStateProps {
  icon: ElementType;
  title: Record<"en" | "es", string> | string;
  subtitle: Record<"en" | "es", string> | string;
  ctaLabel?: Record<"en" | "es", string> | string;
  onCta?: () => void;
}

const EmptyState = ({ icon: Icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) => {
  const { lang } = useLanguage();

  const titleText = typeof title === "string" ? title : title[lang];
  const subtitleText = typeof subtitle === "string" ? subtitle : subtitle[lang];
  const ctaText = ctaLabel ? (typeof ctaLabel === "string" ? ctaLabel : ctaLabel[lang]) : undefined;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{titleText}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{subtitleText}</p>
      {ctaText && onCta && (
        <button
          onClick={onCta}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {ctaText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
