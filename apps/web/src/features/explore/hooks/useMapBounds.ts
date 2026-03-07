"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ExploreBounds } from "../types";

const BOUNDS_TOLERANCE = 0.0008;

const sameBounds = (
  left: ExploreBounds | null,
  right: ExploreBounds | null,
) => {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return (
    Math.abs(left.ne.lat - right.ne.lat) < BOUNDS_TOLERANCE &&
    Math.abs(left.ne.lng - right.ne.lng) < BOUNDS_TOLERANCE &&
    Math.abs(left.sw.lat - right.sw.lat) < BOUNDS_TOLERANCE &&
    Math.abs(left.sw.lng - right.sw.lng) < BOUNDS_TOLERANCE
  );
};

export const useMapBounds = (appliedBounds: ExploreBounds | null) => {
  const initializedRef = useRef(false);
  const [draftBounds, setDraftBounds] = useState<ExploreBounds | null>(
    appliedBounds,
  );
  const [committedBounds, setCommittedBounds] = useState<ExploreBounds | null>(
    appliedBounds,
  );

  useEffect(() => {
    if (!initializedRef.current && !appliedBounds) return;
    initializedRef.current = true;
    setDraftBounds(appliedBounds);
    setCommittedBounds(appliedBounds);
  }, [appliedBounds]);

  const updateDraftBounds = (nextBounds: ExploreBounds | null) => {
    setDraftBounds((currentBounds) => {
      if (!initializedRef.current) {
        // The first idle event establishes the baseline without surfacing a false dirty state.
        initializedRef.current = true;
        setCommittedBounds(nextBounds);
        return nextBounds;
      }

      if (sameBounds(currentBounds, nextBounds)) {
        return currentBounds;
      }

      return nextBounds;
    });
  };

  const isDirty = useMemo(
    () => initializedRef.current && !sameBounds(draftBounds, committedBounds),
    [committedBounds, draftBounds],
  );

  const applyDraftBounds = () => {
    setCommittedBounds(draftBounds);
    return draftBounds;
  };

  return {
    draftBounds,
    committedBounds,
    isDirty,
    updateDraftBounds,
    applyDraftBounds,
  };
};
