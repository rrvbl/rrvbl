// Initialize Supabase client
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase Public Anon Key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const homeSection = document.getElementById('home-section');
const playersSection = document.getElementById('players-section');
const teamsSection = document.getElementById('teams-section');
const transfersSection = document.getElementById('transfers-section');
const matchesSection = document.getElementById('matches-section');
const addnewItemSection = document.getElementById('add-new-item-section');
const playerDetailsSection = document.getElementById('player-details-section');
const teamDetailsSection = document.getElementById('team-details-section');
const searchResultsSection = document.getElementById('search-results-section');

const newPlayersList = document.getElementById('new-players-list');
const recentTransfersList = document.getElementById('recent-transfers-list');
const recentMatchesList = document.getElementById('recent-matches-list');
const playersListContainer = document.getElementById('players-list-container');
const teamsListContainer = document.getElementById('teams-list-container');
const allTransfersList = document.getElementById('all-transfers-list');
const allMatchesList = document.getElementById('all-matches-list');
const addFormsContainer = document.getElementById('add-forms-container');

// Navigation Buttons
document.getElementById('home-btn').addEventListener('click', () => showSection('home'));
document.getElementById('players-btn').addEventListener('click', () => showSection('players'));
document.getElementById('teams-btn').addEventListener('click', () => showSection('teams'));
document.getElementById('transfers-btn').addEventListener('click', () => showSection('transfers'));
document.getElementById('matches-btn').addEventListener('click', () => showSection('matches'));
document.getElementById('add-player-btn').addEventListener('click', () => showAddForm('player'));
document.getElementById('add-team-btn').addEventListener('click', () => showAddForm('team'));
document.getElementById('add-match-btn').addEventListener('click', () => showAddForm('match'));
document.getElementById('transfer-player-btn').addEventListener('click', () => showAddForm('transfer'));
document.getElementById('search-btn').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Filter Inputs
document.getElementById('filter-players-input').addEventListener('input', filterPlayers);
document.getElementById('filter-teams-input').addEventListener('input', filterTeams);

let allPlayersData = []; // Cache for filtering players
let allTeamsData = []; // Cache for filtering teams

// Function to switch visible sections
function showSection(sectionName) {
    document.querySelectorAll('main section').forEach(section => {
        section.classList.remove('active-section');
        section.classList.add('hidden-section');
    });

    switch (sectionName) {
        case 'home':
            homeSection.classList.add('active-section');
            loadHomePageData();
            break;
        case 'players':
            playersSection.classList.add('active-section');
            loadPlayers();
            break;
        case 'teams':
            teamsSection.classList.add('active-section');
            loadTeams();
            break;
        case 'transfers':
            transfersSection.classList.add('active-section');
            loadTransfers();
            break;
        case 'matches':
            matchesSection.classList.add('active-section');
            loadMatches();
            break;
        case 'add-new-item':
            addnewItemSection.classList.add('active-section');
            break;
        case 'player-details':
            playerDetailsSection.classList.add('active-section');
            break;
        case 'team-details':
            teamDetailsSection.classList.add('active-section');
            break;
        case 'search-results':
            searchResultsSection.classList.add('active-section');
            break;
        default:
            homeSection.classList.add('active-section');
            loadHomePageData();
    }
}

// Helper for displaying messages
function showAlert(containerId, message, type) {
    const container = document.getElementById(containerId);
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000); // Remove after 5 seconds
}

// --- Home Page Functions ---
async function loadHomePageData() {
    // 5 Newly Added Players
    const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
    if (playersError) {
        console.error('Error fetching new players:', playersError.message);
        newPlayersList.innerHTML = '<li>Error loading new players.</li>';
    } else {
        newPlayersList.innerHTML = players.map(p => `<li>${p.name} (${p.position})</li>`).join('');
    }

    // Recent Player Transfers
    const { data: transfers, error: transfersError } = await supabase
        .from('transfers')
        .select('*, players(name), old_team:teams!old_team_id(name), new_team:teams!new_team_id(name)')
        .order('transfer_date', { ascending: false })
        .limit(5);
    if (transfersError) {
        console.error('Error fetching recent transfers:', transfersError.message);
        recentTransfersList.innerHTML = '<li>Error loading recent transfers.</li>';
    } else {
        recentTransfersList.innerHTML = transfers.map(t => {
            const playerName = t.players ? t.players.name : 'Unknown Player';
            const oldTeamName = t.old_team ? t.old_team.name : 'N/A';
            const newTeamName = t.new_team ? t.new_team.name : 'N/A';
            return `<li>${playerName} transferred from ${oldTeamName} to ${newTeamName}</li>`;
        }).join('');
    }

    // Recent League Match Scores
    const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*, team1:teams!team1_id(name), team2:teams!team2_id(name)')
        .order('match_date', { ascending: false })
        .limit(5);
    if (matchesError) {
        console.error('Error fetching recent matches:', matchesError.message);
        recentMatchesList.innerHTML = '<li>Error loading recent matches.</li>';
    } else {
        recentMatchesList.innerHTML = matches.map(m => {
            const team1Name = m.team1 ? m.team1.name : 'Unknown Team';
            const team2Name = m.team2 ? m.team2.name : 'Unknown Team';
            return `<li>${team1Name} ${m.score_team1} - ${m.score_team2} ${team2Name}</li>`;
        }).join('');
    }
}


