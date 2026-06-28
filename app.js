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
const officialKnockoutBracket = document.querySelector("#officialKnockoutBracket");
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
  state.officialResults = {
    ...readScoreInputs(officialGroups, "official"),
    knockout: state.officialResults.knockout || {},
  };
  state.officialResults.knockout = validKnockoutChoices(state.officialResults, state.officialResults.knockout);
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
  return groupStageScore(userId) + knockoutScore(userId);
}

function groupStageScore(userId) {
  const prediction = state.predictions[userId] || {};
  return matches.reduce((total, match) => {
    return total + scorePrediction(prediction[match.id], state.officialResults[match.id], match);
  }, 0);
}

function knockoutScore(userId) {
  const predictions = state.predictions[userId]?.knockout || {};
  const official = validKnockoutChoices(state.officialResults, state.officialResults.knockout || {});
  return Object.entries(official).reduce((total, [matchId, winnerName]) => {
    if (!winnerName) return total;
    return predictions[matchId] === winnerName ? total + 4 : total;
  }, 0);
}

function validKnockoutChoices(source, choices) {
  if (!hasCompleteGroupStage(source) || qualifiedTeams(source).length < 32) return {};
  return Object.fromEntries(
    knockoutRounds(source, choices)
      .flatMap((round) => round.matches)
      .filter((match) => match.winner)
      .map((match) => [match.id, match.winner]),
  );
}

function hasCompleteGroupStage(source) {
  return matches.every((match) => {
    const score = source[match.id];
    return score && score.home !== null && score.away !== null;
  });
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
  const playedMatches = [];

  matches
    .filter((match) => match.groupId === groupId)
    .forEach((match) => {
      const score = source[match.id];
      if (!score || score.home === null || score.away === null) return;
      playedMatches.push({ ...match, score });
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
    const tiedTeams = table.filter((row) => row.points === a.points).map((row) => row.team);
    const aHeadToHead = headToHeadPoints(a.team, tiedTeams, playedMatches);
    const bHeadToHead = headToHeadPoints(b.team, tiedTeams, playedMatches);
    return b.points - a.points || bHeadToHead - aHeadToHead || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team);
  });
}

function headToHeadPoints(teamName, tiedTeams, playedMatches) {
  if (tiedTeams.length < 2) return 0;
  return playedMatches.reduce((points, match) => {
    if (!tiedTeams.includes(match.home) || !tiedTeams.includes(match.away)) return points;
    if (match.home === teamName) {
      if (match.score.home > match.score.away) return points + 3;
      if (match.score.home === match.score.away) return points + 1;
    }
    if (match.away === teamName) {
      if (match.score.away > match.score.home) return points + 3;
      if (match.score.away === match.score.home) return points + 1;
    }
    return points;
  }, 0);
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

function groupQualifiers(source) {
  return Object.fromEntries(
    groups.map((group) => {
      const standings = buildStandings(group.id, source).map((row, index) => ({
        ...row,
        groupId: group.id,
        groupRank: index + 1,
      }));
      return [group.id, { winner: standings[0], runnerUp: standings[1], third: standings[2] }];
    }),
  );
}

function bestThirdPlacedTeams(source) {
  return Object.values(groupQualifiers(source))
    .map((group) => group.third)
    .filter(Boolean)
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team))
    .slice(0, 8)
    .map((team, index) => ({ ...team, thirdRank: index + 1 }));
}

const roundOf32ThirdSlots = {
  M74: ["A", "B", "C", "D", "F"],
  M77: ["C", "D", "F", "G", "H"],
  M79: ["C", "E", "F", "H", "I"],
  M80: ["E", "H", "I", "J", "K"],
  M81: ["B", "E", "F", "I", "J"],
  M82: ["A", "E", "H", "I", "J"],
  M85: ["E", "F", "G", "I", "J"],
  M87: ["D", "E", "I", "J", "L"],
};

