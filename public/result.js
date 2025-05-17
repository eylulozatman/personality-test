document.addEventListener('DOMContentLoaded', () => {
  const resultContainer = document.getElementById('result-container');
  const loadingMsg = document.getElementById('loading-msg');

  // Önce cevap dosyasında veri var mı diye kontrol etmek için API'ye istek
  fetch('/api/result')
    .then(res => res.json())
    .then(data => {
      loadingMsg.style.display = 'none';

      if (!data.type) {
        resultContainer.innerHTML = `
          <p>Henüz cevap bulunamadı. Lütfen testi tamamlayın.</p>
          <button id="go-test">Teste Git</button>
        `;

        document.getElementById('go-test').addEventListener('click', () => {
          window.location.href = '/'; // Anasayfa veya test sayfası
        });
        return;
      }

      // Sonuç varsa göster
      resultContainer.innerHTML = `
        <h2>Enneagram Tipiniz: <span class="type">${data.type}</span></h2>
        <h3>Kanat Tipi: <span class="wing">${data.wing || 'Yok'}</span></h3>
        <p class="description">${data.description}</p>
        <button id="reset-test">Testi Sıfırla</button>
      `;

      document.getElementById('reset-test').addEventListener('click', () => {
        fetch('/api/reset', { method: 'POST' })
          .then(res => res.json())
          .then(resp => {
            if (resp.success) {
              alert('Test sıfırlandı!');
              window.location.href = '/';
            } else {
              alert('Sıfırlama başarısız oldu.');
            }
          })
          .catch(() => alert('Sıfırlama başarısız oldu.'));
      });
    })
    .catch(() => {
      loadingMsg.style.display = 'none';
      resultContainer.innerHTML = '<p>Sonuçlar alınamadı, lütfen tekrar deneyin.</p>';
    });
});
