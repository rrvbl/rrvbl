// Supabase client setup
const SUPABASE_URL = 'https://ccwajatpnsaxfwxkjxpb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjd2FqYXRwbnNheGZ3eGtqeHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTk4MDcsImV4cCI6MjA2NzU3NTgwN30.hyUE2bcZajV3orOJ-PvMZ81J_5OH8JNgYLbbWUxOkkk';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if (pageId === 'add') loadTeamsIntoForms();
  if (pageId === 'players') renderPlayersPage();
  if (pageId === 'teams') renderTeamsPage();
  if (pageId === 'transfers') renderTransfersPage();
  if (pageId === 'matches') renderMatchesPage();
}

// Load teams into various dropdowns by league
async function loadTeamsIntoForms() {
  const { data: teams } = await supabase.from('teams').select('*').order('name');

  const team2v2 = document.getElementById('team2v2');
  const team4v4 = document.getElementById('team4v4');
  const team5v5 = document.getElementById('team5v5');
  const transferNewTeam = document.getElementById('transferNewTeam');
  const matchTeamA = document.getElementById('matchTeamA');
  const matchTeamB = document.getElementById('matchTeamB');
  const matchWinner = document.getElementById('matchWinner');

  [team2v2, team4v4, team5v5, transferNewTeam, matchTeamA, matchTeamB, matchWinner].forEach(select => {
    if (!select) return;
    select.innerHTML = '';
  });

  if (team2v2) {
    team2v2.innerHTML = '<option value="">-- None --</option>';
    teams.filter(t => t.league === '2v2').forEach(t => {
      team2v2.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  }
  if (team4v4) {
    team4v4.innerHTML = '<option value="">-- None --</option>';
    teams.filter(t => t.league === '4v4').forEach(t => {
      team4v4.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  }
  if (team5v5) {
    team5v5.innerHTML = '<option value="">-- None --</option>';
    teams.filter(t => t.league === '5v5').forEach(t => {
      team5v5.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
  }

  // For transfer and matches, all teams
  [transferNewTeam, matchTeamA, matchTeamB, matchWinner].forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Team --</option>';
    teams.forEach(t => {
      select.innerHTML += `<option value="${t.id}">${t.name} (${t.league})</option>`;
    });
  });

  updateMatchSetWinners();
}

// Update options for set winner selects based on chosen teams in match form
function updateMatchSetWinners() {
  const matchTeamA = document.getElementById('matchTeamA');
  const matchTeamB = document.getElementById('matchTeamB');

  const winners = document.querySelectorAll('.setWinner');
  winners.forEach(sel => {
    sel.innerHTML = '<option value="">-- Select Winner --</option>';
    if (matchTeamA.value) {
      const textA = matchTeamA.options[matchTeamA.selectedIndex].text;
      sel.innerHTML += `<option value="${matchTeamA.value}">${textA}</option>`;
    }
    if (matchTeamB.value) {
      const textB = matchTeamB.options[matchTeamB.selectedIndex].text;
      sel.innerHTML += `<option value="${matchTeamB.value}">${textB}</option>`;
    }
  });

  // Update match winner select
  const matchWinner = document.getElementById('matchWinner');
  if (matchWinner) {
    matchWinner.innerHTML = '<option value="">-- Select Match Winner --</option>';
    if (matchTeamA.value) {
      const textA = matchTeamA.options[matchTeamA.selectedIndex].text;
      matchWinner.innerHTML += `<option value="${matchTeamA.value}">${textA}</option>`;
    }
    if (matchTeamB.value) {
      const textB = matchTeamB.options[matchTeamB.selectedIndex].text;
      matchWinner.innerHTML += `<option value="${matchTeamB.value}">${textB}</option>`;
    }
  }
}

// Add new Set inputs on the match form (up to 3 sets)
document.getElementById('addSetBtn')?.addEventListener('click', () => {
  const container = document.getElementById('setsContainer');
  const existingSets = container.querySelectorAll('.setWinner').length;
  if (existingSets >= 3) return alert('Maximum 3 sets allowed.');

  const setNum = existingSets + 1;
  const setDiv = document.createElement('div');
  setDiv.innerHTML = `
    <h4>Set ${setNum}</h4>
    <label>Winner:</label>
    <select class="setWinner" data-set="${existingSets}" required></select>
    <label>Score:</label>
    <input type="text" class="setScore" placeholder="e.g. 25-20" required />
  `;
  container.appendChild(setDiv);
  updateMatchSetWinners();
});

// Listen for changes in Team A or B select to update winner options dynamically
document.getElementById('matchTeamA')?.addEventListener('change', updateMatchSetWinners);
document.getElementById('matchTeamB')?.addEventListener('change', updateMatchSetWinners);

// Add Player form submit
document.getElementById('playerForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const name = document.getElementById('playerName').value.trim();
  const gender = document.getElementById('gender').value;
  const position = document.getElementById('position').value;

  // Collect selected team IDs (skip empty)
  const teamIds = [];
  ['team2v2', 'team4v4', 'team5v5'].forEach(id => {
    const val = document.getElementById(id).value;
    if (val) teamIds.push(parseInt(val));
  });

  let image_url = null;
  const imageFile = document.getElementById('playerImage').files[0];
  if (imageFile) {
    const filePath = `${Date.now()}_${imageFile.name}`;
    const { error } = await supabase.storage.from('player-images').upload(filePath, imageFile);
    if (error) return alert('Image upload failed: ' + error.message);
    image_url = supabase.storage.from('player-images').getPublicUrl(filePath).publicURL;
  }

  const { error } = await supabase.from('players').insert({
    name,
    gender,
    position,
    team_ids: teamIds,
    image_url
  });

  if (error) return alert('Add player error: ' + error.message);
  alert('Player added!');
  e.target.reset();
  navigate('players');
  renderPlayersPage();
});

// Add Team form submit
document.getElementById('teamForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('teamName').value.trim();
  const league = document.getElementById('teamLeague').value;

  let logo_url = null;
  const logoFile = document.getElementById('teamLogo').files[0];
  if (logoFile) {
    const filePath = `${Date.now()}_${logoFile.name}`;
    const { error } = await supabase.storage.from('team-logos').upload(filePath, logoFile);
    if (error) return alert('Logo upload failed: ' + error.message);
    logo_url = supabase.storage.from('team-logos').getPublicUrl(filePath).publicURL;
  }

  const { error } = await supabase.from('teams').insert({ name, league, logo_url });
  if (error) return alert('Add team error: ' + error.message);
  alert('Team added!');
  e.target.reset();
  loadTeamsIntoForms();
  navigate('teams');
  renderTeamsPage();
});

// Transfer form submit
document.getElementById('transferForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const playerName = document.getElementById('transferPlayer').value.trim();
  const newTeamId = document.getElementById('transferNewTeam').value;
  if (!newTeamId) return alert('Select a new team.');

  const { data: players } = await supabase.from('players').select('*').ilike('name', `%${playerName}%`).limit(1);
  if (!players || players.length === 0) return alert('Player not found.');

  const player = players[0];
  const oldTeamId = player.team_ids.length > 0 ? player.team_ids[0] : null;

  // Update player team_ids to new team only for simplicity
  const { error } = await supabase.from('players').update({ team_ids: [parseInt(newTeamId)] }).eq('id', player.id);
  if (error) return alert('Update player error: ' + error.message);

  // Insert transfer record
  const { error: tError } = await supabase.from('transfers').insert({
    player_id: player.id,
    old_team_id: oldTeamId,
    new_team_id: parseInt(newTeamId),
  });
  if (tError) return alert('Add transfer error: ' + tError.message);

  alert('Transfer recorded!');
  e.target.reset();
  navigate('transfers');
  renderTransfersPage();
});

// Match form submit
document.getElementById('matchForm')?.addEventListener('submit', async e => {
  e.preventDefault();

  const teamA = document.getElementById('matchTeamA').value;
  const teamB = document.getElementById('matchTeamB').value;
  const winner = document.getElementById('matchWinner').value;
  const video_url = document.getElementById('matchVideo').value.trim();

  if (teamA === teamB) return alert('Teams must be different.');

  // Gather sets data
  const sets = [];
  const setWinners = document.querySelectorAll('.setWinner');
  const setScores = document.querySelectorAll('.setScore');

  for (let i = 0; i < setWinners.length; i++) {
    const w = setWinners[i].value;
    const s = setScores[i].value.trim();
    if (!w || !s) return alert(`Set ${i + 1} is incomplete.`);
    sets.push({ winner_team_id: parseInt(w), score: s });
  }

  if (sets.length === 0) return alert('Add at least one set.');

  // Insert match
  const { error } = await supabase.from('matches').insert({
    team_a_id: parseInt(teamA),
    team_b_id: parseInt(teamB),
    winner_team_id: parseInt(winner),
    sets: JSON.stringify(sets),
    video_url: video_url || null,
  });
  if (error) return alert('Add match error: ' + error.message);

  alert('Match recorded!');
  e.target.reset();
  navigate('matches');
  renderMatchesPage();
});

// Render players page
async function renderPlayersPage() {
  const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);

  const container = document.getElementById('allPlayers');
  container.innerHTML = '';
  data.forEach(p => {
    container.innerHTML += `
      <div class="card">
        <strong>${p.name}</strong> (${p.gender})<br />
        Position: ${p.position}<br />
        Teams: ${p.team_ids.length ? p.team_ids.join(', ') : 'None'}<br />
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" width="100" />` : ''}
      </div>
    `;
  });
}

// Render teams page
async function renderTeamsPage() {
  const { data, error } = await supabase.from('teams').select('*').order('name');
  if (error) return console.error(error);

  const container = document.getElementById('allTeams');
  container.innerHTML = '';
  data.forEach(t => {
    container.innerHTML += `
      <div class="card">
        <strong>${t.name}</strong> (${t.league})<br />
        ${t.logo_url ? `<img src="${t.logo_url}" alt="${t.name}" width="100" />` : ''}
      </div>
    `;
  });
}

// Render transfers page
async function renderTransfersPage() {
  const { data, error } = await supabase.from('transfers')
    .select('id, player_id, old_team_id, new_team_id, created_at, players(name), old_team_id:teams(name), new_team_id:teams(name)')
    .order('created_at', { ascending: false });

  if (error) return console.error(error);

  const container = document.getElementById('allTransfers');
  container.innerHTML = '';
  for (const t of data) {
    // Fetch player and team names manually because of limited select
    const { data: p } = await supabase.from('players').select('name').eq('id', t.player_id).single();
    const { data: oldT } = t.old_team_id ? await supabase.from('teams').select('name').eq('id', t.old_team_id).single() : { data: null };
    const { data: newT } = await supabase.from('teams').select('name').eq('id', t.new_team_id).single();

    container.innerHTML += `
      <div class="card">
        Player: ${p?.name || 'Unknown'}<br />
        From: ${oldT?.name || 'None'}<br />
        To: ${newT?.name || 'Unknown'}<br />
        On: ${new Date(t.created_at).toLocaleString()}
      </div>
    `;
  }
}

// Render matches page
async function renderMatchesPage() {
  const { data, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
  if (error) return console.error(error);

  const container = document.getElementById('allMatches');
  container.innerHTML = '';
  for (const m of data) {
    const { data: teamA } = await supabase.from('teams').select('name').eq('id', m.team_a_id).single();
    const { data: teamB } = await supabase.from('teams').select('name').eq('id', m.team_b_id).single();
    const { data: winner } = await supabase.from('teams').select('name').eq('id', m.winner_team_id).single();

    let setsHtml = '';
    const sets = JSON.parse(m.sets);
    sets.forEach((set, i) => {
      setsHtml += `<div>Set ${i + 1}: Winner - ${set.winner_team_id === m.team_a_id ? teamA.name : teamB.name}, Score - ${set.score}</div>`;
    });

    container.innerHTML += `
      <div class="card">
        <strong>Match: ${teamA.name} vs ${teamB.name}</strong><br />
        ${setsHtml}
        <div><strong>Match Winner: ${winner.name}</strong></div>
        ${m.video_url ? `<div><a href="${m.video_url}" target="_blank">Watch Video</a></div>` : ''}
        <div>Recorded on: ${new Date(m.created_at).toLocaleString()}</div>
      </div>
    `;
  }
}

// Initial page load
navigate('home');
loadTeamsIntoForms();
renderPlayersPage();
renderTeamsPage();
renderTransfersPage();
renderMatchesPage();
