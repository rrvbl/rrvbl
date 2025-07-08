const SUPABASE_URL = 'https://mespelpryubyjddadruu.supabase.co';
const SUPABASE_KEY = '<YOUR_SUPABASE_KEY_HERE>';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isAdmin = false;
const ADMIN_PASS = 'volleyadmin';

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  if (pageId === 'admin' && !isAdmin) {
    document.getElementById('adminLoginForm').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
  }
  document.getElementById(pageId).classList.remove('hidden');
}

// On load
window.onload = () => {
  setupForms();
  fetchLiveHome();
  subscribeRealtime();
};

async function setupForms() {
  // Populate dropdowns, hook forms...

  document.getElementById('adminLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    if (pass === ADMIN_PASS) {
      isAdmin = true;
      document.getElementById('adminLoginForm').classList.add('hidden');
      document.getElementById('adminPanel').classList.remove('hidden');
    } else alert('Wrong password');
  });

  document.getElementById('playerForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = e.target.playerName.value;
    const gender = e.target.gender.value;
    const position = e.target.position.value;
    const teamIds = Array.from(e.target.playerTeams.selectedOptions).map(o => o.value);
    let imageUrl = null;

    if (e.target.playerImage.files.length) {
      const file = e.target.playerImage.files[0];
      const { data, error } = await supabase.storage
        .from('player-images')
        .upload(`${Date.now()}_${file.name}`, file);
      if (error) return alert(error.message);
      imageUrl = supabase.storage.from('player-images').getPublicUrl(data.path).publicURL;
    }

    await supabase
      .from('players')
      .insert({ name, gender, position, team_ids: teamIds, image_url: imageUrl });
  });

  // Similar for transferForm, matchForm, teamForm...
}

// Live home updates
async function fetchLiveHome() {
  const { data: newPlayers } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  // Render to #newPlayers

  const { data: transfers } = await supabase
    .from('transfers')
    .select('*, players(name), old_team(name), new_team(name)')
    .order('transferred_at', { ascending: false })
    .limit(5);
  // Render to #recentTransfers

  const { data: matches } = await supabase
    .from('matches')
    .select('*, team_a(name), team_b(name), winner(name)')
    .order('played_at', { ascending: false })
    .limit(5);
  // Render to #matchScores
}

function subscribeRealtime() {
  supabase
    .from('players')
    .on('INSERT', () => fetchLiveHome())
    .subscribe();

  supabase
    .from('transfers')
    .on('INSERT', () => fetchLiveHome())
    .subscribe();

  supabase
    .from('matches')
    .on('INSERT', () => fetchLiveHome())
    .subscribe();
}
