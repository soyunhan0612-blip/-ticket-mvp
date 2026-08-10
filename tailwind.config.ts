import type { Config } from "tailwindcss";

/*
 * 색·폰트 값은 src/app/globals.css의 :root가 소스다. 여기서는 변수를 참조만 한다.
 * 주의: CSS 변수를 색으로 쓰면 투명도 수식어(bg-primary/50)가 동작하지 않는다.
 * 알파가 필요하면 --color-border-on-dark처럼 전용 토큰을 만든다.
 */
const config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "on-primary": "var(--color-on-primary)",
        canvas: "var(--color-canvas)",
        "canvas-soft": "var(--color-canvas-soft)",
        ink: "var(--color-ink)",
        "ink-deep": "var(--color-ink-deep)",
        body: "var(--color-body)",
        "body-aa": "var(--color-body-aa)",
        mute: "var(--color-mute)",
        "on-dark": "var(--color-on-dark)",
        hairline: "var(--color-border-hairline)",
        "hairline-on-dark": "var(--color-border-on-dark)",
        seat: {
          available: "var(--seat-available)",
          "available-hover": "var(--seat-available-hover)",
          mine: "var(--seat-mine)",
          other: "var(--seat-other)",
          sold: "var(--seat-sold)",
        },
      },
      fontFamily: {
        sans: ["var(--font-display)"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        chip: "var(--radius-pill-md)",
        pill: "var(--radius-pill-lg)",
      },
      fontSize: {
        "display-hero": [
          "var(--fs-display-hero)",
          {
            lineHeight: "var(--lh-display-hero)",
            letterSpacing: "var(--ls-display-hero)",
            fontWeight: "var(--fw-display-hero)",
          },
        ],
        "display-xxl": [
          "var(--fs-display-xxl)",
          {
            lineHeight: "var(--lh-display-xxl)",
            letterSpacing: "var(--ls-display-xxl)",
            fontWeight: "var(--fw-display-xxl)",
          },
        ],
        "display-xl": [
          "var(--fs-display-xl)",
          {
            lineHeight: "var(--lh-display-xl)",
            letterSpacing: "var(--ls-display-xxl)",
            fontWeight: "var(--fw-display-xl)",
          },
        ],
        "display-lg": [
          "var(--fs-display-lg)",
          {
            lineHeight: "var(--lh-display-lg)",
            fontWeight: "var(--fw-display-lg)",
          },
        ],
        "display-md": [
          "var(--fs-display-md)",
          {
            lineHeight: "var(--lh-display-md)",
            fontWeight: "var(--fw-display-md)",
          },
        ],
        "display-sm": [
          "var(--fs-display-sm)",
          {
            lineHeight: "var(--lh-display-sm)",
            fontWeight: "var(--fw-display-sm)",
          },
        ],
        "display-xs": [
          "var(--fs-display-xs)",
          {
            lineHeight: "var(--lh-display-xs)",
            fontWeight: "var(--fw-display-xs)",
          },
        ],
        eyebrow: [
          "var(--fs-eyebrow)",
          {
            lineHeight: "var(--lh-eyebrow)",
            fontWeight: "var(--fw-eyebrow)",
          },
        ],
        "body-lg": [
          "var(--fs-body-lg)",
          { lineHeight: "var(--lh-body-lg)", fontWeight: "var(--fw-body-lg)" },
        ],
        "body-md": [
          "var(--fs-body-md)",
          { lineHeight: "var(--lh-body-md)", fontWeight: "var(--fw-body-md)" },
        ],
        "body-sm": [
          "var(--fs-body-sm)",
          { lineHeight: "var(--lh-body-sm)", fontWeight: "var(--fw-body-sm)" },
        ],
        caption: [
          "var(--fs-caption)",
          { lineHeight: "var(--lh-caption)", fontWeight: "var(--fw-caption)" },
        ],
        "caption-upper": [
          "var(--fs-caption-upper)",
          {
            lineHeight: "var(--lh-caption-upper)",
            letterSpacing: "var(--ls-caption-upper)",
            fontWeight: "var(--fw-caption-upper)",
          },
        ],
        button: [
          "var(--fs-button-md)",
          {
            lineHeight: "var(--lh-button-md)",
            fontWeight: "var(--fw-button-md)",
          },
        ],
      },
      spacing: {
        xxs: "var(--space-xxs)",
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
        "3xl": "var(--space-3xl)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
