"use client";

import { type FormEvent, useState } from "react";

import { AiDescriptionGenerator } from "@/components/seller/AiDescriptionGenerator";
import { PosterPresetSelector } from "@/components/seller/PosterPresetSelector";
import { SeatPresetSelector } from "@/components/seller/SeatPresetSelector";
import { Toast } from "@/components/toast/Toast";
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
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          공연 등록
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">
          새 공연을 등록하고 회차를 설정하세요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-neutral-300"
          >
            공연명
          </label>
          <input
            id="title"
            type="text"
            maxLength={100}
            placeholder="공연 이름을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-neutral-300"
          >
            공연 설명
          </label>
          <textarea
            id="description"
            maxLength={2000}
            rows={5}
            placeholder="공연 설명을 입력하세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500"
          />
          <AiDescriptionGenerator
            title={title}
            genre={genre}
            onApply={setDescription}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            좌석 프리셋
          </label>
          <SeatPresetSelector value={presetId} onChange={setPresetId} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            포스터
          </label>
          <PosterPresetSelector
            value={posterPresetId}
            onChange={setPosterPresetId}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-300">
            회차
          </label>
          <div className="space-y-3">
            {sessionDates.map((date, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => updateSession(index, e.target.value)}
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500"
                />
                {sessionDates.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSession(index)}
                    className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
          {sessionDates.length < 10 && (
            <button
              type="button"
              onClick={addSession}
              className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:text-neutral-600"
            >
              + 회차 추가
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {isPending ? "등록 중..." : "공연 등록"}
        </button>
      </form>
      <Toast />
    </div>
  );
}
