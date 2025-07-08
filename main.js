// Supabase client setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAdmin = false;
const ADMIN_PASS = 'volleyadmin';

// Navigation
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId)?.classList.remove('hidden');
  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
  if (pageId === 'adminPanel') loadTeamsIntoForms();
}

// Load teams for dropdowns
async function loadTeamsIntoForms() {
  const { data: teams } = await client.from('teams').select('*').order('name');
  // Player teams multiple select
  const playerTeamsSelect = document.getElementById('playerTeams');
  if (playerTeamsSelect) {
    playerTeamsSelect.innerHTML = '';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      playerTeamsSelect.appendChild(option);
    });
  }

  // Transfer new team select
  const transferNewTeamSelect = document.getElementById('transferNewTeam');
  if (transferNewTeamSelect) {
    transferNewTeamSelect.innerHTML = '';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      transferNewTeamSelect.appendChild(option);
    });
  }

  // Match Team A and B selects
  const matchTeamASelect = document.getElementById('matchTeamA');
  const matchTeamBSelect = document.getElementById('matchTeamB');
  const matchWinnerSelect = document.getElementById('matchWinner');
  if (matchTeamASelect && matchTeamBSelect && matchWinnerSelect) {
    [matchTeamASelect, matchTeamBSelect, matchWinnerSelect].forEach(select => {
      select.innerHTML = '';
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        select.appendChild(option);
      });
    });
  }
}

// Admin login modal open/close handlers
document.getElementById('adminLoginBtn').addEventListener('click', () => {
  document.getElementById('adminLoginModal').classList.remove('hidden');
});

document.getElementById('closeAdminModal').addEventListener('click', () => {
  document.getElementById('adminLoginModal').classList.add('hidden');
});

// Close modal if clicked outside content
window.addEventListener('click', (e) => {
  const modal = document.getElementById('adminLoginModal');
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

// Admin form submission
document.getElementById('adminForm').addEventListener('submit', e => {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    alert('Logged in as admin!');
    document.getElementById('adminLoginModal').classList.add('hidden');
    navigate('adminPanel');
  } else {
    alert('Wrong password!');
  }
});

// Admin logout button
document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  isAdmin = false;
  alert('Logged out');
  navigate('home');
});

// Add player form
document.getElementById('playerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('playerName').value.trim();
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;
  const teamSelect = document.getElementById('playerTeams');
  const team_ids = Array.from(teamSelect.selectedOptions).map(opt => opt.value);

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
  alert('Player added successfully');
  e.target.reset();
});

// Transfer form
document.getElementById('transferForm').addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value.trim();
  const newTeamId = document.getElementById('transferNewTeam').value;
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

// Match form helper: set UI for sets
const setsContainer = document.getElementById('setsContainer');
const addSetBtn = document.getElementById('addSetBtn');

function createSetInput(index) {
  const div = document.createElement('div');
  div.classList.add('set-input');
  div.innerHTML = `
    <h4>Set ${index + 1}</h4>
    <label>Winner</label>
    <select class="setWinner" required></select>
    <label>Score</label>
    <input type="text" class="setScore" placeholder="e.g. 25-22" required />
  `;
  return div;
}

async function refreshSetTeams() {
  const { data: teams } = await client.from('teams').select('*').order('name');
  document.querySelectorAll('.setWinner').forEach(select => {
    select.innerHTML = '';
    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      select.appendChild(option);
    });
  });
}

// Add first set by default
function addSet() {
  const setIndex = setsContainer.children.length;
  if (setIndex >= 3) return alert('Max 3 sets');
  const setInput = createSetInput(setIndex);
  setsContainer.appendChild(setInput);
  refreshSetTeams();
}

addSetBtn.addEventListener('click', addSet);

// Initial load 1 set
addSet();

// Submit match form
document.getElementById('matchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  if (teamA === teamB) return alert('Teams A and B cannot be the same.');

  const sets = [];
  const setWinners = document.querySelectorAll('.setWinner');
  const setScores = document.querySelectorAll('.setScore');
  for (let i = 0; i < setWinners.length; i++) {
    const winner = setWinners[i].value;
    const score = setScores[i].value.trim();
    if (!score) return alert(`Score for set ${i + 1} is required.`);
    sets.push({ winner, score });
  }

  // Validate winner is one of the two teams for each set
  for
