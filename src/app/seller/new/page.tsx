"use client";

import { useState, type FormEvent, type JSX } from "react";

import { AiDescriptionGenerator } from "@/components/seller/AiDescriptionGenerator";
import { PosterPresetSelector } from "@/components/seller/PosterPresetSelector";
import { SeatPresetSelector } from "@/components/seller/SeatPresetSelector";
import { Toast } from "@/components/toast/Toast";
import { useCreateShow } from "@/hooks/use-create-show";
import { POSTER_PRESETS } from "@/lib/poster-preset";
import type { SeatPresetId } from "@/lib/seat-preset";

const INPUT_CLASS =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:border-neutral-800 disabled:text-neutral-500";

export default function NewShowPage(): JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presetId, setPresetId] = useState<SeatPresetId>("small");
  const [posterId, setPosterId] = useState(POSTER_PRESETS[0].id);
  const [sessions, setSessions] = useState([""]);
  const createShow = useCreateShow();
  const genre = POSTER_PRESETS.find((preset) => preset.id === posterId)?.label ?? "";

  function updateSession(index: number, value: string) {
    setSessions((current) =>
      current.map((session, sessionIndex) =>
        sessionIndex === index ? value : session,
      ),
    );
  }

  function removeSession(index: number) {
    setSessions((current) => current.filter((_, sessionIndex) => sessionIndex !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createShow.mutate({
      title,
      description,
      posterUrl: posterId,
      presetId,
      sessions: sessions.map((startsAt) => new Date(startsAt).toISOString()),
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <form className="space-y-8" onSubmit={handleSubmit}>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            공연 등록
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            공연 정보와 회차를 입력해 예매 페이지를 만드세요.
          </p>
        </header>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white" htmlFor="title">
            공연명
          </label>
          <input
            className={INPUT_CLASS}
            id="title"
            maxLength={100}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="공연 이름을 입력하세요"
            required
            value={title}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white" htmlFor="description">
              공연 설명
            </label>
            <textarea
              className={`${INPUT_CLASS} min-h-40 resize-y`}
              id="description"
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              required
              value={description}
            />
          </div>
          <AiDescriptionGenerator
            genre={genre}
            onUse={setDescription}
            title={title}
          />
        </div>

        <SeatPresetSelector onChange={setPresetId} value={presetId} />
        <PosterPresetSelector onChange={setPosterId} value={posterId} />

        <fieldset>
          <legend className="text-sm font-medium text-white">회차</legend>
          <div className="mt-3 space-y-4">
            {sessions.map((session, index) => (
              <div className="flex items-center gap-4" key={index}>
                <label className="sr-only" htmlFor={`session-${index}`}>
                  회차 {index + 1}
                </label>
                <input
                  className={INPUT_CLASS}
                  id={`session-${index}`}
                  onChange={(event) => updateSession(index, event.target.value)}
                  required
                  type="datetime-local"
                  value={session}
                />
                {sessions.length > 1 ? (
                  <button
                    className="shrink-0 rounded-sm px-1 py-1 text-sm font-medium text-red-500 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                    onClick={() => removeSession(index)}
                    type="button"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            ))}
            {sessions.length < 10 ? (
              <button
                className="rounded-sm px-1 py-1 text-sm font-medium text-neutral-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                onClick={() => setSessions((current) => [...current, ""])}
                type="button"
              >
                회차 추가
              </button>
            ) : null}
          </div>
        </fieldset>

        <button
          className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:bg-neutral-700 disabled:text-neutral-400"
          disabled={createShow.isPending}
          type="submit"
        >
          {createShow.isPending ? "등록 중..." : "공연 등록"}
        </button>
      </form>
      <Toast />
    </div>
  );
}
