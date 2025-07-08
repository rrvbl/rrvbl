// ✅ Supabase Client Setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const { createClient } = supabase;
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
  const selects = ['player2v2', 'player4v4', 'player5v5'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">None</option>';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = `${team.name} (${team.league})`;
      el.appendChild(option);
    });
  });
}

// ✅ Add Player
const playerForm = document.getElementById('playerForm');
playerForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value;
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;
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
  if (!players || players.length === 0) return alert('Player not found');
  const player = players[0];
  const oldTeamId = player.team_ids.length ? player.team_ids[0] : null;
  const { error: updateError } = await client.from('players').update({ team_ids: [newTeamId] }).eq('id', player.id);
  if (updateError) return alert(updateError.message);
  await client.from('transfers').insert({ player_id: player.id, old_team_id: oldTeamId, new_team_id: newTeamId });
  alert('Transfer successful');
  transferForm.reset();
});

// ✅ Add Match
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  const winnerId = document.getElementById('matchWinner').value;
  const scores = [1, 2, 3].map(i => document.getElementById(`set${i}`).value).filter(Boolean);
  const video_url = document.getElementById('matchVideo').value;

  await client.from('matches').insert({ team_a: teamA, team_b: teamB, winner: winnerId, set_scores: scores.join(','), video_url });
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
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const filePath = `${Date.now()}_${logoFile.name}`;
    const { error } = await client.storage.from('team-logos').upload(filePath, logoFile);
    if (error) return alert(error.message);
    logo_url = client.storage.from('team-logos').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('teams').insert({ name, league, logo_url });
  if (error) return alert(error.message);
  alert('Team added');
  teamForm.reset();
  loadTeamsIntoForms();
});

// 🏠 Fetch Home
async function fetchLiveHome() {
  const { data: players } = await client.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML = (players || []).map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await client.from('transfers').select('*, players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML = (transfers || []).map(t => `<div class='card'>${t.players.name} → ${t.new_team.name}</div>`).join('');

  const { data: matches } = await client.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML = (matches || []).map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}</div>`).join('');
}

// ♻️ Realtime
function subscribeRealtime() {
  client.channel('public:players').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchLiveHome).subscribe();
  client.channel('public:transfers').on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, fetchLiveHome).subscribe();
  client.channel('public:matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLiveHome).subscribe();
}

// 📄 Pages
async function renderPlayersPage() {
  const { data } = await client.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML = (data || []).map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');
}

async function renderTeamsPage() {
  const { data } = await client.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML = (data || []).map(t => `<div class='card'><b>${t.name}</b><br>League: ${t.league}</div>`).join('');
}

async function renderTransfersPage() {
  const { data } = await client.from('transfers').select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML = (data || []).map(t => `<div class='card'><b>${t.players.name}</b><br>${t.old_team?.name || 'None'} → ${t.new_team?.name}</div>`).join('');
}

async function renderMatchesPage() {
  const { data } = await client.from('matches').select('*, team_a:teams!matches_team_a_fkey(name), team_b:teams!matches_team_b_fkey(name), winner:teams!matches_winner_fkey(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML = (data || []).map(m => `<div class='card'><b>${m.team_a.name}</b> vs <b>${m.team_b.name}</b><br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}${m.video_url ? `<br><a href='${m.video_url}' target='_blank'>Match Video</a>` : ''}</div>`).join('');
}

// 🚀 Init
window.addEventListener('load', () => {
  fetchLiveHome();
  subscribeRealtime();
});
