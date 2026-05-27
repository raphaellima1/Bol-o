const STORAGE_KEY = "bolaoCopaApp";

const team = (name, code) => ({ name, code });

function flagUrl(code) {
  return `https://flagcdn.com/w40/${code}.png`;
}

const groups = [
  { id: "A", teams: [team("Mexico", "mx"), team("Africa do Sul", "za"), team("Coreia do Sul", "kr"), team("Rep. Tcheca", "cz")] },
  { id: "B", teams: [team("Canada", "ca"), team("Suica", "ch"), team("Catar", "qa"), team("Bosnia", "ba")] },
  { id: "C", teams: [team("Brasil", "br"), team("Marrocos", "ma"), team("Haiti", "ht"), team("Escocia", "gb-sct")] },
  { id: "D", teams: [team("Estados Unidos", "us"), team("Paraguai", "py"), team("Australia", "au"), team("Turquia", "tr")] },
  { id: "E", teams: [team("Alemanha", "de"), team("Curacao", "cw"), team("C. do Marfim", "ci"), team("Equador", "ec")] },
  { id: "F", teams: [team("Holanda", "nl"), team("Japao", "jp"), team("Tunisia", "tn"), team("Suecia", "se")] },
  { id: "G", teams: [team("Belgica", "be"), team("Egito", "eg"), team("Ira", "ir"), team("Nova Zelandia", "nz")] },
  { id: "H", teams: [team("Espanha", "es"), team("Cabo Verde", "cv"), team("Arabia Saudita", "sa"), team("Uruguai", "uy")] },
  { id: "I", teams: [team("Franca", "fr"), team("Senegal", "sn"), team("Noruega", "no"), team("Iraque", "iq")] },
  { id: "J", teams: [team("Argentina", "ar"), team("Argelia", "dz"), team("Austria", "at"), team("Jordania", "jo")] },
  { id: "K", teams: [team("Portugal", "pt"), team("Uzbequistao", "uz"), team("Colombia", "co"), team("RD Congo", "cd")] },
  { id: "L", teams: [team("Inglaterra", "gb-eng"), team("Croacia", "hr"), team("Gana", "gh"), team("Panama", "pa")] },
];

const matches = groups.flatMap((group) => {
  const [a, b, c, d] = group.teams;
  return [
    [a, b],
    [c, d],
    [a, c],
    [b, d],
    [a, d],
    [b, c],
  ].map(([home, away], index) => ({
    id: `${group.id}${index + 1}`,
    groupId: group.id,
    home: home.name,
    away: away.name,
    homeCode: home.code,
    awayCode: away.code,
  }));
});

let state = loadState();
let mode = "login";
let activeTab = "predictions";

const authView = document.querySelector("#authView");
const appView = document.querySelector("#appView");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const nameInput = document.querySelector("#nameInput");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginModeBtn = document.querySelector("#loginModeBtn");
const signupModeBtn = document.querySelector("#signupModeBtn");
const authSubmitLabel = document.querySelector("#authSubmitLabel");
const currentUserName = document.querySelector("#currentUserName");
const currentUserRole = document.querySelector("#currentUserRole");
const currentScore = document.querySelector("#currentScore");
const pageTitle = document.querySelector("#pageTitle");
const predictionGroups = document.querySelector("#predictionGroups");
const officialGroups = document.querySelector("#officialGroups");
const officialStandings = document.querySelector("#officialStandings");
const rankingList = document.querySelector("#rankingList");
const participantsList = document.querySelector("#participantsList");
const settingsMenuBtn = document.querySelector("#settingsMenuBtn");

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return migrateState(JSON.parse(stored));
  }

  return migrateState({
    currentUserId: null,
    users: [],
    predictions: {},
    officialResults: {},
  });
}

