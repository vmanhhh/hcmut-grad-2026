"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InviteCard from "@/components/card/InviteCard";
import NewJourneyPrompt from "@/components/card/NewJourneyPrompt";
import JourneyHost from "@/components/journey/JourneyHost";
import LetterOverlay from "@/components/journey/LetterOverlay";
import galleriesJson from "@/content/galleries.json";
import memoriesJson from "@/content/memories.json";
import { detectInAppBrowser, type InAppInfo } from "@/lib/user-agent";
import type { Gallery, InvitePayload, Memory, SavedRsvp } from "@/lib/types";

const MEMORIES = memoriesJson as Memory[]; // static content, not guest data
const GALLERIES = galleriesJson as Gallery[];
const NOT_IN_APP: InAppInfo = { inApp: false, app: null, os: "other" };

const PLAYED_KEY = (code: string) => `grad-played:${code}`;

/** Journey version the guest last completed in this browser, or null when never. */
function readPlayed(code: string): number | null {
  try {
    const v = window.localStorage.getItem(PLAYED_KEY(code));
    return v === null ? null : Number(v) || 1;
  } catch {
    return null;
  }
}

function writePlayed(code: string, version: number) {
  try {
    window.localStorage.setItem(PLAYED_KEY(code), String(version));
  } catch {
    // storage blocked: the game just plays again next time
  }
}

type Run = null | "play" | "replay";

export default function InviteExperience({ payload }: { payload: InvitePayload }) {
  const { guest, event, code } = payload;
  const hasJourney = event.journey_version > 0;

  const [saved, setSaved] = useState<SavedRsvp | null>(
    guest.rsvp
      ? { rsvp: guest.rsvp, meeting_window: guest.meeting_window, party_size: guest.party_size, wish: guest.wish }
      : null,
  );
  const [inApp, setInApp] = useState<InAppInfo>(NOT_IN_APP);
  // "Has this guest played the game?" lives in this browser (localStorage), not the DB. Until the client has
  // checked it, a cover is rendered (also server-side) so the card never flashes before the game.
  const [run, setRun] = useState<Run>(null);
  const [checking, setChecking] = useState(hasJourney);
  const [promptOpen, setPromptOpen] = useState(false);
  // ?test=1 : never reads or writes the played-cache, never writes the DB (RSVP is simulated), ?seats=N fakes the seat count
  const [test, setTest] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const opened = useRef(false);
  const runRef = useRef<Run>(null);
  runRef.current = run;
  const testRef = useRef(false);
  testRef.current = test;

  // The server renders the card and assumes "not in-app"; detect on the client after hydration.
  useEffect(() => setInApp(detectInAppBrowser(navigator.userAgent)), []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const isTest = q.get("test") === "1";
    setTest(isTest);
    if (hasJourney) {
      const seen = isTest ? null : readPlayed(code);
      if (seen === null) setRun("play");
      else if (seen < event.journey_version) setPromptOpen(true);
    }
    setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // POST /open once when the guest COMPLETES the game: the DB only keeps "finished the game" (opened_at) and the RSVP.
  const recordOpen = useCallback(() => {
    if (testRef.current) return;
    if (opened.current) return;
    opened.current = true;
    fetch(`/api/invite/${code}/open`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {
      opened.current = false;
    });
  }, [code]);

  // "Xác nhận tham gia": saves RSVP "yes" (the single 9h-12h window). In ?test=1 nothing is sent.
  const join = useCallback(async () => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    const body = { rsvp: "yes" as const, meeting_window: "early" as const, party_size: saved?.party_size ?? 1, wish: saved?.wish ?? null };
    try {
      if (testRef.current) {
        setSaved(body);
      } else {
        const res = await fetch(`/api/invite/${code}/rsvp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error("rsvp");
        const data = (await res.json()) as { rsvp: SavedRsvp };
        setSaved(data.rsvp);
      }
    } catch {
      setJoinError("Chưa lưu được. Bạn thử lại nhé.");
    } finally {
      setJoining(false);
    }
  }, [code, joining, saved]);

  // "Hoàn tác": back to no answer. In ?test=1 only the screen state changes.
  const undo = useCallback(async () => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      if (!testRef.current) {
        const res = await fetch(`/api/invite/${code}/rsvp`, { method: "DELETE" });
        if (!res.ok) throw new Error("undo");
      }
      setSaved(null);
    } catch {
      setJoinError("Chưa hoàn tác được. Bạn thử lại nhé.");
    } finally {
      setJoining(false);
    }
  }, [code, joining]);

  const onJourneyFinish = useCallback(
    (reason: "completed" | "skipped") => {
      // Only finishing the game counts as done (opened_at set), so the next visit does not replay it.
      // A skip / load failure leaves it unrecorded. Replay never touches opened_at.
      if (runRef.current === "play" && reason === "completed") {
        recordOpen();
        if (!testRef.current) writePlayed(code, event.journey_version);
      }
      setRun(null);
      window.scrollTo(0, 0);
    },
    [recordOpen, code, event.journey_version],
  );

  return (
    <>
      <InviteCard
        payload={payload}
        saved={saved}
        onSaved={setSaved}
        onJoin={join}
        onUndo={undo}
        joining={joining}
        joinError={joinError}
        onLetter={() => setLetterOpen(true)}
        inApp={inApp}
        onReplay={hasJourney ? () => setRun("replay") : undefined}
        topSlot={
          promptOpen ? (
            <NewJourneyPrompt
              onPlay={() => {
                setPromptOpen(false);
                setRun("play");
              }}
              onDismiss={() => {
                setPromptOpen(false);
                if (!testRef.current) writePlayed(code, event.journey_version);
              }}
            />
          ) : null
        }
      />
      {letterOpen && (
        <LetterOverlay
          letter={{ salutation: guest.salutation, title: guest.message_title, body: guest.message_body }}
          hostName={event.host_name}
          onEnterCard={() => setLetterOpen(false)}
          enterLabel="Đóng thư"
          className="fixed inset-0 z-50"
        />
      )}
      {checking && <div className="fixed inset-0 z-40 bg-[#5eb04d]" aria-hidden="true" />}
      {test && (
        <p className="fixed left-1/2 top-0 z-[60] -translate-x-1/2 bg-[#b02f36] px-2 py-0.5 text-[0.65rem] font-bold text-white">
          CHẾ ĐỘ TEST · không lưu DB / cache
        </p>
      )}
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
