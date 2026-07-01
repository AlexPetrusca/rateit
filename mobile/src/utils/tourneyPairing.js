// Auto-pairing for a live tournament round, computed from the tournament detail
// (standings give wins; teams give past partnerships; matches give bye history).
// Returns a proposed next round the user can hand-adjust.
//
// Rules:
//  - Rank players by wins (tiebreak point differential, then name).
//  - Byes (when players don't fill nets x4) go to whoever has sat out the least.
//  - Partner the highest-win players with the lowest-win players ACROSS the whole
//    field (not just within a net): rank the playing players, then pair the top
//    with the bottom, next-top with next-bottom, etc.
//  - Rule 1: avoid repeating a past partnership (pick the next-lowest available
//    partner instead), then distribute the balanced teams across the nets.

const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

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
  const playing = ranked.filter((p) => !byeIds.has(p.id)); // still rank-ordered, wins desc

  // Form balanced teams across the WHOLE field: take the highest-ranked player and
  // partner them with the lowest-ranked player they haven't partnered before, then
  // repeat. This pairs winners with losers globally (not just inside one net).
  const remaining = [...playing];
  const teams = [];
  while (remaining.length >= 2) {
    const high = remaining.shift();
    let partnerIdx = -1;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (!partnered.has(pairKey(high.id, remaining[i].id))) { partnerIdx = i; break; }
    }
    if (partnerIdx === -1) partnerIdx = remaining.length - 1; // all repeats -> take lowest
    const partner = remaining.splice(partnerIdx, 1)[0];
    teams.push([high, partner]);
  }

  // Distribute the balanced teams into nets. Consecutive teams have similar total
  // strength (each is a high+low pair), so pairing them makes competitive games.
  const games = [];
  for (let i = 0; i + 1 < teams.length; i += 2) {
    games.push({ net: games.length + 1, teamA: teams[i], teamB: teams[i + 1] });
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
