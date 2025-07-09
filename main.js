// Ensure supabase.min.js is loaded before this script (see index.html)

const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
}

async function loadTeamsIntoForms() {
  const { data: teams, error } = await client.from('teams').select('*').order('name');
  if (error) return alert('Error loading teams: ' + error.message);

  ['player2v2', 'player4v4', 'player5v5'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">None</option>';
    teams.forEach(team => {
      if ((id === 'player2v2' && team.league === '2v2') ||
          (id === 'player4v4' && team.league === '4v4') ||
          (id === 'player5v5' && team.league === '5v5')) {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        el.appendChild(option);
      }
    });
  });

  updateTransferTeams();

  ['matchTeamA', 'matchTeamB'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Team</option>';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = `${team.name} (${team.league})`;
      sel.appendChild(option);
    });
  });

  ['set1Winner', 'set2Winner', 'set3Winner', 'matchWinner'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">Select Team</option>';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      sel.appendChild(option);
    });
  });
}

function updateTransferTeams() {
  const leagueSelect = document.getElementById('transferLeague');
  if (!leagueSelect) return;
  const league = leagueSelect.value;
  const select = document.getElementById('transferNewTeam');
  if (!select) return;

  select.innerHTML = '<option value="">Select Team</option>';
  client.from('teams').select('*').eq('league', league).order('name').then(({ data }) => {
    if (!data) return;
    data.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      select.appendChild(option);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const transferLeague = document.getElementById('transferLeague');
  if (transferLeague) transferLeague.addEventListener('change', updateTransferTeams);

  const playerForm = document.getElementById('playerForm');
  if (playerForm) {
    playerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('playerName').value.trim();
      const gender = document.getElementById('gender').value;
      const position = document.getElementById('position').value.trim();
      const team_ids = [];
      ['player2v2', 'player4v4', 'player5v5'].forEach(id => {
        const val = document.getElementById(id).value;
        if (val) team_ids.push(val);
      });

      let image_url = null;
      const imageFile = document.getElementById('playerImage').files[0];
      if (imageFile) {
        const filePath = `${Date.now()}_${imageFile.name}`;
        const { error } = await client.storage.from('player-images').upload(filePath, imageFile);
        if (error) return alert('Image upload error: ' + error.message);
        image_url = client.storage.from('player-images').getPublicUrl(filePath).publicURL;
      }

      const { error } = await client.from('players').insert({ name, gender, position, team_ids, image_url });
      if (error) return alert('Insert error: ' + error.message);
      alert('Player added');
      e.target.reset();
      fetchLiveHome();
    });
  }

  const transferForm = document.getElementById('transferForm');
  if (transferForm) {
    transferForm.addEventListener('submit', async e => {
      e.preventDefault();
      const playerName = document.getElementById('transferPlayer').value.trim();
      const league = document.getElementById('transferLeague').value;
      const newTeamId = document.getElementById('transferNewTeam').value;

      if (!playerName) return alert('Please enter player name');
      if (!league) return alert('Please select a league');
      if (!newTeamId) return alert('Please select a new team');

      const { data: players, error: pError } = await client.from('players').select('*').ilike('name', `%${playerName}%`).limit(1);
      if (pError) return alert('Error finding player: ' + pError.message);
      if (!players || players.length === 0) return alert('Player not found');
      const player = players[0];

      // Update player's team_ids for the league: replace existing team in that league or add if none
      let team_ids = player.team_ids || [];
      // We'll get the existing teams data to check league for existing teams:
      const { data: teamsData, error: tError } = await client.from('teams').select('*').in('id', team_ids);
      if (tError) return alert('Error loading teams: ' + tError.message);

      // Remove any team that is in the same league as selected league
      team_ids = team_ids.filter(tid => {
        const team = teamsData.find(t => t.id === tid);
        return team && team.league !== league;
      });
      // If newTeamId is empty string, we treat as removing team from that league
      if (newTeamId !== '') {
        team_ids.push(newTeamId);
      }

      const { error: updateError } = await client.from('players').update({ team_ids }).eq('id', player.id);
      if (updateError) return alert('Update error: ' + updateError.message);

      // Insert transfer record
      const oldTeam = teamsData.find(t => t.league === league);
      const oldTeamId = oldTeam ? oldTeam.id : null;

      await client.from('transfers').insert({
        player_id: player.id,
        old_team_id: oldTeamId,
        new_team_id: newTeamId !== '' ? newTeamId : null,
        transferred_at: new Date()
      });

      alert('Transfer successful');
      e.target.reset();
      fetchLiveHome();
    });
  }

  const matchForm = document.getElementById('matchForm');
  if (matchForm) {
    matchForm.addEventListener('submit', async e => {
      e.preventDefault();
      const teamA = document.getElementById('matchTeamA').value;
      const teamB = document.getElementById('matchTeamB').value;
      const matchWinner = document.getElementById('matchWinner').value;
      const video_url = document.getElementById('matchVideo').value;

      if (!teamA || !teamB) return alert('Please select both teams');
      if (teamA === teamB) return alert('Teams must be different');
      if (!matchWinner) return alert('Please select match winner');

      const scores = [];
      for (let i = 1; i <= 3; i++) {
        const score = document.getElementById(`set${i}`)?.value.trim();
        const winner = document.getElementById(`set${i}Winner`)?.value;
        if (score && winner) {
          scores.push(`${score} (${winner})`);
        }
      }
      if (scores.length < 2) return alert('Please enter at least two sets with winners');

      const mvpName = document.getElementById('matchMVP').value.trim();
      const svpName = document.getElementById('matchSVP').value.trim();

      async function findPlayerIdByName(name) {
        if (!name) return null;
        const { data } = await client.from('players').select('id').ilike('name', `%${name}%`).limit(1);
        return data && data.length ? data[0].id : null;
      }
      const mvpId = await findPlayerIdByName(mvpName);
      const svpId = await findPlayerIdByName(svpName);

      const { error } = await client.from('matches').insert({
        team_a: teamA,
        team_b: teamB,
        winner: matchWinner,
        set_scores: scores.join(', '),
        video_url,
        mvp_id: mvpId,
        svp_id: svpId,
        played_at: new Date()
      });

      if (error) return alert(error.message);
      alert('Match recorded');
      e.target.reset();
      fetchLiveHome();
    });
  }
});

