const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const QUESTIONS_CSV = path.join(__dirname, 'data', 'questions.csv');
const ANSWERS_CSV = path.join(__dirname, 'data', 'answers.csv');
const DESCRIPTION_CSV = path.join(__dirname, 'data', 'description.csv');

// Soruları getir
app.get('/api/questions', (req, res) => {
  const results = [];
  fs.createReadStream(QUESTIONS_CSV)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => res.json(results));
});

// Cevap gönder (append)
app.post('/api/answer', (req, res) => {
  const { q_id, weight } = req.body;

  if (typeof q_id === 'undefined' || typeof weight === 'undefined') {
    return res.status(400).json({ success: false, error: 'Eksik parametre' });
  }

  const parsedWeight = parseInt(weight);
  if (isNaN(parsedWeight)) {
    return res.status(400).json({ success: false, error: 'Weight sayı olmalı' });
  }

  const a_id = Date.now(); // basit ID
  const newRow = `${a_id},${q_id},${parsedWeight}\n`;

  fs.appendFile(ANSWERS_CSV, newRow, (err) => {
    if (err) {
      console.error('Cevap yazılamadı:', err);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

// Testi sıfırla
app.post('/api/reset', (req, res) => {
  fs.writeFile(ANSWERS_CSV, 'a_id,q_id,weight\n', (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

app.get('/api/result', async (req, res) => {
  try {
    // 1) Soruları oku: question_id => type
    const questions = {};
    await new Promise((resolve) => {
      fs.createReadStream(QUESTIONS_CSV)
        .pipe(csv())
        .on('data', (row) => {
          questions[row.question_id] = row.type;
        })
        .on('end', resolve);
    });

    // 2) Cevapları oku ve her tipe göre ağırlıkları topla
    const typeScores = {};
    await new Promise((resolve) => {
      fs.createReadStream(ANSWERS_CSV)
        .pipe(csv())
        .on('data', (row) => {
          const qType = questions[row.q_id];
          const weight = parseInt(row.weight);
          if (!qType || isNaN(weight)) return;

          if (!typeScores[qType]) typeScores[qType] = 0;
          typeScores[qType] += weight;
        })
        .on('end', resolve);
    });

    if (Object.keys(typeScores).length === 0) {
      return res.status(400).json({ error: 'Henüz cevap yok veya geçersiz veriler var' });
    }

    // 3) En yüksek skorlu mainType'ı bul
    const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
    const mainType = sortedTypes[0][0];

    // 4) Bu mainType'a ait iki wing'i ve açıklamalarını bul
    const wingDescriptions = {};
    await new Promise((resolve) => {
      fs.createReadStream(DESCRIPTION_CSV)
        .pipe(csv())
        .on('data', (row) => {
          if (row.type === mainType) {
            wingDescriptions[row.wing] = row.description;
          }
        })
        .on('end', resolve);
    });

    // 5) Sabit wing çiftlerini tanımla (örneğin Tip 1 için 2 ve 9)
    const wingPairs = {
      '1': ['2', '9'],
      '2': ['1', '3'],
      '3': ['2', '4'],
      '4': ['3', '5'],
      '5': ['4', '6'],
      '6': ['5', '7'],
      '7': ['6', '8'],
      '8': ['7', '9'],
      '9': ['8', '1']
    };

    const [wing1, wing2] = wingPairs[mainType];
    const wing1Score = typeScores[wing1] || 0;
    const wing2Score = typeScores[wing2] || 0;

    // 6) Hangi wing daha yüksek skora sahip?
    const winningWing = wing1Score > wing2Score ? wing1 : wing2;
    const description = wingDescriptions[winningWing] || "Açıklama bulunamadı";

    return res.json({
      type: mainType,
      wing: winningWing,
      description: description,
      scores: typeScores // Debug için skorları da gönderiyoruz
    });
  } catch (err) {
    console.error('Hata:', err);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});


// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});