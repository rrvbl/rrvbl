// Supabase client setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Navigation between pages
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');

  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
}

// Load teams into dropdown selects
async function loadTeamsIntoForms() {
  const { data: teams } = await supabase.from('teams').select('*').order('name');
  const selects = ['player2v2', 'player4v4', 'player5v5', 'transferNewTeam', 'matchTeamA', 'matchTeamB', 'matchWinner', 'set1Winner', 'set2Winner', 'set3Winner'];
  
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

// Add player form submit
const playerForm = document.getElementById('playerForm');
playerForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
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
    const { error } = await supabase.storage.from('player-images').upload(filePath, imageFile);
    if (error) return alert('Image upload error: ' + error.message);
    const { publicURL } = supabase.storage.from('player-images').getPublicUrl(filePath);
    image_url = publicURL;
  }

  const { error } = await supabase.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert('Insert player error: ' + error.message);
  alert('Player added successfully!');
  playerForm.reset();
});

// Transfer player form submit
const transferForm = document.getElementById('transferForm');
transferForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const playerNameInput = document.getElementById('transferPlayer').value.trim();
  const newTeamId = document.getElementById('transferNewTeam').value;
  const leagueSelect = document.getElementById('transferLeague');
  const selectedLeague = leagueSelect.value;

  if (!playerNameInput) return alert('Please enter player name');
  if (!selectedLeague) return alert('Please select a league');
  
  // Fetch players matching (case-insensitive)
  const { data: players } = await supabase.from('players').select('*').ilike('name', `%${playerNameInput}%`).limit(1);
  if (!players || players.length === 0) return alert('Player not found');
  const player = players[0];

  // Update player's team_ids array for the selected league
  let team_ids = player.team_ids || [];
  
  // Remove any team for this league
  const { data: allTeams } = await supabase.from('teams').select('*').eq('league', selectedLeague);
  const leagueTeamIds = allTeams.map(t => t.id);
  team_ids = team_ids.filter(id => !leagueTeamIds.includes(id));

  if (newTeamId) {
    team_ids.push(newTeamId);
  }

  const { error: updateError } = await supabase.from('players').update({ team_ids }).eq('id', player.id);
  if (updateError) return alert('Transfer update error: ' + updateError.message);

  // Log transfer if team changed
  await supabase.from('transfers').insert({ player_id: player.id, new_team_id: newTeamId || null, transferred_at: new Date().toISOString() });

  alert('Transfer updated!');
  transferForm.reset();
});

// Remove team from player button
const removeTeamBtn = document.getElementById('removeTeamBtn');
removeTeamBtn?.addEventListener('click', async () => {
  const playerNameInput = document.getElementById('transferPlayer').value.trim();
  const selectedLeague = document.getElementById('transferLeague').value;
  if (!playerNameInput) return alert('Please enter player name');
  if (!selectedLeague) return alert('Please select a league');

  const { data: players } = await supabase.from('players').select('*').ilike('name', `%${playerNameInput}%`).limit(1);
  if (!players || players.length === 0) return alert('Player not found');
  const player = players[0];

  let team_ids = player.team_ids || [];
  const { data: allTeams } = await supabase.from('teams').select('*').eq('league', selectedLeague);
  const leagueTeamIds = allTeams.map(t => t.id);
  team_ids = team_ids.filter(id => !leagueTeamIds.includes(id));

  const { error } = await supabase.from('players').update({ team_ids }).eq('id', player.id);
  if (error) return alert('Remove team error: ' + error.message);

  alert('Team removed from player!');
  transferForm.reset();
});

// Add match form submit
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  const winnerId = document.getElementById('matchWinner').value;
  const mvpName = document.getElementById('matchMVP').value.trim();
  const svpName = document.getElementById('matchSVP').value.trim();
  const video_url = document.getElementById('matchVideo').value.trim();

  if (!teamA || !teamB || !winnerId) return alert('Please select teams and match winner');

  const setScores = [];
  for (let i = 1; i <= 3; i++) {
    const setWinner = document.getElementById(`set${i}Winner`).value;
    const setScore = document.getElementById(`set${i}Score`).value.trim();
    if (setWinner && setScore) {
      setScores.push(`${setWinner}:${setScore}`);
    }
  }

  // Resolve MVP and SVP player IDs (optional)
  async function getPlayerIdByName(name) {
    if (!name) return null;
    const { data } = await supabase.from('players').select('id').ilike('name', `%${name}%`).limit(1);
    return data && data.length > 0 ? data[0].id : null;
  }

  const mvp_id = await getPlayerIdByName(mvpName);
  const svp_id = await getPlayerIdByName(svpName);

  const { error } = await supabase.from('matches').insert({
    team_a: teamA,
    team_b: teamB,
    winner: winnerId,
    set_scores: setScores.join(','),
    video_url,
    mvp_id,
    svp_id,
    played_at: new Date().toISOString(),
  });

  if (error) return alert('Match insert error: ' + error.message);

  alert('Match recorded!');
  matchForm.reset();
});

