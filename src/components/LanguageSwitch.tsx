import { Languages } from "lucide-react";
import { localeOptions, useI18n } from "../lib/i18n";

export function LanguageSwitch({
  tone = "paper"
}: {
  tone?: "paper" | "dark";
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={`language-switch language-switch-${tone}`}
      role="group"
      aria-label={t("language.label")}
    >
      <Languages size={14} aria-hidden="true" />
      {localeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={locale === option.value ? "active" : ""}
          aria-label={option.label}
          aria-pressed={locale === option.value}
          title={option.label}
          onClick={() => setLocale(option.value)}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