const roundOf32ThirdGroupMatrix = {
  BDEFIJKL: {
    M79: "E",
    M85: "J",
    M81: "B",
    M74: "D",
    M82: "I",
    M77: "F",
    M87: "L",
    M80: "K",
  },
  BDEFGIKL: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "I",
    M77: "F",
    M87: "L",
    M80: "K",
  },
  BDEFGIJL: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "J",
    M77: "F",
    M87: "L",
    M80: "I",
  },
  BDEFGIJK: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "J",
    M77: "F",
    M87: "I",
    M80: "K",
  },
  ABDEFGIL: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "A",
    M77: "F",
    M87: "L",
    M80: "I",
  },
  ABDEFGIK: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "A",
    M77: "F",
    M87: "I",
    M80: "K",
  },
  ABDEFGIJ: {
    M79: "E",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "A",
    M77: "F",
    M87: "I",
    M80: "J",
  },
  ABCDEFGI: {
    M79: "C",
    M85: "G",
    M81: "B",
    M74: "D",
    M82: "A",
    M77: "F",
    M87: "E",
    M80: "I",
  },
};

function assignThirdPlacedTeams(source) {
  const thirds = bestThirdPlacedTeams(source);
  const matrixKey = thirds.map((team) => team.groupId).sort().join("");
  const matrixAssignment = roundOf32ThirdGroupMatrix[matrixKey];

  if (matrixAssignment) {
    return Object.fromEntries(
      Object.entries(matrixAssignment)
        .map(([matchId, groupId]) => [matchId, thirds.find((team) => team.groupId === groupId)])
        .filter(([, team]) => Boolean(team)),
    );
  }

  const slots = Object.entries(roundOf32ThirdSlots)
    .map(([matchId, eligibleGroups]) => ({
      matchId,
      eligibleGroups,
      candidates: thirds.filter((team) => eligibleGroups.includes(team.groupId)),
    }))
    .sort((a, b) => a.candidates.length - b.candidates.length || a.matchId.localeCompare(b.matchId));

  function backtrack(index, usedGroups, assignment) {
    if (index === slots.length) return assignment;
    const slot = slots[index];
    for (const candidate of slot.candidates) {
      if (usedGroups.has(candidate.groupId)) continue;
      const nextUsed = new Set(usedGroups);
      nextUsed.add(candidate.groupId);
      const result = backtrack(index + 1, nextUsed, { ...assignment, [slot.matchId]: candidate });
      if (result) return result;
    }
    return null;
  }

  return backtrack(0, new Set(), {}) || {};
}

function roundOf32Matches(source, choices) {
  const qualifiers = groupQualifiers(source);
  const thirdAssignments = assignThirdPlacedTeams(source);
  const rank = (groupId, position) => {
    const group = qualifiers[groupId];
    if (position === 1) return group?.winner;
    if (position === 2) return group?.runnerUp;
    return group?.third;
  };
  const third = (matchId) => thirdAssignments[matchId] || null;
  const defs = [
    ["M73", "2º Grupo A", rank("A", 2), "2º Grupo B", rank("B", 2)],
    ["M74", "1º Grupo E", rank("E", 1), "3º A/B/C/D/F", third("M74")],
    ["M75", "1º Grupo F", rank("F", 1), "2º Grupo C", rank("C", 2)],
    ["M76", "1º Grupo C", rank("C", 1), "2º Grupo F", rank("F", 2)],
    ["M77", "1º Grupo I", rank("I", 1), "3º C/D/F/G/H", third("M77")],
    ["M78", "2º Grupo E", rank("E", 2), "2º Grupo I", rank("I", 2)],
    ["M79", "1º Grupo A", rank("A", 1), "3º C/E/F/H/I", third("M79")],
    ["M80", "1º Grupo L", rank("L", 1), "3º E/H/I/J/K", third("M80")],
    ["M81", "1º Grupo D", rank("D", 1), "3º B/E/F/I/J", third("M81")],
    ["M82", "1º Grupo G", rank("G", 1), "3º A/E/H/I/J", third("M82")],
    ["M83", "2º Grupo K", rank("K", 2), "2º Grupo L", rank("L", 2)],
    ["M84", "1º Grupo H", rank("H", 1), "2º Grupo J", rank("J", 2)],
    ["M85", "1º Grupo B", rank("B", 1), "3º E/F/G/I/J", third("M85")],
    ["M86", "1º Grupo J", rank("J", 1), "2º Grupo H", rank("H", 2)],
    ["M87", "1º Grupo K", rank("K", 1), "3º D/E/I/J/L", third("M87")],
    ["M88", "2º Grupo D", rank("D", 2), "2º Grupo G", rank("G", 2)],
  ];

  return defs.map(([id, homeLabel, home, awayLabel, away]) => buildKnockoutMatch(id, "R32", "16 avos de final", home, away, choices, homeLabel, awayLabel));
}

