const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Load teams into dropdowns for forms
async function loadTeamsIntoForms() {
  const { data: teams, error } = await supabase.from('teams').select('*').order('name');
  if (error) {
    alert('Error loading teams: ' + error.message);
    return;
  }
  // Populate player team selects with all teams and league info
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

  // Populate transferNewTeam select based on selected league
  updateTransferTeams();

  // Populate match teams selects
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

  // Populate set winner selects and match winner
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

// Update transferNewTeam options based on league select
function updateTransferTeams() {
  const league = document.getElementById('transferLeague').value;
  const select = document.getElementById('transferNewTeam');
  select.innerHTML = '<option value="">Select Team</option>';
  supabase.from('teams').select('*').eq('league', league).order('name').then(({ data }) => {
    if (!data) return;
    data.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      select.appendChild(option);
    });
  });
}

// Add Player Form submit
document.getElementById('playerForm').addEventListener('submit', async e => {
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
    if (error) return alert(error.message);
    image_url = supabase.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await supabase.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);
  alert('Player added');
  e.target.reset();
  loadTeamsIntoForms();
  fetchLiveHome();
});

// Transfer Player Form submit
document.getElementById('transferForm').addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value.trim();
  const league = document.getElementById('transferLeague').value;
  const newTeamId = document.getElementById('transferNewTeam').value;
  const removeOnly = document.getElementById('transferRemoveOnly').checked;

  if (!playerName) return alert('Please enter player name');
  if (!league) return alert('Please select a league');
  if (!newTeamId && !removeOnly) return alert('Please select a team or check remove only');

  // Search players by name case-insensitive
  const { data: players } = await supabase.from('players').select('*').ilike('name', `%${playerName}%`).limit(5);
  if (!players || players.length === 0) return alert('Player not found');

  // If multiple results, just pick the first for simplicity
  const player = players[0];

  // Remove or replace the team in that league
  let updatedTeamIds = player.team_ids || [];

  // Remove team(s) in the selected league
  const { data: leagueTeams } = await supabase.from('teams').select('id').eq('league', league);
  const leagueTeamIds = leagueTeams ? leagueTeams.map(t => t.id) : [];

  updatedTeamIds = updatedTeamIds.filter(tid => !leagueTeamIds.includes(tid));

  // If not remove only, add the new team
  if (!removeOnly) {
    updatedTeamIds.push(newTeamId);
  }

  // Update player
  const { error } = await supabase.from('players').update({ team_ids: updatedTeamIds }).eq('id', player.id);
  if (error) return alert(error.message);

  // Log transfer only if not remove only
  if (!removeOnly) {
    // Get old team id (for transfer log), use the first league team found from old ones if any
    const oldTeamId = player.team_ids.find(tid => leagueTeamIds.includes(tid)) || null;
    await supabase.from('transfers').insert({
      player_id: player.id,
      old_team_id: oldTeamId,
      new_team_id: newTeamId
    });
  }

  alert('Transfer updated');
  e.target.reset();
  fetchLiveHome();
});

// Match form submit
document.getElementById('matchForm').addEventListener('submit', async e => {
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
    const score = document.getElementById(`set${i}`).value.trim();
    const winner = document.getElementById(`set${i}Winner`).value;
    if (score && winner) {
      scores.push(`${score} (${winner})`);
    }
  }
  if (scores.length < 2) return alert('Please enter at least two sets with winners');

  // MVP and SVP player names
  const mvpName = document.getElementById('matchMVP').value.trim();
  const svpName = document.getElementById('matchSVP').value.trim();

  // Find MVP and SVP player IDs
  async function findPlayerIdByName(name) {
    if (!name) return null;
    const { data } = await supabase.from('players').select('id').ilike('name', `%${name}%`).limit(1);
    return data && data.length ? data[0].id : null;
  }
  const mvpId = await findPlayerIdByName(mvpName);
  const svpId = await findPlayerIdByName(svpName);

  // Insert match record
  const { error } = await supabase.from('matches').insert({
    team_a: teamA,
    team_b: teamB,
    winner: matchWinner,
    set_scores: scores.join(', '),
    video_url,
   
