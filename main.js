// ✅ Supabase Client Setup
const SUPABASE_URL = 'https://mespelpryubyjddadruu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lc3BlbHByeXVieWpkZGFkcnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTczNTMsImV4cCI6MjA2NzU3MzM1M30.Vb8kivvLXJ6t1-zcOiG_24e4EWR67IFwwOpUkcykREg';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAdmin = false;
const ADMIN_PASS = 'volleyadmin';

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
  const selects = ['playerTeams', 'transferNewTeam'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      el.appendChild(option);
    });
  });
}

// ✅ Admin Login
const adminForm = document.getElementById('adminForm');
adminForm?.addEventListener('submit', e => {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    document.getElementById('adminPanel').classList.remove('hidden');
  } else {
    alert('Wrong password');
  }
});

// ✅ Add Player Form
const playerForm = document.getElementById('playerForm');
playerForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value;
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;
  const teamSelect = document.getElementById('playerTeams');
  const team_ids = Array.from(teamSelect.selectedOptions).map(opt => opt.value);

  let image_url = null;
  const imageFile = document.getElementById('playerImage').files[0];
  if (imageFile) {
    const filePath = `${Date.now()}_${imageFile.name}`;
    const { data, error } = await client.storage.from('player-images').upload(filePath, imageFile);
    if (error) return alert(error.message);
    image_url = client.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);
  alert('Player added successfully');
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

// ✅ Add Match Score
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  const setScores = document.getElementById('matchSets').value;
  const winnerName = document.getElementById('matchWinner').value;
  const video_url = document.getElementById('matchVideo').value;

  const teamLookup = async name => {
    const { data } = await client.from('teams').select('*').ilike('name', name).limit(1);
    return data && data[0] ? data[0].id : null;
  };

  const teamAId = await teamLookup(teamA);
  const teamBId = await teamLookup(teamB);
  const winnerId = await teamLookup(winnerName);
  if (!teamAId || !teamBId || !winnerId) return alert('Team(s) not found');

  const sets = setScores.split(',').map(s => s.trim());
  if (sets.length < 2) return alert('At least 2 set scores required');

  await client.from('matches').insert({
    team_a: teamAId,
    team_b: teamBId,
    set_scores: sets.join(','),
    winner: winnerId,
    video_url
  });
  alert('Match recorded');
  matchForm.reset();
});

// ✅ Admin: Add Team
const teamForm = document.getElementById('teamForm');
teamForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('teamName').value;
  const league = document.getElementById('teamLeague').value;
  const members = document.getElementById('teamMembers').value.split(',').map(x => x.trim());

  let logo_url = null;
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const filePath = `${Date.now()}_${logoFile.name}`;
    const { data, error } = await client.storage.from('team-logos').upload(filePath, logoFile);
    if (error) return alert(error.message);
    logo_url = client.storage.from('team-logos').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('teams').insert({ name, league, logo_url, members });
  if (error) return alert(error.message);
  alert('Team added');
  teamForm.reset();
});

// 📥 Fetch Homepage Data
async function fetchLiveHome() {
  const { data: players } = await client.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML = players.map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await client.from('transfers').select('*, players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML = transfers.map(t => `<div class='card'>${t.players.name} → ${t.new_team.name}</div>`).join('');

  const { data: matches } = await client.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML = matches.map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}</div>`).join('');
}

// 🔁 Subscribe to updates
function subscribeRealtime() {
  client.channel('public:players').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchLiveHome).subscribe();
  client.channel('public:transfers').on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, fetchLiveHome).subscribe();
  client.channel('public:matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLiveHome).subscribe();
}

// ✅ Render Players Page
async function renderPlayersPage() {
  const { data: players } = await client.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML = players.map(p => `<div class='card'><strong>${p.name}</strong><br>${p.gender} • ${p.position}</div>`).join('');
}

// ✅ Render Teams Page
async function renderTeamsPage() {
  const { data: teams } = await client.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML = teams.map(t => `<div class='card'><strong>${t.name}</strong><br>League: ${t.league}<br>Members: ${t.members.join(', ')}</div>`).join('');
}

// ✅ Render Transfers Page
async function renderTransfersPage() {
  const { data: transfers } = await client.from('transfers').select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML = transfers.map(t => `<div class='card'><strong>${t.players.name}</strong><br>${t.old_team?.name || 'No Team'} → ${t.new_team?.name}</div>`).join('');
}

// ✅ Render Matches Page
async function renderMatchesPage() {
  const { data: matches } = await client.from('matches').select('*, team_a:teams!matches_team_a_fkey(name), team_b:teams!matches_team_b_fkey(name), winner:teams!matches_winner_fkey(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML = matches.map(m => `<div class='card'><strong>${m.team_a.name}</strong> vs <strong>${m.team_b.name}</strong><br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}${m.video_url ? `<br><a href='${m.video_url}' target='_blank'>Match Video</a>` : ''}</div>`).join('');
}

// 🚀 Init on Load
window.addEventListener('load', () => {
  fetchLiveHome();
  subscribeRealtime();
});