function buildKnockoutMatch(id, key, title, home, away, choices, homeLabel = "", awayLabel = "") {
  const selectedWinner = choices[id];
  const winner = [home?.team, away?.team].includes(selectedWinner) ? selectedWinner : "";
  return { id, key, title, home, away, winner, homeLabel, awayLabel };
}

function nextRoundEntry(match) {
  if (!match.winner) return { team: `Vencedor ${match.id}`, code: "", placeholder: true };
  const entry = [match.home, match.away].find((item) => item?.team === match.winner);
  return entry || { team: match.winner, code: getTeamCode(match.winner) };
}

function knockoutRounds(source, choices) {
  const r32 = roundOf32Matches(source, choices);
  const byId = Object.fromEntries(r32.map((match) => [match.id, match]));
  const makeRound = (key, title, pairs) =>
    pairs.map(([id, homeId, awayId]) => {
      const match = buildKnockoutMatch(id, key, title, nextRoundEntry(byId[homeId]), nextRoundEntry(byId[awayId]), choices, `Vencedor ${homeId}`, `Vencedor ${awayId}`);
      byId[id] = match;
      return match;
    });

  const r16 = makeRound("R16", "Oitavas de final", [
    ["M89", "M73", "M75"],
    ["M90", "M74", "M77"],
    ["M91", "M76", "M78"],
    ["M92", "M79", "M80"],
    ["M93", "M83", "M84"],
    ["M94", "M81", "M82"],
    ["M95", "M86", "M88"],
    ["M96", "M85", "M87"],
  ]);
  const qf = makeRound("QF", "Quartas de final", [
    ["M97", "M89", "M90"],
    ["M98", "M93", "M94"],
    ["M99", "M91", "M92"],
    ["M100", "M95", "M96"],
  ]);
  const sf = makeRound("SF", "Semifinais", [
    ["M101", "M97", "M98"],
    ["M102", "M99", "M100"],
  ]);
  const final = makeRound("F", "Final", [["M104", "M101", "M102"]]);

  return [
    { key: "R32", title: "16 avos de final", matches: r32 },
    { key: "R16", title: "Oitavas de final", matches: r16 },
    { key: "QF", title: "Quartas de final", matches: qf },
    { key: "SF", title: "Semifinais", matches: sf },
    { key: "F", title: "Final", matches: final },
  ];
}