// Add team form submit
const teamForm = document.getElementById('teamForm');
teamForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('teamName').value.trim();
  const league = document.getElementById('teamLeague').value;

  let logo_url = null;
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const filePath = `${Date.now()}_${logoFile.name}`;
    const { error } = await supabase.storage.from('team-logos').upload(filePath, logoFile);
    if (error) return alert('Team logo upload error: ' + error.message);
    const { publicURL } = supabase.storage.from('team-logos').getPublicUrl(filePath);
    logo_url = publicURL;
  }

  const { error } = await supabase.from('teams').insert({ name, league, logo_url });
  if (error) return alert('Team insert error: ' + error.message);

  alert('Team added!');
  teamForm.reset();
  loadTeamsIntoForms();
});

// Fetch home page live data
async function fetchLiveHome() {
  const { data: players } = await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  document.getElementById('newPlayers').innerHTML = (players || []).map(p => `<div class='card'><b>${p.name}</b><br>${p.gender}, ${p.position}</div>`).join('');

  const { data: transfers } = await supabase.from('transfers').select('*, players(name), new_team:teams(name)').order('transferred_at', { ascending: false }).limit(5);
  document.getElementById('recentTransfers').innerHTML = (transfers || []).map(t => `<div class='card'>${t.players.name} → ${t.new_team?.name || 'None'}</div>`).join('');

  const { data: matches } = await supabase.from('matches').select('*, team_a:teams(name), team_b:teams(name), winner:teams(name)').order('played_at', { ascending: false }).limit(5);
  document.getElementById('matchScores').innerHTML = (matches || []).map(m => `<div class='card'>${m.team_a.name} vs ${m.team_b.name}<br>Sets: ${m.set_scores}<br>Winner: ${m.winner.name}</div>`).join('');
}

// Realtime subscriptions
function subscribeRealtime() {
  supabase.channel('public:players').on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchLiveHome).subscribe();
  supabase.channel('public:transfers').on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, fetchLiveHome).subscribe();
  supabase.channel('public:matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchLiveHome).subscribe();
}

// Render players page
async function renderPlayersPage() {
  const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false });
  document.getElementById('allPlayers').innerHTML = (data || []).map(p => `
    <div class='card'>
      <b>${p.name}</b><br>
      Gender: ${p.gender}<br>
      Position: ${p.position}<br>
      Teams: ${p.team_ids?.length ? p.team_ids.join(', ') : 'None'}
    </div>
  `).join('');
}

// Render teams page
async function renderTeamsPage() {
  const { data } = await supabase.from('teams').select('*').order('name');
  document.getElementById('allTeams').innerHTML = (data || []).map(t => `
    <div class='card'>
      <b>${t.name}</b><br>
      League: ${t.league}
    </div>
  `).join('');
}

// Render transfers page
async function renderTransfersPage() {
  const { data } = await supabase.from('transfers').select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)').order('transferred_at', { ascending: false });
  document.getElementById('allTransfers').innerHTML = (data || []).map(t => `
    <div class='card'>
      <b>${t.players.name}</b><br>
      ${t.old_team?.name || 'None'} → ${t.new_team?.name || 'None'}
    </div>
  `).join('');
}

// Render matches page
async function renderMatchesPage() {
  const { data } = await supabase.from('matches').select('*, team_a:teams!matches_team_a_fkey(name), team_b:teams!matches_team_b_fkey(name), winner:teams!matches_winner_fkey(name)').order('played_at', { ascending: false });
  document.getElementById('allMatches').innerHTML = (data || []).map(m => `
    <div class='card'>
      <b>${m.team_a.name}</b> vs <b>${m.team_b.name}</b><br>
      Sets: ${m.set_scores}<br>
      Winner: ${m.winner.name}
      ${m.video_url ? `<br><a href='${m.video_url}' target='_blank'>Match Video</a>` : ''}
    </div>
  `).join('');
}

// Initialize app
window.addEventListener('load', () => {
  navigate('home');
  fetchLiveHome();
  subscribeRealtime();
});
