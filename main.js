// Supabase Setup
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

// Toggle Admin Login panel
function toggleAdminLogin() {
  const panel = document.getElementById('adminLoginPanel');
  if (panel) panel.classList.toggle('hidden');
}

// Load teams into select dropdowns grouped by league
async function loadTeamsIntoForms() {
  const { data: teams, error } = await client.from('teams').select('*').order('name');
  if (error) {
    alert('Error loading teams: ' + error.message);
    return;
  }

  // Clear and add default options
  ['team2v2', 'team4v4', 'team5v5', 'transferNewTeam', 'matchTeamA', 'matchTeamB', 'matchWinner'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    if (id === 'transferNewTeam' || id === 'matchTeamA' || id === 'matchTeamB' || id === 'matchWinner') {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- Select Team --';
      sel.appendChild(opt);
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '-- None --';
      sel.appendChild(opt);
    }
  });

  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;

    if (team.league === '2v2') {
      document.getElementById('team2v2')?.appendChild(option.cloneNode(true));
    } else if (team.league === '4v4') {
      document.getElementById('team4v4')?.appendChild(option.cloneNode(true));
    } else if (team.league === '5v5') {
      document.getElementById('team5v5')?.appendChild(option.cloneNode(true));
    }

    ['transferNewTeam', 'matchTeamA', 'matchTeamB', 'matchWinner'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.appendChild(option.cloneNode(true));
    });
  });

  // Reset sets UI on load teams
  resetSetsUI();
}

// Admin login form submit
document.getElementById('adminForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    alert('Admin login successful');
    document.getElementById('adminPanel').classList.remove('hidden');
    navigate('add');  // Navigate to Add page for admin
    document.getElementById('adminLoginPanel').classList.add('hidden');
  } else {
    alert('Wrong password');
  }
});

// Add Player Form
document.getElementById('playerForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const name = document.getElementById('playerName').value.trim();
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;

  const team2v2 = document.getElementById('team2v2').value;
  const team4v4 = document.getElementById('team4v4').value;
  const team5v5 = document.getElementById('team5v5').value;

  const team_ids = [team2v2, team4v4, team5v5].filter(Boolean);

  let image_url = null;
  const imageFile = document.getElementById('playerImage').files[0];
  if (imageFile) {
    const filePath = `player-images/${Date.now()}_${imageFile.name}`;
    const { data, error } = await client.storage.from('player-images').upload(filePath, imageFile);
    if (error) return alert(error.message);
    image_url = client.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await client.from('players').insert({ name, gender, position, team_ids, image_url });
  if (error) return alert(error.message);

  alert('Player added successfully');
  e.target.reset();
  loadTeamsIntoForms();
});

// Transfer Player Form
document.getElementById('transferForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value.trim();
  const newTeamId = document.getElementById('transferNewTeam').value;
  if (!newTeamId) return alert('Please select a team for transfer');

  const { data: players } = await client.from('players').select('*').ilike('name', `%${playerName}%`).limit(1);
  if (!players || players.length === 0) return alert('Player not found');

  const player = players[0];
  const oldTeamId = player.team_ids && player.team_ids.length ? player.team_ids[0] : null;

  const { error: updateError } = await client.from('players').update({ team_ids: [newTeamId] }).eq('id', player.id);
  if (updateError) return alert(updateError.message);

  await client.from('transfers').insert({ player_id: player.id, old_team_id: oldTeamId, new_team_id: newTeamId });

  alert('Transfer successful');
  e.target.reset();
});

// Add Match Score Form

// Manage dynamic sets UI
const setsContainer = document.getElementById('setsContainer');
const addSetBtn = document.getElementById('addSetBtn');
let currentSets = 1;
const maxSets = 3;

function resetSetsUI() {
  setsContainer.innerHTML = '';
  currentSets = 1;
  addSetUI(currentSets);
}

function addSetUI(setNumber) {
  const h3 = document.createElement('h3');
  h3.textContent = `Set ${setNumber}`;
  setsContainer.appendChild(h3);

  const winnerSelect = document.createElement('select');
  winnerSelect.classList.add('setWinner');
  winnerSelect.setAttribute('data-set', setNumber);
  winnerSelect.required = true;
  winnerSelect.innerHTML = '<option value="">Select Winner</option>';
  ['matchTeamA', 'matchTeamB'].forEach(id => {
    const sourceSelect = document.getElementById(id);
    if (sourceSelect) {
      [...sourceSelect.options].forEach(opt => {
        if (opt.value !== '') {
          const optionClone = document.createElement('option');
          optionClone.value = opt.value;
          optionClone.textContent = opt.textContent;
          winnerSelect.appendChild(optionClone);
        }
      });
    }
  });
  setsContainer.appendChild(winnerSelect);

  const scoreInput = document.createElement('input');
  scoreInput.classList.add('setScore');
  scoreInput.setAttribute('data-set', setNumber);
  scoreInput.placeholder = 'Score (e.g. 25-22)';
  scoreInput.required = true;
  setsContainer.appendChild(scoreInput);
}

