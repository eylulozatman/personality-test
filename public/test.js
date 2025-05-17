let currentPage = 0;
const questionsPerPage = 9;
let questions = [];
const answers = {}; // { question_id: weight }

async function fetchQuestions() {
  const res = await fetch('/api/questions');
  questions = await res.json();
  showPage();
}

function showPage() {
  const container = document.getElementById('options-container');
  container.innerHTML = '';

  const start = currentPage * questionsPerPage;
  const end = Math.min(start + questionsPerPage, questions.length);

  document.getElementById('question-text').textContent = `Sayfa ${currentPage + 1} `;

  for (let i = start; i < end; i++) {
    const q = questions[i];

    const questionDiv = document.createElement('div');
    questionDiv.classList.add('question-item');
    questionDiv.style.marginBottom = '20px';

    const questionTitle = document.createElement('p');
    questionTitle.textContent = `${i + 1}. ${q.question}`;
    questionDiv.appendChild(questionTitle);

    const options = [
      { value: 2, label: 'Kesinlikle Katılıyorum' },
      { value: 1, label: 'Katılıyorum' },
      { value: 0, label: 'Kararsızım' },
      { value: -1, label: 'Katılmıyorum' },
      { value: -2, label: 'Hiç Katılmıyorum' }
    ];

    options.forEach(opt => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `answer_${q.question_id}`;
      input.value = opt.value;

      // Daha önce cevabı seçiliyse
      if (answers[q.question_id] !== undefined && parseInt(answers[q.question_id]) === opt.value) {
        input.checked = true;
      }

      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + opt.label));
      questionDiv.appendChild(label);
    });

    container.appendChild(questionDiv);
  }

  document.getElementById('prev-page').style.display = currentPage === 0 ? 'none' : 'inline-block';
  document.getElementById('next-page').style.display = (end === questions.length) ? 'none' : 'inline-block';
  document.getElementById('show-result').style.display = (end === questions.length) ? 'inline-block' : 'none';
}

async function saveAnswersOnPage() {
  const start = currentPage * questionsPerPage;
  const end = Math.min(start + questionsPerPage, questions.length);

  for (let i = start; i < end; i++) {
    const q = questions[i];
    const selected = document.querySelector(`input[name="answer_${q.question_id}"]:checked`);
    if (!selected) {
      alert(`Lütfen ${i + 1}. soru için bir seçenek seçiniz!`);
      return false;
    }

    // Kaydet
    answers[q.question_id] = selected.value;

    await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q_id: q.question_id,
        weight: parseInt(selected.value)
      })
    });
  }
  return true;
}

document.getElementById('next-page').onclick = async () => {
  const saved = await saveAnswersOnPage();
  if (!saved) return;
  currentPage++;
  showPage();
};

document.getElementById('prev-page').onclick = () => {
  currentPage--;
  showPage();
};

document.getElementById('show-result').onclick = () => {
  window.location.href = 'result.html';
};

fetchQuestions();