// --- Player Functions ---
async function loadPlayers() {
    const { data, error } = await supabase.from('players').select('*, teams(name)');
    if (error) {
        console.error('Error fetching players:', error.message);
        playersListContainer.innerHTML = '<p>Error loading players.</p>';
        return;
    }
    allPlayersData = data; // Cache data
    displayPlayers(data);
}

function displayPlayers(players) {
    playersListContainer.innerHTML = ''; // Clear previous content
    if (players.length === 0) {
        playersListContainer.innerHTML = '<p>No players found.</p>';
        return;
    }
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'item-card';
        playerCard.innerHTML = `
            <img src="${player.image_url || 'https://via.placeholder.com/100?text=No+Image'}" alt="${player.name} image">
            <h4>${player.name}</h4>
            <p>${player.position}</p>
            <p>${player.teams ? player.teams.name : 'No Team'}</p>
        `;
        playerCard.addEventListener('click', () => showPlayerDetails(player.id));
        playersListContainer.appendChild(playerCard);
    });
}

async function showPlayerDetails(playerId) {
    const { data: player, error } = await supabase
        .from('players')
        .select('*, teams(name)')
        .eq('id', playerId)
        .single();

    if (error) {
        console.error('Error fetching player details:', error.message);
        alert('Could not load player details.');
        return;
    }

    document.getElementById('player-details-name').textContent = player.name;
    document.getElementById('player-details-image').src = player.image_url || 'https://via.placeholder.com/150?text=No+Image';
    document.getElementById('player-details-gender').textContent = player.gender;
    document.getElementById('player-details-position').textContent = player.position;
    document.getElementById('player-details-team').textContent = player.teams ? player.teams.name : 'No Team';

    showSection('player-details');
}

function filterPlayers() {
    const searchTerm = document.getElementById('filter-players-input').value.toLowerCase();
    const filteredPlayers = allPlayersData.filter(player =>
        player.name.toLowerCase().includes(searchTerm) ||
        (player.teams && player.teams.name.toLowerCase().includes(searchTerm)) ||
        player.position.toLowerCase().includes(searchTerm)
    );
    displayPlayers(filteredPlayers);
}

// --- Team Functions ---
async function loadTeams() {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
        console.error('Error fetching teams:', error.message);
        teamsListContainer.innerHTML = '<p>Error loading teams.</p>';
        return;
    }
    allTeamsData = data; // Cache data
    displayTeams(data);
}

function displayTeams(teams) {
    teamsListContainer.innerHTML = ''; // Clear previous content
    if (teams.length === 0) {
        teamsListContainer.innerHTML = '<p>No teams found.</p>';
        return;
    }
    teams.forEach(team => {
        const teamCard = document.createElement('div');
        teamCard.className = 'item-card';
        teamCard.innerHTML = `
            <img src="${team.logo_url || 'https://via.placeholder.com/100?text=No+Logo'}" alt="${team.name} logo">
            <h4>${team.name}</h4>
            <p>${team.league} League</p>
        `;
        teamCard.addEventListener('click', () => showTeamDetails(team.id));
        teamsListContainer.appendChild(teamCard);
    });
}

