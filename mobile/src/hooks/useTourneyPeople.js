import { useCallback, useEffect, useMemo, useState } from 'react';
import BackendApiService from '../services/BackendApiService.js';
import { useNotifications } from '../contexts/NotificationContext.jsx';

// Shared player-selection data for the tourney create + match flows: one selectable
// list of everyone (Critic users + saved non-Critic "guest" players reused from past
// events), plus ensureTourneyPlayer() which resolves a picked candidate to a saved
// TourneyPlayer id (creating a guest/critic player row on the fly when needed).

export const normalizeName = (value) => value.trim().replace(/\s+/g, ' ');

export const playerKey = (player) => (
  player.playerId ? `player:${player.playerId}`
    : player.criticUserId ? `critic:${player.criticUserId}`
      : `raw:${player.displayName.toLowerCase()}`
);

export const samePlayer = (left, right) => {
  if (left.playerId && right.playerId) {
    return left.playerId === right.playerId;
  }
  if (left.criticUserId && right.criticUserId) {
    return left.criticUserId === right.criticUserId;
  }
  return left.displayName.toLowerCase() === right.displayName.toLowerCase();
};

export function useTourneyPeople() {
  const { notify } = useNotifications();
  const [criticUsers, setCriticUsers] = useState([]);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [users, players] = await Promise.all([
        BackendApiService.getTourneyCriticUsers(),
        BackendApiService.getTourneyPlayers()
      ]);
      setCriticUsers(users);
      setExistingPlayers(players);
    } catch (err) {
      notify({ message: err.message || 'Failed to load players', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Tournament veterans (played before, incl. saved guests) sort to the top.
  const people = useMemo(() => {
    const criticPeople = criticUsers.map((u) => ({
      key: `critic:${u.userId}`,
      displayName: u.username,
      profilePicUrl: u.profilePicUrl,
      guest: false,
      playedBefore: u.playedBefore,
      candidate: { displayName: u.username, criticUserId: u.userId, criticUsername: u.username }
    }));
    const criticNames = new Set(criticUsers.map((u) => u.username.toLowerCase()));
    const guestPeople = existingPlayers
      .filter((p) => p.criticUserId == null && !criticNames.has(p.displayName.toLowerCase()))
      .map((p) => ({
        key: `player:${p.id}`,
        displayName: p.displayName,
        profilePicUrl: null,
        guest: true,
        playedBefore: true,
        candidate: { playerId: p.id, displayName: p.displayName }
      }));
    return [...criticPeople, ...guestPeople].sort((a, b) => (
      (b.playedBefore === a.playedBefore ? 0 : b.playedBefore ? 1 : -1)
      || a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    ));
  }, [criticUsers, existingPlayers]);

  const ensureTourneyPlayer = useCallback(async (player) => {
    if (player.playerId) {
      return player.playerId;
    }
    const existing = existingPlayers.find((candidate) => (
      player.criticUserId
        ? candidate.criticUserId === player.criticUserId
        : candidate.displayName.toLowerCase() === player.displayName.toLowerCase()
    ));
    if (existing) {
      return existing.id;
    }
    const created = await BackendApiService.createTourneyPlayer({
      displayName: player.displayName,
      criticUserId: player.criticUserId || null
    });
    return created.id;
  }, [existingPlayers]);

  return { people, loading, reload, ensureTourneyPlayer };
}
