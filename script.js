const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const errorBox = document.getElementById('error');
const gameSection = document.getElementById('game');
const statusSection = document.getElementById('status');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answers');
const feedbackBox = document.getElementById('feedback');
const nextButton = document.getElementById('nextButton');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const pool = document.getElementById('pool');
const correctCountEl = document.getElementById('correctCount');
const incorrectCountEl = document.getElementById('incorrectCount');
const configSection = document.getElementById('config');
const questionCountInput = document.getElementById('questionCount');
const questionCountValue = document.getElementById('questionCountValue');
const totalQuestionsValue = document.getElementById('totalQuestions');
const requiredStreakInput = document.getElementById('requiredStreak');
const requiredStreakValue = document.getElementById('requiredStreakValue');
const startButton = document.getElementById('startButton');
const cancelButton = document.getElementById('cancelButton');

let questions = [];
let allQuestions = [];
let currentQuestion = null;
let answered = false;
let correctCount = 0;
let incorrectCount = 0;
let answeredThisCycle = 0;
let cycleSize = 0;
let requiredStreak = 2;
let runActive = false;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function resetGameState() {
  questions = [];
  currentQuestion = null;
  answered = false;
  correctCount = 0;
  incorrectCount = 0;
  answeredThisCycle = 0;
  cycleSize = 0;
  runActive = false;

  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';
  nextButton.disabled = true;
  answersContainer.innerHTML = '';

  progress.textContent = 'Fragen im aktuellen Durchlauf: 0 von 0 beantwortet';
  if (progressBar) {
    progressBar.style.width = '0%';
  }
  if (progressText) {
    progressText.textContent = '';
  }
  pool.textContent = 'Aktive Fragen: 0 | Gemeistert: 0';
  correctCountEl.textContent = 'Richtig beantwortet: 0';
  incorrectCountEl.textContent = 'Falsch beantwortet: 0';

  questionCountInput.disabled = false;
  requiredStreakInput.disabled = false;
  startButton.disabled = false;
  cancelButton.disabled = true;

  statusSection.hidden = true;
  gameSection.hidden = true;
}

