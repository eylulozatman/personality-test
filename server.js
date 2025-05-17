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

// Soruları oku
app.get('/api/questions', (req, res) => {
  const results = [];
  fs.createReadStream(QUESTIONS_CSV)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    });
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

// Testi resetle
app.post('/api/reset', (req, res) => {
  fs.writeFile(ANSWERS_CSV, 'a_id,q_id,weight\n', (err) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

// Sonuçları hesapla
app.get('/api/result', async (req, res) => {
  const typeScores = {};

  // Soruları oku
  const questions = {};
  await new Promise((resolve) => {
    fs.createReadStream(QUESTIONS_CSV)
      .pipe(csv())
      .on('data', (row) => {
        questions[row.question_id] = row.type;
      })
      .on('end', resolve);
  });

  // Cevapları oku
  await new Promise((resolve) => {
    fs.createReadStream(ANSWERS_CSV)
      .pipe(csv())
      .on('data', (row) => {
        const qType = questions[row.q_id];
        const weight = parseInt(row.weight);
        if (!qType || isNaN(weight)) return; // kontrol

        if (!typeScores[qType]) typeScores[qType] = 0;
        typeScores[qType] += weight;
      })
      .on('end', resolve);
  });

  // En yüksek ve ikinci en yüksek tip
  const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const mainType = sortedTypes[0]?.[0] || null;
  const wingType = sortedTypes[1]?.[0] || null;

  // Açıklamaları oku
  const descriptions = [];
  fs.createReadStream(DESCRIPTION_CSV)
    .pipe(csv())
    .on('data', (row) => descriptions.push(row))
    .on('end', () => {
      const match = descriptions.find((d) => d.type === mainType && d.wing === wingType);
      res.json({
        type: mainType,
        wing: wingType,
        description: match?.description || 'Sonuç açıklaması bulunamadı.'
      });
    });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});