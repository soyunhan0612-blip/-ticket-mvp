import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { SeatMapContainer } from "@/components/seat/SeatMapContainer";
import { Band } from "@/components/ui/Band";
import { SNAPSHOT_QUERY_KEY } from "@/hooks/use-seat-snapshot";
import { USER_ID_COOKIE_NAME } from "@/lib/cookie";
import { SECTIONS } from "@/lib/seat-map";
import { generateSeats } from "@/lib/mock-data";
import { generateSeatsForPreset, getPreset } from "@/lib/seat-preset";
import { getSeatStore, getShowStore } from "@/services";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SeatSelectionPage(props: PageProps) {
  const { id } = await props.params;
  const result = await getShowStore().getBySessionId(id);

  if (!result) notFound();

  const { show, session } = result;

  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE_NAME)?.value ?? "";
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: [SNAPSHOT_QUERY_KEY, id],
    queryFn: () => getSeatStore().getSnapshot(id, userId),
  });

  const seats = show.presetId
    ? generateSeatsForPreset(show.presetId)
    : generateSeats();
  const sections = show.presetId
    ? getPreset(show.presetId).sections
    : SECTIONS;
  const sessionTime = new Date(session.startsAt).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  return (
    <main className="flex flex-1 flex-col">
      {/*
       * 도구 화면이라 dark 밴드에 둔다 (docs/UI_GUIDE.md 밴드 정책).
       * 이전에는 배경 클래스가 아예 없어 흰 배경에 흰 글씨로 렌더됐다.
       */}
      <Band fill tone="dark" width="tool">
        <div className="space-y-3xl">
          <header className="space-y-xs">
            <h1 className="text-display-sm">{show.title}</h1>
            <time className="block text-body-sm" dateTime={session.startsAt}>
              {sessionTime}
            </time>
            <p className="text-caption text-mute">{session.id}</p>
          </header>

          <HydrationBoundary state={dehydrate(queryClient)}>
            <SeatMapContainer
              seats={seats}
              sections={sections}
              sessionId={id}
            />
          </HydrationBoundary>
        </div>
      </Band>
    </main>
  );
}