async function showTeamDetails(teamId) {
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

    if (teamError) {
        console.error('Error fetching team details:', teamError.message);
        alert('Could not load team details.');
        return;
    }

    const { data: members, error: membersError } = await supabase
        .from('players')
        .select('name, position')
        .eq('team_id', teamId);

    if (membersError) {
        console.error('Error fetching team members:', membersError.message);
        document.getElementById('team-members-list').innerHTML = '<li>Error loading members.</li>';
    }

    document.getElementById('team-details-name').textContent = team.name;
    document.getElementById('team-details-logo').src = team.logo_url || 'https://via.placeholder.com/150?text=No+Logo';
    document.getElementById('team-details-league').textContent = team.league;

    const teamMembersList = document.getElementById('team-members-list');
    teamMembersList.innerHTML = '';
    if (members && members.length > 0) {
        members.forEach(member => {
            const li = document.createElement('li');
            li.textContent = `${member.name} (${member.position})`;
            teamMembersList.appendChild(li);
        });
    } else {
        teamMembersList.innerHTML = '<li>No players registered for this team yet.</li>';
    }

    showSection('team-details');
}

function filterTeams() {
    const searchTerm = document.getElementById('filter-teams-input').value.toLowerCase();
    const filteredTeams = allTeamsData.filter(team =>
        team.name.toLowerCase().includes(searchTerm) ||
        team.league.toLowerCase().includes(searchTerm)
    );
    displayTeams(filteredTeams);
}


// --- Transfer Functions ---
async function loadTransfers() {
    const { data, error } = await supabase
        .from('transfers')
        .select('*, players(name), old_team:teams!old_team_id(name), new_team:teams!new_team_id(name)')
        .order('transfer_date', { ascending: false });

    if (error) {
        console.error('Error fetching transfers:', error.message);
        allTransfersList.innerHTML = '<li>Error loading transfers.</li>';
        return;
    }

    allTransfersList.innerHTML = '';
    if (data.length === 0) {
        allTransfersList.innerHTML = '<li>No transfers recorded yet.</li>';
        return;
    }

    data.forEach(t => {
        const li = document.createElement('li');
        const playerName = t.players ? t.players.name : 'Unknown Player';
        const oldTeamName = t.old_team ? t.old_team.name : 'N/A';
        const newTeamName = t.new_team ? t.new_team.name : 'N/A';
        const transferDate = new Date(t.transfer_date).toLocaleDateString();
        li.textContent = `${playerName} transferred from ${oldTeamName} to ${newTeamName} on ${transferDate}`;
        allTransfersList.appendChild(li);
    });
}

// --- Matches Functions ---
async function loadMatches() {
    const { data, error } = await supabase
        .from('matches')
        .select('*, team1:teams!team1_id(name), team2:teams!team2_id(name)')
        .order('match_date', { ascending: false });

    if (error) {
        console.error('Error fetching matches:', error.message);
        allMatchesList.innerHTML = '<li>Error loading match scores.</li>';
        return;
    }

    allMatchesList.innerHTML = '';
    if (data.length === 0) {
        allMatchesList.innerHTML = '<li>No match scores recorded yet.</li>';
        return;
    }

    data.forEach(m => {
        const li = document.createElement('li');
        const team1Name = m.team1 ? m.team1.name : 'Unknown Team';
        const team2Name = m.team2 ? m.team2.name : 'Unknown Team';
        const matchDate = new Date(m.match_date).toLocaleDateString();
        li.textContent = `${team1Name} ${m.score_team1} - ${m.score_team2} ${team2Name} (${matchDate})`;
        allMatchesList.appendChild(li);
    });
}