function migrateState(nextState) {
  nextState.users = nextState.users || [];
  nextState.predictions = nextState.predictions || {};
  nextState.officialResults = nextState.officialResults || {};
  const hasRoles = nextState.users.every((user) => user.role);
  if (!hasRoles) {
    nextState.users = nextState.users.map((user, index) => ({
      ...user,
      role: user.role || (index === 0 ? "admin" : "participant"),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setAuthMode(nextMode) {
  mode = nextMode;
  const isSignup = mode === "signup";
  nameInput.parentElement.style.display = isSignup ? "grid" : "none";
  loginModeBtn.classList.toggle("is-active", !isSignup);
  signupModeBtn.classList.toggle("is-active", isSignup);
  authSubmitLabel.textContent = isSignup ? "Criar cadastro" : "Entrar";
  authMessage.textContent = "";
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function isAdmin(user = getCurrentUser()) {
  return user?.role === "admin";
}

function handleAuth(event) {
  event.preventDefault();
  const name = nameInput.value.trim();
  const email = normalizeEmail(emailInput.value);
  const password = passwordInput.value;

  if (password.length < 4) {
    authMessage.textContent = "Use uma senha com pelo menos 4 caracteres.";
    return;
  }

  if (mode === "signup") {
    if (!name) {
      authMessage.textContent = "Informe seu nome para criar o cadastro.";
      return;
    }
    if (state.users.some((user) => user.email === email)) {
      authMessage.textContent = "Este e-mail ja esta cadastrado.";
      return;
    }
    const user = { id: crypto.randomUUID(), name, email, password, role: state.users.length === 0 ? "admin" : "participant" };
    state.users.push(user);
    state.currentUserId = user.id;
    state.predictions[user.id] = {};
    saveState();
    renderApp();
    return;
  }

  const user = state.users.find((item) => item.email === email && item.password === password);
  if (!user) {
    authMessage.textContent = "E-mail ou senha nao encontrados.";
    return;
  }
  state.currentUserId = user.id;
  saveState();
  renderApp();
}

function readScoreInputs(scope, prefix) {
  const values = {};
  scope.querySelectorAll("input[data-match]").forEach((input) => {
    const matchId = input.dataset.match;
    const side = input.dataset.side;
    values[matchId] = values[matchId] || {};
    const value = input.value === "" ? null : Number(input.value);
    values[matchId][side] = Number.isFinite(value) ? value : null;
  });
  Object.entries(values).forEach(([matchId, score]) => {
    if (score.home === null && score.away === null) {
      delete values[matchId];
    }
  });
  return values;
}

function savePredictions() {
  const user = getCurrentUser();
  if (!user || isAdmin(user)) return;
  state.predictions[user.id] = readScoreInputs(predictionGroups, "pred");
  saveState();
  renderApp();
}

function saveOfficialResults() {
  if (!isAdmin()) return;
  state.officialResults = readScoreInputs(officialGroups, "official");
  saveState();
  renderApp();
}

function deleteParticipant(userId) {
  if (!isAdmin()) return;
  const target = state.users.find((user) => user.id === userId);
  if (!target || target.role === "admin") return;
  state.users = state.users.filter((user) => user.id !== userId);
  delete state.predictions[userId];
  saveState();
  renderApp();
}

function handleLogout() {
  state.currentUserId = null;
  saveState();
  renderApp();
}

function winner(score, match) {
  if (!score || score.home === null || score.away === null) return "";
  if (score.home > score.away) return match.home;
  if (score.home < score.away) return match.away;
  return "Empate";
}

function scorePrediction(prediction, official, match) {
  if (!prediction || !official) return 0;
  if (prediction.home === null || prediction.away === null || official.home === null || official.away === null) return 0;
  let points = 0;
  if (prediction.home === official.home) points += 1;
  if (prediction.away === official.away) points += 1;
  if (winner(prediction, match) === winner(official, match)) points += 2;
  return points;
}

function userScore(userId) {
  const prediction = state.predictions[userId] || {};
  return matches.reduce((total, match) => {
    return total + scorePrediction(prediction[match.id], state.officialResults[match.id], match);
  }, 0);
}

function buildStandings(groupId, source) {
  const group = groups.find((item) => item.id === groupId);
  const table = group.teams.map((team) => ({
    team: team.name,
    code: team.code,
    played: 0,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
  }));

  const byTeam = Object.fromEntries(table.map((row) => [row.team, row]));

  matches
    .filter((match) => match.groupId === groupId)
    .forEach((match) => {
      const score = source[match.id];
      if (!score || score.home === null || score.away === null) return;
      const home = byTeam[match.home];
      const away = byTeam[match.away];
      home.played += 1;
      away.played += 1;
      home.goalsFor += score.home;
      home.goalsAgainst += score.away;
      away.goalsFor += score.away;
      away.goalsAgainst += score.home;
      if (score.home > score.away) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else if (score.home < score.away) {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  table.forEach((row) => {
    row.goalDiff = row.goalsFor - row.goalsAgainst;
  });

  return table.sort((a, b) => {
    return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
  });
}

function scoreValue(source, matchId, side) {
  const value = source?.[matchId]?.[side];
  return Number.isFinite(value) ? value : "";
}

function matchInput(match, source, inputClass) {
  return `
    <div class="match-row">
      <span class="team home"><span>${match.home}</span>${flagImage(match.homeCode, match.home)}</span>
      <input class="score-input ${inputClass}" type="number" min="0" max="20" inputmode="numeric" data-match="${match.id}" data-side="home" value="${scoreValue(source, match.id, "home")}" aria-label="${match.home}" />
      <strong>x</strong>
      <input class="score-input ${inputClass}" type="number" min="0" max="20" inputmode="numeric" data-match="${match.id}" data-side="away" value="${scoreValue(source, match.id, "away")}" aria-label="${match.away}" />
      <span class="team">${flagImage(match.awayCode, match.away)}<span>${match.away}</span></span>
    </div>
  `;
}

function flagImage(code, name) {
  return `<img class="flag" src="${flagUrl(code)}" alt="Bandeira de ${name}" onerror="this.classList.add('is-missing'); this.removeAttribute('src');" />`;
}

function teamLabel(row) {
  return `<span class="table-team">${flagImage(row.code, row.team)}<span>${row.team}</span></span>`;
}

function standingsTable(rows) {
  return `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>J</th>
          <th>Pts</th>
          <th>SG</th>
          <th>GP</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${teamLabel(row)}</td>
                <td>${row.played}</td>
                <td>${row.points}</td>
                <td>${row.goalDiff}</td>
                <td>${row.goalsFor}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderPredictionGroups() {
  const user = getCurrentUser();
  const source = state.predictions[user?.id] || {};
  predictionGroups.innerHTML = groups
    .map((group) => {
      const groupMatches = matches.filter((match) => match.groupId === group.id);
      return `
        <article class="group-card">
          <header>
            <div>
              <span class="group-badge">Grupo ${group.id}</span>
            </div>
          </header>
          <div class="match-list">
            ${groupMatches.map((match) => matchInput(match, source, "prediction-input")).join("")}
          </div>
          ${standingsTable(buildStandings(group.id, source))}
        </article>
      `;
    })
    .join("");
}

function renderOfficialGroups() {
  officialGroups.innerHTML = groups
    .map((group) => {
      const groupMatches = matches.filter((match) => match.groupId === group.id);
      return `
        <article class="official-group">
          <h4>Grupo ${group.id}</h4>
          <div class="match-list">
            ${groupMatches.map((match) => matchInput(match, state.officialResults, "official-input")).join("")}
          </div>
        </article>
      `;
    })
    .join("");

  officialStandings.innerHTML = groups
    .map(
      (group) => `
        <div>
          <h4>Grupo ${group.id}</h4>
          ${standingsTable(buildStandings(group.id, state.officialResults))}
        </div>
      `,
    )
    .join("");
}

function renderParticipants() {
  const participants = state.users.filter((user) => user.role !== "admin");
  if (!participants.length) {
    participantsList.innerHTML = `<div class="empty-state">Nenhum participante cadastrado ainda.</div>`;
    return;
  }

  participantsList.innerHTML = participants
    .map(
      (user) => `
        <div class="participant-item">
          <div>
            <strong>${user.name}</strong>
            <span>${user.email}</span>
          </div>
          <button class="danger-action" type="button" data-delete-user="${user.id}" onclick="deleteParticipant('${user.id}')">Excluir</button>
        </div>
      `,
    )
    .join("");
}

function renderRanking() {
  const ranked = state.users
    .map((user) => ({ ...user, points: userScore(user.id) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  if (!ranked.length) {
    rankingList.innerHTML = `<div class="empty-state">Nenhum participante cadastrado ainda.</div>`;
    return;
  }

  rankingList.innerHTML = ranked
    .map(
      (user, index) => `
        <div class="ranking-item">
          <span class="ranking-position">${index + 1}</span>
          <strong>${user.name}</strong>
          <span>${user.points} pts</span>
        </div>
      `,
    )
    .join("");
}

function renderApp() {
  const user = getCurrentUser();
  authView.classList.toggle("is-hidden", Boolean(user));
  appView.classList.toggle("is-hidden", !user);

  if (!user) {
    setAuthMode(mode);
    return;
  }

  currentUserName.textContent = user.name;
  currentUserRole.textContent = isAdmin(user) ? "Administrador" : "Participante";
  currentScore.textContent = userScore(user.id);
  settingsMenuBtn.classList.toggle("is-hidden", !isAdmin(user));
  document.querySelector('[data-tab="predictions"]').classList.toggle("is-hidden", isAdmin(user));
  document.querySelector('[data-tab="ranking"]').classList.toggle("is-hidden", isAdmin(user));
  document.querySelector(".score-pill").classList.toggle("is-hidden", isAdmin(user));
  renderPredictionGroups();
  renderOfficialGroups();
  renderParticipants();
  renderRanking();
  if (isAdmin(user)) {
    activeTab = "settings";
  }
  if (!isAdmin(user) && activeTab === "settings") {
    activeTab = "ranking";
  }
  switchTab(activeTab);
}

function switchTab(tabName) {
  const user = getCurrentUser();
  if (tabName === "settings" && !isAdmin(user)) {
    tabName = "ranking";
  }
  if (isAdmin(user) && tabName !== "settings") {
    tabName = "settings";
  }
  activeTab = tabName;
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });
  document.querySelector("#predictionsTab").classList.toggle("is-hidden", tabName !== "predictions");
  document.querySelector("#rankingTab").classList.toggle("is-hidden", tabName !== "ranking");
  document.querySelector("#settingsTab").classList.toggle("is-hidden", tabName !== "settings");
  const titles = {
    predictions: "Simulacao dos palpites",
    ranking: "Resultados e classificacao",
    settings: "Configuracoes",
  };
  pageTitle.textContent = titles[tabName];
}

loginModeBtn.addEventListener("click", () => setAuthMode("login"));
signupModeBtn.addEventListener("click", () => setAuthMode("signup"));
authForm.addEventListener("submit", handleAuth);
document.querySelector("#savePredictionsBtn").addEventListener("click", savePredictions);
document.querySelector("#saveOfficialBtn").addEventListener("click", saveOfficialResults);
participantsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-user]");
  if (!button) return;
  deleteParticipant(button.dataset.deleteUser);
});
document.querySelector("#logoutBtn").addEventListener("click", handleLogout);
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

setAuthMode("login");
renderApp();
