import type { ThreadReactionType } from "@/features/chika/api/threads";

export type ChikaVoteState = {
  voteScore: number;
  viewerVote: ThreadReactionType | null;
};

const voteScoreByState = {
  upvote: 1,
  downvote: -1,
  none: 0,
} as const;

export const voteDelta = (
  current: ThreadReactionType | null,
  next: ThreadReactionType | null,
) => {
  const scoreFor = (value: ThreadReactionType | null) =>
    voteScoreByState[value ?? "none"];
  return scoreFor(next) - scoreFor(current);
};

export const nextVoteForClick = (
  current: ThreadReactionType | null,
  clicked: ThreadReactionType,
) => (current === clicked ? null : clicked);

export const applyVoteTransition = (
  current: ChikaVoteState,
  clicked: ThreadReactionType,
): ChikaVoteState => {
  const viewerVote = nextVoteForClick(current.viewerVote, clicked);
  return {
    viewerVote,
    voteScore: current.voteScore + voteDelta(current.viewerVote, viewerVote),
  };
};