async function fetchLiveHome() {
  // Fetch and render latest players, transfers, and matches for homepage
  const { data: players } = await client.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML = (players || []).map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await client.from('transfers').select('*, player:players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML = (transfers || []).map(t => `<div class='card'>${t.player.name} → ${t.new_team?.name || 'Removed'}</div>`).join('');

  const { data: matches } = await client.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML = (matches || []).map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}</div>`).join('');
}

async function renderPlayersPage() {
  const { data } = await client.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML = (data || []).map(p => `<div class='card'><b>${p.name}</b> - ${p.position} - ${p.gender}</div>`).join('');
}

async function renderTeamsPage() {
  const { data } = await client.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML = (data || []).map(t => `<div class='card'><b>${t.name}</b> (${t.league})</div>`).join('');
}

async function renderTransfersPage() {
  const { data } = await client.from('transfers').select('*, player:players(name), old_team:teams(name), new_team:teams(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML = (data || []).map(t => `<div class='card'>${t.player.name}: ${t.old_team?.name || 'None'} → ${t.new_team?.name || 'Removed'} (${new Date(t.transferred_at).toLocaleDateString()})</div>`).join('');
}

async function renderMatchesPage() {
  const { data } = await client.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML = (data || []).map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}<br>Date: ${new Date(m.played_at).toLocaleDateString()}</div>`).join('');
}

function subscribeRealtime() {
  // TODO: Add realtime subscriptions if needed, using client.channel etc.
  console.log('subscribeRealtime called');
}

window.addEventListener('load', () => {
  fetchLiveHome();
  subscribeRealtime();
  loadTeamsIntoForms();
});
