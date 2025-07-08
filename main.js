// ✅ Supabase Client Setup
const { createClient } = supabase;
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🔁 Navigation
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
}

// 🟡 Load Teams for Dropdowns
async function loadTeamsIntoForms() {
  const { data: teams } = await client.from('teams').select('*').order('name');
  const leagueSelects = {
    '2v2': document.getElementById('team2v2'),
    '4v4': document.getElementById('team4v4'),
    '5v5': document.getElementById('team5v5')
  };
  Object.values(leagueSelects).forEach(select => select.innerHTML = '<option value="">None</option>');

  teams.forEach(team => {
    if (leagueSelects[team.league]) {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      leagueSelects[team.league].appendChild(opt);
    }
  });

  // Fill transfer and match forms
  const transferSel = document.getElementById('transferNewTeam');
  const matchSelA = document.getElementById('matchTeamA');
  const matchSelB = document.getElementById('matchTeamB');
  const matchWinner = document.getElementById('matchWinner');
  [transferSel, matchSelA, matchSelB, matchWinner].forEach(el => el.innerHTML = '');
  teams.forEach(team => {
    const o1 = new Option(team.name, team.id);
    const o2 = new Option(team.name, team.id);
    const o3 = new Option(team.name, team.id);
    const o4 = new Option(team.name, team.id);
    transferSel.appendChild(o1);
    matchSelA.appendChild(o2);
    matchSelB.appendChild(o3);
    matchWinner.appendChild(o4);
  });
}

// ✅ Add Player
const playerForm = document.getElementById('playerForm');
playerForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value;
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;
  const t2 = document.getElementById('team2v2').value;
  const t4 = document.getElementById('team4v4').value;
  const t5 = document.getElementById('team5v5').value;
  const team_ids = [t2, t4, t5].filter(Boolean);

  let image_url = null;
  const imageFile = document.getElementById('playerImage').files[0];
  if (imageFile) {
    const filePath = `${Date.now()}_${imageFile.name}`;
    const { error } = await client.storage.from('player-images').upload(filePath, imageFile);
    if (error) return alert(error.message);
    image_url = client.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);
  alert('Player added');
  playerForm.reset();
});

// ✅ Add Transfer
const transferForm = document.getElementById('transferForm');
transferForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value;
  const newTeamId = document.getElementById('transferNewTeam').value;
  const { data: players } = await client.from('players').select('*').ilike('name', `%${playerName}%`).limit(1);
  if (!players?.length) return alert('Player not found');
  const player = players[0];
  const oldTeamId = player.team_ids?.[0] || null;
  await client.from('players').update({ team_ids: [newTeamId] }).eq('id', player.id);
  await client.from('transfers').insert({ player_id: player.id, old_team_id: oldTeamId, new_team_id: newTeamId });
  alert('Transfer done');
  transferForm.reset();
});

// ✅ Add Match
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  const winner = document.getElementById('matchWinner').value;
  const video = document.getElementById('matchVideo').value;
  const sets = [document.getElementById('set1').value, document.getElementById('set2').value];
  const set3 = document.getElementById('set3').value;
  if (set3) sets.push(set3);
  if (!teamA || !teamB || !winner || sets.length < 2) return alert('Missing info');
  await client.from('matches').insert({ team_a: teamA, team_b: teamB, set_scores: sets.join(','), winner, video_url: video });
  alert('Match recorded');
  matchForm.reset();
});

// ✅ Add Team
const teamForm = document.getElementById('teamForm');
teamForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('teamName').value;
  const league = document.getElementById('teamLeague').value;
  let logo_url = null;
  const logo = document.getElementById('teamLogo').files[0];
  if (logo) {
    const path = `${Date.now()}_${logo.name}`;
    const { error } = await client.storage.from('team-logos').upload(path, logo);
    if (error) return alert(error.message);
    logo_url = client.storage.from('team-logos').getPublicUrl(path).publicURL;
  }
  await client.from('teams').insert({ name, league, logo_url });
  alert('Team added');
  teamForm.reset();
  loadTeamsIntoForms();
});

// ✅ Render Pages
async function renderPlayersPage() {
  const { data } = await client.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML = data.map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');
}

async function renderTeamsPage() {
  const { data } = await client.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML = data.map(t => `<div class='card'><b>${t.name}</b><br>League: ${t.league}</div>`).join('');
}

async function renderTransfersPage() {
  const { data } = await client.from('transfers').select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML = data.map(t => `<div class='card'>${t.players.name}: ${t.old_team?.name || 'None'} → ${t.new_team?.name}</div>`).join('');
}

async function renderMatchesPage() {
  const { data } = await client.from('matches').select('*, team_a:teams!matches_team_a_fkey(name), team_b:teams!matches_team_b_fkey(name), winner:teams!matches_winner_fkey(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML = data.map(m => `<div class='card'><strong>${m.team_a.name}</strong> vs <strong>${m.team_b.name}</strong><br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}${m.video_url ? `<br><a href='${m.video_url}' target='_blank'>Video</a>` : ''}</div>`).join('');
}

async function fetchLiveHome() {
  const { data: players } = await client.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML = players.map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await client.from('transfers').select('*, players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML = transfers.map(t => `<div class='card'>${t.players.name} → ${t.new_team.name}</div>`).join('');

  const { data: matches } = await client.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML = matches.map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}</div>`).join('');
}

window.addEventListener('load', () => {
  fetchLiveHome();
  loadTeamsIntoForms();
});
