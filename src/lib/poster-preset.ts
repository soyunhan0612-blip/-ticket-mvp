export interface PosterPreset {
  id: string;
  label: string;
  url: string;
}

export const POSTER_PRESETS: readonly PosterPreset[] = [
  { id: "concert", label: "콘서트", url: "/posters/concert.svg" },
  { id: "musical", label: "뮤지컬", url: "/posters/musical.svg" },
  { id: "theater", label: "연극", url: "/posters/theater.svg" },
];

export function isValidPosterPresetId(id: string): boolean {
  return POSTER_PRESETS.some((preset) => preset.id === id);
}

export function getPosterUrl(id: string): string | null {
  return POSTER_PRESETS.find((preset) => preset.id === id)?.url ?? null;
}
