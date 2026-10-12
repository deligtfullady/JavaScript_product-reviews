/**
 * Product Reviews
 * Урок 3. Промисы. Хранилище (Продвинутый JavaScript)
 *
 * Данные хранятся в LocalStorage.
 * Операции чтения/записи обёрнуты в промисы,
 * чтобы продемонстрировать работу с асинхронным кодом.
 */

const STORAGE_KEY = 'product_reviews';

// ========== PROMISE-ОБЁРТКИ ДЛЯ LOCALSTORAGE ==========

/**
 * Асинхронно читает все отзывы из LocalStorage
 * @returns {Promise<Object>} объект { [productName]: [reviews] }
 */
function loadReviews() {
  return new Promise((resolve, reject) => {
    try {
      // Небольшая задержка имитирует асинхронность
      setTimeout(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        const data = raw ? JSON.parse(raw) : {};
        resolve(data);
      }, 50);
    } catch (err) {
      reject(new Error('Не удалось прочитать данные из LocalStorage'));
    }
  });
}

/**
 * Асинхронно сохраняет все отзывы в LocalStorage
 * @param {Object} data
 * @returns {Promise<void>}
 */
function saveReviews(data) {
  return new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve();
      }, 50);
    } catch (err) {
      reject(new Error('Не удалось сохранить данные в LocalStorage'));
    }
  });
}

/**
 * Добавляет новый отзыв
 * @param {string} productName
 * @param {string} text
 * @returns {Promise<void>}
 */
async function addReview(productName, text) {
  const data = await loadReviews();
  const key = productName.trim();

  if (!data[key]) {
    data[key] = [];
  }

  data[key].push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text: text.trim(),
    date: new Date().toISOString(),
  });

  await saveReviews(data);
}

/**
 * Удаляет отзыв по id
 * @param {string} productName
 * @param {string} reviewId
 * @returns {Promise<void>}
 */
async function deleteReview(productName, reviewId) {
  const data = await loadReviews();

  if (!data[productName]) return;

  data[productName] = data[productName].filter((r) => r.id !== reviewId);

  // Если отзывов больше нет — удаляем продукт
  if (data[productName].length === 0) {
    delete data[productName];
  }

  await saveReviews(data);
}

// ========== DOM ==========

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const form = document.getElementById('review-form');
const productInput = document.getElementById('product-name');
const reviewInput = document.getElementById('review-text');
const productError = document.getElementById('product-error');
const reviewError = document.getElementById('review-error');
const submitBtn = document.getElementById('submit-btn');
const successMessage = document.getElementById('success-message');
const productsList = document.getElementById('products-list');
const emptyState = document.getElementById('empty-state');

// ========== ВКЛАДКИ ==========

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;

    tabs.forEach((t) => t.classList.remove('active'));
    panels.forEach((p) => p.classList.remove('active'));

    tab.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');

    // При переключении на «Просмотр» — обновляем список
    if (target === 'view') {
      renderProducts();
    }
  });
});

// ========== ДОБАВЛЕНИЕ ОТЗЫВА ==========

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Сброс ошибок
  productError.textContent = '';
  reviewError.textContent = '';
  successMessage.classList.add('hidden');

  const productName = productInput.value.trim();
  const reviewText = reviewInput.value.trim();
  let hasError = false;

  if (!productName) {
    productError.textContent = 'Введите название продукта';
    hasError = true;
  }

  if (!reviewText) {
    reviewError.textContent = 'Введите текст отзыва';
    hasError = true;
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Сохранение...';

  try {
    await addReview(productName, reviewText);

    // Очистка формы
    productInput.value = '';
    reviewInput.value = '';

    successMessage.classList.remove('hidden');
    setTimeout(() => successMessage.classList.add('hidden'), 2500);
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Добавить отзыв';
  }
});

// ========== ОТОБРАЖЕНИЕ ПРОДУКТОВ И ОТЗЫВОВ ==========

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function renderProducts() {
  try {
    const data = await loadReviews();
    const products = Object.keys(data).sort((a, b) => a.localeCompare(b, 'ru'));

    productsList.innerHTML = '';

    if (products.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    products.forEach((productName) => {
      const reviews = data[productName];
      const card = document.createElement('div');
      card.className = 'product-card';

      card.innerHTML = `
        <div class="product-header">
          <span class="product-title">${escapeHtml(productName)}</span>
          <div class="product-meta">
            <span class="badge">${reviews.length} ${pluralize(reviews.length, 'отзыв', 'отзыва', 'отзывов')}</span>
            <span class="chevron">▼</span>
          </div>
        </div>
        <div class="reviews-container"></div>
      `;

      const header = card.querySelector('.product-header');
      const container = card.querySelector('.reviews-container');

      // Рендерим отзывы
      reviews.forEach((review) => {
        const item = document.createElement('div');
        item.className = 'review-item';
        item.innerHTML = `
          <div class="review-body">
            <p class="review-text">${escapeHtml(review.text)}</p>
            <p class="review-date">${formatDate(review.date)}</p>
          </div>
          <button class="btn btn-danger" data-id="${review.id}" title="Удалить отзыв">
            Удалить
          </button>
        `;

        item.querySelector('.btn-danger').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Удалить этот отзыв?')) return;

          try {
            await deleteReview(productName, review.id);
            await renderProducts();
          } catch (err) {
            alert(err.message);
          }
        });

        container.appendChild(item);
      });

      // Раскрытие / сворачивание
      header.addEventListener('click', () => {
        card.classList.toggle('open');
      });

      productsList.appendChild(card);
    });
  } catch (err) {
    alert(err.message);
  }
}

// ========== УТИЛИТЫ ==========

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// ========== СТАРТ ==========
// При первой загрузке ничего дополнительно не делаем —
// список отрисуется при переключении на вкладку «Просмотр»
