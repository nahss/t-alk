"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 640px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True on phone-sized screens (the design's 640px breakpoint). */
export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
