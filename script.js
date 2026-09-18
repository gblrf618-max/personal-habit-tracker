// === ДАННЫЕ ===
// Привычки по умолчанию — используются только при первой загрузке.
const DEFAULT_HABITS = ["Зарядка", "Вода 1.5л", "Экран < 2ч"];
const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Превращает дату в строку "2026-09-17"
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Возвращает массив из 7 дат текущей недели (Пн–Вс)
function getWeekDates() {
  const today = new Date();

  // Определяем понедельник этой недели
  const dayOfWeek = today.getDay();                 // 0=Вс, 1=Пн, ..., 6=Сб
  const mondayOffset = (dayOfWeek + 6) % 7;         // сколько дней от Пн до сегодня
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);   // отматываем назад

  // Собираем 7 дат от понедельника
  const result = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    result.push(formatDate(day));
  }
  return result;
}

// === ЗАГРУЖАЕМ СОХРАНЁННОЕ (с миграцией) ===
function loadData() {
  // 1. Пробуем прочитать НОВЫЙ формат
  const raw = localStorage.getItem("habits-tracker");
  if (raw) {
  const parsed = JSON.parse(raw);

  localStorage.setItem("habits-tracker", JSON.stringify(parsed));

  // Если есть старые ключи (с днями недели), мигрируем их на даты
  parsed.progress = migrateProgressKeys(parsed.progress);

  return parsed;
}

  // 2. Нет нового — пробуем СТАРЫЙ
  const oldRaw = localStorage.getItem("habits-progress");
  const oldProgress = oldRaw ? JSON.parse(oldRaw) : {};

  // 3. Собираем новый объект: привычки по умолчанию + старые галочки
  const migrated = {
    habits: DEFAULT_HABITS,
    progress: oldProgress
  };

  // 4. Сохраняем под новым ключом, убираем старый
  localStorage.setItem("habits-tracker", JSON.stringify(migrated));
  localStorage.removeItem("habits-progress");

  return migrated;
}

// Превращает ключи "Зарядка-Пн" в "Зарядка-2026-09-14"
function migrateProgressKeys(progress) {
  const weekDates = getWeekDates();
  const newProgress = {};

  for (const key in progress) {
    // Ищем старый формат: "Привычка-ДеньНедели"
    const parts = key.split("-");

    // Если ключ уже в новом формате (с датой) — оставляем как есть
    if (parts.length > 2) {
      newProgress[key] = progress[key];
      continue;
    }

    const habitName = parts[0];
    const dayName = parts[1];

    // Находим индекс дня в массиве days
    const dayIdx = days.indexOf(dayName);

    if (dayIdx === -1) {
      // Не нашли день — оставляем ключ как есть (на всякий случай)
      newProgress[key] = progress[key];
      continue;
    }

    // Собираем новый ключ с датой
    const newKey = habitName + "-" + weekDates[dayIdx];
    newProgress[newKey] = progress[key];
  }

  return newProgress;
}

// Загружаем данные
const data = loadData();

// Теперь `habits` и `progress` — это ссылки на поля объекта `data`.
const habits = data.habits;
const progress = data.progress;
// === ОПРЕДЕЛЯЕМ СЕГОДНЯШНИЙ ДЕНЬ ===
// new Date() — текущая дата. getDay() возвращает 0=Вс, 1=Пн, ..., 6=Сб.
// Нам надо перевести в наш формат: 0=Пн, 1=Вт, ..., 6=Вс.
const todayIndex = (new Date().getDay() + 6) % 7;
const today = days[todayIndex]; // например, "Пн"
// Красивая дата: "Понедельник, 15 сентября"
const rawDate = new Date().toLocaleDateString("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long"
});
const todayText = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);


