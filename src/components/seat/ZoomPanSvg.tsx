"use client";

import {
  type JSX,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
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

interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  clientX: number;
  clientY: number;
  maxDistance: number;
}

const DRAG_THRESHOLD_PX = 4;
const MIN_VIEW_SCALE = 0.2;
const WHEEL_SENSITIVITY = 0.001;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function constrainViewBox(viewBox: ViewBox, box: LayoutBox): ViewBox {
  return {
    ...viewBox,
    x: clamp(viewBox.x, 0, box.width - viewBox.width),
    y: clamp(viewBox.y, 0, box.height - viewBox.height),
  };
}

export function ZoomPanSvg({
  box,
  children,
  className,
}: ZoomPanSvgProps): JSX.Element {
  const [viewBox, setViewBox] = useState<ViewBox>(() => getInitialViewBox(box));
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return;
    const svgElement: SVGSVGElement = svg;

    function handleWheel(event: WheelEvent): void {
      event.preventDefault();

      const bounds = svgElement.getBoundingClientRect();
      const pointerX = bounds.width === 0
        ? 0.5
        : clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const pointerY = bounds.height === 0
        ? 0.5
        : clamp((event.clientY - bounds.top) / bounds.height, 0, 1);

      setViewBox((current) => {
        const factor = Math.exp(event.deltaY * WHEEL_SENSITIVITY);
        const width = clamp(
          current.width * factor,
          box.width * MIN_VIEW_SCALE,
          box.width,
        );
        const scale = width / current.width;
        const height = clamp(
          current.height * scale,
          box.height * MIN_VIEW_SCALE,
          box.height,
        );

        return constrainViewBox({
          x: current.x + (current.width - width) * pointerX,
          y: current.y + (current.height - height) * pointerY,
          width,
          height,
        }, box);
      });
    }

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgElement.removeEventListener("wheel", handleWheel);
  }, [box]);

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0) return;

    suppressClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      maxDistance: 0,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    drag.maxDistance = Math.max(
      drag.maxDistance,
      Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY),
    );
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    setViewBox((current) => constrainViewBox({
      ...current,
      x: current.x - deltaX * (current.width / bounds.width),
      y: current.y - deltaY * (current.height / bounds.height),
    }, box));
  }

  function finishPointer(event: ReactPointerEvent<SVGSVGElement>): void {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;

    suppressClickRef.current = drag.maxDistance >= DRAG_THRESHOLD_PX;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleClickCapture(event: ReactMouseEvent<SVGSVGElement>): void {
    if (!suppressClickRef.current) return;

    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function showFullLayout(): void {
    setViewBox({ x: 0, y: 0, width: box.width, height: box.height });
  }

  return (
    <div className="space-y-4">
      <button
        className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
        onClick={showFullLayout}
        type="button"
      >
        전체 보기
      </button>

      <svg
        className={className}
        onClickCapture={handleClickCapture}
        onPointerCancel={finishPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        ref={svgRef}
        style={{ touchAction: "none" }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        {children}
      </svg>
    </div>
  );
}
