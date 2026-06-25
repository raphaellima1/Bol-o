const STORAGE_KEY = "bolaoCopaApp";
const SUPABASE_URL = "https://mrzyyofibvkslsphljvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_wuq8QTeVxvMy0G5MbZKkyA_qhPBZH3x";
const ADMIN_EMAIL = "raphaeel.rmdl@gmail.com";
const ADMIN_PASSWORD = "1991";
const ADMIN_NAME = "Raphael Lima";

const team = (name, code) => ({ name, code });

function flagUrl(code) {
  return `https://flagcdn.com/w40/${code}.png`;
}

const groups = [
  { id: "A", teams: [team("México", "mx"), team("África do Sul", "za"), team("Coreia do Sul", "kr"), team("Rep. Tcheca", "cz")] },
  { id: "B", teams: [team("Canadá", "ca"), team("Suíça", "ch"), team("Catar", "qa"), team("Bósnia", "ba")] },
  { id: "C", teams: [team("Brasil", "br"), team("Marrocos", "ma"), team("Haiti", "ht"), team("Escócia", "gb-sct")] },
  { id: "D", teams: [team("Estados Unidos", "us"), team("Paraguai", "py"), team("Austrália", "au"), team("Turquia", "tr")] },
  { id: "E", teams: [team("Alemanha", "de"), team("Curaçao", "cw"), team("Costa do Marfim", "ci"), team("Equador", "ec")] },
  { id: "F", teams: [team("Holanda", "nl"), team("Japão", "jp"), team("Tunísia", "tn"), team("Suécia", "se")] },
  { id: "G", teams: [team("Bélgica", "be"), team("Egito", "eg"), team("Irã", "ir"), team("Nova Zelândia", "nz")] },
  { id: "H", teams: [team("Espanha", "es"), team("Cabo Verde", "cv"), team("Arábia Saudita", "sa"), team("Uruguai", "uy")] },
  { id: "I", teams: [team("França", "fr"), team("Senegal", "sn"), team("Noruega", "no"), team("Iraque", "iq")] },
  { id: "J", teams: [team("Argentina", "ar"), team("Argélia", "dz"), team("Áustria", "at"), team("Jordânia", "jo")] },
  { id: "K", teams: [team("Portugal", "pt"), team("Uzbequistão", "uz"), team("Colômbia", "co"), team("RD Congo", "cd")] },
  { id: "L", teams: [team("Inglaterra", "gb-eng"), team("Croácia", "hr"), team("Gana", "gh"), team("Panamá", "pa")] },
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
let databaseReady = false;
let syncInProgress = false;

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
const knockoutBracket = document.querySelector("#knockoutBracket");
const officialGroups = document.querySelector("#officialGroups");
const officialStandings = document.querySelector("#officialStandings");
const rankingList = document.querySelector("#rankingList");
const participantsList = document.querySelector("#participantsList");
const userHistoryList = document.querySelector("#userHistoryList");
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
    history: [],
  });
}

function migrateState(nextState) {
  nextState.users = nextState.users || [];
  nextState.predictions = nextState.predictions || {};
  nextState.officialResults = nextState.officialResults || {};
  nextState.history = nextState.history || [];

  const existingAdmin = nextState.users.find((user) => normalizeEmail(user.email || "") === ADMIN_EMAIL);
  if (existingAdmin) {
    existingAdmin.name = existingAdmin.name || ADMIN_NAME;
    existingAdmin.email = ADMIN_EMAIL;
    existingAdmin.password = ADMIN_PASSWORD;
    existingAdmin.role = "admin";
  } else {
    const admin = {
      id: "admin-raphael",
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      createdAt: new Date().toISOString(),
      passwordHistory: [{ password: ADMIN_PASSWORD, changedAt: new Date().toISOString(), reason: "Administrador pré-configurado" }],
    };
    nextState.users.unshift(admin);
    nextState.predictions[admin.id] = nextState.predictions[admin.id] || {};
  }

  nextState.users = nextState.users.map((user) => {
    const email = normalizeEmail(user.email || "");
    const isPresetAdmin = email === ADMIN_EMAIL;
    return {
      ...user,
      email,
      role: isPresetAdmin ? "admin" : "participant",
      createdAt: user.createdAt || new Date().toISOString(),
      passwordHistory: user.passwordHistory || [{ password: user.password || "", changedAt: new Date().toISOString(), reason: "Senha inicial" }],
      lastLoginAt: user.lastLoginAt || "",
    };
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Erro Supabase ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function toAppUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: normalizeEmail(row.email),
    password: row.password,
    role: row.role,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || "",
    passwordHistory: row.password_history || [],
  };
}

function toDbUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: normalizeEmail(user.email),
    password: user.password,
    role: user.role,
    created_at: user.createdAt || new Date().toISOString(),
    last_login_at: user.lastLoginAt || null,
    password_history: user.passwordHistory || [],
  };
}