function renderKnockoutSimulation() {
  const user = getCurrentUser();
  const choices = state.predictions[user?.id]?.knockout || {};
  const groupStageComplete = hasCompleteGroupStage(state.officialResults);
  const qualifiers = groupStageComplete ? qualifiedTeams(state.officialResults) : [];

  if (qualifiers.length < 32) {
    knockoutBracket.innerHTML = `<div class="empty-state">A chave do mata-mata será liberada quando o administrador lançar os resultados da fase de grupos.</div>`;
    return;
  }

  const rounds = knockoutRounds(state.officialResults, choices);
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

function renderOfficialKnockoutSimulation() {
  const choices = state.officialResults.knockout || {};
  const groupStageComplete = hasCompleteGroupStage(state.officialResults);
  const qualifiers = groupStageComplete ? qualifiedTeams(state.officialResults) : [];

  if (qualifiers.length < 32) {
    officialKnockoutBracket.innerHTML = `<div class="empty-state">Lance os resultados dos grupos para montar a chave oficial do mata-mata.</div>`;
    return;
  }

  const rounds = knockoutRounds(state.officialResults, choices);
  const champion = rounds.at(-1)?.matches[0]?.winner;
  officialKnockoutBracket.innerHTML = `
    ${champion ? `<div class="champion-banner"><span>Campeão oficial</span><strong>${flagImage(getTeamCode(champion), champion)} ${champion}</strong></div>` : ""}
    <div class="bracket-columns">
      ${rounds
        .map(
          (round) => `
            <section class="bracket-round">
              <h4>${round.title}</h4>
              <div class="bracket-match-list">
                ${round.matches.map((match) => knockoutMatchMarkup(match, "official")).join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

function knockoutMatchMarkup(match, mode = "prediction") {
  return `
    <article class="bracket-match">
      <div class="bracket-match-title">${match.id}</div>
      ${knockoutTeamButton(match, match.home, mode)}
      ${knockoutTeamButton(match, match.away, mode)}
    </article>
  `;
}

function knockoutTeamButton(match, entry, mode = "prediction") {
  const isSelected = entry?.team && match.winner === entry.team;
  const disabled = !entry?.team || entry.placeholder;
  const label = entry === match.home ? match.homeLabel : match.awayLabel;
  return `
    <button class="bracket-team ${isSelected ? "is-selected" : ""}" type="button" data-knockout-mode="${mode}" data-knockout-match="${match.id}" data-winner="${entry?.team || ""}" ${disabled ? "disabled" : ""}>
      ${entry?.team && !entry.placeholder ? flagImage(entry.code || getTeamCode(entry.team), entry.team) : ""}
      <span>${entry?.team || "A definir"}</span>
      <small>${entry?.groupId ? `${entry.groupRank}º Grupo ${entry.groupId}` : label}</small>
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
  const knockoutOfficial = validKnockoutChoices(state.officialResults, state.officialResults.knockout || {});
  const knockoutPredictions = predictions.knockout || {};
  const knockoutItems = Object.entries(knockoutOfficial).filter(([, winnerName]) => Boolean(winnerName));

  if (!completedMatches.length && !knockoutItems.length) {
    officialStandings.innerHTML = `<div class="empty-state">Os resultados oficiais ainda não foram lançados.</div>`;
    return;
  }

  const groupMarkup = completedMatches
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
  const knockoutMarkup = knockoutItems
    .map(([matchId, officialWinner]) => {
      const predictionWinner = knockoutPredictions[matchId] || "Não informado";
      const points = predictionWinner === officialWinner ? 4 : 0;
      return `
        <div class="points-detail-item">
          <div class="points-detail-head">
            <strong>${matchId}: vencedor</strong>
            <span>${points} pts</span>
          </div>
          <div class="points-detail-grid">
            <span>Seu palpite</span>
            <strong>${predictionWinner}</strong>
            <span>Resultado oficial</span>
            <strong>${officialWinner}</strong>
          </div>
          <small>${points === 4 ? "+4 vencedor correto" : "Vencedor diferente do oficial."}</small>
        </div>
      `;
    })
    .join("");

  officialStandings.innerHTML = `
    ${groupMarkup ? `<h4 class="points-section-title">1ª fase</h4>${groupMarkup}` : ""}
    ${knockoutMarkup ? `<h4 class="points-section-title">Mata-mata</h4>${knockoutMarkup}` : ""}
  `;
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
    .filter((user) => user.role !== "admin")
    .map((user) => {
      const groupPoints = groupStageScore(user.id);
      const knockoutPoints = knockoutScore(user.id);
      return { ...user, groupPoints, knockoutPoints, points: groupPoints + knockoutPoints };
    })
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
          <div class="ranking-name">
            <strong>${user.name}</strong>
            <small>1ª fase: ${user.groupPoints} pts · Mata-mata: ${user.knockoutPoints} pts</small>
          </div>
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
  renderOfficialKnockoutSimulation();
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
officialKnockoutBracket.addEventListener("click", (event) => {
  const button = event.target.closest("[data-knockout-match]");
  const user = getCurrentUser();
  if (!button || !user || !isAdmin(user) || button.disabled) return;
  const winnerName = button.dataset.winner;
  if (!winnerName) return;
  state.officialResults.knockout = {
    ...(state.officialResults.knockout || {}),
    [button.dataset.knockoutMatch]: winnerName,
  };
  saveState();
  renderOfficialKnockoutSimulation();
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