// --- Add New Item Forms ---
async function showAddForm(type) {
    addFormsContainer.innerHTML = ''; // Clear previous form
    showSection('add-new-item');

    let formHtml = '';
    let formElement;

    if (type === 'player') {
        const { data: teams, error } = await supabase.from('teams').select('id, name').order('name');
        let teamOptions = '<option value="">No Team</option>';
        if (teams) {
            teamOptions += teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
        }

        formHtml = `
            <h3>Add New Player</h3>
            <form id="add-player-form">
                <label for="player-name">Player Name:</label>
                <input type="text" id="player-name" required>

                <label for="player-gender">Gender:</label>
                <select id="player-gender" required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                </select>

                <label for="player-position">Position:</label>
                <select id="player-position" required>
                    <option value="">Select Position</option>
                    <option value="wing spiker">Wing Spiker</option>
                    <option value="middle blocker">Middle Blocker</option>
                    <option value="setter">Setter</option>
                    <option value="libero">Libero</option>
                    <option value="defensive specialist">Defensive Specialist</option>
                    <option value="all rounder">All Rounder</option>
                </select>

                <label for="player-team">Team:</label>
                <select id="player-team">
                    ${teamOptions}
                </select>
                <button type="button" id="add-team-from-player-btn" style="margin-top: 5px;">Add New Team</button>
                <div id="new-team-input-container" style="display:none; margin-top: 10px;">
                    <label for="new-team-name-player">New Team Name:</label>
                    <input type="text" id="new-team-name-player">
                    <label for="new-team-league-player">New Team League:</label>
                    <select id="new-team-league-player">
                        <option value="2v2">2v2</option>
                        <option value="4v4">4v4</option>
                        <option value="5v5">5v5</option>
                    </select>
                    <button type="button" id="submit-new-team-from-player-btn">Create Team</button>
                </div>


                <label for="player-image">Player Image (optional):</label>
                <input type="file" id="player-image" accept="image/*">

                <button type="submit">Add Player</button>
            </form>
            <div id="player-form-alert-container"></div>
        `;
    } else if (type === 'team') {
        formHtml = `
            <h3>Add New Team</h3>
            <form id="add-team-form">
                <label for="team-name">Team Name:</label>
                <input type="text" id="team-name" required>

                <label for="team-league">League:</label>
                <select id="team-league" required>
                    <option value="2v2">2v2</option>
                    <option value="4v4">4v4</option>
                    <option value="5v5">5v5</option>
                </select>

                <label for="team-logo">Team Logo (optional):</label>
                <input type="file" id="team-logo" accept="image/*">

                <button type="submit">Add Team</button>
            </form>
            <div id="team-form-alert-container"></div>
        `;
    } else if (type === 'match') {
        const { data: teams, error } = await supabase.from('teams').select('id, name').order('name');
        let teamOptions = '<option value="">Select Team</option>';
        if (teams) {
            teamOptions += teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
        }

        formHtml = `
            <h3>Add Match Score</h3>
            <form id="add-match-form">
                <label for="match-team1">Team 1:</label>
                <select id="match-team1" required>
                    ${teamOptions}
                </select>

                <label for="match-score1">Score Team 1:</label>
                <input type="number" id="match-score1" min="0" required>

                <label for="match-team2">Team 2:</label>
                <select id="match-team2" required>
                    ${teamOptions}
                </select>

                <label for="match-score2">Score Team 2:</label>
                <input type="number" id="match-score2" min="0" required>

                <label for="match-date">Match Date:</label>
                <input type="date" id="match-date" value="${new Date().toISOString().slice(0,10)}" required>

                <button type="submit">Add Match</button>
            </form>
            <div id="match-form-alert-container"></div>
        `;
    } else if (type === 'transfer') {
        const { data: players, error: playersErr } = await supabase.from('players').select('id, name, teams(name)').order('name');
        const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name').order('name');

        let playerOptions = '<option value="">Select Player</option>';
        if (players) {
            playerOptions += players.map(player => `<option value="${player.id}">${player.name} (${player.teams ? player.teams.name : 'No Team'})</option>`).join('');
        }

        let teamOptions = '<option value="">No Team / Unassign</option>';
        if (teams) {
            teamOptions += teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
        }

        formHtml = `
            <h3>Transfer Player</h3>
            <form id="transfer-player-form">
                <label for="transfer-player-select">Select Player:</label>
                <select id="transfer-player-select" required>
                    ${playerOptions}
                </select>

                <label for="transfer-new-team">New Team:</label>
                <select id="transfer-new-team" required>
                    ${teamOptions}
                </select>

                <button type="submit">Record Transfer</button>
            </form>
            <div id="transfer-form-alert-container"></div>
        `;
    }

    addFormsContainer.innerHTML = formHtml;

    if (type === 'player') {
        formElement = document.getElementById('add-player-form');
        document.getElementById('add-team-from-player-btn').addEventListener('click', () => {
            const newTeamInputContainer = document.getElementById('new-team-input-container');
            newTeamInputContainer.style.display = newTeamInputContainer.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('submit-new-team-from-player-btn').addEventListener('click', async () => {
            const newTeamName = document.getElementById('new-team-name-player').value.trim();
            const newTeamLeague = document.getElementById('new-team-league-player').value;

            if (!newTeamName) {
                showAlert('player-form-alert-container', 'New team name is required.', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('teams')
                .insert({ name: newTeamName, league: newTeamLeague })
                .select();

            if (error) {
                showAlert('player-form-alert-container', `Error adding new team: ${error.message}`, 'error');
            } else {
                showAlert('player-form-alert-container', `Team "${newTeamName}" added successfully!`, 'success');
                // Dynamically add the new team to the player's team dropdown
                const playerTeamSelect = document.getElementById('player-team');
                const newOption = document.createElement('option');
                newOption.value = data[0].id;
                newOption.textContent = data[0].name;
                playerTeamSelect.appendChild(newOption);
                playerTeamSelect.value = data[0].id; // Select the newly added team
                document.getElementById('new-team-name-player').value = ''; // Clear input
                document.getElementById('new-team-input-container').style.display = 'none'; // Hide input
            }
        });

        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('player-name').value;
            const gender = document.getElementById('player-gender').value;
            const position = document.getElementById('player-position').value;
            const teamId = document.getElementById('player-team').value || null;
            const imageFile = document.getElementById('player-image').files[0];
            let imageUrl = null;

            if (imageFile) {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('volleyball-images')
                    .upload(`players/${Date.now()}_${imageFile.name}`, imageFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    showAlert('player-form-alert-container', `Error uploading image: ${uploadError.message}`, 'error');
                    return;
                }
                const publicUrlResponse = supabase.storage.from('volleyball-images').getPublicUrl(uploadData.path);
                imageUrl = publicUrlResponse.data.publicUrl;
            }

            const { data, error } = await supabase
                .from('players')
                .insert([{ name, gender, position, team_id: teamId, image_url: imageUrl }]);

            if (error) {
                showAlert('player-form-alert-container', `Error adding player: ${error.message}`, 'error');
            } else {
                showAlert('player-form-alert-container', 'Player added successfully!', 'success');
                formElement.reset();
                if (imageFile) document.getElementById('player-image').value = ''; // Clear file input
                loadPlayers(); // Refresh player list
                loadHomePageData(); // Refresh homepage data
            }
        });
    } else if (type === 'team') {
        formElement = document.getElementById('add-team-form');
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('team-name').value;
            const league = document.getElementById('team-league').value;
            const logoFile = document.getElementById('team-logo').files[0];
            let logoUrl = null;

            if (logoFile) {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('volleyball-images')
                    .upload(`teams/${Date.now()}_${logoFile.name}`, logoFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    showAlert('team-form-alert-container', `Error uploading logo: ${uploadError.message}`, 'error');
                    return;
                }
                const publicUrlResponse = supabase.storage.from('volleyball-images').getPublicUrl(uploadData.path);
                logoUrl = publicUrlResponse.data.publicUrl;
            }

            const { data, error } = await supabase
                .from('teams')
                .insert([{ name, league, logo_url: logoUrl }]);

            if (error) {
                showAlert('team-form-alert-container', `Error adding team: ${error.message}`, 'error');
            } else {
                showAlert('team-form-alert-container', 'Team added successfully!', 'success');
                formElement.reset();
                if (logoFile) document.getElementById('team-logo').value = ''; // Clear file input
                loadTeams(); // Refresh team list
                loadHomePageData(); // Refresh homepage data
            }
        });
    } else if (type === 'match') {
        formElement = document.getElementById('add-match-form');
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const team1_id = document.getElementById('match-team1').value;
            const score_team1 = document.getElementById('match-score1').value;
            const team2_id = document.getElementById('match-team2').value;
            const score_team2 = document.getElementById('match-score2').value;
            const match_date = document.getElementById('match-date').value;

            if (team1_id === team2_id) {
                showAlert('match-form-alert-container', 'Team 1 and Team 2 cannot be the same.', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('matches')
                .insert([{
                    team1_id,
                    score_team1,
                    team2_id,
                    score_team2,
                    match_date
                }]);

            if (error) {
                showAlert('match-form-alert-container', `Error adding match: ${error.message}`, 'error');
            } else {
                showAlert('match-form-alert-container', 'Match added successfully!', 'success');
                formElement.reset();
                loadMatches(); // Refresh match list
                loadHomePageData(); // Refresh homepage data
            }
        });
    } else if (type === 'transfer') {
        formElement = document.getElementById('transfer-player-form');
        formElement.addEventListener('submit', async (e) => {
            e.preventDefault();
            const playerId = document.getElementById('transfer-player-select').value;
            const newTeamId = document.getElementById('transfer-new-team').value || null; // Can be null for unassign

            // Get current team of the player for recording old_team_id in transfers
            const { data: currentPlayer, error: playerError } = await supabase
                .from('players')
                .select('team_id')
                .eq('id', playerId)
                .single();

            if (playerError) {
                showAlert('transfer-form-alert-container', `Error fetching player info: ${playerError.message}`, 'error');
                return;
            }

            const oldTeamId = currentPlayer ? currentPlayer.team_id : null;

            // Update player's team
            const { error: updateError } = await supabase
                .from('players')
                .update({ team_id: newTeamId })
                .eq('id', playerId);

            if (updateError) {
                showAlert('transfer-form-alert-container', `Error updating player team: ${updateError.message}`, 'error');
                return;
            }

            // Record transfer
            const { error: transferError } = await supabase
                .from('transfers')
                .insert([{
                    player_id: playerId,
                    old_team_id: oldTeamId,
                    new_team_id: newTeamId
                }]);

            if (transferError) {
                showAlert('transfer-form-alert-container', `Error recording transfer: ${transferError.message}`, 'error');
                // You might want to revert player update here if transfer recording fails, or handle it differently.
            } else {
                showAlert('transfer-form-alert-container', 'Player transferred successfully!', 'success');
                formElement.reset();
                loadPlayers(); // Refresh player list
                loadTransfers(); // Refresh transfer list
                loadHomePageData(); // Refresh homepage data
            }
        });
    }
}

