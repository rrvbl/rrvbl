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

async function loadTeamsIntoForms() {
  const { data: teams, error } = await supabase.from('teams').select('*').order('name');
  if (error) return alert('Error loading teams: ' + error.message);

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

  updateTransferTeams();

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

document.getElementById('transferLeague').addEventListener('change', updateTransferTeams);

document.getElementById('playerForm').addEventListener('submit', async e => {
  e.preventDefault();
  // ... your existing player form code
});

document.getElementById('transferForm').addEventListener('submit', async e => {
  e.preventDefault();
  // ... your existing transfer form code
});

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

  const mvpName = document.getElementById('matchMVP').value.trim();
  const svpName = document.getElementById('matchSVP').value.trim();

  async function findPlayerIdByName(name) {
    if (!name) return null;
    const { data } = await supabase.from('players').select('id').ilike('name', `%${name}%`).limit(1);
    return data && data.length ? data[0].id : null;
  }
  const mvpId = await findPlayerIdByName(mvpName);
  const svpId = await findPlayerIdByName(svpName);

  const { error } = await supabase.from('matches').insert({
    team_a: teamA,
    team_b: teamB,
    winner: matchWinner,
    set_scores: scores.join(', '),
    video_url,
    mvp_id: mvpId,
    svp_id: svpId,
    played_at: new Date()
  });

  if (error) return alert(error.message);
  alert('Match recorded');
  e.target.reset();
  fetchLiveHome();
});

// fetchLiveHome and other functions...

// Make sure everything initializes properly:
window.addEventListener('load', () => {
  fetchLiveHome();
  subscribeRealtime();
  loadTeamsIntoForms();
});
