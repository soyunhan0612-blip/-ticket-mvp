import type { ButtonHTMLAttributes, JSX, ReactNode } from "react";

/*
 * Vodafone Design System / components/buttons/Button.jsx 포팅.
 * 원본은 인라인 style에 포커스 링이 없다 — DS의 공백이라 보고 focus-visible을 추가했다.
 * (UX_PRINCIPLES.md 접근성 스코프: 모든 인터랙티브 요소에 포커스 링)
 */
export type ButtonVariant =
  | "primary"
  | "outline-red"
  | "outline-dark"
  | "outline-on-dark"
  | "text"
  | "text-on-dark";

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover focus-visible:ring-primary focus-visible:ring-offset-canvas disabled:border-mute disabled:bg-mute",
  "outline-red":
    "border border-primary bg-canvas text-primary hover:bg-primary hover:text-on-primary focus-visible:ring-primary focus-visible:ring-offset-canvas disabled:border-mute disabled:text-mute",
  "outline-dark":
    "border border-hairline bg-canvas text-ink hover:bg-ink hover:text-on-dark focus-visible:ring-ink focus-visible:ring-offset-canvas disabled:border-mute disabled:text-mute",
  "outline-on-dark":
    "border border-hairline-on-dark bg-transparent text-on-dark hover:bg-on-dark hover:text-ink focus-visible:ring-on-dark focus-visible:ring-offset-ink disabled:border-body disabled:text-body",
  text: "border border-transparent text-body-aa hover:text-ink focus-visible:ring-ink focus-visible:ring-offset-canvas disabled:text-mute",
  "text-on-dark":
    "border border-transparent text-mute hover:text-on-dark focus-visible:ring-on-dark focus-visible:ring-offset-ink disabled:text-body",
};

const SIZE_CLASS_NAMES = {
  md: "px-2xl py-md text-button",
  sm: "px-lg py-sm text-body-sm",
} as const;

const BASE_CLASS_NAMES =
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed";

/** `<Link>`를 버튼 모양으로 쓸 때 이 함수를 쓴다 — 클래스 문자열을 복제하지 않기 위해. */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_CLASS_NAMES;
  className?: string;
} = {}): string {
  return `${BASE_CLASS_NAMES} ${VARIANT_CLASS_NAMES[variant]} ${SIZE_CLASS_NAMES[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE_CLASS_NAMES;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      type={type}
      {...rest}
    >
      {children}
    </button>
  );
}