// === НАХОДИМ МЕСТО ===
const tracker = document.getElementById("tracker");
// Находим элемент с датой и вставляем красивую дату
const dateElement = document.getElementById("date");
dateElement.textContent = todayText;
// === ЗВУК ===
// AudioContext — «звуковой движок» браузера.Создаём один раз и переиспользуем.
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Универсальная функция: играет короткий «щелчок» заданной частоты
function playTone(frequency, duration) {
  const osc = audioCtx.createOscillator();   // генератор волны
  const gain = audioCtx.createGain();         // регулятор громкости

  osc.frequency.value = frequency;            // частота звука (Гц)
  osc.type = "sine";                          // тип волны: синус — мягкий

  gain.gain.value = 0.08;                     // громкость: 0.08 — очень тихо

  osc.connect(gain);                          // осциллятор → громкость
  gain.connect(audioCtx.destination);         // громкость → динамики

  osc.start();                                // запустить звук

  // Плавно убираем громкость до 0 за время duration
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.stop(audioCtx.currentTime + duration);  // остановить через duration
}

// «Тик» для клика по клетке: высокий, короткий
function playTick() {
  playTone(880, 0.06);   // 880 Гц, 60 мс
}

// «Ток» для кнопки сброса: ниже, чуть длиннее
function playThock() {
  playTone(440, 0.12);   // 440 Гц, 120 мс
}
// === СЧЁТЧИК ПРОГРЕССА ===
const progressElement = document.getElementById("progress");

function updateProgress() {
  // Считаем только ключи с датами текущей недели
const weekDates = getWeekDates();
const done = Object.keys(progress).filter(function (key) {
  // Ключ формата "Зарядка-2026-09-14" — берём дату после последнего дефиса
  const parts = key.split("-");
  if (parts.length < 4) return false;      // старый формат — пропускаем
  const date = parts.slice(1).join("-");   // "2026-09-14"
  return weekDates.includes(date);
}).length;
  const total = habits.length * days.length;
  progressElement.textContent = "Выполнено: " + done + " из " + total;
  
  // Прогресс-бар: считаем процент
  const percent = total === 0 ? 0 : (done / total) * 100;
  document.getElementById("progressFill").style.width = percent + "%";
}

// Считает серию дней подряд для привычки
function getStreak(habitName) {
  let streak = 0;
  const today = new Date();

  // Идём назад по дням, максимум 365 дней
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const key = habitName + "-" + formatDate(date);

    if (progress[key]) {
      streak++;
    } else {
      break;   // пропуск — серия прервана
    }
  }

  return streak;
}

function createStreakElement(streak) {
  const streakEl = document.createElement("span");
  streakEl.classList.add("cell__streak");

  streakEl.innerHTML = '<svg class="cell__flame" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 8 6 8 11C8 14 9 16 9 16C9 16 7 15 6 13C6 13 5 16 5 18C5 21 8 23 12 23C16 23 19 21 19 18C19 13 14 10 14 6C14 6 13 8 12 9C12 9 12 5 12 2Z" fill="currentColor"/></svg><span class="cell__streak-num">' + streak + '</span>';

  let level = 1;
  if (streak >= 14) level = 4;
  else if (streak >= 7) level = 3;
  else if (streak >= 3) level = 2;
  streakEl.classList.add("cell__streak--level-" + level);

  return streakEl;
}

