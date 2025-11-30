const fileInput = document.getElementById('fileInput');
const errorBox = document.getElementById('error');
const gameSection = document.getElementById('game');
const statusSection = document.getElementById('status');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answers');
const feedbackBox = document.getElementById('feedback');
const nextButton = document.getElementById('nextButton');
const progress = document.getElementById('progress');
const pool = document.getElementById('pool');
const correctCountEl = document.getElementById('correctCount');
const incorrectCountEl = document.getElementById('incorrectCount');

let questions = [];
let currentQuestion = null;
let answered = false;
let correctCount = 0;
let incorrectCount = 0;
let answeredThisCycle = 0;
let cycleSize = 0;

function resetGameState() {
  currentQuestion = null;
  answered = false;
  correctCount = 0;
  incorrectCount = 0;
  answeredThisCycle = 0;
  cycleSize = 0;
  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';
  nextButton.disabled = true;
  answersContainer.innerHTML = '';
  updateStatus();
}

function validateQuestions(data) {
  if (!Array.isArray(data)) {
    throw new Error('Die Datei muss ein Array von Fragen enthalten.');
  }
  if (data.length === 0) {
    throw new Error('Die Fragenliste ist leer.');
  }

  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Eintrag ${index + 1} ist kein Objekt.`);
    }
    const { id, question, answers, correctIndex } = item;
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      throw new Error(`Frage ${index + 1}: "id" muss eine Ganzzahl sein.`);
    }
    if (typeof question !== 'string' || question.trim() === '') {
      throw new Error(`Frage ${id}: "question" muss ein Text sein.`);
    }
    if (!Array.isArray(answers) || answers.length !== 4 || !answers.every(a => typeof a === 'string')) {
      throw new Error(`Frage ${id}: "answers" muss ein Array mit genau 4 Texten sein.`);
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      throw new Error(`Frage ${id}: "correctIndex" muss eine Zahl zwischen 0 und 3 sein.`);
    }
  });
}

function loadQuestionsFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      validateQuestions(parsed);
      questions = parsed.map((q) => ({ ...q, correctStreak: 0 }));
      resetGameState();
      statusSection.hidden = false;
      gameSection.hidden = false;
      errorBox.textContent = '';
      startCycle();
    } catch (err) {
      errorBox.textContent = err.message || 'Fehler beim Laden der Datei.';
      statusSection.hidden = true;
      gameSection.hidden = true;
      questions = [];
      resetGameState();
    }
  };
  reader.onerror = () => {
    errorBox.textContent = 'Datei konnte nicht gelesen werden.';
  };
  reader.readAsText(file);
}

function startCycle() {
  cycleSize = questions.filter(q => q.correctStreak < 2).length;
  answeredThisCycle = 0;
  if (cycleSize === 0) {
    questions.forEach(q => { q.correctStreak = 0; });
    cycleSize = questions.length;
    feedbackBox.textContent = 'Alle Fragen in diesem Durchlauf geschafft! Der Zähler wurde zurückgesetzt und ein neuer Durchlauf beginnt.';
    feedbackBox.className = 'feedback correct';
  } else {
    feedbackBox.textContent = '';
    feedbackBox.className = 'feedback';
  }
  loadNextQuestion();
  updateStatus();
}

function getActiveQuestions() {
  return questions.filter(q => q.correctStreak < 2);
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
    btn.className = 'answer-btn';
    btn.textContent = answer;
    btn.dataset.index = idx;
    btn.addEventListener('click', handleAnswerClick);
    answersContainer.appendChild(btn);
  });
  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';
  nextButton.disabled = true;
  answered = false;
}

function handleAnswerClick(event) {
  if (answered || !currentQuestion) return;
  answered = true;
  const selectedIndex = Number(event.currentTarget.dataset.index);
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
  nextButton.disabled = false;
  updateStatus();
}

function loadNextQuestion() {
  currentQuestion = pickQuestion();
  if (!currentQuestion) {
    startCycle();
    return;
  }
  renderQuestion(currentQuestion);
}

function updateStatus() {
  const activeCount = getActiveQuestions().length;
  const masteredCount = questions.length - activeCount;
  progress.textContent = `Fragen im aktuellen Durchlauf: ${answeredThisCycle} von ${cycleSize} beantwortet`;
  pool.textContent = `Aktive Fragen: ${activeCount} | Gemeistert: ${masteredCount}`;
  correctCountEl.textContent = `Richtig beantwortet: ${correctCount}`;
  incorrectCountEl.textContent = `Falsch beantwortet: ${incorrectCount}`;
}

fileInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  loadQuestionsFromFile(file);
});

nextButton.addEventListener('click', () => {
  loadNextQuestion();
});

// Preload example when hosted locally if desired (no auto-load by default)
console.info('Spiel bereit. Bitte eine JSON-Datei mit Fragen hochladen.');