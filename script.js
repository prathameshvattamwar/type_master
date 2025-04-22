document.addEventListener("DOMContentLoaded", () => {
  const views = {
    home: document.getElementById("view-home"),
    typing: document.getElementById("view-typing"),
    results: document.getElementById("view-results"),
    achievements: document.getElementById("view-achievements"),
    settings: document.getElementById("view-settings"),
  };
  const mainContent = document.querySelector(".main-content");
  const navLinks = document.querySelectorAll(".nav-link");
  const lessonListContainer = document.getElementById("lesson-list");
  const paragraphDisplay = document.getElementById("paragraph-display");
  const typingInput = document.getElementById("typing-input");
  const keyboardContainer = document.getElementById("keyboard");
  const timerDisplay = document.getElementById("timer");
  const wpmDisplay = document.getElementById("wpm-current");
  const accDisplay = document.getElementById("accuracy-current");
  const errDisplay = document.getElementById("errors-current");
  const timeGoalDisplay = document.getElementById("time-goal-display");
  const resultsTitle = document.getElementById("results-title");
  const starsContainer = document.getElementById("stars-container");
  const resultsWpm = document.getElementById("results-wpm");
  const resultsAccuracy = document.getElementById("results-accuracy");
  const resultsErrors = document.getElementById("results-errors");
  const resultsTime = document.getElementById("results-time");
  const achievementPopup = document.getElementById("achievement-unlocked");
  const retryBtn = document.getElementById("retry-btn");
  const nextLessonBtn = document.getElementById("next-lesson-btn");
  const backToHomeBtn = document.getElementById("back-to-home-btn");
  const quitLessonBtn = document.getElementById("quit-lesson-btn");
  const achievementsListContainer =
    document.getElementById("achievements-list");
  const achievementsCountDisplayNav = document.getElementById(
    "achievements-count-nav"
  );
  const dailyGoalInput = document.getElementById("daily-goal-input");
  const saveGoalBtn = document.getElementById("save-goal-btn");
  const settingsGoalSavedMessage = document.getElementById(
    "settings-goal-saved-message"
  );
  const settingsResetMessage = document.getElementById(
    "settings-reset-message"
  );
  const dailyGoalDisplays = document.querySelectorAll(".daily-goal-display");
  const todayTypedDisplays = document.querySelectorAll(".today-typed-display");
  const dailyProgressBars = document.querySelectorAll(".daily-progress");
  const typingLessonName = document.getElementById("typing-lesson-name");
  const timeModal = document.getElementById("time-modal");
  const modalLessonName = document.getElementById("modal-lesson-name");
  const modalTimeInput = document.getElementById("modal-time-input");
  const modalStartBtn = document.getElementById("modal-start-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  const resetStatsBtn = document.getElementById("reset-stats-btn");
  const resetAchievementsBtn = document.getElementById(
    "reset-achievements-btn"
  );
  const avgSpeedStat = document.getElementById("avg-speed-stat");
  const avgAccuracyStat = document.getElementById("avg-accuracy-stat");
  const totalTimeStat = document.getElementById("total-time-stat");
  const totalStarsStat = document.getElementById("total-stars-stat");

  let paragraphsData = null;
  let achievementsData = null;
  let userData = loadUserData();
  let currentLesson = null;
  let lessonToStart = null;
  let timerInterval = null;
  let inactivityTimeout = null;
  let typingState = null;
  let activeView = "home";
  const INACTIVITY_DELAY = 5000;

  const KEYBOARD_LAYOUT = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"],
    ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
    ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "enter"],
    [
      "shift-left",
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      ",",
      ".",
      "/",
      "shift-right",
    ],
    ["ctrl", "alt", "cmd", "space", "cmd", "alt", "ctrl"],
  ];
  const WPM_STANDARD_WORD_LENGTH = 5;

  function initApp() {
    typingState = resetTypingState();
    applyTheme(userData.theme);
    setupEventListeners();
    setLessonListMessage("Loading lessons...");
    setAchievementListMessage("Loading achievements...");
    updateDailyGoalUI();
    updateDashboardStats();
    loadJSONData()
      .then(() => {
        renderKeyboard();
        renderLessons();
        renderAchievements();
        updateAchievementsCount();
        populateSettings();
        showView("home", true);
      })
      .catch((error) => {
        console.error("Initialization failed:", error);
        setLessonListMessage(`Error: ${error.message}. Please refresh.`, true);
        setAchievementListMessage("Error loading achievement data.", true);
        showView("home", true);
      });
  }

  function setupEventListeners() {
    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const viewName = link.getAttribute("data-view");
        if (viewName) showView(viewName);
      });
    });
    lessonListContainer.addEventListener("click", handleLessonSelect);
    typingInput.addEventListener("input", handleTypingInput);
    typingInput.addEventListener("focus", () => {
      resetInactivityTimer();
      resumeTimer();
    });
    typingInput.addEventListener("blur", pauseTimer);
    typingInput.addEventListener("paste", (e) => e.preventDefault());
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    quitLessonBtn.addEventListener("click", () => finishLesson("quit"));
    retryBtn.addEventListener("click", () => {
      if (currentLesson) openTimeModal(currentLesson);
    });
    nextLessonBtn.addEventListener("click", startNextLesson);
    backToHomeBtn.addEventListener("click", () => showView("home"));
    modalStartBtn.addEventListener("click", handleModalStart);
    modalCancelBtn.addEventListener("click", closeTimeModal);
    timeModal.addEventListener("click", (e) => {
      if (e.target === timeModal) closeTimeModal();
    });
    saveGoalBtn.addEventListener("click", handleSaveGoal);
    themeRadios.forEach((radio) =>
      radio.addEventListener("change", handleThemeChange)
    );
    resetStatsBtn.addEventListener("click", handleResetStats);
    resetAchievementsBtn.addEventListener("click", handleResetAchievements);
  }

  async function loadJSONData() {
    try {
      const [pResponse, aResponse] = await Promise.all([
        fetch("paragraph.json"),
        fetch("achievement.json"),
      ]);
      if (!pResponse.ok)
        throw new Error(
          `Failed to load paragraphs: ${pResponse.statusText} (${pResponse.status})`
        );
      if (!aResponse.ok)
        throw new Error(
          `Failed to load achievements: ${aResponse.statusText} (${aResponse.status})`
        );
      paragraphsData = await pResponse.json();
      achievementsData = await aResponse.json();
    } catch (error) {
      console.error("Failed to load JSON data:", error);
      throw error;
    }
  }

  function showView(viewName, immediate = false) {
    if (!views[viewName] || (viewName === activeView && !immediate)) return;
    const currentActiveViewElement = views[activeView];
    const nextViewElement = views[viewName];
    navLinks.forEach((link) =>
      link.classList.toggle(
        "active",
        link.getAttribute("data-view") === viewName
      )
    );
    if (currentActiveViewElement && !immediate) {
      currentActiveViewElement.classList.add("exiting");
      setTimeout(() => {
        if (currentActiveViewElement) {
          currentActiveViewElement.classList.remove("active-view", "exiting");
        }
        if (nextViewElement) {
          nextViewElement.classList.add("active-view");
        }
        activeView = viewName;
        refreshViewContent(viewName);
        mainContent.scrollTop = 0;
      }, 250);
    } else {
      if (currentActiveViewElement)
        currentActiveViewElement.classList.remove("active-view");
      if (nextViewElement) nextViewElement.classList.add("active-view");
      activeView = viewName;
      refreshViewContent(viewName);
      mainContent.scrollTop = 0;
    }
  }

  function refreshViewContent(viewName) {
    switch (viewName) {
      case "home":
        renderLessons();
        updateDailyGoalUI();
        updateDashboardStats();
        break;
      case "achievements":
        renderAchievements();
        break;
      case "settings":
        populateSettings();
        break;
      case "typing":
        if (typingInput) typingInput.focus();
        break;
    }
  }

  function setLessonListMessage(message, isError = false) {
    lessonListContainer.innerHTML = `<p class="${
      isError ? "error-message" : "loading-message"
    }">${message}</p>`;
  }
  function setAchievementListMessage(message, isError = false) {
    achievementsListContainer.innerHTML = `<p class="${
      isError ? "error-message" : "loading-message"
    }">${message}</p>`;
  }

  function renderLessons() {
    if (!paragraphsData) {
      if (
        !lessonListContainer.querySelector(".loading-message") &&
        !lessonListContainer.querySelector(".error-message")
      )
        setLessonListMessage("Loading lessons...");
      return;
    }
    if (!paragraphsData.levels || paragraphsData.levels.length === 0) {
      setLessonListMessage("No lesson levels found.", true);
      return;
    }
    lessonListContainer.innerHTML = "";
    paragraphsData.levels.forEach((level) => {
      const levelDiv = document.createElement("div");
      levelDiv.className = "level-group";
      levelDiv.innerHTML = `<h3>${level.name}</h3>`;
      if (level.lessons && level.lessons.length > 0) {
        level.lessons.forEach((lesson) => {
          const button = document.createElement("button");
          button.className = "lesson-button";
          button.dataset.lessonId = lesson.id;
          button.dataset.levelId = level.id;

          const lessonProgress = userData.completedLessons[lesson.id];
          let statsHTML = "No attempts yet.";
          if (
            lessonProgress &&
            typeof lessonProgress.wpm === "number" &&
            typeof lessonProgress.accuracy === "number"
          ) {
            const starsDisplay =
              "★".repeat(lessonProgress.stars || 0) +
              "☆".repeat(3 - (lessonProgress.stars || 0));
            statsHTML = `Best: ${lessonProgress.wpm} WPM | ${lessonProgress.accuracy}% Acc<span class="stars">${starsDisplay}</span>`;
          }

          button.innerHTML = `
                        <span class="lesson-name">${lesson.name}</span>
                        <span class="lesson-stats">${statsHTML}</span>
                    `;
          levelDiv.appendChild(button);
        });
      } else {
        levelDiv.innerHTML += `<p class="loading-message">No lessons defined for this level.</p>`;
      }
      lessonListContainer.appendChild(levelDiv);
    });
  }

  function renderKeyboard() {
    keyboardContainer.innerHTML = "";
    KEYBOARD_LAYOUT.forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "keyboard-row";
      row.forEach((key) => {
        const keyDiv = document.createElement("div");
        keyDiv.className = "key";
        const keyId = `key-${key.toLowerCase().replace("\\", "backslash")}`;
        keyDiv.id = keyId;
        keyDiv.dataset.key = key.toLowerCase();
        if (
          [
            "tab",
            "caps",
            "shift-left",
            "ctrl",
            "alt",
            "cmd",
            "delete",
            "enter",
            "shift-right",
            "space",
          ].includes(key)
        )
          keyDiv.classList.add(
            `key-${key.replace("-left", "").replace("-right", "")}`
          );
        let displayText = key;
        switch (key) {
          case "delete":
            displayText = "Del";
            break;
          case "tab":
            displayText = "Tab";
            break;
          case "caps":
            displayText = "Caps";
            break;
          case "enter":
            displayText = "Enter";
            break;
          case "shift-left":
          case "shift-right":
            displayText = "Shift";
            break;
          case "ctrl":
            displayText = "Ctrl";
            break;
          case "alt":
            displayText = "Alt";
            break;
          case "cmd":
            displayText = "Cmd";
            break;
          case "space":
            displayText = " ";
            break;
          case "\\":
            displayText = "\\";
            break;
        }
        keyDiv.innerHTML = `<span>${displayText}</span>`;
        rowDiv.appendChild(keyDiv);
      });
      keyboardContainer.appendChild(rowDiv);
    });
  }

  function renderAchievements() {
    if (!achievementsData) {
      if (
        !achievementsListContainer.querySelector(".loading-message") &&
        !achievementsListContainer.querySelector(".error-message")
      )
        setAchievementListMessage("Loading achievements...");
      return;
    }
    if (achievementsData.length === 0) {
      setAchievementListMessage("No achievements defined.", true);
      return;
    }
    achievementsListContainer.innerHTML = "";
    achievementsData.forEach((ach) => {
      const isUnlocked = userData.unlockedAchievements.includes(ach.id);
      const div = document.createElement("div");
      div.className = `achievement-item ${isUnlocked ? "unlocked" : ""}`;
      div.innerHTML = `<div class="achievement-icon">${ach.icon}</div><div class="achievement-details"><h4>${ach.name}</h4><p>${ach.description}</p></div>`;
      achievementsListContainer.appendChild(div);
    });
  }

  function updateDailyGoalUI() {
    const goalMinutes = userData.dailyGoalMinutes;
    const goalSeconds = goalMinutes * 60;
    const todaySeconds = userData.todayTypedSeconds;
    const displayGoalTime = formatTime(goalSeconds, false);
    const displayTodayTime = formatTime(todaySeconds, false);
    dailyGoalDisplays.forEach((el) => (el.textContent = displayGoalTime));
    todayTypedDisplays.forEach((el) => (el.textContent = displayTodayTime));
    dailyProgressBars.forEach((bar) => {
      bar.max = goalSeconds;
      bar.value = Math.min(todaySeconds, goalSeconds);
    });
  }

  function updateAchievementsCount() {
    const count = userData.unlockedAchievements.length;
    achievementsCountDisplayNav.textContent = count;
  }

  function updateDashboardStats() {
    let totalWpm = 0;
    let totalAccuracy = 0;
    let lessonCount = 0;
    let validLessonCount = 0;

    for (const lessonId in userData.completedLessons) {
      const progress = userData.completedLessons[lessonId];
      lessonCount++;
      if (
        progress &&
        typeof progress.wpm === "number" &&
        typeof progress.accuracy === "number"
      ) {
        totalWpm += progress.wpm;
        totalAccuracy += progress.accuracy;
        validLessonCount++;
      }
    }

    const avgWpm =
      validLessonCount > 0 ? Math.round(totalWpm / validLessonCount) : "--";
    const avgAcc =
      validLessonCount > 0
        ? Math.round(totalAccuracy / validLessonCount)
        : "--";

    avgSpeedStat.textContent = avgWpm;
    avgAccuracyStat.textContent = avgAcc;
    totalTimeStat.textContent = formatTime(userData.totalTimeSeconds);
    totalStarsStat.textContent = userData.totalStars;
  }

  function populateSettings() {
    dailyGoalInput.value = userData.dailyGoalMinutes;
    themeRadios.forEach((radio) => {
      radio.checked = radio.value === userData.theme;
    });
  }

  function handleLessonSelect(event) {
    const button = event.target.closest(".lesson-button");
    if (button && button.dataset.lessonId) {
      const lessonId = button.dataset.lessonId;
      const levelId = button.dataset.levelId;
      if (!paragraphsData) {
        console.error("Lessons not loaded");
        return;
      }
      const level = paragraphsData.levels.find((l) => l.id === levelId);
      const lesson = level?.lessons.find((l) => l.id === lessonId);
      if (lesson && lesson.text) {
        lessonToStart = { ...lesson, levelId: levelId };
        openTimeModal(lessonToStart);
      } else {
        console.error("Lesson data error", lessonId, levelId);
        alert("Error loading lesson text.");
      }
    }
  }

  function openTimeModal(lesson) {
    lessonToStart = lesson;
    modalLessonName.textContent = lesson.name;
    const lastTime = userData.completedLessons[lesson.id]?.lastTimeLimit;
    modalTimeInput.value =
      lastTime !== undefined && lastTime !== null ? lastTime : 5;
    modalTimeInput.min = 0;
    timeModal.classList.remove("hidden");
    modalTimeInput.focus();
  }

  function closeTimeModal() {
    timeModal.classList.add("hidden");
    lessonToStart = null;
  }

  function handleModalStart() {
    if (!lessonToStart) return;
    let timeLimitMinutes = parseInt(modalTimeInput.value, 10);
    if (isNaN(timeLimitMinutes) || timeLimitMinutes < 0) {
      timeLimitMinutes = 0; // Default to no limit if invalid
    }

    // Ensure the lesson entry exists
    if (!userData.completedLessons[lessonToStart.id]) {
      userData.completedLessons[lessonToStart.id] = {
        wpm: 0,
        accuracy: 0,
        stars: 0,
        lastTimeLimit: timeLimitMinutes,
      };
    } else {
      userData.completedLessons[lessonToStart.id].lastTimeLimit =
        timeLimitMinutes;
    }

    currentLesson = lessonToStart;
    closeTimeModal();
    startTypingSession(
      currentLesson,
      timeLimitMinutes > 0 ? timeLimitMinutes * 60 : null
    );
  }

  function resetTypingState() {
    if (timerInterval) clearTimeout(timerInterval);
    if (inactivityTimeout) clearTimeout(inactivityTimeout);
    timerInterval = null;
    inactivityTimeout = null;
    return {
      startTime: null,
      elapsedSeconds: 0,
      totalTypedChars: 0,
      correctChars: 0,
      incorrectChars: 0,
      isFinished: false,
      lessonText: "",
      timerRunning: false,
      timeLimit: null,
      lastInputTimestamp: 0,
    };
  }

  function startTypingSession(lesson, timeLimitSeconds = null) {
    currentLesson = lesson;
    typingState = resetTypingState();
    typingState.timeLimit = timeLimitSeconds;
    typingState.lessonText = lesson.text || "";
    paragraphDisplay.innerHTML = "";
    String(typingState.lessonText)
      .split("")
      .forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.className = "char-todo";
        paragraphDisplay.appendChild(span);
      });
    if (paragraphDisplay.children.length > 0) {
      paragraphDisplay.children[0].classList.add("char-current");
      highlightKeyOnKeyboard(typingState.lessonText[0]);
    }
    typingInput.value = "";
    typingInput.disabled = false;
    timerDisplay.textContent = timeLimitSeconds
      ? formatTime(timeLimitSeconds)
      : "0:00";
    timeGoalDisplay.textContent = timeLimitSeconds
      ? formatTime(timeLimitSeconds)
      : "∞";
    wpmDisplay.textContent = "0";
    accDisplay.textContent = "100%";
    errDisplay.textContent = "0";
    typingLessonName.textContent = lesson.name;
    achievementPopup.classList.add("hidden");
    clearAllKeyHighlights();
    showView("typing");
    typingInput.focus();
  }

  function handleTypingInput() {
    if (typingState.isFinished || !currentLesson) return;

    const currentTime = Date.now();
    if (!typingState.timerRunning && typingState.lessonText.length > 0) {
      startTimer();
    }
    resetInactivityTimer();
    typingState.lastInputTimestamp = currentTime;

    const typedValue = typingInput.value;
    const targetText = typingState.lessonText;
    const spans = paragraphDisplay.children;
    const currentPos = typedValue.length;

    typingState.totalTypedChars = currentPos;
    let correctCount = 0;
    let incorrectCount = 0;

    for (let i = 0; i < targetText.length; i++) {
      const span = spans[i];
      if (!span) continue;
      const targetChar = targetText[i];

      span.classList.remove(
        "char-correct",
        "char-incorrect",
        "char-current",
        "char-todo"
      );
      span.style.backgroundColor = "";

      if (
        span.textContent !== targetChar &&
        !(span.classList.contains("char-incorrect") && targetChar === " ")
      ) {
        span.textContent = targetChar;
      }

      if (i < currentPos) {
        const typedChar = typedValue[i];
        if (typedChar === targetChar) {
          span.classList.add("char-correct");
          correctCount++;
        } else {
          span.classList.add("char-incorrect");
          incorrectCount++;
          if (targetChar === " ") {
            span.textContent = "_";
            span.style.backgroundColor = "#ffdddd";
          }
        }
      } else if (i === currentPos) {
        span.classList.add("char-current");
        if (span.textContent === "_") {
          span.textContent = targetChar;
        }
      } else {
        span.classList.add("char-todo");
        if (span.textContent === "_") {
          span.textContent = targetChar;
        }
      }
    }

    typingState.correctChars = correctCount;
    typingState.incorrectChars = incorrectCount;

    if (currentPos < targetText.length) {
      highlightKeyOnKeyboard(targetText[currentPos]);
    } else {
      clearAllKeyHighlights(false);
    }

    updateLiveStats();

    if (currentPos === targetText.length && incorrectCount === 0) {
      clearAllKeyHighlights();
      finishLesson("completed");
    }
  }

  function updateLiveStats() {
    if (typingState.isFinished) return;

    const currentTime = Date.now();
    let currentElapsedSeconds = typingState.elapsedSeconds;
    if (typingState.timerRunning && typingState.startTime) {
      currentElapsedSeconds += (currentTime - typingState.startTime) / 1000;
    }

    const minutes = currentElapsedSeconds / 60;
    let wpm = 0;
    if (minutes > 0.01) {
      wpm = Math.round(
        typingState.correctChars / WPM_STANDARD_WORD_LENGTH / minutes
      );
    }

    let accuracy = 100;
    if (typingState.totalTypedChars > 0) {
      accuracy = Math.round(
        (typingState.correctChars / typingState.totalTypedChars) * 100
      );
    }

    wpmDisplay.textContent = Math.max(0, wpm);
    accDisplay.textContent = `${Math.max(0, Math.min(100, accuracy))}%`;
    errDisplay.textContent = typingState.incorrectChars;

    if (typingState.timeLimit && typingState.timerRunning) {
      const remainingTime = Math.max(
        0,
        typingState.timeLimit - currentElapsedSeconds
      );
      timerDisplay.textContent = formatTime(remainingTime);
    } else if (!typingState.timeLimit && typingState.timerRunning) {
      timerDisplay.textContent = formatTime(currentElapsedSeconds);
    }
  }

  function startTimer() {
    if (typingState.timerRunning || typingState.isFinished) return;
    typingState.startTime = Date.now();
    typingState.timerRunning = true;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!typingState.timerRunning || typingState.isFinished) {
        clearInterval(timerInterval);
        return;
      }
      const now = Date.now();
      const currentElapsed =
        typingState.elapsedSeconds + (now - typingState.startTime) / 1000;

      if (typingState.timeLimit) {
        const remainingTime = typingState.timeLimit - currentElapsed;
        if (remainingTime <= 0) {
          timerDisplay.textContent = formatTime(0);
          finishLesson("timeup");
        } else {
          timerDisplay.textContent = formatTime(remainingTime);
        }
      } else {
        timerDisplay.textContent = formatTime(currentElapsed);
      }
    }, 250);
  }
  function pauseTimer() {
    if (!typingState.timerRunning || typingState.isFinished) return;
    clearTimeout(inactivityTimeout);
    clearInterval(timerInterval);
    timerInterval = null;
    if (typingState.startTime)
      typingState.elapsedSeconds += (Date.now() - typingState.startTime) / 1000;
    typingState.timerRunning = false;
    typingState.startTime = null;
  }
  function resumeTimer() {
    if (
      typingState.timerRunning ||
      typingState.isFinished ||
      typingState.startTime !== null
    )
      return;
    typingState.startTime = Date.now();
    typingState.timerRunning = true;
    startTimer();
    resetInactivityTimer();
  }
  function stopTimer() {
    clearInterval(timerInterval);
    clearTimeout(inactivityTimeout);
    timerInterval = null;
    inactivityTimeout = null;
    if (typingState.timerRunning && typingState.startTime)
      typingState.elapsedSeconds += (Date.now() - typingState.startTime) / 1000;
    typingState.timerRunning = false;
    return typingState.elapsedSeconds;
  }
  function handleInactivity() {
    pauseTimer();
  }
  function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    if (typingState.timerRunning && !typingState.isFinished) {
      inactivityTimeout = setTimeout(handleInactivity, INACTIVITY_DELAY);
    }
  }

  function finishLesson(reason = "completed") {
    if (typingState.isFinished) return;
    typingState.isFinished = true;
    const finalElapsedTime = stopTimer();
    typingInput.disabled = true;
    clearAllKeyHighlights();

    const finalTypedValue = typingInput.value;
    const targetText = typingState.lessonText;
    let finalCorrectCount = 0;
    let finalErrorCount = 0;
    let finalTypedLength = finalTypedValue.length;

    for (let i = 0; i < finalTypedLength; i++) {
      if (i < targetText.length && finalTypedValue[i] === targetText[i]) {
        finalCorrectCount++;
      } else {
        finalErrorCount++;
      }
    }

    const minutes = finalElapsedTime / 60;
    let finalWpm = 0;
    if (minutes > 0.01) {
      finalWpm = Math.round(
        finalCorrectCount / WPM_STANDARD_WORD_LENGTH / minutes
      );
      finalWpm = Math.max(0, finalWpm);
    }

    let finalAccuracy = 0;
    if (finalTypedLength > 0) {
      finalAccuracy = Math.round((finalCorrectCount / finalTypedLength) * 100);
      finalAccuracy = Math.max(0, Math.min(100, finalAccuracy));
    } else if (reason !== "quit" && finalElapsedTime > 1) {
      finalAccuracy = 0;
    } else if (reason !== "quit") {
      finalAccuracy = 100;
    }

    const consideredComplete =
      reason === "completed" ||
      (reason === "timeup" && finalAccuracy >= 70 && finalElapsedTime > 5);

    const result = {
      wpm: finalWpm,
      accuracy: finalAccuracy,
      errors: finalErrorCount,
      timeSeconds: Math.round(finalElapsedTime),
      stars: calculateStars(finalWpm, finalAccuracy, reason),
      lessonId: currentLesson.id,
      completed: consideredComplete,
      timeLimit: typingState.timeLimit,
    };

    updateUserData(result);
    displayResults(result, reason);
    const newlyUnlocked = checkAchievements(result);
    displayAchievementNotification(newlyUnlocked);
    saveUserData();

    updateDashboardStats();
    renderLessons();
  }

  function calculateStars(wpm, accuracy, reason) {
    if (reason === "quit") return 0;
    if (accuracy < 85) return 0;
    let stars = 0;
    if (accuracy >= 98 && wpm >= 40) stars = 3;
    else if (accuracy >= 95 && wpm >= 30) stars = 2;
    else if (accuracy >= 85) stars = 1;
    else stars = 0;
    return stars;
  }
  function displayResults(result, reason) {
    resultsWpm.textContent = result.wpm;
    resultsAccuracy.textContent = `${result.accuracy}%`;
    resultsErrors.textContent = result.errors;
    resultsTime.textContent = formatTime(result.timeSeconds);
    starsContainer.innerHTML =
      "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
    if (reason === "completed") resultsTitle.textContent = "Lesson Complete!";
    else if (reason === "timeup") resultsTitle.textContent = "Time's Up!";
    else resultsTitle.textContent = "Lesson Stopped";
    const nextLesson = findNextLesson(currentLesson.id, currentLesson.levelId);
    if (nextLesson && reason !== "quit") {
      nextLessonBtn.classList.remove("hidden");
      nextLessonBtn.dataset.nextLessonId = nextLesson.id;
      nextLessonBtn.dataset.nextLevelId = nextLesson.levelId;
    } else {
      nextLessonBtn.classList.add("hidden");
    }
    showView("results");
  }
  function findNextLesson(currentLessonId, currentLevelId) {
    if (!paragraphsData) return null;
    const currentLevelIndex = paragraphsData.levels.findIndex(
      (l) => l.id === currentLevelId
    );
    if (currentLevelIndex === -1) return null;
    const currentLevel = paragraphsData.levels[currentLevelIndex];
    const currentLessonIndex = currentLevel.lessons.findIndex(
      (l) => l.id === currentLessonId
    );
    if (currentLessonIndex === -1) return null;
    if (currentLessonIndex + 1 < currentLevel.lessons.length) {
      const nextLessonData = currentLevel.lessons[currentLessonIndex + 1];
      return { ...nextLessonData, levelId: currentLevelId };
    }
    if (currentLevelIndex + 1 < paragraphsData.levels.length) {
      const nextLevel = paragraphsData.levels[currentLevelIndex + 1];
      if (nextLevel.lessons && nextLevel.lessons.length > 0) {
        const nextLessonData = nextLevel.lessons[0];
        return { ...nextLessonData, levelId: nextLevel.id };
      }
    }
    return null;
  }
  function startNextLesson() {
    const nextLessonId = nextLessonBtn.dataset.nextLessonId;
    const nextLevelId = nextLessonBtn.dataset.nextLevelId;
    if (nextLessonId && nextLevelId) {
      const level = paragraphsData.levels.find((l) => l.id === nextLevelId);
      const lesson = level?.lessons.find((l) => l.id === nextLessonId);
      if (lesson) {
        openTimeModal({ ...lesson, levelId: nextLevelId });
      } else {
        console.error("Next lesson data not found");
        showView("home");
      }
    } else {
      showView("home");
    }
  }
  function handleSaveGoal() {
    const newGoal = parseInt(dailyGoalInput.value, 10);
    if (!isNaN(newGoal) && newGoal > 0 && newGoal <= 300) {
      userData.dailyGoalMinutes = newGoal;
      updateDailyGoalUI();
      saveUserData();
      settingsGoalSavedMessage.classList.remove("hidden");
      setTimeout(() => {
        settingsGoalSavedMessage.classList.add("hidden");
      }, 2000);
    } else {
      alert("Please enter a valid number of minutes (e.g., 1-300).");
      dailyGoalInput.value = userData.dailyGoalMinutes;
    }
  }
  function handleThemeChange(event) {
    const selectedTheme = event.target.value;
    applyTheme(selectedTheme);
    userData.theme = selectedTheme;
    saveUserData();
  }
  function applyTheme(themeName) {
    document.body.className = themeName || "theme-default";
  }
  function handleResetStats() {
    if (
      confirm(
        "Are you sure you want to reset all your statistics?\nThis includes best scores, stars, and total time."
      )
    ) {
      userData.completedLessons = {};
      userData.totalStars = 0;
      userData.totalTimeSeconds = 0;
      userData.todayTypedSeconds = 0;
      saveUserData();
      updateDailyGoalUI();
      updateDashboardStats();
      renderLessons();
      showResetMessage("Statistics reset successfully.");
    }
  }
  function handleResetAchievements() {
    if (confirm("Are you sure you want to reset all achievements?")) {
      userData.unlockedAchievements = [];
      saveUserData();
      updateAchievementsCount();
      renderAchievements();
      showResetMessage("Achievements reset successfully.");
    }
  }
  function showResetMessage(message) {
    settingsResetMessage.textContent = message;
    settingsResetMessage.classList.remove("hidden");
    setTimeout(() => {
      settingsResetMessage.classList.add("hidden");
    }, 3000);
  }

  function loadUserData() {
    const data = localStorage.getItem("typingUserData");
    const defaultData = {
      userName: "Player1",
      dailyGoalMinutes: 15,
      todayTypedSeconds: 0,
      theme: "theme-default",
      lastPlayedDate: new Date().toDateString(),
      completedLessons: {},
      unlockedAchievements: [],
      totalStars: 0,
      totalTimeSeconds: 0,
    };
    try {
      let parsedData = data ? JSON.parse(data) : { ...defaultData };

      // Ensure defaults for potentially missing top-level keys
      parsedData.userName = parsedData.userName || defaultData.userName;
      parsedData.dailyGoalMinutes =
        Number(parsedData.dailyGoalMinutes) || defaultData.dailyGoalMinutes;
      parsedData.todayTypedSeconds =
        Number(parsedData.todayTypedSeconds) || defaultData.todayTypedSeconds;
      parsedData.theme = parsedData.theme || defaultData.theme;
      parsedData.lastPlayedDate =
        parsedData.lastPlayedDate || defaultData.lastPlayedDate;
      parsedData.completedLessons = parsedData.completedLessons || {};
      parsedData.unlockedAchievements = Array.isArray(
        parsedData.unlockedAchievements
      )
        ? parsedData.unlockedAchievements
        : [];
      parsedData.totalStars = Number(parsedData.totalStars) || 0;
      parsedData.totalTimeSeconds = Number(parsedData.totalTimeSeconds) || 0;

      if (parsedData.lastPlayedDate !== new Date().toDateString()) {
        parsedData.todayTypedSeconds = 0;
        parsedData.lastPlayedDate = new Date().toDateString();
      }

      // Ensure nested completedLessons have valid numbers
      for (const lessonId in parsedData.completedLessons) {
        const lesson = parsedData.completedLessons[lessonId];
        lesson.wpm = Number(lesson.wpm) || 0;
        lesson.accuracy = Number(lesson.accuracy) || 0;
        lesson.stars = Number(lesson.stars) || 0;
        lesson.lastTimeLimit =
          Number(lesson.lastTimeLimit) >= 0 ? Number(lesson.lastTimeLimit) : 5; // Default 5 mins if invalid
      }

      return parsedData;
    } catch (e) {
      console.error(
        "Error parsing user data from localStorage, using defaults.",
        e
      );
      localStorage.removeItem("typingUserData");
      return { ...defaultData };
    }
  }

  function saveUserData() {
    try {
      localStorage.setItem("typingUserData", JSON.stringify(userData));
    } catch (e) {
      console.error("Error saving user data:", e);
      alert("Warning: Could not save progress.");
    }
  }

  function updateUserData(result) {
    if (!result || !result.lessonId) return;

    if (result.timeSeconds > 1) {
      userData.totalTimeSeconds =
        (userData.totalTimeSeconds || 0) + result.timeSeconds;
      userData.todayTypedSeconds =
        (userData.todayTypedSeconds || 0) + result.timeSeconds;
      userData.lastPlayedDate = new Date().toDateString();
    }

    const lessonId = result.lessonId;
    const currentBest = userData.completedLessons[lessonId];
    let isNewBest = false;
    let starsGained = 0;
    const newResultWpm = Number(result.wpm) || 0;
    const newResultAccuracy = Number(result.accuracy) || 0;
    const newResultStars = Number(result.stars) || 0;
    const lastTimeLimit =
      Number(result.timeLimit) >= 0
        ? Number(result.timeLimit)
        : currentBest?.lastTimeLimit ?? 5;

    if (
      !currentBest ||
      newResultWpm > (currentBest.wpm || 0) ||
      (newResultWpm === (currentBest.wpm || 0) &&
        newResultAccuracy > (currentBest.accuracy || 0))
    ) {
      const oldStars = currentBest ? currentBest.stars || 0 : 0;
      starsGained = newResultStars - oldStars;
      userData.completedLessons[lessonId] = {
        wpm: newResultWpm,
        accuracy: newResultAccuracy,
        stars: newResultStars,
        lastTimeLimit: lastTimeLimit,
      };
      isNewBest = true;
    } else {
      // Update lastTimeLimit even if not a new best score
      userData.completedLessons[lessonId].lastTimeLimit = lastTimeLimit;
      // Update stars if current attempt is better than saved, but not overall best WPM/Acc
      const oldStars = currentBest.stars || 0;
      if (newResultStars > oldStars) {
        starsGained = newResultStars - oldStars;
        userData.completedLessons[lessonId].stars = newResultStars;
        isNewBest = true; // Consider star increase a reason to update total
      }
    }

    if (isNewBest) {
      userData.totalStars = (userData.totalStars || 0) + starsGained;
      userData.totalStars = Math.max(0, userData.totalStars);
    }
  }

  function checkAchievements(latestResult) {
    if (!achievementsData || !latestResult) return [];
    const newlyUnlocked = [];
    const reasonableCompletion =
      latestResult.completed && latestResult.timeSeconds > 5;
    achievementsData.forEach((ach) => {
      if (userData.unlockedAchievements.includes(ach.id)) return;
      let unlocked = false;
      const criteria = ach.criteria;
      switch (criteria.type) {
        case "complete_lesson":
          unlocked =
            latestResult.lessonId === criteria.lessonId &&
            latestResult.completed;
          break;
        case "collect_stars":
          unlocked = userData.totalStars >= criteria.count;
          break;
        case "reach_wpm":
          unlocked = latestResult.wpm >= criteria.wpm && reasonableCompletion;
          break;
        case "reach_accuracy":
          unlocked =
            latestResult.accuracy >= criteria.accuracy && reasonableCompletion;
          break;
        case "total_time":
          unlocked = userData.totalTimeSeconds / 60 >= criteria.minutes;
          break;
      }
      if (unlocked) {
        userData.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach);
      }
    });
    return newlyUnlocked;
  }
  function displayAchievementNotification(newlyUnlocked) {
    if (newlyUnlocked.length > 0) {
      const ach = newlyUnlocked[0];
      achievementPopup.innerHTML = `<h3>✨ Achievement Unlocked! ✨</h3><p><span id="unlocked-badge-icon">${ach.icon}</span> <strong id="unlocked-badge-name">${ach.name}</strong></p><p id="unlocked-badge-desc">${ach.description}</p>`;
      achievementPopup.classList.remove("hidden");
      updateAchievementsCount();
    } else {
      achievementPopup.classList.add("hidden");
    }
  }
  function handleKeyDown(event) {
    if (document.activeElement === typingInput) {
      if (event.key === "Tab") {
        event.preventDefault();
      }
    }
    if (!views.typing.classList.contains("active-view")) return;
    highlightPhysicalKey(event.key, event.code, true);
    resetInactivityTimer();
  }
  function handleKeyUp(event) {
    if (!views.typing.classList.contains("active-view")) return;
    highlightPhysicalKey(event.key, event.code, false);
  }
  function highlightPhysicalKey(key, code, isPressed) {
    let keyIdentifier = key.toLowerCase();
    switch (code) {
      case "Space":
        keyIdentifier = "space";
        break;
      case "ShiftLeft":
        keyIdentifier = "shift-left";
        break;
      case "ShiftRight":
        keyIdentifier = "shift-right";
        break;
      case "ControlLeft":
      case "ControlRight":
        keyIdentifier = "ctrl";
        break;
      case "AltLeft":
      case "AltRight":
        keyIdentifier = "alt";
        break;
      case "MetaLeft":
      case "MetaRight":
        keyIdentifier = "cmd";
        break;
      case "CapsLock":
        keyIdentifier = "caps";
        break;
      case "Backspace":
        keyIdentifier = "delete";
        break;
      case "Enter":
        keyIdentifier = "enter";
        break;
      case "Tab":
        keyIdentifier = "tab";
        break;
      case "Backslash":
        keyIdentifier = "backslash";
        break;
      case "Quote":
        keyIdentifier = "'";
        break;
      case "Semicolon":
        keyIdentifier = ";";
        break;
      case "Comma":
        keyIdentifier = ",";
        break;
      case "Period":
        keyIdentifier = ".";
        break;
      case "Slash":
        keyIdentifier = "/";
        break;
      case "BracketLeft":
        keyIdentifier = "[";
        break;
      case "BracketRight":
        keyIdentifier = "]";
        break;
      case "Minus":
        keyIdentifier = "-";
        break;
      case "Equal":
        keyIdentifier = "=";
        break;
      case "Backquote":
        keyIdentifier = "`";
        break;
    }
    if (keyIdentifier === key.toLowerCase() && code.startsWith("Digit")) {
      keyIdentifier = key;
    } else if (keyIdentifier === key.toLowerCase() && code.startsWith("Key")) {
      keyIdentifier = key.toLowerCase();
    }
    if (keyIdentifier === "shift-left" || keyIdentifier === "shift-right") {
      highlightElement(document.getElementById("key-shift-left"), isPressed);
      highlightElement(document.getElementById("key-shift-right"), isPressed);
    } else if (["ctrl", "alt", "cmd"].includes(keyIdentifier)) {
      const elements = keyboardContainer.querySelectorAll(
        `.key-${keyIdentifier}`
      );
      elements.forEach((el) => highlightElement(el, isPressed));
    } else {
      const keyElement = document.getElementById(`key-${keyIdentifier}`);
      highlightElement(keyElement, isPressed);
    }
  }
  function highlightKeyOnKeyboard(char) {
    clearAllKeyHighlights(false);
    if (!char) return;
    let keyChar = char.toLowerCase();
    let requiresShift =
      char !== " " &&
      char.toUpperCase() === char &&
      char.toLowerCase() !== char;
    const symbolMap = {
      "!": "1",
      "@": "2",
      "#": "3",
      $: "4",
      "%": "5",
      "^": "6",
      "&": "7",
      "*": "8",
      "(": "9",
      ")": "0",
      _: "-",
      "+": "=",
      "{": "[",
      "}": "]",
      "|": "\\",
      ":": ";",
      '"': "'",
      "<": ",",
      ">": ".",
      "?": "/",
    };
    if (symbolMap[char]) {
      keyChar = symbolMap[char];
      requiresShift = true;
    } else if (char === " ") {
      keyChar = "space";
      requiresShift = false;
    }
    const keyElement = document.getElementById(`key-${keyChar}`);
    if (keyElement) keyElement.classList.add("key-target");
    if (requiresShift) {
      document.getElementById("key-shift-left")?.classList.add("key-target");
      document.getElementById("key-shift-right")?.classList.add("key-target");
    }
  }
  function isSymbolShifted(char) {
    const shiftedSymbols = '!@#$%^&*()_+{}|:"<>?';
    return shiftedSymbols.includes(char);
  }
  function highlightElement(element, isPressed) {
    if (element) element.classList.toggle("key-active", isPressed);
  }
  function clearAllKeyHighlights(clearPhysicalPresses = true) {
    const targetKeys = keyboardContainer.querySelectorAll(".key-target");
    targetKeys.forEach((key) => key.classList.remove("key-target"));
    if (clearPhysicalPresses) {
      const activeKeys = keyboardContainer.querySelectorAll(".key-active");
      activeKeys.forEach((key) => key.classList.remove("key-active"));
    }
  }
  function formatTime(totalSeconds, showMilliseconds = false) {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedSeconds = String(seconds).padStart(2, "0");
    let timeString = `${minutes}:${paddedSeconds}`;
    if (showMilliseconds) {
      const milliseconds = Math.floor((totalSeconds * 1000) % 1000);
      const paddedMilliseconds = String(milliseconds).padStart(3, "0");
      timeString += `.${paddedMilliseconds}`;
    }
    return timeString;
  }

  initApp();
});
