import type { JSX, ReactNode } from "react";

/*
 * Vodafone Design System / components/bands/*.jsx 포팅 (HeroBandDark, HeroBandRed, ContentBandLight).
 * DS는 그림자를 쓰지 않고 표면 극성 반전(dark ↔ light)으로 깊이를 만든다.
 * 밴드는 full-bleed이고 안쪽 컨테이너만 폭이 제한된다.
 */
export type BandTone = "light" | "soft" | "dark" | "red";

const TONE_CLASS_NAMES: Record<BandTone, string> = {
  light: "bg-canvas text-ink",
  soft: "bg-canvas-soft text-ink",
  dark: "bg-ink text-on-dark",
  red: "bg-primary text-on-primary",
};

/*
 * 마케팅 밴드는 DS의 1400px 컨테이너에 가깝게, 도구 화면은 기존 max-w-5xl을 유지한다.
 * 밀도가 다른 화면에 같은 폭을 강요하지 않는다 (UX_PRINCIPLES.md 원칙 3).
 */
const WIDTH_CLASS_NAMES = {
  wide: "max-w-7xl",
  tool: "max-w-5xl",
} as const;

interface BandProps {
  tone?: BandTone;
  width?: keyof typeof WIDTH_CLASS_NAMES;
  /** 화면 높이를 채운다. 페이지의 마지막(또는 유일한) 밴드에 쓴다. */
  fill?: boolean;
  className?: string;
  children: ReactNode;
}

export function Band({
  tone = "light",
  width = "tool",
  fill = false,
  className = "",
  children,
}: BandProps): JSX.Element {
  return (
    <section
      className={`${TONE_CLASS_NAMES[tone]} ${fill ? "min-h-screen" : ""} px-lg py-3xl sm:px-2xl lg:px-3xl ${className}`}
    >
      <div className={`mx-auto w-full ${WIDTH_CLASS_NAMES[width]}`}>
        {children}
      </div>
    </section>
  );
}
