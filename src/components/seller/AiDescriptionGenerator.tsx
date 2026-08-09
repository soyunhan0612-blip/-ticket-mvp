"use client";

import { useState, type JSX } from "react";

interface AiDescriptionGeneratorProps {
  title: string;
  genre: string;
  onUse: (description: string) => void;
}

export function AiDescriptionGenerator({
  title,
  genre,
  onUse,
}: AiDescriptionGeneratorProps): JSX.Element {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateDescription() {
    setText("");
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, genre }),
      });

      if (!response.ok) {
        throw new Error(await response.text() || "설명을 생성하지 못했습니다.");
      }
      if (!response.body) {
        throw new Error("스트리밍 응답을 읽을 수 없습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((current) => current + decoder.decode(value, { stream: true }));
      }
      setText((current) => current + decoder.decode());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "설명을 생성하지 못했습니다.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
        disabled={isGenerating || title.trim().length === 0}
        onClick={generateDescription}
        type="button"
      >
        {isGenerating ? "생성 중..." : "AI로 설명 생성"}
      </button>

      {error ? (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      ) : null}

      {text ? (
        <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-300">
            {text}
          </p>
          {!isGenerating ? (
            <button
              className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              onClick={() => onUse(text)}
              type="button"
            >
              이 설명 사용
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
