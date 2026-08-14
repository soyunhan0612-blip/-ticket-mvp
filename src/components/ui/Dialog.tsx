"use client";

import { useEffect, useId, useRef, type JSX, type ReactNode } from "react";

/*
 * DS에는 모달이 없다. 네이티브 <dialog>의 showModal()을 쓰는 이유는
 * 포커스 트랩·ESC·배경 inert·top-layer를 브라우저가 처리해 주기 때문이다 —
 * 손으로 옮겨 적으면 가장 먼저 틀리는 부분들이다.
 *
 * 표면은 카드와 같은 규칙을 따른다: 6px 라디우스, 1px 헤어라인, 그림자 없음.
 * 백드롭은 globals.css의 dialog::backdrop에서 ink 72%로 칠한다
 * (docs/UI_GUIDE.md "이미지 위 텍스트"의 오버레이 값과 같은 값이다).
 */
const DIALOG_CLASS_NAMES =
  "m-auto w-[calc(100vw-2rem)] max-w-md rounded-card border border-hairline bg-canvas p-2xl text-ink";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * false면 ESC·백드롭 클릭으로 닫히지 않는다. 닫아도 갈 곳이 없는
   * 인증 벽에만 쓴다 — 일반 확인 다이얼로그에서는 탈출구를 막지 않는다.
   */
  dismissible?: boolean;
  children: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  dismissible = true,
  children,
}: DialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={DIALOG_CLASS_NAMES}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      // 백드롭 클릭은 패널이 아니라 dialog 엘리먼트 자신을 타깃으로 삼는다.
      onClick={(event) => {
        if (dismissible && event.target === dialogRef.current) onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="space-y-lg">
        <h2 className="text-display-xs" id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
