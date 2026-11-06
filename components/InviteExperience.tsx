"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InviteCard from "@/components/card/InviteCard";
import NewJourneyPrompt from "@/components/card/NewJourneyPrompt";
import JourneyHost from "@/components/journey/JourneyHost";
import galleriesJson from "@/content/galleries.json";
import memoriesJson from "@/content/memories.json";
import { detectInAppBrowser, type InAppInfo } from "@/lib/user-agent";
import type { Gallery, InvitePayload, Memory, SavedRsvp } from "@/lib/types";

const MEMORIES = memoriesJson as Memory[]; // static content, not guest data
const GALLERIES = galleriesJson as Gallery[];
const NOT_IN_APP: InAppInfo = { inApp: false, app: null, os: "other" };

type Run = null | "play" | "replay";

export default function InviteExperience({ payload }: { payload: InvitePayload }) {
  const { guest, event, code, visit } = payload;
  const hasJourney = event.journey_version > 0;

  const [saved, setSaved] = useState<SavedRsvp | null>(
    guest.rsvp
      ? { rsvp: guest.rsvp, meeting_window: guest.meeting_window, party_size: guest.party_size, wish: guest.wish }
      : null,
  );
  const [inApp, setInApp] = useState<InAppInfo>(NOT_IN_APP);
  // First visit with a journey: start in "play" from the very first (server-rendered) paint so the black
  // loading overlay shows immediately and the card never flashes before the game.
  const [run, setRun] = useState<Run>(visit === "first" && hasJourney ? "play" : null);
  const [promptOpen, setPromptOpen] = useState(visit === "return_new_journey" && hasJourney);
  const opened = useRef(false);
  const runRef = useRef<Run>(null);
  runRef.current = run;

  // The server renders the card and assumes "not in-app"; detect on the client after hydration.
  useEffect(() => setInApp(detectInAppBrowser(navigator.userAgent)), []);

  // POST /open once: sets opened_at (first time only) and journey_version_seen. Never blocks the card.
  const recordOpen = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    fetch(`/api/invite/${code}/open`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {
      opened.current = false;
    });
  }, [code]);

  useEffect(() => {
    if (visit !== "first") return;
    if (!hasJourney) recordOpen(); // no journey: the card is the first thing shown (FR-012)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onJourneyFinish = useCallback(
    (reason: "completed" | "skipped") => {
      // Only finishing the game counts as done (opened_at set), so the next visit does not replay it.
      // A skip / load failure leaves it unrecorded. Replay never touches opened_at.
      if (runRef.current === "play" && reason === "completed") recordOpen();
      setRun(null);
      window.scrollTo(0, 0);
    },
    [recordOpen],
  );

  return (
    <>
      <InviteCard
        payload={payload}
        saved={saved}
        onSaved={setSaved}
        inApp={inApp}
        onReplay={hasJourney ? () => setRun("replay") : undefined}
        topSlot={
          promptOpen ? (
            <NewJourneyPrompt
              onPlay={() => {
                setPromptOpen(false);
                recordOpen();
                setRun("play");
              }}
              onDismiss={() => {
                setPromptOpen(false);
                recordOpen();
              }}
            />
          ) : null
        }
      />
      {run && (
        <JourneyHost
          key={run}
          mode={run}
          letter={{ salutation: guest.salutation, title: guest.message_title, body: guest.message_body }}
          memories={MEMORIES}
          galleries={GALLERIES}
          hostName={event.host_name}
          onFinish={onJourneyFinish}
        />
      )}
    </>
  );
}
