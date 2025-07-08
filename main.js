// ✅ Supabase Client Setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const { data: teams } = await supabase.from('teams').select('*').order('name');
  ['player2v2', 'player4v4', 'player5v5', 'matchTeamA', 'matchTeamB', 'matchWinner'].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- None --</option>';
    teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name + ` (${team.league})`;
      select.appendChild(opt);
    });
  });
}

// ✅ Add Player Form
document.getElementById('playerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value;
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;

  const team_ids = ['player2v2', 'player4v4', 'player5v5']
    .map(id => document.getElementById(id).value)
    .filter(v => v);

  let image_url = null;
  const file = document.getElementById('playerImage').files[0];
  if (file) {
    const path = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('player-images').upload(path, file);
    if (error) return alert(error.message);
    image_url = supabase.storage.from('player-images').getPublicUrl(path).publicURL;
  }

  const { error } = await supabase.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);
  alert('Player added!');
  e.target.reset();
});

// ✅ Add Transfer
document.getElementById('transferForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value;
  const newTeamId = document.getElementById('transferNewTeam').value;

  const { data: players } = await supabase.from('players').select('*').ilike('name', `%${playerName}%`).limit(1);
  if (!players?.length) return alert('Player not found');
  const player = players[0];
  const oldTeamId = player.team_ids?.[0] || null;

  const { error: updateError } = await supabase.from('players').update({ team_ids: [newTeamId] }).eq('id', player.id);
  if (updateError) return alert(updateError.message);

  await supabase.from('transfers').insert({ player_id: player.id, old_team_id: oldTeamId, new_team_id: newTeamId });
  alert('Transfer recorded!');
  e.target.reset();
});

// ✅ Add Match Score
document.getElementById('matchForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamAId = document.getElementById('matchTeamA').value;
  const teamBId = document.getElementById('matchTeamB').value;
  const winnerId = document.getElementById('matchWinner').value;
  const setScores = [
    document.getElementById('set1').value,
    document.getElementById('set2').value,
    document.getElementById('set3').value,
  ].filter(Boolean);
  const video_url = document.getElementById('matchVideo').value;

  if (!teamAId || !teamBId || !winnerId || setScores.length < 2) {
    return alert('Fill all required fields and at least 2 set scores');
  }

  await supabase.from('matches').insert({
    team_a: teamAId,
    team_b: teamBId,
    winner: winnerId,
    set_scores: setScores.join(', '),
    video_url
  });
  alert('Match recorded!');
  e.target.reset();
});

// ✅ Add Team
document.getElementById('teamForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('teamName').value;
  const league = document.getElementById('teamLeague').value;

  let logo_url = null;
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const path = `${Date.now()}_${logoFile.name}`;
    const { error } = await supabase.storage.from('team-logos').upload(path, logoFile);
    if (error) return alert(error.message);
    logo_url = supabase.storage.from('team-logos').getPublicUrl(path).publicURL;
  }

  const { error } = await supabase.from('teams').insert({ name, league, logo_url });
  if (error) return alert(error.message);
  alert('Team added!');
  e.target.reset();
  loadTeamsIntoForms(); // refresh dropdowns
});

// ✅ Render Homepage Sections
async function fetchLiveHome() {
  const { data: players } = await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML =
    (players || []).map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await supabase.from('transfers').select('*, players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML =
    (transfers || []).map(t => `<div class='card'>${t.players.name} → ${t.new_team.name}</div>`).join('');

  const { data: matches } = await supabase.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML =
    (matches || []).map(m =>
      `<div class='card'>
        ${m.team_a.name} vs ${m.team_b.name}<br>
        Sets: ${m.set_scores}<br>
        Winner: ${m.winner.name}
        ${m.video_url ? `<br><a href='${m.video_url}' target='_blank'>Match Video</a>` : ''}
      </div>`
    ).join('');
}

// ✅ Render Pages
async function renderPlayersPage() {
  const { data: players } = await supabase.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML =
    (players || []).map(p => `<div class='card'><strong>${p.name}</strong><br>${p.gender} • ${p.position}</div>`).join('');
}

async function renderTeamsPage() {
  const { data: teams } = await supabase.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML =
    (teams || []).map(t => `<div class='card'><strong>${t.name}</strong><br>League: ${t.league}</div>`).join('');
}

async function renderTransfersPage() {
  const { data: transfers } = await supabase.from('transfers').select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML =
    (transfers || []).map(t =>
      `<div class='card'><strong>${t.players.name}</strong><br>${t.old_team?.name || 'No Team'} → ${t.new_team?.name}</div>`
    ).join('');
}

async function renderMatchesPage() {
  const { data: matches } = await supabase.from('matches').select('*, team_a:teams!matches_team_a_fkey(name), team_b:teams!matches_team_b_fkey(name), winner:teams!matches_winner_fkey(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML =
    (matches || []).map(m =>
      `<div class='card'><strong>${m.team_a.name}</strong> vs <strong>${m.team_b.name}</strong><br>
        Sets: ${m.set_scores}<br>
        Winner: ${m.winner.name}
        ${m.video_url ? `<br><a href="${m.video_url}" target="_blank">Match Video</a>` : ''}
      </div>`
    ).join('');
}

// ✅ Realtime
function subscribeRealtime() {
  ['players', 'transfers', 'matches'].forEach(table => {
    supabase.channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, fetchLiveHome)
      .subscribe();
  });
}

// ✅ On Page Load
window.addEventListener('load', () => {
  fetchLiveHome();
  loadTeamsIntoForms();
  subscribeRealtime();
});
