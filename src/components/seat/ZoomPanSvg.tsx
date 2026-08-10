"use client";

import {
  type JSX,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
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

export const DRAG_THRESHOLD_PX = 4;
const MIN_VIEW_SCALE = 0.2;
const WHEEL_SENSITIVITY = 0.001;
const BUTTON_ZOOM_FACTOR = 0.75;

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

function scaleViewBox(
  current: ViewBox,
  box: LayoutBox,
  factor: number,
  focalX: number,
  focalY: number,
): ViewBox {
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

  return constrainViewBox(
    {
      x: current.x + (current.width - width) * focalX,
      y: current.y + (current.height - height) * focalY,
      width,
      height,
    },
    box,
  );
}

export function ZoomPanSvg({
  box,
  children,
  className,
}: ZoomPanSvgProps): JSX.Element {
  const [viewBox, setViewBox] = useState<ViewBox>(() => getInitialViewBox(box));
  // 드래그 중인지만 나타낸다. 좌표는 dragRef에 두어 이동마다 리렌더가 나지 않게 한다.
  const [dragging, setDragging] = useState(false);
  const mapId = useId();
  const instructionsId = useId();
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
        return scaleViewBox(current, box, factor, pointerX, pointerY);
      });
    }

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgElement.removeEventListener("wheel", handleWheel);
  }, [box]);

  // 포인터를 캡처하면 브라우저가 뒤따르는 click을 <svg>로 재타겟팅해 좌석
  // <rect>의 onClick이 죽는다. 캡처 대신 제스처 동안 window에서 듣는다 —
  // 포인터가 <svg>를 벗어나도 이동과 pointerup이 반드시 도착해야 하기 때문이다.
  useEffect(() => {
    if (!dragging) return;

    function handlePointerMove(event: PointerEvent): void {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (drag === null || svg === null) return;
      if (drag.pointerId !== event.pointerId) return;
      // 브라우저 창 밖에서 버튼을 떼면 pointerup이 오지 않는다. 버튼이 풀린 채
      // 들어온 이동을 제스처의 끝으로 본다 — 드래그를 남겨두면 맵이 커서를
      // 따라다니고 아래 가드 때문에 새 드래그도 시작할 수 없다.
      if (event.buttons === 0) {
        dragRef.current = null;
        setDragging(false);
        return;
      }

      drag.maxDistance = Math.max(
        drag.maxDistance,
        Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY),
      );
      // 임계값 전에는 clientX/Y를 갱신하지 않는다. 그래야 좌석을 누를 때의
      // 손떨림으로 맵이 밀리지 않고, 임계값을 넘는 첫 이동이 누른 지점부터의
      // 전체 변위만큼 한 번에 따라온다.
      if (drag.maxDistance < DRAG_THRESHOLD_PX) return;

      const deltaX = event.clientX - drag.clientX;
      const deltaY = event.clientY - drag.clientY;
      drag.clientX = event.clientX;
      drag.clientY = event.clientY;

      const bounds = svg.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;

      setViewBox((current) => constrainViewBox({
        ...current,
        x: current.x - deltaX * (current.width / bounds.width),
        y: current.y - deltaY * (current.height / bounds.height),
      }, box));
    }

    function finishPointer(event: PointerEvent): void {
      const drag = dragRef.current;
      if (drag === null || drag.pointerId !== event.pointerId) return;

      suppressClickRef.current = drag.maxDistance >= DRAG_THRESHOLD_PX;
      dragRef.current = null;
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishPointer);
    window.addEventListener("pointercancel", finishPointer);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishPointer);
      window.removeEventListener("pointercancel", finishPointer);
    };
  }, [box, dragging]);

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
    if (event.button !== 0) return;
    // 진행 중인 드래그를 두 번째 포인터가 덮어쓰면, 첫 포인터를 뗄 때
    // 클릭 억제가 서지 않아 팬 제스처가 좌석을 선택해버린다.
    if (dragRef.current !== null) return;

    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      maxDistance: 0,
    };
    setDragging(true);
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

  function changeZoom(factor: number): void {
    setViewBox((current) => scaleViewBox(current, box, factor, 0.5, 0.5));
  }

  return (
    <div className="space-y-lg">
      <div
        aria-label="좌석 배치도 확대/축소"
        className="flex flex-wrap gap-sm"
        role="group"
      >
        <Button
          aria-controls={mapId}
          className="min-h-11"
          disabled={viewBox.width <= box.width * MIN_VIEW_SCALE}
          onClick={() => changeZoom(BUTTON_ZOOM_FACTOR)}
          size="sm"
          variant="outline-on-dark"
        >
          확대
        </Button>
        <Button
          aria-controls={mapId}
          className="min-h-11"
          disabled={viewBox.width >= box.width}
          onClick={() => changeZoom(1 / BUTTON_ZOOM_FACTOR)}
          size="sm"
          variant="outline-on-dark"
        >
          축소
        </Button>
        <Button
          aria-controls={mapId}
          className="min-h-11"
          onClick={showFullLayout}
          size="sm"
          variant="outline-on-dark"
        >
          전체 보기
        </Button>
      </div>

      <p className="text-caption text-mute" id={instructionsId}>
        확대·축소 버튼 또는 마우스 휠로 크기를 조절하고, 드래그하여 이동하세요.
      </p>

      <svg
        aria-describedby={instructionsId}
        aria-label="좌석 배치도"
        className={[className, dragging ? "cursor-grabbing" : "cursor-grab"]
          .filter(Boolean)
          .join(" ")}
        id={mapId}
        onClickCapture={handleClickCapture}
        onPointerDown={handlePointerDown}
        ref={svgRef}
        // 캡처가 없으므로 드래그가 STAGE 텍스트 선택으로 새지 않게 막는다.
        style={{ touchAction: "none", userSelect: "none" }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      >
        {children}
      </svg>
    </div>
  );
}