// --- Search Functionality ---
async function handleSearch() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    showSection('search-results');
    const searchPlayersList = document.getElementById('search-players-list');
    const searchTeamsList = document.getElementById('search-teams-list');

    searchPlayersList.innerHTML = '<li>Searching players...</li>';
    searchTeamsList.innerHTML = '<li>Searching teams...</li>';

    // Search Players
    const { data: players, error: playerSearchError } = await supabase
        .from('players')
        .select('id, name, position, teams(name)')
        .ilike('name', `%${searchTerm}%`); // Case-insensitive search for name

    if (playerSearchError) {
        console.error('Error searching players:', playerSearchError.message);
        searchPlayersList.innerHTML = '<li>Error searching players.</li>';
    } else {
        if (players.length === 0) {
            searchPlayersList.innerHTML = '<li>No players found.</li>';
        } else {
            searchPlayersList.innerHTML = players.map(p =>
                `<li onclick="showPlayerDetails('${p.id}')">
                    <strong>${p.name}</strong> - ${p.position} (${p.teams ? p.teams.name : 'No Team'})
                </li>`
            ).join('');
        }
    }

    // Search Teams
    const { data: teams, error: teamSearchError } = await supabase
        .from('teams')
        .select('id, name, league')
        .ilike('name', `%${searchTerm}%`); // Case-insensitive search for name

    if (teamSearchError) {
        console.error('Error searching teams:', teamSearchError.message);
        searchTeamsList.innerHTML = '<li>Error searching teams.</li>';
    } else {
        if (teams.length === 0) {
            searchTeamsList.innerHTML = '<li>No teams found.</li>';
        } else {
            searchTeamsList.innerHTML = teams.map(t =>
                `<li onclick="showTeamDetails('${t.id}')">
                    <strong>${t.name}</strong> - ${t.league} League
                </li>`
            ).join('');
        }
    }
}

// Initial load on page
document.addEventListener('DOMContentLoaded', () => {
    showSection('home');
});

// Optional: Realtime subscriptions for live updates (for advanced use cases)
// You can uncomment and adapt these if you want the homepage to update instantly
// without refreshing, but it adds complexity. For a basic free setup, refreshing
// on navigation is usually sufficient.

/*
supabase
  .channel('public:players')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
    console.log('Change received!', payload);
    loadHomePageData(); // Refresh homepage data on player changes
    if (playersSection.classList.contains('active-section')) {
        loadPlayers(); // Refresh player list if visible
    }
  })
  .subscribe();

supabase
  .channel('public:transfers')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, payload => {
    console.log('Change received!', payload);
    loadHomePageData(); // Refresh homepage data on transfer changes
    if (transfersSection.classList.contains('active-section')) {
        loadTransfers(); // Refresh transfers list if visible
    }
  })
  .subscribe();

supabase
  .channel('public:matches')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
    console.log('Change received!', payload);
    loadHomePageData(); // Refresh homepage data on match changes
    if (matchesSection.classList.contains('active-section')) {
        loadMatches(); // Refresh matches list if visible
    }
  })
  .subscribe();
*/