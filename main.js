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

// Toggle Admin Login Modal
function toggleAdminLogin() {
  const modal = document.getElementById('adminLoginModal');
  modal.classList.toggle('hidden');
}

// Load teams into all relevant selects
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
  const set1Winner = document.getElementById('set1Winner');
  const set2Winner = document.getElementById('set2Winner');
  const set3Winner = document.getElementById('set3Winner');
  const matchWinner = document.getElementById('matchWinner');

  playerTeamsSelect.innerHTML = '';
  transferNewTeamSelect.innerHTML = '';
  matchTeamASelect.innerHTML = '';
  matchTeamBSelect.innerHTML = '';
  set1Winner.innerHTML = '';
  set2Winner.innerHTML = '';
  set3Winner.innerHTML = '';
  matchWinner.innerHTML = '';

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

  updateSetWinnerOptions();
}

// When teams change in match form, update the set winner dropdown options & match winner dropdown
function updateSetWinnerOptions() {
  const teamASelect = document.getElementById('matchTeamA');
  const teamBSelect = document.getElementById('matchTeamB');

  const teamAName = teamASelect.options[teamASelect.selectedIndex]?.text || 'Team A';
  const teamBName = teamBSelect.options[teamBSelect.selectedIndex]?.text || 'Team B';

  const sets = ['set1Winner', 'set2Winner', 'set3Winner', 'matchWinner'];
  sets.forEach(setId => {
    const select = document.getElementById(setId);
    if (!select) return;

    select.innerHTML = '';

    const optionA = document.createElement('option');
    optionA.value = 'A';
    optionA.textContent = teamAName;

    const optionB = document.createElement('option');
    optionB.value = 'B';
    optionB.textContent = teamBName;

    select.appendChild(optionA);
    select.appendChild(optionB);
  });
}

// Add event listeners to update set winner options dynamically
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('matchTeamA').addEventListener('change', updateSetWinnerOptions);
  document.getElementById('matchTeamB').addEventListener('change', updateSetWinnerOptions);
});

// Admin login form
const adminForm = document.getElementById('adminForm');
adminForm?.addEventListener('submit', e => {
  e.preventDefault();
  const pass = document.getElementById('adminPassword').value;
  if (pass === ADMIN_PASS) {
    isAdmin = true;
    document.getElementById('adminPanel').classList.remove('hidden');
    toggleAdminLogin();
    alert('Admin logged in');
  } else {
    alert('Wrong password');
  }
});

// Add Player form
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

// Add Team form
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

// Add Match form
const matchForm = document.getElementById('matchForm');
matchForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const teamAId = document.getElementById('matchTeamA').value;
  const teamBId = document.getElementById('matchTeamB').value;
  if (teamAId === teamBId) return alert('Select two different teams');

  const set1Score = document.getElementById('set1Score').value.trim();
  const set2Score = document.getElementById('set2Score').value.trim();
  const set3Score = document.getElementById('set3Score').value.trim();

  const set1WinnerVal = document.getElementById('set1Winner').value;
  const set2WinnerVal = document.getElementById('set2Winner').value;
  const set3WinnerVal = document.getElementById('set3Winner').value;

  const matchWinnerVal = document.getElementById('matchWinner').value;

  if (!set1Score || !set2Score) return alert('At least first two set scores are required');

  const sets = [
    { score: set1Score, winner: set1WinnerVal === 'A' ? teamAId : teamBId },
    { score: set2Score, winner: set2WinnerVal === 'A' ? teamAId : teamBId }
  ];

  if (set3Score) {
    sets.push({ score: set3Score, winner: set3WinnerVal === 'A' ? teamAId : teamBId });
  }

  const finalWinnerId = matchWinnerVal === 'A' ? teamAId : teamBId;
  const video_url = document.getElementById('matchVideo').value.trim();

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

// Render and helper functions below same as before (with no changes needed for your request)...

// Initial load
navigate('home');
loadTeamsIntoForms();
renderPlayersPage();
renderTeamsPage();
renderTransfersPage();
renderMatchesPage();
