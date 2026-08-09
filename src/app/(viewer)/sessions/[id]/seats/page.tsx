import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { SeatMapContainer } from "@/components/seat/SeatMapContainer";
import { SNAPSHOT_QUERY_KEY } from "@/hooks/use-seat-snapshot";
import { USER_ID_COOKIE_NAME } from "@/lib/cookie";
import { generateSeats } from "@/lib/mock-data";
import { SECTIONS } from "@/lib/seat-map";
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
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {show.title}
        </h1>
        <time
          className="mt-3 block text-sm leading-6 text-neutral-300"
          dateTime={session.startsAt}
        >
          {sessionTime}
        </time>
        <p className="mt-1 text-sm text-neutral-400">{session.id}</p>
      </header>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <SeatMapContainer
          seats={seats}
          sessionId={id}
          sections={sections}
        />
      </HydrationBoundary>
    </main>
  );
}
