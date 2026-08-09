"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";

import { toastMessageAtom } from "@/atoms/toast";
import type { CreateShowInput } from "@/lib/show-validation";
import type { Session, Show } from "@/types";

export const showsQueryKey = ["shows"] as const;

interface CreateShowResponse {
  show: Show;
  sessions: Session[];
}

export function useCreateShow(): UseMutationResult<
  CreateShowResponse,
  Error,
  CreateShowInput
> {
  const queryClient = useQueryClient();
  const router = useRouter();
  const setToast = useSetAtom(toastMessageAtom);

  return useMutation<CreateShowResponse, Error, CreateShowInput>({
    mutationFn: async (input) => {
      const response = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? "공연 등록에 실패했습니다.");
      }

      return (await response.json()) as CreateShowResponse;
    },
    onSuccess: async ({ show }) => {
      await queryClient.invalidateQueries({ queryKey: showsQueryKey });
      setToast({ text: "공연이 등록되었습니다.", type: "success" });
      router.push(`/shows/${show.id}`);
    },
    onError: (error) => {
      setToast({ text: error.message, type: "error" });
    },
  });
}