// Обновляет огонёк у конкретной привычки
function updateStreakFor(habitName) {
  const labelCell = document.querySelector('[data-habit="' + habitName + '"]');
  if (!labelCell) return;

  const oldStreak = labelCell.querySelector(".cell__streak");
  const streak = getStreak(habitName);

  if (streak === 0) {
    if (oldStreak) {
      oldStreak.classList.add("cell__streak--fade-out");
      setTimeout(function () {
        oldStreak.remove();
      }, 300);
    }
    return;
  }

  const newStreak = createStreakElement(streak);

  if (oldStreak) {
    oldStreak.classList.add("cell__streak--fade-out");
    setTimeout(function () {
      oldStreak.remove();
      labelCell.insertBefore(newStreak, labelCell.firstChild);
      // Форсируем reflow и запускаем анимацию
      void newStreak.offsetWidth;
      newStreak.classList.add("cell__streak--appear");
    }, 200);
  } else {
    labelCell.insertBefore(newStreak, labelCell.firstChild);
    // Форсируем reflow и запускаем анимацию
    void newStreak.offsetWidth;
    newStreak.classList.add("cell__streak--appear");
  }
}
{

// Рисует мини-график за неделю
function renderChart() {
  const chart = document.getElementById("chart");
  chart.innerHTML = "";

  const weekDates = getWeekDates();
  const total = habits.length;

  weekDates.forEach(function (date, i) {
    // Считаем сколько привычек выполнено в этот день
    let done = 0;
    habits.forEach(function (habit) {
      const key = habit + "-" + date;
      if (progress[key]) done++;
    });

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    // Создаём столбик дня
    const dayEl = document.createElement("div");
    dayEl.classList.add("chart__day");

    // Процент сверху (появляется при наведении)
    const percentEl = document.createElement("span");
    percentEl.classList.add("chart__percent");
    percentEl.textContent = percent + "%";
    dayEl.appendChild(percentEl);

    // Обёртка для полосы
    const barWrapper = document.createElement("div");
    barWrapper.classList.add("chart__bar-wrapper");

    // Полоса
    const bar = document.createElement("div");
    bar.classList.add("chart__bar");
    bar.style.height = percent + "%";
    barWrapper.appendChild(bar);

    dayEl.appendChild(barWrapper);

    // Подпись дня
    const labelEl = document.createElement("span");
    labelEl.classList.add("chart__label");
    labelEl.textContent = days[i];
    dayEl.appendChild(labelEl);

    chart.appendChild(dayEl);
  });
}
  
}



