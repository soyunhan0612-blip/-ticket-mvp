"use client";

import { atom } from "jotai";

export interface ToastMessage {
  text: string;
  type: "success" | "error";
}

export const toastMessageAtom = atom<ToastMessage | null>(null);
