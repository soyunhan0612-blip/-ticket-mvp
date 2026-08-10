import type { InputHTMLAttributes, JSX, ReactNode } from "react";

/*
 * Vodafone Design System / components/forms/TextInput.jsx 포팅.
 * 라벨은 caption-upper(12px 대문자) — DS 폼 라벨 규약.
 * placeholder는 라벨을 대체하지 않는다 (UX_PRINCIPLES.md 접근성 스코프).
 */

/** input·textarea·select가 공유하는 필드 스타일. 클래스 문자열 복제를 막는다. */
export const FIELD_CLASS_NAMES =
  "w-full rounded-card border border-hairline bg-canvas px-lg py-md text-body-sm text-ink transition-colors duration-150 placeholder:text-body-aa focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:border-mute disabled:text-mute";

export const FIELD_LABEL_CLASS_NAMES =
  "block text-caption-upper uppercase text-ink";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** `<label htmlFor>` 연결에 쓰인다. 필수 — placeholder만으로 라벨을 대체하지 않는다. */
  id: string;
  label: string;
  hint?: ReactNode;
}

export function TextInput({
  id,
  label,
  hint,
  className = "",
  ...rest
}: TextInputProps): JSX.Element {
  return (
    <div className="space-y-xs">
      <label className={FIELD_LABEL_CLASS_NAMES} htmlFor={id}>
        {label}
      </label>
      <input className={`${FIELD_CLASS_NAMES} ${className}`} id={id} {...rest} />
      {hint ? <p className="text-caption text-body-aa">{hint}</p> : null}
    </div>
  );
}
