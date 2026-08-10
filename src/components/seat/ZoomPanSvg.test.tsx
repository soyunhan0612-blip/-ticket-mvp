import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getInitialViewBox, getLayoutBox } from "@/lib/seat-layout";

import { DRAG_THRESHOLD_PX, ZoomPanSvg } from "./ZoomPanSvg";

/**
 * 시드 공연(4구역 2000석)의 실제 레이아웃. box = 600 x 780.
 * SVG 표시 폭을 600 CSS px으로 스텁했으므로 초기 viewBox(폭 300)에서는
 * 1 viewBox 단위 = 2 CSS px이다. 즉 4 CSS px 드래그 = 2 viewBox 단위.
 */
const BOX = getLayoutBox(["A", "B", "C", "D"]);
const INITIAL = getInitialViewBox(BOX);
const SVG_CSS_WIDTH = 600;
const SVG_CSS_HEIGHT = 780;

/** ZoomPanSvg.tsx의 MIN_VIEW_SCALE과 같은 값. */
const MIN_VIEW_SCALE = 0.2;

function viewBoxOf(svg: SVGSVGElement): string {
  return svg.getAttribute("viewBox") ?? "";
}

function parseViewBox(svg: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const [x, y, width, height] = viewBoxOf(svg)
    .split(" ")
    .map((value) => Number(value));

  return { x, y, width, height };
}

/**
 * 좌석 역할을 하는 자식. 실제 Seat.tsx처럼 rect에 onClick을 직접 단다 —
 * 드래그 억제가 실패하면 이 핸들러가 호출된다.
 */
function renderZoomPan(onSeatClick: () => void) {
  const utils = render(
    <ZoomPanSvg box={BOX}>
      <rect data-testid="seat" height={12} onClick={onSeatClick} width={12} />
    </ZoomPanSvg>,
  );
  const svg = utils.container.querySelector("svg");
  if (svg === null) throw new Error("svg not rendered");

  // jsdom은 레이아웃을 계산하지 않으므로 팬/줌 환산에 필요한 크기를 스텁한다.
  vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
    bottom: SVG_CSS_HEIGHT,
    height: SVG_CSS_HEIGHT,
    left: 0,
    right: SVG_CSS_WIDTH,
    toJSON: () => ({}),
    top: 0,
    width: SVG_CSS_WIDTH,
    x: 0,
    y: 0,
  });

  return { ...utils, seat: screen.getByTestId("seat"), svg };
}

/**
 * 포인터 제스처 한 번. moves는 시작점 기준 누적 오프셋이다.
 * 실제 브라우저와 달리 합성 pointerup은 click을 만들지 않으므로
 * 좌석 클릭을 명시적으로 발생시킨다 — 억제 로직을 실제로 통과시키기 위함.
 */
function gesture(
  svg: SVGSVGElement,
  seat: Element,
  moves: readonly { x: number; y: number }[],
): void {
  const origin = { x: 100, y: 100 };

  fireEvent.pointerDown(svg, {
    button: 0,
    clientX: origin.x,
    clientY: origin.y,
    pointerId: 1,
  });

  for (const move of moves) {
    fireEvent.pointerMove(svg, {
      // 실제 브라우저는 드래그 중 buttons=1을 싣는다. 빠뜨리면 구현이 버튼을
      // 뗀 것으로 보고 제스처를 끝낸다.
      buttons: 1,
      clientX: origin.x + move.x,
      clientY: origin.y + move.y,
      pointerId: 1,
    });
  }

  fireEvent.pointerUp(svg, {
    clientX: origin.x + (moves.at(-1)?.x ?? 0),
    clientY: origin.y + (moves.at(-1)?.y ?? 0),
    pointerId: 1,
  });

  fireEvent.click(seat);
}

function wheel(svg: SVGSVGElement, deltaY: number, clientX = 300): void {
  fireEvent.wheel(svg, { clientX, clientY: 390, deltaY });
}

let setPointerCapture: Mock<(pointerId: number) => void>;

beforeEach(() => {
  // jsdom에 포인터 캡처 API가 없어서 스파이를 심는다. 구현이 캡처를 호출하면
  // 안 되므로 용도는 부정 단언 하나뿐이다 — "포인터를 캡처하지 않는다" 참고.
  setPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = setPointerCapture;
});

afterEach(() => {
  // 프로토타입을 오염시킨 채 파일을 끝내지 않는다.
  Reflect.deleteProperty(Element.prototype, "setPointerCapture");
  vi.restoreAllMocks();
});