async function loadRemoteState() {
  const currentUser = getCurrentUser();
  const currentEmail = currentUser ? normalizeEmail(currentUser.email) : "";
  const [usersRows, predictionRows, officialRows, historyRows] = await Promise.all([
    supabaseRequest("bolao_users?select=*&order=created_at.asc"),
    supabaseRequest("bolao_predictions?select=*"),
    supabaseRequest("bolao_official_results?select=*"),
    supabaseRequest("bolao_history?select=*&order=created_at.desc&limit=100"),
  ]);

  state.users = usersRows.map(toAppUser);
  state.predictions = Object.fromEntries(predictionRows.map((row) => [row.user_id, row.predictions || {}]));
  state.officialResults = officialRows.find((row) => row.id === "official")?.results || {};
  state.history = historyRows.map((row) => ({
    id: row.id,
    type: row.type,
    detail: row.detail,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
  if (currentEmail) {
    state.currentUserId = state.users.find((user) => normalizeEmail(user.email) === currentEmail)?.id || null;
  }
  state = migrateState(state);
  databaseReady = true;
  saveState();
}

async function syncDatabase() {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    await ensureRemoteSeed();
    await loadRemoteState();
    renderApp();
  } catch (error) {
    showDatabaseError(error);
  } finally {
    syncInProgress = false;
  }
}

async function ensureRemoteSeed() {
  const admin = state.users.find((user) => normalizeEmail(user.email) === ADMIN_EMAIL);
  if (!admin) return;
  await supabaseRequest("bolao_users?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(toDbUser(admin)),
  });
}

async function saveRemoteUser(user) {
  if (!databaseReady) return;
  await supabaseRequest("bolao_users?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(toDbUser(user)),
  });
}

async function saveRemotePredictions(userId) {
  if (!databaseReady) return;
  await supabaseRequest("bolao_predictions?on_conflict=user_id", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, predictions: state.predictions[userId] || {}, updated_at: new Date().toISOString() }),
  });
}

async function saveRemoteOfficialResults() {
  if (!databaseReady) return;
  await supabaseRequest("bolao_official_results?on_conflict=id", {
    method: "POST",
    body: JSON.stringify({ id: "official", results: state.officialResults || {}, updated_at: new Date().toISOString() }),
  });
}

async function saveRemoteHistory(item) {
  if (!databaseReady || !item) return;
  await supabaseRequest("bolao_history", {
    method: "POST",
    body: JSON.stringify({
      id: item.id,
      type: item.type,
      detail: item.detail,
      user_id: item.userId,
      name: item.name,
      email: item.email,
      role: item.role,
      created_at: item.createdAt,
    }),
  });
}

