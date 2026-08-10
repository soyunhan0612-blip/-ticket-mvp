"use client";

import { type FormEvent, useState } from "react";

import { AiDescriptionGenerator } from "@/components/seller/AiDescriptionGenerator";
import { PosterPresetSelector } from "@/components/seller/PosterPresetSelector";
import { SeatPresetSelector } from "@/components/seller/SeatPresetSelector";
import { Toast } from "@/components/toast/Toast";
import { Button } from "@/components/ui/Button";
import {
  FIELD_CLASS_NAMES,
  FIELD_LABEL_CLASS_NAMES,
  TextInput,
} from "@/components/ui/TextInput";
import { useCreateShow } from "@/hooks/use-create-show";
import { POSTER_PRESETS } from "@/lib/poster-preset";
import type { SeatPresetId } from "@/lib/seat-preset";

export default function SellerNewPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presetId, setPresetId] = useState<SeatPresetId | null>(null);
  const [posterPresetId, setPosterPresetId] = useState<string | null>(null);
  const [sessionDates, setSessionDates] = useState<string[]>([""]);

  const { mutate, isPending } = useCreateShow();

  const genre =
    POSTER_PRESETS.find((p) => p.id === posterPresetId)?.label ?? "";

  function addSession() {
    if (sessionDates.length >= 10) return;
    setSessionDates((prev) => [...prev, ""]);
  }

  function removeSession(index: number) {
    if (sessionDates.length <= 1) return;
    setSessionDates((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSession(index: number, value: string) {
    setSessionDates((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !presetId || !posterPresetId)
      return;

    const filledSessions = sessionDates.filter((d) => d.trim() !== "");
    if (filledSessions.length === 0) return;

    mutate({
      title,
      description,
      posterUrl: posterPresetId,
      presetId,
      sessions: filledSessions.map((d) => new Date(d).toISOString()),
    });
  }

  const canSubmit =
    title.trim() &&
    description.trim() &&
    presetId &&
    posterPresetId &&
    sessionDates.some((d) => d.trim() !== "") &&
    !isPending;

  return (
    <div className="space-y-2xl">
      <header className="space-y-sm">
        <p className="text-caption-upper uppercase text-primary">셀러</p>
        <h1 className="text-display-sm">공연 등록</h1>
        <p className="text-body-sm text-body-aa">
          새 공연을 등록하고 회차를 설정하세요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-2xl">
        <TextInput
          id="title"
          label="공연명"
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공연 이름을 입력하세요"
          type="text"
          value={title}
        />

        <div className="space-y-xs">
          <label className={FIELD_LABEL_CLASS_NAMES} htmlFor="description">
            공연 설명
          </label>
          <textarea
            className={FIELD_CLASS_NAMES}
            id="description"
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="공연 설명을 입력하세요"
            rows={5}
            value={description}
          />
          <AiDescriptionGenerator
            title={title}
            genre={genre}
            onApply={setDescription}
          />
        </div>

        <div className="space-y-sm">
          <p className={FIELD_LABEL_CLASS_NAMES}>좌석 프리셋</p>
          <SeatPresetSelector value={presetId} onChange={setPresetId} />
        </div>

        <div className="space-y-sm">
          <p className={FIELD_LABEL_CLASS_NAMES}>포스터</p>
          <PosterPresetSelector
            value={posterPresetId}
            onChange={setPosterPresetId}
          />
        </div>

        <div className="space-y-sm">
          <p className={FIELD_LABEL_CLASS_NAMES}>회차</p>
          <div className="space-y-md">
            {sessionDates.map((date, index) => (
              <div key={index} className="flex items-center gap-md">
                <input
                  aria-label={`회차 ${index + 1} 일시`}
                  className={FIELD_CLASS_NAMES}
                  onChange={(e) => updateSession(index, e.target.value)}
                  type="datetime-local"
                  value={date}
                />
                {sessionDates.length > 1 && (
                  <Button
                    onClick={() => removeSession(index)}
                    size="sm"
                    variant="text"
                  >
                    삭제
                  </Button>
                )}
              </div>
            ))}
          </div>
          {sessionDates.length < 10 && (
            <Button onClick={addSession} size="sm" variant="outline-dark">
              + 회차 추가
            </Button>
          )}
        </div>

        <Button disabled={!canSubmit} type="submit">
          {isPending ? "등록 중..." : "공연 등록"}
        </Button>
      </form>
      <Toast />
    </div>
  );
}