describe("ZoomPanSvg 드래그와 클릭 구분", () => {
  it("제자리 클릭은 좌석 선택으로 이어진다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    gesture(svg, seat, []);

    expect(onSeatClick).toHaveBeenCalledTimes(1);
    expect(viewBoxOf(svg)).toBe(
      `${INITIAL.x} ${INITIAL.y} ${INITIAL.width} ${INITIAL.height}`,
    );
  });

  it("임계값 이상 드래그하면 좌석이 선택되지 않는다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    gesture(svg, seat, [{ x: 30, y: 0 }]);

    expect(onSeatClick).not.toHaveBeenCalled();
    // 억제만 되고 팬이 일어나지 않았다면 드래그 자체가 등록되지 않은 것이다.
    expect(parseViewBox(svg).x).toBeLessThan(INITIAL.x);
  });

  it("임계값 미만으로 움직이면 좌석이 선택된다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    gesture(svg, seat, [{ x: DRAG_THRESHOLD_PX - 1, y: 0 }]);

    expect(onSeatClick).toHaveBeenCalledTimes(1);
  });

  it("임계값과 같은 거리는 드래그로 처리한다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    gesture(svg, seat, [{ x: DRAG_THRESHOLD_PX, y: 0 }]);

    expect(onSeatClick).not.toHaveBeenCalled();
  });

  it("멀리 갔다가 제자리로 돌아와도 드래그로 처리한다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    // 순변위는 0이지만 최대 이동 거리는 20이다. 순변위 기준으로 판정하면
    // 좌석이 선택돼 버린다.
    gesture(svg, seat, [
      { x: 20, y: 0 },
      { x: 0, y: 0 },
    ]);

    expect(onSeatClick).not.toHaveBeenCalled();
  });

  it("드래그 다음의 제자리 클릭은 다시 선택된다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    gesture(svg, seat, [{ x: 30, y: 0 }]);
    expect(onSeatClick).not.toHaveBeenCalled();

    // 억제 플래그가 한 번 쓰고 반드시 풀려야 한다. 남아 있으면
    // 드래그 이후 좌석맵이 영구히 클릭 불가가 된다.
    gesture(svg, seat, []);
    expect(onSeatClick).toHaveBeenCalledTimes(1);
  });

  it("주 버튼이 아니면 드래그를 시작하지 않는다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    fireEvent.pointerDown(svg, {
      button: 2,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    // 이동은 window 리스너가 받는다. 드래그가 시작되지 않았다면 리스너 자체가 없다.
    fireEvent.pointerMove(window, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 200, clientY: 100, pointerId: 1 });

    expect(viewBoxOf(svg)).toBe(
      `${INITIAL.x} ${INITIAL.y} ${INITIAL.width} ${INITIAL.height}`,
    );
    fireEvent.click(seat);
    expect(onSeatClick).toHaveBeenCalledTimes(1);
  });
});

/**
 * 포인터를 캡처하면 브라우저는 뒤따르는 click을 캡처 요소로 재타겟팅한다.
 * 그러면 클릭이 <svg>에 도달하고 자식 좌석 <rect>에는 오지 않아 Seat.tsx의
 * onClick이 영영 호출되지 않는다 — 좌석 선택이 통째로 죽는다.
 *
 * 그래서 캡처 대신 제스처 동안 window에 리스너를 단다. 캡처가 해주던
 * "pointerup은 반드시 도착한다"를 window가 대신 보장해야 한다. 보장이 깨지면
 * 드래그 상태가 영원히 남아 버튼을 뗀 채 지나가기만 해도 맵이 따라온다.
 */
