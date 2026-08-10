"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";

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
    <div className="space-y-md">
      <Button
        disabled={isGenerating}
        onClick={generate}
        size="sm"
        variant="outline-dark"
      >
        {isGenerating ? "생성 중..." : "AI로 설명 생성"}
      </Button>

      {error && (
        <p className="text-body-sm text-primary" role="alert">
          {error}
        </p>
      )}

      {generated && (
        <div className="space-y-md">
          <div className="rounded-card border border-hairline bg-canvas-soft p-lg">
            {/* plain text + whitespace-pre-wrap. dangerouslySetInnerHTML 금지 (저장형 XSS) */}
            <p className="whitespace-pre-wrap text-body-sm text-ink">
              {generated}
            </p>
          </div>
          <Button
            disabled={isGenerating}
            onClick={() => onApply(generated)}
            size="sm"
          >
            이 설명 사용
          </Button>
        </div>
      )}
    </div>
  );
}