function validateQuestions(data) {
  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array.');
  }

  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid question at index ${index}: expected object.`);
    }

    if (!Object.hasOwn(item, 'id')) {
      throw new Error("Invalid question: missing required field 'id'.");
    }
    if (!Object.hasOwn(item, 'question')) {
      throw new Error("Invalid question: missing required field 'question'.");
    }
    if (!Object.hasOwn(item, 'answers')) {
      throw new Error("Invalid question: missing required field 'answers'.");
    }
    if (!Object.hasOwn(item, 'correctIndex')) {
      throw new Error("Invalid question: missing required field 'correctIndex'.");
    }

    const { id, question, answers, correctIndex } = item;

    if (typeof id !== 'number' || Number.isNaN(id)) {
      throw new Error('Invalid question: id must be a number.');
    }
    if (typeof question !== 'string') {
      throw new Error('Invalid question: question must be a string.');
    }
    if (!Array.isArray(answers)) {
      throw new Error('Invalid question: answers must be an array.');
    }
    if (answers.length < 2) {
      throw new Error('Invalid question: answers array must contain at least 2 entries.');
    }
    if (!answers.every(a => typeof a === 'string')) {
      throw new Error('Invalid question: answers must contain only strings.');
    }
    if (!Number.isInteger(correctIndex)) {
      throw new Error('Invalid question: correctIndex must be an integer.');
    }
    if (correctIndex < 0 || correctIndex >= answers.length) {
      throw new Error('Invalid question: correctIndex is out of bounds.');
    }
  });
}

function loadQuestionsFromFile(file) {
  if (file.size > MAX_FILE_SIZE) {
    errorBox.textContent = 'Die Datei ist zu groß (max. 5 MB).';
    return;
  }
  if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
    errorBox.textContent = 'Bitte nur JSON-Dateien hochladen.';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      validateQuestions(parsed);
      allQuestions = parsed.map((q) => ({
        id: q.id,
        question: q.question,
        answers: [...q.answers],
        correctIndex: q.correctIndex
      }));
      resetGameState();
      errorBox.textContent = '';

      const total = allQuestions.length;
      totalQuestionsValue.textContent = String(total);
      questionCountInput.min = '1';
      questionCountInput.max = String(total);
      const defaultCount = Math.min(20, total);
      questionCountInput.value = String(defaultCount);
      questionCountValue.textContent = String(defaultCount);

      requiredStreakInput.min = '1';
      requiredStreakInput.max = '5';
      requiredStreakInput.value = '2';
      requiredStreakValue.textContent = '2';

      configSection.hidden = false;
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      const safeMessage = err && err.message ? err.message : 'Fehler beim Laden der Datei. Bitte überprüfe das Format.';
      errorBox.textContent = safeMessage;
      configSection.hidden = true;
      allQuestions = [];
      resetGameState();
    }
  };
  reader.onerror = () => {
    errorBox.textContent = 'Datei konnte nicht gelesen werden.';
  };
  reader.readAsText(file);
}

function prepareQuestionsForRun() {
  const total = allQuestions.length;
  if (total === 0) return;

  let requestedCount = Number(questionCountInput.value);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) {
    requestedCount = 1;
  }
  if (requestedCount > total) {
    requestedCount = total;
  }

  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, requestedCount);

  questions = selected.map((q) => ({
    id: q.id,
    question: q.question,
    answers: [...q.answers],
    correctIndex: q.correctIndex,
    correctStreak: 0
  }));

  cycleSize = questions.length;
  answeredThisCycle = 0;
}

function applyConfigValues() {
  let streak = Number(requiredStreakInput.value);
  if (!Number.isInteger(streak) || streak < 1) streak = 1;
  if (streak > 5) streak = 5;
  requiredStreak = streak;
  requiredStreakValue.textContent = String(requiredStreak);
}

function startRun() {
  if (!allQuestions.length) {
    errorBox.textContent = 'Bitte zuerst eine gültige Fragen-Datei hochladen.';
    return;
  }

  applyConfigValues();
  prepareQuestionsForRun();

  if (questions.length === 0) {
    errorBox.textContent = 'Keine Fragen verfügbar.';
    return;
  }

  correctCount = 0;
  incorrectCount = 0;
  answeredThisCycle = 0;
  runActive = true;
  answered = false;

  statusSection.hidden = false;
  gameSection.hidden = false;

  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';

  questionCountInput.disabled = true;
  requiredStreakInput.disabled = true;
  startButton.disabled = true;
  cancelButton.disabled = false;

  loadNextQuestion();
  updateStatus();
}

function getActiveQuestions() {
  return questions.filter(q => q.correctStreak < requiredStreak);
}

function pickQuestion() {
  const active = getActiveQuestions();
  if (active.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * active.length);
  return active[index];
}

function renderQuestion(question) {
  questionText.textContent = question.question;
  answersContainer.innerHTML = '';
  question.answers.forEach((answer, idx) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn answer-button';
    btn.textContent = answer;
    btn.dataset.index = idx;
    answersContainer.appendChild(btn);
  });
  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';
  nextButton.disabled = true;
  answered = false;
}

function handleAnswerClick(event) {
  const target = event.target.closest('.answer-btn');
  if (!target || answered || !currentQuestion || !runActive) return;
  answered = true;
  const selectedIndex = Number(target.dataset.index);
  const isCorrect = selectedIndex === currentQuestion.correctIndex;
  const answerButtons = Array.from(answersContainer.querySelectorAll('button'));

  answerButtons.forEach((btn, idx) => {
    btn.classList.add('disabled');
    if (idx === currentQuestion.correctIndex) {
      btn.classList.add('correct');
    }
    if (idx === selectedIndex && !isCorrect) {
      btn.classList.add('incorrect');
    }
  });

  if (isCorrect) {
    currentQuestion.correctStreak += 1;
    correctCount += 1;
    feedbackBox.textContent = 'Richtig!';
    feedbackBox.className = 'feedback correct';
  } else {
    currentQuestion.correctStreak = 0;
    incorrectCount += 1;
    const correctAnswer = currentQuestion.answers[currentQuestion.correctIndex];
    feedbackBox.textContent = `Falsch. Die richtige Antwort ist: ${correctAnswer}`;
    feedbackBox.className = 'feedback incorrect';
  }

  answeredThisCycle += 1;
  updateStatus();

  const stillActive = getActiveQuestions().length > 0;
  if (stillActive) {
    nextButton.disabled = false;
    nextButton.focus();
  } else {
    nextButton.disabled = true;
    endRun();
  }
}

function loadNextQuestion() {
  if (!runActive) return;

  currentQuestion = pickQuestion();
  if (!currentQuestion) {
    endRun();
    return;
  }
  renderQuestion(currentQuestion);
}

function endRun() {
  runActive = false;
  currentQuestion = null;

  const answerButtons = Array.from(answersContainer.querySelectorAll('button'));
  answerButtons.forEach(btn => btn.classList.add('disabled'));
  nextButton.disabled = true;

  const total = questions.length;
  feedbackBox.textContent = `Glückwunsch, du hast diesen Durchlauf geschafft! (${correctCount} richtig, ${incorrectCount} falsch bei ${total} Fragen.) Du kannst oben neue Einstellungen wählen und einen weiteren Durchlauf starten.`;
  feedbackBox.className = 'feedback correct';

  questionCountInput.disabled = false;
  requiredStreakInput.disabled = false;
  startButton.disabled = false;
  cancelButton.disabled = true;
}

function updateStatus() {
  const activeCount = getActiveQuestions().length;
  const total = questions.length;
  const masteredCount = total - activeCount;

  cycleSize = total;

  progress.textContent = `Fragen im aktuellen Durchlauf: ${answeredThisCycle} von ${total} beantwortet`;

  const totalNeededCorrect = total * requiredStreak;
  let currentCorrectProgress = 0;

  questions.forEach((q) => {
    currentCorrectProgress += Math.min(q.correctStreak, requiredStreak);
  });

  if (progressBar) {
    const fraction = totalNeededCorrect
      ? (currentCorrectProgress / totalNeededCorrect) * 100
      : 0;

    progressBar.style.width = `${Math.min(100, Math.max(0, fraction))}%`;
  }
  if (progressText) {
    progressText.textContent = total
      ? `${masteredCount} von ${total} Fragen gemeistert`
      : '';
  }
  pool.textContent = `Aktive Fragen: ${activeCount} | Gemeistert: ${masteredCount}`;
  correctCountEl.textContent = `Richtig beantwortet: ${correctCount}`;
  incorrectCountEl.textContent = `Falsch beantwortet: ${incorrectCount}`;
}

function cancelRun() {
  if (!runActive) return;

  runActive = false;
  currentQuestion = null;
  answered = false;
  questions = [];

  answersContainer.innerHTML = '';
  nextButton.disabled = true;

  feedbackBox.textContent = 'Quiz abgebrochen. Du kannst oben neue Einstellungen wählen und einen neuen Durchlauf starten.';
  feedbackBox.className = 'feedback';

  answeredThisCycle = 0;
  cycleSize = 0;

  progress.textContent = 'Fragen im aktuellen Durchlauf: 0 von 0 beantwortet';
  if (progressBar) {
    progressBar.style.width = '0%';
  }
  if (progressText) {
    progressText.textContent = '';
  }

  pool.textContent = 'Aktive Fragen: 0 | Gemeistert: 0';
  correctCountEl.textContent = 'Richtig beantwortet: 0';
  incorrectCountEl.textContent = 'Falsch beantwortet: 0';

  questionCountInput.disabled = false;
  requiredStreakInput.disabled = false;
  startButton.disabled = false;
  cancelButton.disabled = true;
}

fileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) {
    if (fileName) {
      fileName.textContent = 'Keine Datei ausgewählt';
    }
    return;
  }
  if (fileName) {
    fileName.textContent = file.name;
  }
  loadQuestionsFromFile(file);
});

answersContainer.addEventListener('click', handleAnswerClick);

nextButton.addEventListener('click', () => {
  loadNextQuestion();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !nextButton.disabled && runActive) {
    loadNextQuestion();
  }
});

questionCountInput.addEventListener('input', () => {
  questionCountValue.textContent = String(questionCountInput.value);
});

requiredStreakInput.addEventListener('input', () => {
  requiredStreakValue.textContent = String(requiredStreakInput.value);
});

startButton.addEventListener('click', () => {
  startRun();
});

cancelButton.addEventListener('click', () => {
  cancelRun();
});

// Preload example when hosted locally if desired (no auto-load by default)
console.info('Spiel bereit. Bitte eine JSON-Datei mit Fragen hochladen.');