describe("ZoomPanSvg 드래그 수명주기", () => {
  it("포인터를 캡처하지 않는다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    gesture(svg, seat, [{ x: 30, y: 0 }]);

    expect(setPointerCapture).not.toHaveBeenCalled();
  });

  it("svg 밖에서 움직여도 팬이 이어진다", () => {
    const { svg } = renderZoomPan(vi.fn());

    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    // svg가 아니라 바깥 요소에서 발생한 이동. 캡처에 의존하면 여기서 팬이 죽는다.
    fireEvent.pointerMove(document.body, {
      buttons: 1,
      clientX: 130,
      clientY: 100,
      pointerId: 1,
    });

    expect(parseViewBox(svg).x).toBe(INITIAL.x - 15);
  });

  it("svg 밖에서 손을 떼도 드래그가 끝난다", () => {
    const { svg } = renderZoomPan(vi.fn());

    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientX: 130,
      clientY: 100,
      pointerId: 1,
    });
    const afterDrag = viewBoxOf(svg);

    fireEvent.pointerUp(document.body, {
      clientX: 130,
      clientY: 100,
      pointerId: 1,
    });

    // buttons=1을 유지한다. pointerUp 자체가 드래그를 끝냈어야 통과한다.
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientX: 400,
      clientY: 300,
      pointerId: 1,
    });

    expect(viewBoxOf(svg)).toBe(afterDrag);
  });

  it("버튼이 풀린 채 들어온 이동은 드래그를 끝낸다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientX: 130,
      clientY: 100,
      pointerId: 1,
    });

    // 브라우저 창 밖에서 손을 떼면 pointerup이 오지 않는다. 이 상태로 드래그가
    // 남으면 맵이 커서를 따라다니고, 새 드래그도 영영 시작할 수 없다.
    fireEvent.pointerMove(window, {
      buttons: 0,
      clientX: 200,
      clientY: 200,
      pointerId: 1,
    });
    const afterRelease = viewBoxOf(svg);

    fireEvent.pointerMove(window, {
      buttons: 0,
      clientX: 400,
      clientY: 300,
      pointerId: 1,
    });
    expect(viewBoxOf(svg)).toBe(afterRelease);

    // 드래그가 정리됐으므로 다음 제스처는 정상적으로 시작된다.
    const beforeNext = parseViewBox(svg).x;
    gesture(svg, seat, [{ x: -20, y: -20 }]);
    expect(parseViewBox(svg).x).toBe(beforeNext + 10);
  });

  it("두 번째 포인터가 진행 중인 드래그를 가로채지 않는다", () => {
    const onSeatClick = vi.fn();
    const { seat, svg } = renderZoomPan(onSeatClick);

    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientX: 130,
      clientY: 100,
      pointerId: 1,
    });

    // 두 번째 손가락이 드래그 상태를 덮어쓰면 1번의 클릭 억제가 풀린다.
    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 300,
      clientY: 300,
      pointerId: 2,
    });

    fireEvent.pointerUp(window, { clientX: 130, clientY: 100, pointerId: 1 });
    fireEvent.click(seat);

    expect(onSeatClick).not.toHaveBeenCalled();
  });

  it("언마운트하면 window 리스너를 정리한다", () => {
    const { svg, unmount } = renderZoomPan(vi.fn());

    fireEvent.pointerDown(svg, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });

    const removeEventListener = vi.spyOn(window, "removeEventListener");
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "pointerup",
      expect.any(Function),
    );
  });
});

describe("ZoomPanSvg 팬", () => {
  it("드래그 방향과 반대로 viewBox가 이동한다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    gesture(svg, seat, [{ x: -20, y: -20 }]);

    // 1 viewBox 단위 = 2 CSS px이므로 20 CSS px = 10 단위.
    const after = parseViewBox(svg);
    expect(after.x).toBe(INITIAL.x + 10);
    expect(after.y).toBe(INITIAL.y + 10);
  });

  it("임계값 미만 움직임은 viewBox를 건드리지 않는다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    // 좌석을 누를 때의 손떨림. 클릭으로 판정하면서 맵만 밀리면 안 된다.
    gesture(svg, seat, [{ x: DRAG_THRESHOLD_PX - 1, y: 0 }]);

    expect(viewBoxOf(svg)).toBe(
      `${INITIAL.x} ${INITIAL.y} ${INITIAL.width} ${INITIAL.height}`,
    );
  });

  it("좌석 영역을 벗어나지 않도록 이동을 제한한다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    gesture(svg, seat, [{ x: 5_000, y: 5_000 }]);

    expect(parseViewBox(svg)).toMatchObject({ x: 0, y: 0 });

    gesture(svg, seat, [{ x: -5_000, y: -5_000 }]);

    const after = parseViewBox(svg);
    expect(after.x).toBe(BOX.width - after.width);
    expect(after.y).toBe(BOX.height - after.height);
  });

  it("전관을 보고 있으면 팬해도 움직이지 않는다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));
    const before = viewBoxOf(svg);

    gesture(svg, seat, [{ x: 200, y: 200 }]);
    expect(viewBoxOf(svg)).toBe(before);

    gesture(svg, seat, [{ x: -200, y: -200 }]);
    expect(viewBoxOf(svg)).toBe(before);
  });
});