// === ФУНКЦИЯ СОХРАНЕНИЯ ===
// Превращает объект progress в строку и кладёт в localStorage.
function saveProgress() {
  localStorage.setItem("habits-tracker", JSON.stringify(data));
}
  function renderTracker() {
  // Очищаем трекер перед перерисовкой
  tracker.innerHTML = "";

    // Массив дат текущей недели
  const weekDates = getWeekDates();

  // ... (дальше — весь код построения)

// === СТРОИМ ТАБЛИЦУ ===

// Шапка с днями
const headerRow = document.createElement("div");
headerRow.classList.add("row", "row--header");

const emptyCell = document.createElement("div");
emptyCell.classList.add("cell", "cell--label");
headerRow.appendChild(emptyCell);

days.forEach(function (day) {
  const cell = document.createElement("div");
  cell.classList.add("cell", "cell--day");
  cell.textContent = day;


  if (day === today) {                  // ← новая
    cell.classList.add("cell--today");  // ← новая
  }                                     // ← новая

  headerRow.appendChild(cell);
});



tracker.appendChild(headerRow);
// Строки с привычками
habits.forEach(function (habit, rowIndex) {
  const row = document.createElement("div");
  row.classList.add("row");

  const labelCell = document.createElement("div");
labelCell.classList.add("cell", "cell--label");

labelCell.setAttribute("data-habit", habit);

    // Streak — огонёк + цифра
  const streak = getStreak(habit);
  if (streak > 0) {
    labelCell.appendChild(createStreakElement(streak));
  }

// Текст привычки
const habitText = document.createElement("span");
habitText.classList.add("cell__habit-text");
habitText.textContent = habit;
labelCell.appendChild(habitText);

// Кнопка удаления
const deleteBtn = document.createElement("button");
deleteBtn.classList.add("cell__delete");
deleteBtn.innerHTML = "×";
deleteBtn.title = "Удалить привычку";

deleteBtn.addEventListener("click", function (e) {
  e.stopPropagation();  // чтобы клик не шёл дальше
  const confirmed = confirm("Удалить привычку «" + habit + "»?");
  if (!confirmed) return;

  // Удаляем из массива habits
  const index = habits.indexOf(habit);
  if (index !== -1) {
    habits.splice(index, 1);
  }

  // Удаляем связанные галочки из progress
  const keysToDelete = [];
  for (const key in progress) {
    if (key.startsWith(habit + "-")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(function (key) {
    delete progress[key];
  });

  // Сохраняем, перерисовываем
  saveProgress();
  renderTracker();
  updateProgress();
  renderChart();
});

labelCell.appendChild(deleteBtn);
row.appendChild(labelCell);

  days.forEach(function (day, dayIndex) {
    const cell = document.createElement("div");
    cell.classList.add("cell", "cell--check");

cell.style.animationDelay = (rowIndex * 7 + dayIndex) * 0.03 + "s";

    // Уникальный ключ для этой клетки: "Зарядка-Пн"
    const key = habit + "-" + weekDates[dayIndex];

    // Если в сохранённых данных эта клетка = true — красим её сразу
    if (progress[key]) {
      cell.classList.add("cell--done");
 }

  if (day === today) {                    // ← новая
    cell.classList.add("cell--today");    // ← новая
 }                                       // ← новая
    // === ГЛАВНОЕ: ОБРАБОТКА КЛИКА ===
    cell.addEventListener("click", function () {
  playTick();

  // Анимация пульсации
  cell.classList.add("cell--pulse");
  setTimeout(function () {
    cell.classList.remove("cell--pulse");
  }, 300);

  // toggle — переключатель
  cell.classList.toggle("cell--done");

  // Обновляем данные в объекте progress
  if (cell.classList.contains("cell--done")) {
    progress[key] = true;
  } else {
    delete progress[key];
  }

  // Сохраняем в память браузера
  saveProgress();
  updateProgress();
  updateStreakFor(habit);
  renderChart();
});


    row.appendChild(cell);
  });

  tracker.appendChild(row);
});                          // ← закрывашка habits.forEach
}
// === КНОПКА СБРОСА ===
const resetButton = document.getElementById("reset");

resetButton.addEventListener("click", function () {
  const confirmed = confirm("Точно сбросить все галочки?");
  if (!confirmed) return;  // если отменила — выходим


  playThock();   // ← НОВАЯ СТРОЧКА (звук «ток»)

    // Очищаем ТОЛЬКО текущую неделю
  const weekDates = getWeekDates();
  const keysToDelete = [];

  for (const key in progress) {
    const parts = key.split("-");
    if (parts.length < 4) continue;             // старый формат — пропускаем
    const date = parts.slice(1).join("-");       // "2026-09-14"
    if (weekDates.includes(date)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(function (key) {
    delete progress[key];
  });

  // Сохраняем пустое состояние
  saveProgress();
  updateProgress();
    
  // Обновляем огоньки у всех привычек (могли обнулиться)
  habits.forEach(function (habit) {
    updateStreakFor(habit);
  });
  renderChart();

  // Снимаем все галочки с клеток на странице
  const doneCells = document.querySelectorAll(".cell--done");
  doneCells.forEach(function (cell) {
    cell.classList.remove("cell--done");
  });
});

// Обновляем счётчик при загрузке страницы
updateProgress()
// === ДОБАВЛЕНИЕ ПРИВЫЧКИ: показать/скрыть форму ===
const addHabitBlock = document.querySelector(".add-habit");
const addHabitBtn = document.getElementById("addHabitBtn");
const addHabitCancel = document.getElementById("addHabitCancel");

addHabitBtn.addEventListener("click", function () {
  addHabitBlock.classList.add("open");
  document.getElementById("addHabitInput").focus();
});

addHabitCancel.addEventListener("click", function () {
  addHabitBlock.classList.remove("open");
});
// Первая отрисовкаы
// === ДОБАВЛЕНИЕ ПРИВЫЧКИ: логика ===
const addHabitInput = document.getElementById("addHabitInput");
const addHabitSave = document.getElementById("addHabitSave");

function addHabit() {
  const name = addHabitInput.value.trim();

  // Проверка: пустое или слишком короткое?
  if (name.length < 2) {
    addHabitInput.focus();
    return;
  }

  // Проверка: уже есть такая привычка?
  if (habits.includes(name)) {
    alert("Такая привычка уже есть");
    addHabitInput.focus();
    return;
  }

  // Добавляем в массив
  habits.push(name);

  // Сохраняем и перерисовываем
  saveProgress();
  renderTracker();
  updateProgress();
  renderChart();

  // Закрываем форму и очищаем поле
  addHabitBlock.classList.remove("open");
  addHabitInput.value = "";
}

addHabitSave.addEventListener("click", addHabit);

// Enter в поле — тоже добавление
addHabitInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addHabit();
  }
});

// Первая отрисовка таблицы
renderTracker();
renderChart();
