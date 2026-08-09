"use client";

import {
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  getInitialViewBox,
  type LayoutBox,
  type ViewBox,
} from "@/lib/seat-layout";

interface ZoomPanSvgProps {
  box: LayoutBox;
  children: ReactNode;
  className?: string;
}

const DRAG_THRESHOLD_PX = 4;
const WHEEL_ZOOM_FACTOR = 1.15;
const MAX_ZOOM = 8;

interface PointerPosition {
  x: number;
  y: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function clampViewBox(viewBox: ViewBox, box: LayoutBox): ViewBox {
  const width = clamp(viewBox.width, box.width / MAX_ZOOM, box.width);
  const height = clamp(viewBox.height, box.height / MAX_ZOOM, box.height);

  return {
    x: clamp(viewBox.x, 0, box.width - width),
    y: clamp(viewBox.y, 0, box.height - height),
    width,
    height,
  };
}

export function ZoomPanSvg({
  box,
  children,
  className,
}: ZoomPanSvgProps): JSX.Element {
  const [viewBox, setViewBox] = useState<ViewBox>(() => getInitialViewBox(box));
  const pointerStartRef = useRef<PointerPosition | null>(null);
  const pointerPreviousRef = useRef<PointerPosition | null>(null);
  const draggedRef = useRef(false);

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>): void {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const direction = event.deltaY > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;

    setViewBox((current) => {
      const width = clamp(
        current.width * direction,
        box.width / MAX_ZOOM,
        box.width,
      );
      const height = clamp(
        current.height * direction,
        box.height / MAX_ZOOM,
        box.height,
      );
      const pointerX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const pointerY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);

      return clampViewBox(
        {
          x: current.x + (current.width - width) * pointerX,
          y: current.y + (current.height - height) * pointerY,
          width,
          height,
        },
        box,
      );
    });
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0) return;

    const position = { x: event.clientX, y: event.clientY };
    pointerStartRef.current = position;
    pointerPreviousRef.current = position;
    draggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const start = pointerStartRef.current;
    const previous = pointerPreviousRef.current;
    if (start === null || previous === null) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= DRAG_THRESHOLD_PX) {
      draggedRef.current = true;
    }

    if (draggedRef.current) {
      const deltaX = event.clientX - previous.x;
      const deltaY = event.clientY - previous.y;

      setViewBox((current) =>
        clampViewBox(
          {
            ...current,
            x: current.x - deltaX * (current.width / bounds.width),
            y: current.y - deltaY * (current.height / bounds.height),
          },
          box,
        ),
      );
    }

    pointerPreviousRef.current = { x: event.clientX, y: event.clientY };
  }

  function finishPointer(event: ReactPointerEvent<SVGSVGElement>): void {
    pointerStartRef.current = null;
    pointerPreviousRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="space-y-4">
      <button
        className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
        onClick={() => setViewBox({ x: 0, y: 0, ...box })}
        type="button"
      >
        전체 보기
      </button>

      <svg
        className={className}
        onClickCapture={(event) => {
          if (!draggedRef.current) return;
          event.preventDefault();
          event.stopPropagation();
          draggedRef.current = false;
        }}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onWheel={handleWheel}
        style={{ touchAction: "none" }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        {children}
      </svg>
    </div>
  );
}