describe("ZoomPanSvg 줌", () => {
  it("터치 화면에서도 사용할 수 있는 확대·축소 버튼을 제공한다", () => {
    const { svg } = renderZoomPan(vi.fn());
    const initial = parseViewBox(svg);

    fireEvent.click(screen.getByRole("button", { name: "확대" }));
    expect(parseViewBox(svg).width).toBeLessThan(initial.width);

    fireEvent.click(screen.getByRole("button", { name: "축소" }));
    expect(parseViewBox(svg).width).toBeCloseTo(initial.width, 5);
  });

  it("줌 컨트롤은 작은 화면에서 줄바꿈할 수 있고 사용법을 안내한다", () => {
    renderZoomPan(vi.fn());

    expect(screen.getByRole("group", { name: "좌석 배치도 확대/축소" })).toHaveClass(
      "flex-wrap",
    );
    expect(
      screen.getByText("확대·축소 버튼 또는 마우스 휠로 크기를 조절하고, 드래그하여 이동하세요."),
    ).toBeInTheDocument();
  });

  it("휠 확대·축소가 페이지 스크롤을 막는다", () => {
    const { svg } = renderZoomPan(vi.fn());

    // fireEvent는 preventDefault가 호출되면 false를 반환한다. 리스너가
    // passive로 등록되면 preventDefault가 무시돼 페이지가 함께 스크롤된다.
    const notCancelled = fireEvent.wheel(svg, {
      clientX: 300,
      clientY: 390,
      deltaY: -200,
    });

    expect(notCancelled).toBe(false);
    expect(parseViewBox(svg).width).toBeLessThan(INITIAL.width);
  });

  it("확대에 상한이 있다", () => {
    const { svg } = renderZoomPan(vi.fn());

    for (let index = 0; index < 20; index += 1) wheel(svg, -300);

    const after = parseViewBox(svg);
    expect(after.width).toBeCloseTo(BOX.width * MIN_VIEW_SCALE, 5);
    expect(after.height).toBeCloseTo(BOX.height * MIN_VIEW_SCALE, 5);
  });

  it("축소 하한은 전관까지이며 종횡비가 유지된다", () => {
    const { svg } = renderZoomPan(vi.fn());

    for (let index = 0; index < 20; index += 1) wheel(svg, 300);

    // 폭과 높이가 각각 독립적으로 클램프되면 종횡비가 어긋나 레터박싱이 생긴다.
    expect(parseViewBox(svg)).toMatchObject({
      height: BOX.height,
      width: BOX.width,
    });
  });

  it("작은 휠 틱을 반복해도 종횡비가 어긋나지 않는다", () => {
    const { svg } = renderZoomPan(vi.fn());

    for (let index = 0; index < 60; index += 1) wheel(svg, 40);

    const after = parseViewBox(svg);
    expect(after.width / after.height).toBeCloseTo(BOX.width / BOX.height, 5);
  });

  it("커서 위치를 기준으로 확대한다", () => {
    const left = renderZoomPan(vi.fn());
    wheel(left.svg, -300, 0);
    const afterLeft = parseViewBox(left.svg);
    left.unmount();

    const right = renderZoomPan(vi.fn());
    wheel(right.svg, -300, SVG_CSS_WIDTH);
    const afterRight = parseViewBox(right.svg);

    // 같은 배율이라도 커서가 가리키던 지점이 제자리에 남아야 한다. 중심
    // 기준으로만 확대하면 두 결과의 x가 같아진다.
    expect(afterLeft.width).toBeCloseTo(afterRight.width, 5);
    expect(afterLeft.x).toBeLessThan(afterRight.x);
    // 왼쪽 끝을 가리켰으면 그 지점(viewBox 좌변)이 그대로 유지된다.
    expect(afterLeft.x).toBe(INITIAL.x);
  });
});

describe("ZoomPanSvg 전체 보기", () => {
  it("전관 viewBox로 되돌린다", () => {
    const { seat, svg } = renderZoomPan(vi.fn());

    wheel(svg, -300);
    gesture(svg, seat, [{ x: 40, y: 40 }]);
    expect(viewBoxOf(svg)).not.toBe(`0 0 ${BOX.width} ${BOX.height}`);

    fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));

    expect(viewBoxOf(svg)).toBe(`0 0 ${BOX.width} ${BOX.height}`);
  });
});
