"use client";

import { useCallback, useState } from "react";

interface AiDescriptionGeneratorProps {
  title: string;
  genre: string;
  onApply: (text: string) => void;
}

export function AiDescriptionGenerator({
  title,
  genre,
  onApply,
}: AiDescriptionGeneratorProps) {
  const [generated, setGenerated] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    if (!title.trim()) {
      setError("공연명을 먼저 입력하세요.");
      return;
    }

    setIsGenerating(true);
    setGenerated("");
    setError("");

    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, genre }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "설명 생성에 실패했습니다.");
      }

      if (!response.body) {
        throw new Error("스트리밍 응답을 읽을 수 없습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setGenerated((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setGenerated((prev) => prev + decoder.decode());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "설명 생성에 실패했습니다.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [title, genre]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={isGenerating}
        onClick={generate}
        className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
      >
        {isGenerating ? "생성 중..." : "AI로 설명 생성"}
      </button>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {generated && (
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-300">
              {generated}
            </p>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => onApply(generated)}
            className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            이 설명 사용
          </button>
        </div>
      )}
    </div>
  );
}
