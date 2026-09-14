// === ДАННЫЕ ===
const habits = ["Зарядка", "Вода 1.5л", "Экран < 2ч"];
const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
// === ОПРЕДЕЛЯЕМ СЕГОДНЯШНИЙ ДЕНЬ ===
// new Date() — текущая дата. getDay() возвращает 0=Вс, 1=Пн, ..., 6=Сб.
// Нам надо перевести в наш формат: 0=Пн, 1=Вт, ..., 6=Вс.
const todayIndex = (new Date().getDay() + 6) % 7;
const today = days[todayIndex]; // например, "Пн"
// Красивая дата: "Понедельник, 15 сентября"
// Красивая дата: "Понедельник, 15 сентября"
const rawDate = new Date().toLocaleDateString("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long"
});
const todayText = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
// === ЗАГРУЖАЕМ СОХРАНЁННОЕ ИЗ ПАМЯТИ БРАУЗЕРА ===
// Пытаемся прочитать то, что сохраняли раньше.
// Если ничего нет — берём пустой объект {}.
const saved = localStorage.getItem("habits-progress");
const progress = saved ? JSON.parse(saved) : {};

// === НАХОДИМ МЕСТО ===
const tracker = document.getElementById("tracker");
// Находим элемент с датой и вставляем красивую дату
const dateElement = document.getElementById("date");
dateElement.textContent = todayText;
// === ФУНКЦИЯ СОХРАНЕНИЯ ===
// Превращает объект progress в строку и кладёт в localStorage.
function saveProgress() {
  localStorage.setItem("habits-progress", JSON.stringify(progress));
}

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
habits.forEach(function (habit) {
  const row = document.createElement("div");
  row.classList.add("row");

  const labelCell = document.createElement("div");
  labelCell.classList.add("cell", "cell--label");
  labelCell.textContent = habit;
  row.appendChild(labelCell);

  days.forEach(function (day) {
    const cell = document.createElement("div");
    cell.classList.add("cell", "cell--check");

    // Уникальный ключ для этой клетки: "Зарядка-Пн"
    const key = habit + "-" + day;

    // Если в сохранённых данных эта клетка = true — красим её сразу
    if (progress[key]) {
      cell.classList.add("cell--done");
 }

  if (day === today) {                    // ← новая
    cell.classList.add("cell--today");    // ← новая
 }                                       // ← новая
    // === ГЛАВНОЕ: ОБРАБОТКА КЛИКА ===
    cell.addEventListener("click", function () {
      // toggle — переключатель: был класс — убрать, не было — добавить
      cell.classList.toggle("cell--done");

      // Обновляем данные в объекте progress
      if (cell.classList.contains("cell--done")) {
        progress[key] = true;
      } else {
        delete progress[key];
      }

      // Сохраняем в память браузера
      saveProgress();
    });

    row.appendChild(cell);
  });

  tracker.appendChild(row);
});