export interface RenderCounter {
  /** label의 카운트를 1 증가시킨다. 최초 label은 0에서 시작해 1이 된다. */
  bump(label: string): void;
  /** label의 현재 카운트. 한 번도 bump되지 않은 label은 0. */
  countOf(label: string): number;
  /** 현재까지 집계된 전체 카운트의 읽기 전용 사본. */
  snapshot(): Readonly<Record<string, number>>;
  /** 모든 카운트를 버린다. */
  reset(): void;
  /** 집계된 모든 카운트의 합. */
  total(): number;
}

export function createRenderCounter(): RenderCounter {
  const counts = new Map<string, number>();

  return {
    bump(label) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    },
    countOf(label) {
      return counts.get(label) ?? 0;
    },
    snapshot() {
      return Object.fromEntries(counts);
    },
    reset() {
      counts.clear();
    },
    total() {
      let sum = 0;

      for (const count of counts.values()) {
        sum += count;
      }

      return sum;
    },
  };
}