addSetBtn.addEventListener('click', () => {
  if (currentSets < maxSets) {
    currentSets++;
    addSetUI(currentSets);
  } else {
    alert(`Maximum of ${maxSets} sets allowed.`);
  }
});

// When teams are changed, update sets winners dropdown options
document.getElementById('matchTeamA').addEventListener('change', updateSetsWinnersOptions);
document.getElementById('matchTeamB').addEventListener('change', updateSetsWinnersOptions);

function updateSetsWinnersOptions() {
  const teamASelect = document.getElementById('matchTeamA');
  const teamBSelect = document.getElementById('matchTeamB');
  const winners = [teamASelect.value, teamBSelect.value];

  // Update all setWinner selects
  document.querySelectorAll('.setWinner').forEach(sel => {
    const selectedValue = sel.value;
    sel.innerHTML = '<option value="">Select Winner</option>';
    winners.forEach(teamId => {
      if (!teamId) return;
      const option = document.createElement('option');
      option.value = teamId;
      option.textContent = document.querySelector(`#matchTeamA option[value="${teamId}"]`)?.textContent ||
                          document.querySelector(`#matchTeamB option[value="${teamId}"]`)?.textContent || 'Unknown';
      sel.appendChild(option);
    });
    // Restore previously selected if still available
    if (winners.includes(selectedValue)) {
      sel.value = selectedValue;
    }
  });

  // Update match winner select
  const matchWinner = document.getElementById('matchWinner');
  const prevWinner = matchWinner.value;
  matchWinner.innerHTML = '<option value="">Select Match Winner</option>';
  winners.forEach(teamId => {
    if (!teamId) return;
    const option = document.createElement('option');
    option.value = teamId;
    option.textContent = document.querySelector(`#matchTeamA option[value="${teamId}"]`)?.textContent ||
                        document.querySelector(`#matchTeamB option[value="${teamId}"]`)?.textContent || 'Unknown';
    matchWinner.appendChild(option);
  });
  if (winners.includes(prevWinner)) {
    matchWinner.value = prevWinner;
  }
}

// Submit match form
document.getElementById('matchForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  if (!teamA || !teamB || teamA === teamB) return alert('Select two different teams');

  // Gather sets data
  const sets = [];
  const setWinners = document.querySelectorAll('.setWinner');
  const setScores = document.querySelectorAll('.setScore');

  for (let i = 0; i < setWinners.length; i++) {
    const winner = setWinners[i].value;
    const score = setScores[i].value.trim();
    if (!winner || !score) return alert(`Please fill winner and score for set ${i + 1}`);
    sets.push({ set_number: i + 1, winner_team_id: winner, score });
  }

  const matchWinner = document.getElementById('matchWinner').value;
  if (!matchWinner) return alert('Select match winner');

  // Insert match with sets and winner
  const { error } = await client.from('matches').insert({
    team_a_id: teamA,
    team_b_id: teamB,
    sets,
    winner_team_id: matchWinner,
    video_url: document.getElementById('matchVideo').value.trim() || null
  });

  if (error) return alert(error.message);

  alert('Match recorded successfully');
  e.target.reset();
  resetSetsUI();
});

// Render functions for pages (simplified example)
async function renderPlayersPage() {
  const { data: players } = await client.from('players').select('*,team_ids');
  const container = document.getElementById('allPlayers');
  container.innerHTML = '';
  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = `${p.name} (${p.gender}) - ${p.position}`;
    container.appendChild(div);
  });
}

async function renderTeamsPage() {
  const { data: teams } = await client.from('teams').select('*');
  const container = document.getElementById('allTeams');
  container.innerHTML = '';
  teams.forEach(t => {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = `${t.name} (${t.league})`;
    container.appendChild(div);
  });
}

async function renderTransfersPage() {
  const { data: transfers } = await client.from('transfers').select('*').limit(20).order('created_at', { ascending: false });
  const container = document.getElementById('allTransfers');
  container.innerHTML = '';
  transfers.forEach(tr => {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = `Transfer ID: ${tr.id}`;
    container.appendChild(div);
  });
}

async function renderMatchesPage() {
  const { data: matches } = await client.from('matches').select('*').limit(20).order('created_at', { ascending: false });
  const container = document.getElementById('allMatches');
  container.innerHTML = '';
  matches.forEach(m => {
    const div = document.createElement('div');
    div.className = 'card';
    div.textContent = `Match ID: ${m.id}`;
    container.appendChild(div);
  });
}

// Initial setup
navigate('home');
loadTeamsIntoForms();
resetSetsUI();