async function deleteRemoteParticipant(userId) {
  if (!databaseReady) return;
  await supabaseRequest(`bolao_users?id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
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
    authMessage.textContent = "Este e-mail já está cadastrado.";
      return;
    }
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role: "participant",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      passwordHistory: [{ password, changedAt: new Date().toISOString(), reason: "Cadastro do participante" }],
    };
    state.users.push(user);
    state.currentUserId = user.id;
    state.predictions[user.id] = {};
    const createdHistory = recordHistory("Cadastro", user, "Participante cadastrado");
    const loginHistory = recordHistory("Login", user, "Primeiro acesso após cadastro");
    saveState();
    renderApp();
    saveRemoteUser(user).then(() => saveRemotePredictions(user.id)).catch(showDatabaseError);
    Promise.all([saveRemoteHistory(createdHistory), saveRemoteHistory(loginHistory)]).catch(showDatabaseError);
    return;
  }

  const user = state.users.find((item) => item.email === email && item.password === password);
  if (!user) {
    authMessage.textContent = "E-mail ou senha não encontrados.";
    return;
  }
  state.currentUserId = user.id;
  user.lastLoginAt = new Date().toISOString();
  const loginHistory = recordHistory("Login", user, "Acesso realizado");
  saveState();
  renderApp();
  saveRemoteUser(user).catch(showDatabaseError);
  saveRemoteHistory(loginHistory).catch(showDatabaseError);
}

function recordHistory(type, user, detail) {
  state.history = state.history || [];
  const item = {
    id: crypto.randomUUID(),
    type,
    detail,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString(),
  };
  state.history.unshift(item);
  state.history = state.history.slice(0, 100);
  return item;
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

async function savePredictions() {
  const user = getCurrentUser();
  if (!user || isAdmin(user)) return;
  const existing = state.predictions[user.id] || {};
  const groupScores = readScoreInputs(predictionGroups, "pred");
  state.predictions[user.id] = {
    ...Object.fromEntries(Object.entries(existing).filter(([key]) => !matches.some((match) => match.id === key))),
    ...groupScores,
  };
  saveState();
  try {
    await saveRemotePredictions(user.id);
    await loadRemoteState();
    renderApp();
  } catch (error) {
    showDatabaseError(error);
  }
}

async function saveOfficialResults() {
  if (!isAdmin()) return;
  state.officialResults = readScoreInputs(officialGroups, "official");
  saveState();
  try {
    await saveRemoteOfficialResults();
    await loadRemoteState();
    renderApp();
    showToast("Resultados salvos com sucesso");
  } catch (error) {
    showDatabaseError(error);
    showToast("Não foi possível salvar os resultados", "error");
  }
}

function deleteParticipant(userId) {
  if (!isAdmin()) return;
  const target = state.users.find((user) => user.id === userId);
  if (!target || target.role === "admin") return;
  state.users = state.users.filter((user) => user.id !== userId);
  delete state.predictions[userId];
  const deleteHistory = recordHistory("Exclusão", target, "Participante excluído pelo administrador");
  saveState();
  renderApp();
  deleteRemoteParticipant(userId).catch(showDatabaseError);
  saveRemoteHistory(deleteHistory).catch(showDatabaseError);
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

function pointReason(prediction, official, match) {
  if (!prediction || !official || prediction.home === null || prediction.away === null || official.home === null || official.away === null) {
    return "Aguardando palpite ou resultado oficial.";
  }

  const reasons = [];
  if (prediction.home === official.home) reasons.push(`+1 gol de ${match.home}`);
  if (prediction.away === official.away) reasons.push(`+1 gol de ${match.away}`);
  if (winner(prediction, match) === winner(official, match)) reasons.push("+2 vencedor/empate");
  return reasons.length ? reasons.join(" · ") : "Nenhum critério acertado.";
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

function getTeamCode(teamName) {
  return groups.flatMap((group) => group.teams).find((item) => item.name === teamName)?.code || "";
}

function qualifiedTeams(source) {
  const direct = [];
  const thirds = [];

  groups.forEach((group) => {
    const standings = buildStandings(group.id, source).map((row, index) => ({
      ...row,
      groupId: group.id,
      groupRank: index + 1,
    }));
    direct.push(...standings.slice(0, 2));
    thirds.push(standings[2]);
  });

  const bestThirds = thirds
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team))
    .slice(0, 8);

  return [...direct, ...bestThirds]
    .sort((a, b) => {
      return a.groupRank - b.groupRank || b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
    })
    .slice(0, 32);
}

function knockoutRounds(source, choices) {
  const rounds = [
    { key: "R32", title: "16 avos de final" },
    { key: "R16", title: "Oitavas de final" },
    { key: "QF", title: "Quartas de final" },
    { key: "SF", title: "Semifinais" },
    { key: "F", title: "Final" },
  ];

  let teams = qualifiedTeams(source);
  return rounds.map((round) => {
    const matchesForRound = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const home = teams[index];
      const away = teams[teams.length - 1 - index];
      const matchId = `${round.key}-${index + 1}`;
      const selectedWinner = choices[matchId];
      const winner = [home?.team, away?.team].includes(selectedWinner) ? selectedWinner : "";
      matchesForRound.push({ ...round, id: matchId, home, away, winner });
    }
    teams = matchesForRound.map((match) => {
      const winnerName = match.winner;
      if (!winnerName) return null;
      const sourceTeam = [match.home, match.away].find((item) => item?.team === winnerName);
      return sourceTeam || { team: winnerName, code: getTeamCode(winnerName), points: 0, goalDiff: 0, goalsFor: 0 };
    }).filter(Boolean);
    return { ...round, matches: matchesForRound };
  });
}

function renderKnockoutSimulation() {
  const user = getCurrentUser();
  const source = state.predictions[user?.id] || {};
  const choices = source.knockout || {};
  const qualifiers = qualifiedTeams(source);

  if (qualifiers.length < 32) {
    knockoutBracket.innerHTML = `<div class="empty-state">Preencha os palpites da fase de grupos para montar a chave do mata-mata.</div>`;
    return;
  }

  const rounds = knockoutRounds(source, choices);
  const champion = rounds.at(-1)?.matches[0]?.winner;
  knockoutBracket.innerHTML = `
    ${champion ? `<div class="champion-banner"><span>Campeão simulado</span><strong>${flagImage(getTeamCode(champion), champion)} ${champion}</strong></div>` : ""}
    <div class="bracket-columns">
      ${rounds
        .map(
          (round) => `
            <section class="bracket-round">
              <h4>${round.title}</h4>
              <div class="bracket-match-list">
                ${round.matches.map((match) => knockoutMatchMarkup(match)).join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

function knockoutMatchMarkup(match) {
  return `
    <article class="bracket-match">
      ${knockoutTeamButton(match, match.home)}
      ${knockoutTeamButton(match, match.away)}
    </article>
  `;
}

function knockoutTeamButton(match, entry) {
  const isSelected = entry?.team && match.winner === entry.team;
  const disabled = !entry?.team;
  return `
    <button class="bracket-team ${isSelected ? "is-selected" : ""}" type="button" data-knockout-match="${match.id}" data-winner="${entry?.team || ""}" ${disabled ? "disabled" : ""}>
      ${entry?.team ? flagImage(entry.code || getTeamCode(entry.team), entry.team) : ""}
      <span>${entry?.team || "A definir"}</span>
      ${entry?.groupId ? `<small>${entry.groupRank}º Grupo ${entry.groupId}</small>` : ""}
    </button>
  `;
}

async function saveKnockoutSimulation() {
  const user = getCurrentUser();
  if (!user || isAdmin(user)) return;
  state.predictions[user.id] = state.predictions[user.id] || {};
  saveState();
  try {
    await saveRemotePredictions(user.id);
    await loadRemoteState();
    renderApp();
    showToast("Mata-mata salvo com sucesso");
  } catch (error) {
    showDatabaseError(error);
    showToast("Não foi possível salvar o mata-mata", "error");
  }
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
}

function renderPointBreakdown() {
  const user = getCurrentUser();
  const predictions = state.predictions[user?.id] || {};
  const completedMatches = matches.filter((match) => {
    const official = state.officialResults[match.id];
    return official && official.home !== null && official.away !== null;
  });

  if (!completedMatches.length) {
    officialStandings.innerHTML = `<div class="empty-state">Os resultados oficiais ainda não foram lançados.</div>`;
    return;
  }

  officialStandings.innerHTML = completedMatches
    .map((match) => {
      const prediction = predictions[match.id];
      const official = state.officialResults[match.id];
      const points = scorePrediction(prediction, official, match);
      return `
        <div class="points-detail-item">
          <div class="points-detail-head">
            <strong>Grupo ${match.groupId}: ${match.home} x ${match.away}</strong>
            <span>${points} pts</span>
          </div>
          <div class="points-detail-grid">
            <span>Seu palpite</span>
            <strong>${formatScore(prediction)}</strong>
            <span>Resultado oficial</span>
            <strong>${formatScore(official)}</strong>
          </div>
          <small>${pointReason(prediction, official, match)}</small>
        </div>
      `;
    })
    .join("");
}

function formatScore(score) {
  if (!score || score.home === null || score.away === null) return "Não informado";
  return `${score.home} x ${score.away}`;
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
            <small>Senha: ${user.password} · Cadastro: ${formatDate(user.createdAt)}</small>
          </div>
          <button class="danger-action" type="button" data-delete-user="${user.id}" onclick="deleteParticipant('${user.id}')">Excluir</button>
        </div>
      `,
    )
    .join("");
}

function renderUserHistory() {
  const usersMarkup = state.users
    .map(
      (user) => `
        <div class="user-info-item">
          <strong>${user.name}</strong>
          <span>${user.email}</span>
          <span>Perfil: ${user.role === "admin" ? "Administrador" : "Participante"}</span>
          <span>Senha atual: ${user.password}</span>
          <span>Último login: ${formatDate(user.lastLoginAt)}</span>
        </div>
      `,
    )
    .join("");

  const historyMarkup = (state.history || [])
    .slice(0, 20)
    .map(
      (item) => `
        <div class="history-item">
          <strong>${item.type}</strong>
          <span>${item.name} · ${item.email}</span>
          <span>${item.detail}</span>
          <small>${formatDate(item.createdAt)}</small>
        </div>
      `,
    )
    .join("");

  userHistoryList.innerHTML = `
    <div class="history-section">
      <h4>Usuários no banco</h4>
      ${usersMarkup || `<div class="empty-state">Nenhum usuário salvo.</div>`}
    </div>
    <div class="history-section">
      <h4>Histórico de login e senha</h4>
      ${historyMarkup || `<div class="empty-state">Nenhum histórico registrado ainda.</div>`}
    </div>
  `;
}
function formatDate(value) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function showDatabaseError(error) {
  console.error(error);
  authMessage.textContent = "Não foi possível sincronizar com o banco. Confira as tabelas no Supabase.";
}

function showToast(message, type = "success") {
  let toast = document.querySelector("#toastMessage");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastMessage";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.className = `toast-message ${type === "error" ? "is-error" : "is-success"}`;
  toast.textContent = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.add("is-hiding");
  }, 2600);
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
  document.querySelector('[data-tab="knockout"]').classList.toggle("is-hidden", isAdmin(user));
  document.querySelector('[data-tab="ranking"]').classList.toggle("is-hidden", isAdmin(user));
  document.querySelector(".score-pill").classList.toggle("is-hidden", isAdmin(user));
  renderPredictionGroups();
  renderKnockoutSimulation();
  renderOfficialGroups();
  renderPointBreakdown();
  renderParticipants();
  renderUserHistory();
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
  document.querySelector("#knockoutTab").classList.toggle("is-hidden", tabName !== "knockout");
  document.querySelector("#rankingTab").classList.toggle("is-hidden", tabName !== "ranking");
  document.querySelector("#settingsTab").classList.toggle("is-hidden", tabName !== "settings");
  const titles = {
    predictions: "Simulação dos palpites",
    knockout: "Simulação do mata-mata",
    ranking: "Resultados e classificação",
    settings: "Configurações",
  };
  pageTitle.textContent = titles[tabName];
  if (tabName === "settings" && databaseReady) {
    syncDatabase();
  }
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
knockoutBracket.addEventListener("click", (event) => {
  const button = event.target.closest("[data-knockout-match]");
  const user = getCurrentUser();
  if (!button || !user || isAdmin(user) || button.disabled) return;
  const winnerName = button.dataset.winner;
  if (!winnerName) return;
  state.predictions[user.id] = state.predictions[user.id] || {};
  state.predictions[user.id].knockout = {
    ...(state.predictions[user.id].knockout || {}),
    [button.dataset.knockoutMatch]: winnerName,
  };
  saveState();
  renderKnockoutSimulation();
});
document.querySelector("#logoutBtn").addEventListener("click", handleLogout);
document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

async function initializeApp() {
  setAuthMode("login");
  renderApp();
  await syncDatabase();
}

window.switchTab = switchTab;
window.syncDatabase = syncDatabase;
window.savePredictions = savePredictions;
window.saveKnockoutSimulation = saveKnockoutSimulation;
window.saveOfficialResults = saveOfficialResults;
window.deleteParticipant = deleteParticipant;
window.handleLogout = handleLogout;

initializeApp();
