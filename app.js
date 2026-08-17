(function () {
  "use strict";

  const STORAGE_KEY = "runTracker.runs";

  const form = document.getElementById("runForm");
  const dateInput = document.getElementById("date");
  const distanceInput = document.getElementById("distance");
  const timeInput = document.getElementById("time");
  const formError = document.getElementById("formError");
  const runList = document.getElementById("runList");
  const emptyState = document.getElementById("emptyState");
  const weekDistanceEl = document.getElementById("weekDistance");
  const totalRunsEl = document.getElementById("totalRuns");
  const totalDistanceEl = document.getElementById("totalDistance");

  dateInput.valueAsDate = new Date();

  function loadRuns() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveRuns(runs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }

  function parseTimeToSeconds(value) {
    const parts = value.trim().split(":").map((p) => p.trim());
    if (parts.length < 2 || parts.length > 3) return null;
    if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;

    const nums = parts.map(Number);
    let hours = 0, minutes, seconds;
    if (nums.length === 3) {
      [hours, minutes, seconds] = nums;
    } else {
      [minutes, seconds] = nums;
    }
    if (minutes >= 60 || seconds >= 60) return null;

    return hours * 3600 + minutes * 60 + seconds;
  }

  function formatSecondsToTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  }

  function formatPace(distanceKm, totalSeconds) {
    if (distanceKm <= 0) return "—";
    const paceSeconds = Math.round(totalSeconds / distanceKm);
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = paceSeconds % 60;
    const ss = String(seconds).padStart(2, "0");
    return `${minutes}:${ss} /км`;
  }

  function formatDate(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function getWeekRange(referenceDate) {
    const d = new Date(referenceDate);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }

  function isInCurrentWeek(isoDate) {
    const { start, end } = getWeekRange(new Date());
    const d = new Date(isoDate + "T00:00:00");
    return d >= start && d <= end;
  }

  function render() {
    const runs = loadRuns();
    runs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    runList.innerHTML = "";
    emptyState.hidden = runs.length > 0;

    runs.forEach((run) => {
      const li = document.createElement("li");
      li.className = "run-item";

      const main = document.createElement("div");
      main.className = "run-main";

      const dateEl = document.createElement("span");
      dateEl.className = "run-date";
      dateEl.textContent = formatDate(run.date);

      const metrics = document.createElement("div");
      metrics.className = "run-metrics";
      metrics.innerHTML = `
        <span><span class="metric-value">${run.distanceKm.toFixed(2)}</span><span class="metric-label">км</span></span>
        <span><span class="metric-value">${formatSecondsToTime(run.timeSeconds)}</span><span class="metric-label">время</span></span>
        <span><span class="metric-value">${formatPace(run.distanceKm, run.timeSeconds)}</span></span>
      `;

      main.appendChild(dateEl);
      main.appendChild(metrics);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-delete";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Удалить";
      deleteBtn.addEventListener("click", () => {
        const updated = loadRuns().filter((r) => r.id !== run.id);
        saveRuns(updated);
        render();
      });

      li.appendChild(main);
      li.appendChild(deleteBtn);
      runList.appendChild(li);
    });

    const weekTotal = runs
      .filter((r) => isInCurrentWeek(r.date))
      .reduce((sum, r) => sum + r.distanceKm, 0);
    const overallTotal = runs.reduce((sum, r) => sum + r.distanceKm, 0);

    weekDistanceEl.textContent = `${weekTotal.toFixed(1)} км`;
    totalRunsEl.textContent = String(runs.length);
    totalDistanceEl.textContent = `${overallTotal.toFixed(1)} км`;
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function clearError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    clearError();

    const date = dateInput.value;
    const distanceKm = parseFloat(distanceInput.value);
    const timeSeconds = parseTimeToSeconds(timeInput.value);

    if (!date) {
      showError("Укажи дату пробежки.");
      return;
    }
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      showError("Дистанция должна быть положительным числом.");
      return;
    }
    if (timeSeconds === null || timeSeconds <= 0) {
      showError("Введи время в формате чч:мм:сс или мм:сс.");
      return;
    }

    const runs = loadRuns();
    runs.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      date,
      distanceKm,
      timeSeconds,
      createdAt: Date.now(),
    });
    saveRuns(runs);

    form.reset();
    dateInput.valueAsDate = new Date();
    render();
  });

  render();
})();
