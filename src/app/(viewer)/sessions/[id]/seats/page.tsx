import { notFound } from "next/navigation";

import { SeatMap } from "@/components/seat/SeatMap";
import { generateSeats, MOCK_SESSIONS, MOCK_SHOWS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SeatSelectionPage(props: PageProps) {
  const { id } = await props.params;
  const session = MOCK_SESSIONS.find((candidate) => candidate.id === id);

  if (!session) notFound();

  const show = MOCK_SHOWS.find((candidate) => candidate.id === session.showId);

  if (!show) notFound();

  const seats = generateSeats();
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

      <SeatMap seats={seats} />
    </main>
  );
}
