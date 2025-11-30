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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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
      questions = parsed.map((q) => ({
        id: q.id,
        question: q.question,
        answers: [...q.answers],
        correctIndex: q.correctIndex,
        correctStreak: 0
      }));
      resetGameState();
      statusSection.hidden = false;
      gameSection.hidden = false;
      errorBox.textContent = '';
      startCycle();
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      const safeMessage = err && err.message ? err.message : 'Fehler beim Laden der Datei. Bitte überprüfe das Format.';
      errorBox.textContent = safeMessage;
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
    answersContainer.appendChild(btn);
  });
  feedbackBox.textContent = '';
  feedbackBox.className = 'feedback';
  nextButton.disabled = true;
  answered = false;
}

function handleAnswerClick(event) {
  const target = event.target.closest('.answer-btn');
  if (!target || answered || !currentQuestion) return;
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
  nextButton.disabled = false;
  nextButton.focus();
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

answersContainer.addEventListener('click', handleAnswerClick);

nextButton.addEventListener('click', () => {
  loadNextQuestion();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !nextButton.disabled) {
    loadNextQuestion();
  }
});

// Preload example when hosted locally if desired (no auto-load by default)
console.info('Spiel bereit. Bitte eine JSON-Datei mit Fragen hochladen.');