import { getApiUrl } from '../config.js';

const parseError = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  const error = new Error(data.message || fallbackMessage);
  error.status = response.status;
  throw error;
};

const request = async (path, options = {}, fallbackMessage = 'Request failed') => {
  const response = await fetch(getApiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    await parseError(response, fallbackMessage);
  }

  return response.status === 204 ? null : response.json();
};

const jsonBody = (body) => JSON.stringify(body);

const TourneyApiService = {
  sendOtp: (phoneNumber) => request('/auth/send_otp', {
    method: 'POST',
    body: jsonBody({ phoneNumber })
  }, 'Failed to send code'),

  verifyOtp: (phoneNumber, code) => request('/auth/login', {
    method: 'POST',
    body: jsonBody({ phoneNumber, code })
  }, 'Invalid code'),

  logout: () => request('/auth/logout', { method: 'POST' }, 'Failed to log out'),

  getCurrentUser: async () => {
    const response = await fetch(getApiUrl('/api/users/me'), { credentials: 'include' });
    if (response.status === 204 || response.status === 404) return null;
    if (response.status === 401 || response.status === 403) {
      const error = new Error('Not authenticated');
      error.status = response.status;
      throw error;
    }
    if (!response.ok) {
      await parseError(response, 'Failed to fetch user');
    }
    return response.json();
  },

  listTournaments: () => request('/api/tourney/tournaments', {}, 'Failed to load tournaments'),

  createTournament: (tournamentData) => request('/api/tourney/tournaments', {
    method: 'POST',
    body: jsonBody(tournamentData)
  }, 'Failed to create tournament'),

  updateTournament: (tournamentId, tournamentData) => request(`/api/tourney/tournaments/${encodeURIComponent(tournamentId)}`, {
    method: 'PUT',
    body: jsonBody(tournamentData)
  }, 'Failed to update tournament'),

  getTournament: (tournamentId) => request(
    `/api/tourney/tournaments/${encodeURIComponent(tournamentId)}`,
    {},
    'Failed to load tournament'
  ),

  addTeam: (tournamentId, teamData) => request(`/api/tourney/tournaments/${encodeURIComponent(tournamentId)}/teams`, {
    method: 'POST',
    body: jsonBody(teamData)
  }, 'Failed to add team'),

  deleteTeam: (tournamentId, teamId) => request(
    `/api/tourney/tournaments/${encodeURIComponent(tournamentId)}/teams/${encodeURIComponent(teamId)}`,
    { method: 'DELETE' },
    'Failed to delete team'
  ),

  generateSchedule: (tournamentId) => request(`/api/tourney/tournaments/${encodeURIComponent(tournamentId)}/schedule`, {
    method: 'POST'
  }, 'Failed to generate schedule'),

  updateMatchScore: (tournamentId, matchId, matchData) => request(
    `/api/tourney/tournaments/${encodeURIComponent(tournamentId)}/matches/${encodeURIComponent(matchId)}/score`,
    {
      method: 'PUT',
      body: jsonBody(matchData)
    },
    'Failed to save score'
  )
};

export default TourneyApiService;
