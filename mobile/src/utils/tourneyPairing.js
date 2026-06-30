// Mexicano-style auto-pairing for a live tournament round, computed from the
// tournament detail (standings give wins; teams give past partnerships; matches
// give bye history). Returns a proposed next round the user can hand-adjust.
//
// Rules:
//  - Rank players by wins (tiebreak point differential, then name).
//  - Byes (when players don't fill nets x4) go to whoever has sat out the least.
//  - Fill nets from the top of the ranking (top 4 -> net 1, next 4 -> net 2 ...).
//  - Within a net of 4 ranked a>b>c>d, partner lowest+highest: (a+d) vs (b+c).
//  - Rule 1: avoid repeating a past partnership; try the other splits if needed.

const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Pick the split of 4 ranked players into two pairs, preferring (a+d)/(b+c) and
// avoiding partnerships that already happened.
const chooseTeams = (group, partnered) => {
  const [a, b, c, d] = group;
  const splits = [
    [[a, d], [b, c]],
    [[a, c], [b, d]],
    [[a, b], [c, d]]
  ];
  const fresh = splits.find(([t1, t2]) => (
    !partnered.has(pairKey(t1[0].id, t1[1].id)) && !partnered.has(pairKey(t2[0].id, t2[1].id))
  ));
  return fresh || splits[0];
};

export const proposeNextRound = (detail) => {
  const players = (detail?.players || []).map((tp) => ({ id: tp.player.id, name: tp.player.displayName }));
  const matches = detail?.matches || [];
  const courtCount = Math.max(1, detail?.courtCount || 1);

  const teamPlayers = new Map((detail?.teams || []).map((t) => [t.id, [t.playerOne.id, t.playerTwo.id]]));
  const winsById = new Map((detail?.playerStandings || []).map((s) => [s.playerId, s.wins]));
  const diffById = new Map((detail?.playerStandings || []).map((s) => [s.playerId, s.pointDifferential]));

  const partnered = new Set((detail?.teams || []).map((t) => pairKey(t.playerOne.id, t.playerTwo.id)));

  // Bye history: how many distinct rounds each player has played.
  const allRounds = [...new Set(matches.map((m) => m.roundNumber))];
  const playedRounds = new Map();
  matches.forEach((m) => {
    [...(teamPlayers.get(m.teamAId) || []), ...(teamPlayers.get(m.teamBId) || [])].forEach((pid) => {
      if (!playedRounds.has(pid)) playedRounds.set(pid, new Set());
      playedRounds.get(pid).add(m.roundNumber);
    });
  });
  const byeCount = (pid) => allRounds.length - (playedRounds.get(pid)?.size || 0);

  const nextRoundNumber = (allRounds.length ? Math.max(...allRounds) : 0) + 1;

  const ranked = [...players].sort((p, q) => (
    (winsById.get(q.id) || 0) - (winsById.get(p.id) || 0)
    || (diffById.get(q.id) || 0) - (diffById.get(p.id) || 0)
    || p.name.localeCompare(q.name)
  ));

  const usableNets = Math.min(courtCount, Math.floor(ranked.length / 4));
  const playingCount = usableNets * 4;
  const byesCount = ranked.length - playingCount;

  // Byes: fewest byes so far first (rotate fairly), tiebreak by name.
  const byes = byesCount > 0
    ? [...ranked].sort((p, q) => byeCount(p.id) - byeCount(q.id) || p.name.localeCompare(q.name)).slice(0, byesCount)
    : [];
  const byeIds = new Set(byes.map((p) => p.id));
  const playing = ranked.filter((p) => !byeIds.has(p.id)); // still rank-ordered

  const games = [];
  for (let i = 0; i + 4 <= playing.length; i += 4) {
    const group = playing.slice(i, i + 4);
    const [teamA, teamB] = chooseTeams(group, partnered);
    // Reserve these partnerships so two nets in the same round don't collide.
    partnered.add(pairKey(teamA[0].id, teamA[1].id));
    partnered.add(pairKey(teamB[0].id, teamB[1].id));
    games.push({ net: games.length + 1, teamA, teamB });
  }

  return { roundNumber: nextRoundNumber, games, byes };
};

// Build the POST body for committing a proposed/edited round.
export const roundToCommitPayload = (round) => ({
  roundNumber: round.roundNumber,
  games: round.games.map((g) => ({
    teamAPlayerIds: g.teamA.map((p) => p.id),
    teamBPlayerIds: g.teamB.map((p) => p.id)
  }))
});
