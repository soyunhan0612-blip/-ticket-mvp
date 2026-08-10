import type { HTMLAttributes, JSX, ReactNode } from "react";

/*
 * Vodafone Design System / components/cards/ContentCard.jsx 포팅.
 * DS는 카드에 그림자를 쓰지 않는다 — 6px 라디우스 + 1px 헤어라인만으로 경계를 만든다.
 * 밝은 밴드에서는 ink 헤어라인, 어두운 밴드에서는 25% 흰색 헤어라인.
 */
export type CardTone = "light" | "dark";

const TONE_CLASS_NAMES: Record<CardTone, string> = {
  light: "border-hairline bg-canvas text-ink",
  dark: "border-hairline-on-dark bg-ink text-on-dark",
};

/** `<Link>`를 카드로 쓸 때 재사용한다. */
export function cardClassName({
  tone = "light",
  interactive = false,
  className = "",
}: {
  tone?: CardTone;
  interactive?: boolean;
  className?: string;
} = {}): string {
  const hover =
    tone === "light"
      ? "hover:border-primary focus-visible:ring-primary focus-visible:ring-offset-canvas"
      : "hover:border-on-dark focus-visible:ring-on-dark focus-visible:ring-offset-ink";

  return `rounded-card border p-2xl transition-colors duration-150 ${TONE_CLASS_NAMES[tone]} ${
    interactive
      ? `${hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`
      : ""
  } ${className}`;
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  tone = "light",
  interactive = false,
  className = "",
  children,
  ...rest
}: CardProps): JSX.Element {
  return (
    <div className={cardClassName({ tone, interactive, className })} {...rest}>
      {children}
    </div>
  );
}
