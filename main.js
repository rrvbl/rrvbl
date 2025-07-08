// Supabase Client Setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAdmin = false;
const ADMIN_PASS = 'volleyadmin';

// Navigation
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
}

// Load teams into selects (player form, transfer form, match form)
async function loadTeamsIntoForms() {
  const { data: teams, error } = await client.from('teams').select('*').order('name');
  if (error) {
    console.error(error);
    return;
  }
  
  const playerTeamsSelect = document.getElementById('playerTeams');
  const transferNewTeamSelect = document.getElementById('transferNewTeam');
  const matchTeamASelect = document.getElementById('matchTeamA');
  const matchTeamBSelect = document.getElementById('matchTeamB');

  playerTeamsSelect.innerHTML = '';
  transferNewTeamSelect.innerHTML = '';
  matchTeamASelect.innerHTML = '';
  matchTeamBSelect.innerHTML = '';

  teams.forEach(team => {
    const optionPlayer = document.createElement('option');
    optionPlayer.value = team.id;
    optionPlayer.textContent = team.name;
    playerTeamsSelect.appendChild(optionPlayer);

    const optionTransfer = document.createElement('option');
    optionTransfer.value = team.id;
    optionTransfer.textContent = team.name;
    transferNewTeamSelect.appendChild(optionTransfer);

    const optionA = document.createElement('option');
    optionA.value = team.id;
    optionA.textContent = team.name;
    matchTeamASelect.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = team.id;
    optionB.textContent = team.name;
    matchTeamBSelect.appendChild(optionB);
  });
}

// Admin login
const adminForm = document.getElementById('adminForm');
adminForm?.addEventListener('submit', e => {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    document.getElementById('adminPanel').classList.remove('hidden');
    alert('Admin logged in');
  } else {
    alert('Wrong password');
  }
});

// Add Player
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
    const { error: uploadError } = await client.storage.from('player-images').upload(filePath, imageFile);
    if (uploadError) return alert(uploadError.message);
    image_url = client.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);
  alert('Player added successfully');
  playerForm.reset();
});

// Add Team
const teamForm = document.getElementById('teamForm');
teamForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!isAdmin) return alert('Only admins can add teams');
  const name = document.getElementById('teamName').value;
  const league = document.getElementById('teamLeague').value;

  let logo_url = null;
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const filePath = `${Date.now()}_${logoFile.name}`;
    const { error: uploadError } = await client.storage.from('team-logos').upload(filePath, logoFile);
    if (uploadError) return alert(uploadError.message);
    logo_url = client.storage.from('team-logos').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('teams').insert({ name, league, logo_url });
  if (error) return alert(error.message);
  alert('Team added');
  teamForm.reset();
  loadTeamsIntoForms();
});

// Add Match
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamAId = document.getElementById('matchTeamA').value;
  const teamBId = document.getElementById('matchTeamB').value;
  if (teamAId === teamBId) return alert('Select two different teams');

  const set1Score = document.getElementById('set1Score').value.trim();
  const set2Score = document.getElementById('set2Score').value.trim();
  const set3Score = document.getElementById('set3Score').value.trim();

  const set1Winner = document.getElementById('set1Winner').value;
  const set2Winner = document.getElementById('set2Winner').value;
  const set3Winner = document.getElementById('set3Winner').value;

  const matchWinner = document.getElementById('matchWinner').value;

  if (!set1Score || !set2Score) return alert('At least first two set scores are required');

  // Prepare sets array with winner info
  const sets = [
    { score: set1Score, winner: set1Winner === 'A' ? teamAId : teamBId },
    { score: set2Score, winner: set2Winner === 'A' ? teamAId : teamBId }
  ];

  if (set3Score) {
    sets.push({ score: set3Score, winner: set3Winner === 'A' ? teamAId : teamBId });
  }

  const finalWinnerId = matchWinner === 'A' ? teamAId : teamBId;
  const video_url = document.getElementById('matchVideo').value.trim();

  // Store sets as JSON string for flexibility
  const set_scores = JSON.stringify(sets);

  const { error } = await client.from('matches').insert({
    team_a: teamAId,
    team_b: teamBId,
    set_scores,
    winner: finalWinnerId,
    video_url
  });

  if (error) return alert(error.message);
  alert('Match recorded');
  matchForm.reset();
});

// Render functions with dynamic members

async function renderPlayersPage() {
  const { data: players, error } = await client.from('players').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);
  document.getElementById('allPlayers').innerHTML = players.map(p => `
    <div class='card'>
      <strong>${p.name}</strong><br>
      ${p.gender} • ${p.position}<br>
      Teams: ${p.team_ids ? p.team_ids.join(', ') : 'None'}
    </div>
  `).join('');
}

// For Teams page, show members by querying players belonging to that team
async function renderTeamsPage() {
  const { data: teams, error } = await client.from('teams').select('*').order('name');
  if (error) return console.error(error);

  // For each team, query players with that team id in their team_ids array
  let html = '';

  for (const team of teams) {
    const { data: members } = await client
      .from('players')
      .select('name')
      .contains('team_ids', [team.id]);

    const memberNames = members ? members.map(m => m.name).join(', ') : 'None';

    html += `<div class='card'>
      <strong>${team.name}</strong><br>
      League: ${team.league}<br>
      Members: ${memberNames}
    </div>`;
  }

  document.getElementById('allTeams').innerHTML = html;
}

async function renderTransfersPage() {
  const { data: transfers, error } = await client.from('transfers')
    .select('*, players(name), old_team:teams!transfers_old_team_id_fkey(name), new_team:teams!transfers_new_team_id_fkey(name)')
    .order('transferred_at', { ascending: false });
  if (error) return console.error(error);
  document.getElementById('allTransfers').innerHTML = transfers.map(t => `
    <div class='card'>
      <strong>${t.players.name}</strong><br>
      ${t.old_team?.name || 'No Team'} → ${t.new_team?.name}
    </div>
  `).join('');
}

async function renderMatchesPage() {
  const { data: matches, error } = await client.from('matches').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);

  let html = '';
  for (const m of matches) {
    // Get team names
    const { data: teamsA } = await client.from('teams').select('name').eq('id', m.team_a).single();
    const { data: teamsB } = await client.from('teams').select('name').eq('id', m.team_b).single();

    let sets = [];
    try {
      sets = JSON.parse(m.set_scores);
    } catch {
      sets = [];
    }

    html += `<div class='card'>
      <strong>${teamsA?.name || 'Team A'}</strong> vs <strong>${teamsB?.name || 'Team B'}</strong><br>
      Sets:<br>
      <ul>
        ${sets.map((s, i) => `<li>Set ${i+1}: ${s.score} - Winner: ${s.winner === m.team_a ? teamsA.name : teamsB.name}</li>`).join('')}
      </ul>
      Match Winner: <strong>${m.winner === m.team_a ? teamsA.name : teamsB.name}</strong><br>
      ${m.video_url ? `<a href="${m.video_url}" target="_blank">Watch Video</a>` : ''}
    </div>`;
  }
  document.getElementById('allMatches').innerHTML = html;
}

// Initial load
navigate('home');
loadTeamsIntoForms();
renderPlayersPage();
renderTeamsPage();
renderTransfersPage();
renderMatchesPage();
