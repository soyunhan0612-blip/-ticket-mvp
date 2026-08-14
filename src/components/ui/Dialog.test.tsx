import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("open이 false면 보이지 않는다", () => {
    // 닫힌 dialog의 내용은 접근성 트리에서 빠지므로 role 질의로는 찾히지 않는다.
    // 엘리먼트 자체의 가시성으로 확인한다.
    const { container } = render(
      <Dialog onClose={vi.fn()} open={false} title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    expect(container.querySelector("dialog")).not.toBeVisible();
    expect(screen.queryByRole("heading", { name: "예매를 취소할까요?" })).toBeNull();
  });

  it("open이 true면 보인다", () => {
    render(
      <Dialog onClose={vi.fn()} open title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    expect(screen.getByRole("heading", { name: "예매를 취소할까요?" })).toBeVisible();
  });

  it("제목을 aria-labelledby로 연결한다", () => {
    const { container } = render(
      <Dialog onClose={vi.fn()} open title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    const dialog = container.querySelector("dialog");
    const heading = screen.getByRole("heading", { name: "예매를 취소할까요?" });

    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
    expect(heading.id).not.toBe("");
  });

  it("ESC로 닫으면 onClose를 부른다", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog onClose={onClose} open title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    // jsdom은 ESC → cancel/close를 자동으로 이어주지 않으므로 브라우저가 보내는
    // 이벤트를 그대로 발생시킨다. 계약은 "cancel이 막히지 않으면 close된다"이다.
    const dialog = container.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(false);
    dialog.dispatchEvent(new Event("close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("백드롭을 누르면 onClose를 부른다", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog onClose={onClose} open title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    // 백드롭 클릭은 dialog 엘리먼트 자신을 타깃으로 삼는다.
    await userEvent.click(container.querySelector("dialog")!);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("패널 안을 눌러도 닫히지 않는다", async () => {
    const onClose = vi.fn();
    render(
      <Dialog onClose={onClose} open title="예매를 취소할까요?">
        <p>본문</p>
      </Dialog>,
    );

    await userEvent.click(screen.getByText("본문"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismissible이 false면 ESC와 백드롭으로 닫히지 않는다", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog dismissible={false} onClose={onClose} open title="로그인이 필요합니다">
        <p>본문</p>
      </Dialog>,
    );

    const dialog = container.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    await userEvent.click(dialog);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
