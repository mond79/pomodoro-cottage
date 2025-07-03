// static/js/script.js (최신 버전: 탭 구조)

// ⭐⭐ 여기부터 새로운 '음악 도서관' 데이터! ⭐⭐
const musicLibrary = [
  // --- 밤(night) 테마 ---
  { name: "Rainy Seoul Night", file: "_Rainy Seoul Night_.mp3", tag: "night" },
  { name: "Rainy Seoul Night #2", file: "_Rainy Seoul Night_1.mp3", tag: "night" },
  { name: "Quiet Evenings", file: "Quiet Evenings.mp3", tag: "night" },
  { name: "밤에 키보드로 글쓰기", file: "밤에 키보드로 글을 쓰는 느낌.mp3", tag: "night" },
  { name: "밤에 키보드로 글쓰기 #2", file: "밤에 키보드로 글을 쓰는 느낌_1.mp3", tag: "night" },
  { name: "새벽녘 고요한 명상", file: "새벽녘 고요한 방에서 명상하는 느낌.mp3", tag: "night" },
  
  // --- 자연(nature) 테마 ---
  { name: "고요한 숲 속 오두막", file: "고요한 숲 속 오두막에서 휴식하는 느낌.mp3", tag: "nature" },
  { name: "고요한 숲 속 오두막 #2", file: "고요한 숲 속 오두막에서 휴식하는 느낌_1.mp3", tag: "nature" },
  { name: "고요한 숲 속 오두막 #3", file: "고요한 숲 속 오두막에서 휴식하는 느낌_2.mp3", tag: "nature" },
  { name: "숲 속의 새", file: "숲에 새.mp3", tag: "nature" },
  { name: "숲 속의 새 #2", file: "숲에 새_1.mp3", tag: "nature" },
  
  // --- 아늑함(cozy) 테마 ---
  { name: "아늑한 벽난로", file: "아늑한 벽난로 옆에서 책 읽는 느낌.mp3", tag: "cozy" },
  { name: "아늑한 벽난로 #2", file: "아늑한 벽난로 옆에서 책 읽는 느낌_1.mp3", tag: "cozy" },
  { name: "아늑한 벽난로 #3", file: "아늑한 벽난로 옆에서 책 읽는 느낌_2.mp3", tag: "cozy" },
  
  // --- 비(rainy) 테마 ---
  { name: "비 오는 날 창가에서", file: "비 오는 날 창가에서 공부하는 느낌.mp3", tag: "rainy" },
  
  // --- 집중(focus) 테마 ---
  { name: "따뜻한 공간의 사색", file: "미니멀하고 따뜻한 공간에서의 사색.mp3", tag: "focus" },
  { name: "따뜻한 공간의 사색 #2", file: "미니멀하고 따뜻한 공간에서의 사색_1.mp3", tag: "focus" },
  { name: "따뜻한 공간의 사색 #3", file: "미니멀하고 따뜻한 공간에서의 사색_2.mp3", tag: "focus" },
  { name: "따뜻한 공간의 사색 #4", file: "미니멀하고 따뜻한 공간에서의 사색_3.mp3", tag: "focus" },

  // 참고: wav 파일도 이런 식으로 추가하면 돼!
  // { name: "뇌우와 비", file: "뇌우와 비.wav", tag: "rainy" },
];
// ⭐⭐ 여기까지! ⭐⭐

document.addEventListener('DOMContentLoaded', () => {
    // === 탭 기능 초기화 (가장 먼저!) ===
    initializeTabs();

    // === 기존 초기화 함수들 호출 ===
    loadCustomTimes();
    loadTimerState();
    updateTimerDisplay();
    loadTodos();
    populateMusicSelector('all'); // 처음에는 모든 음악 표시
    setInitialTheme();
    setInitialMusic();
    setInitialSoundMixer();
    updateGoalProgress();
    updateQuestProgress();
});

// ==========================================================
//                     탭 기능
// ==========================================================
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // 모든 버튼과 컨텐츠에서 'active' 클래스 제거
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // 클릭된 버튼과 해당 컨텐츠에 'active' 클래스 추가
            button.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
            
            // '기록' 탭을 열었을 때만 차트와 일지를 로드/생성 (최적화!)
            if (tabName === 'records') {
                generateStatsChart();
                displayPastEntries();
            }
        });
    });
}

// ==========================================================
//                 전역 변수 및 DOM 요소 선언
// ==========================================================
// 공통
const favicon = document.getElementById('favicon');

// 타이머
let timer; let timeLeft; let isPaused = true; let currentPhase = 'pomodoro';
let POMODORO_DURATION = 25 * 60; let SHORT_BREAK_DURATION = 5 * 60; const LONG_BREAK_DURATION = 15 * 60;
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const currentPhaseDisplay = document.getElementById('current-phase');
const bellSound = document.getElementById('bell-sound');

// 할 일 목록
const newTodoInput = document.getElementById('new-todo');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
let todos = [];

// 설정 (타이머, 음악, 테마, 믹서)
const focusTimeInput = document.getElementById('focus-time-input');
const breakTimeInput = document.getElementById('break-time-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const themeSelector = document.getElementById('theme-selector');
const backgroundMusic = document.getElementById('background-music');
const ambientSound = document.getElementById('ambient-sound');
const playMusicBtn = document.getElementById('play-music-btn');
const pauseMusicBtn = document.getElementById('pause-music-btn');
const musicSelector = document.getElementById('music-selector');
const prevMusicBtn = document.getElementById('prev-music-btn');
const nextMusicBtn = document.getElementById('next-music-btn');
const ambientSelector = document.getElementById('ambient-selector');
const musicVolumeSlider = document.getElementById('music-volume-slider');
const ambientVolumeSlider = document.getElementById('ambient-volume-slider');

// 목표
const goalInput = document.getElementById('goal-input');
const saveGoalBtn = document.getElementById('save-goal-btn');
const goalProgressText = document.getElementById('goal-progress-text');
const progressBar = document.getElementById('progress-bar');
const questDescription = document.getElementById('quest-description');
const questProgressText = document.getElementById('quest-progress-text');
const rewardMessage = document.getElementById('reward-message');
let DAILY_QUEST_GOAL = 4;

// 기록
const pomodoroChartCanvas = document.getElementById('pomodoro-chart');
const totalFocusTimeDisplay = document.getElementById('total-focus-time');
let chartInstance = null;
const journalEntryInput = document.getElementById('journal-entry-input');
const saveJournalBtn = document.getElementById('save-journal-btn');
const pastEntriesContainer = document.getElementById('past-entries-container');


// ==========================================================
//                 초기화 헬퍼 함수들
// ==========================================================
function setInitialTheme() {
    const lastSelectedTheme = localStorage.getItem('selectedTheme');
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 19 || currentHour < 6;
    if (lastSelectedTheme && lastSelectedTheme !== 'default') {
        changeTheme(lastSelectedTheme);
        themeSelector.value = lastSelectedTheme;
    } else {
        if (isNight) { changeTheme('night'); themeSelector.value = 'night'; }
        else { changeTheme('default'); themeSelector.value = 'default'; }
    }
}
function setInitialMusic() {
    if (musicSelector && musicSelector.options.length > 0 && musicSelector.value) {
        const lastSelectedMusic = localStorage.getItem('selectedMusic');
        if (lastSelectedMusic) { musicSelector.value = lastSelectedMusic; }
        backgroundMusic.src = `/static/music/${musicSelector.value}`;
    }
}
function setInitialSoundMixer() {
    const savedAmbientSound = localStorage.getItem('selectedAmbientSound') || 'none';
    const savedMusicVolume = localStorage.getItem('musicVolume') || '0.5';
    const savedAmbientVolume = localStorage.getItem('ambientVolume') || '0.5';
    ambientSelector.value = savedAmbientSound;
    if (savedAmbientSound !== 'none') { ambientSound.src = `/static/sounds/ambient/${savedAmbientSound}`; }
    musicVolumeSlider.value = savedMusicVolume;
    backgroundMusic.volume = savedMusicVolume;
    ambientVolumeSlider.value = savedAmbientVolume;
    ambientSound.volume = savedAmbientVolume;
}

// ==========================================================
//                     뽀모도로 타이머 기능
// ==========================================================
function loadCustomTimes() {
    const savedFocusTime = localStorage.getItem('focusTime');
    const savedBreakTime = localStorage.getItem('breakTime');
    if (savedFocusTime) { POMODORO_DURATION = parseInt(savedFocusTime) * 60; focusTimeInput.value = savedFocusTime; }
    if (savedBreakTime) { SHORT_BREAK_DURATION = parseInt(savedBreakTime) * 60; breakTimeInput.value = savedBreakTime; }
}
function loadTimerState() {
    const savedTimeLeft = localStorage.getItem('pomodoroTimeLeft');
    const savedPhase = localStorage.getItem('pomodoroCurrentPhase');
    if (savedTimeLeft && savedPhase) { timeLeft = parseInt(savedTimeLeft, 10); currentPhase = savedPhase; }
    else { timeLeft = POMODORO_DURATION; currentPhase = 'pomodoro'; }
    currentPhaseDisplay.textContent = getPhaseKoreanName(currentPhase);
}
function saveTimerState() { localStorage.setItem('pomodoroTimeLeft', timeLeft); localStorage.setItem('pomodoroCurrentPhase', currentPhase); }
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.title = `${timerDisplay.textContent} - 몬드의 코티지`;
}
function startTimer() {
    if (isPaused) {
        isPaused = false; startBtn.disabled = true; pauseBtn.disabled = false;
        timer = setInterval(() => {
            if (timeLeft > 0) { timeLeft--; updateTimerDisplay(); saveTimerState(); }
            else {
                clearInterval(timer); isPaused = true; bellSound.play();
                startBtn.disabled = false; pauseBtn.disabled = true;
                if (currentPhase === 'pomodoro') {
                    recordFocusSession(POMODORO_DURATION / 60);
                    alert(`🔔 집중 시간 종료! 대단해요!`);
                } else { alert(`🔔 ${getPhaseKoreanName(currentPhase)} 종료!`); }
            }
        }, 1000);
    }
}
function pauseTimer() { clearInterval(timer); isPaused = true; startBtn.disabled = false; pauseBtn.disabled = true; }
function resetTimer() { clearInterval(timer); isPaused = true; timeLeft = POMODORO_DURATION; currentPhase = 'pomodoro'; updateTimerDisplay(); saveTimerState(); startBtn.disabled = false; pauseBtn.disabled = true; currentPhaseDisplay.textContent = getPhaseKoreanName(currentPhase); }
function getPhaseKoreanName(phase) { switch (phase) { case 'pomodoro': return '집중 시간'; case 'short-break': return '짧은 휴식'; case 'long-break': return '긴 휴식'; default: return '알 수 없음'; } }
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// ==========================================================
//                     할 일 목록 기능
// ==========================================================
function loadTodos() { const savedTodos = localStorage.getItem('todos'); if (savedTodos) { todos = JSON.parse(savedTodos); renderTodos(); } }
function saveTodos() { localStorage.setItem('todos', JSON.stringify(todos)); }
function renderTodos() { todoList.innerHTML = ''; todos.forEach((todo, index) => { const li = document.createElement('li'); li.className = todo.completed ? 'completed' : ''; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = todo.completed; checkbox.addEventListener('change', () => toggleTodoComplete(index)); li.appendChild(checkbox); const span = document.createElement('span'); span.textContent = todo.text; li.appendChild(span); const deleteBtn = document.createElement('button'); deleteBtn.textContent = '삭제'; deleteBtn.className = 'delete-btn'; deleteBtn.addEventListener('click', () => deleteTodo(index)); li.appendChild(deleteBtn); todoList.appendChild(li); }); }
function addTodo() { const todoText = newTodoInput.value.trim(); if (todoText) { todos.push({ text: todoText, completed: false }); newTodoInput.value = ''; renderTodos(); saveTodos(); } }
function toggleTodoComplete(index) { todos[index].completed = !todos[index].completed; renderTodos(); saveTodos(); }
function deleteTodo(index) { todos.splice(index, 1); renderTodos(); saveTodos(); }
addTodoBtn.addEventListener('click', addTodo);
newTodoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addTodo(); } });

// ==========================================================
//                     설정 기능 (타이머, 음악, 테마, 믹서)
// ==========================================================
saveSettingsBtn.addEventListener('click', () => {
    const newFocusTime = parseInt(focusTimeInput.value);
    const newBreakTime = parseInt(breakTimeInput.value);
    if (isNaN(newFocusTime) || newFocusTime < 1 || isNaN(newBreakTime) || newBreakTime < 1) { alert("유효한 시간을 입력해주세요 (1분 이상)."); return; }
    POMODORO_DURATION = newFocusTime * 60; SHORT_BREAK_DURATION = newBreakTime * 60;
    localStorage.setItem('focusTime', newFocusTime); localStorage.setItem('breakTime', newBreakTime);
    alert("설정이 저장되었습니다!"); resetTimer();
});
function playCurrentMusic() {
    if (musicSelector.value) { const playPromise = backgroundMusic.play(); if (playPromise !== undefined) { playPromise.catch(error => {}); } }
    if (ambientSelector.value !== 'none') { const ambientPromise = ambientSound.play(); if (ambientPromise !== undefined) { ambientPromise.catch(error => {}); } }
}
playMusicBtn.addEventListener('click', () => { if (backgroundMusic.paused) { playCurrentMusic(); } else { backgroundMusic.pause(); ambientSound.pause(); } });
pauseMusicBtn.addEventListener('click', () => { backgroundMusic.pause(); ambientSound.pause(); });
backgroundMusic.addEventListener('play', () => { playMusicBtn.textContent = "재생 중"; });
backgroundMusic.addEventListener('pause', () => { playMusicBtn.textContent = "재생"; });
backgroundMusic.addEventListener('ended', () => { nextMusicBtn.click(); });
nextMusicBtn.addEventListener('click', () => { let nextIndex = musicSelector.selectedIndex + 1; if (nextIndex >= musicSelector.options.length) { nextIndex = 0; } musicSelector.selectedIndex = nextIndex; musicSelector.dispatchEvent(new Event('change')); });
prevMusicBtn.addEventListener('click', () => { let prevIndex = musicSelector.selectedIndex - 1; if (prevIndex < 0) { prevIndex = musicSelector.options.length - 1; } musicSelector.selectedIndex = prevIndex; musicSelector.dispatchEvent(new Event('change')); });
musicSelector.addEventListener('change', () => {
    const selectedMusicFile = musicSelector.value;
    backgroundMusic.src = `/static/music/${selectedMusicFile}`;
    backgroundMusic.load();
    // 음악과 테마를 연결하는 규칙
    const musicToThemeMap = {
        '비 오는 날 창가에서 공부하는 느낌.mp3': 'rain',
        '아늑한 벽난로 옆에서 책 읽는 느낌.mp3': 'fireplace',
        '아늑한 벽난로 옆에서 책 읽는 느낌_1.mp3': 'fireplace',
        '아늑한 벽난로 옆에서 책 읽는 느낌_2.mp3': 'fireplace',
        '고요한 숲 속 오두막에서 휴식하는 느낌.mp3': 'forest',
        '고요한 숲 속 오두막에서 휴식하는 느낌.mp3': 'forest',
        '고요한 숲 속 오두막에서 휴식하는 느낌_1.mp3': 'forest',
        '고요한 숲 속 오두막에서 휴식하는 느낌_2.mp3': 'forest',
        '새벽녘 고요한 방에서 명상하는 느낌.mp3': 'night',
        '미니멀하고 따뜻한 공간에서의 사색.mp3': 'fireplace',
        '미니멀하고 따뜻한 공간에서의 사색_1.mp3': 'fireplace',
        '미니멀하고 따뜻한 공간에서의 사색_2.mp3': 'fireplace',
        '미니멀하고 따뜻한 공간에서의 사색_3.mp3': 'fireplace',
        '밤에 키보드로 글을 쓰는 느낌.mp3': 'night',
        '밤에 키보드로 글을 쓰는 느낌_1.mp3': 'night',
        '_Rainy Seoul Night_1.mp3': 'rain',
        '_Rainy Seoul Night_.mp3': 'rain',
        '_Wood Cabin Study_.mp3': 'forest',
        'Quiet Evenings.mp3': 'default',
    };
    const newTheme = musicToThemeMap[selectedMusicFile] || 'default';
    changeTheme(newTheme);
    playCurrentMusic();
    localStorage.setItem('selectedMusic', selectedMusicFile);
});
themeSelector.addEventListener('change', () => { changeTheme(themeSelector.value); });
ambientSelector.addEventListener('change', () => {
    const selectedAmbientFile = ambientSelector.value;
    localStorage.setItem('selectedAmbientSound', selectedAmbientFile);
    if (selectedAmbientFile === 'none') { ambientSound.pause(); ambientSound.src = ''; }
    else { ambientSound.src = `/static/sounds/ambient/${selectedAmbientFile}`; ambientSound.load(); if (!backgroundMusic.paused) { ambientSound.play(); } }
});
musicVolumeSlider.addEventListener('input', () => { const newVolume = musicVolumeSlider.value; backgroundMusic.volume = newVolume; localStorage.setItem('musicVolume', newVolume); });
ambientVolumeSlider.addEventListener('input', () => { const newVolume = ambientVolumeSlider.value; ambientSound.volume = newVolume; localStorage.setItem('ambientVolume', newVolume); });
function changeTheme(theme) { document.body.className = ''; if (theme !== 'default') { document.body.classList.add(theme); } localStorage.setItem('selectedTheme', theme); changeFaviconBasedOnTheme(theme); }
function changeFaviconBasedOnTheme(theme) {
    const themeToIconMap = { 'rain': 'leaf.ico', 'fireplace': 'house.ico', 'forest': 'tree.ico', 'night': 'moon.ico', 'default': 'favicon.ico' };
    favicon.href = `/static/${themeToIconMap[theme] || 'favicon.ico'}`;
}

// ==========================================================
//                     음악 라이브러리 기능 
// ==========================================================
const moodSelector = document.getElementById('mood-selector');

// 분위기에 맞춰 음악 목록을 채워주는 함수
function populateMusicSelector(mood) {
    musicSelector.innerHTML = ''; // 기존 목록 비우기
    
    const filteredMusic = (mood === 'all')
        ? musicLibrary // '모든 음악'이면 전체 목록
        : musicLibrary.filter(track => track.tag === mood); // 아니면 태그로 필터링

    filteredMusic.forEach(track => {
        const option = document.createElement('option');
        option.value = track.file; // 실제 파일명을 값으로
        option.textContent = track.name; // 보여줄 이름을 텍스트로
        musicSelector.appendChild(option);
    });

    // 음악 목록이 바뀌었으니, 첫 번째 곡으로 소스를 업데이트
    if (musicSelector.options.length > 0) {
        musicSelector.dispatchEvent(new Event('change'));
    }
}

// 분위기 선택 드롭다운에 이벤트 리스너 추가
moodSelector.addEventListener('change', () => {
    const selectedMood = moodSelector.value;
    populateMusicSelector(selectedMood);
});


// (이하 모든 기능의 코드는 이전 버전과 동일하게 유지됩니다.
//  가장 큰 변화는 musicLibrary를 사용하도록 바뀐 것과,
//  분위기 선택에 따라 음악 목록이 바뀌는 기능이 추가된 것입니다.)

// ==========================================================
//                     목표 기능 (주간, 일일)
// ==========================================================
function recordFocusSession(durationMinutes) {
    const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || [];
    const today = new Date().toISOString().slice(0, 10);
    stats.push({ date: today, duration: durationMinutes });
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
    updateGoalProgress();
    updateQuestProgress();
}
function getStartOfWeek(date) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)).toISOString().slice(0, 10); }
function updateGoalProgress() {
    const weeklyGoal = parseInt(localStorage.getItem('weeklyGoal')) || 0;
    goalInput.value = weeklyGoal > 0 ? weeklyGoal : '';
    if (weeklyGoal <= 0) { goalProgressText.textContent = "이번 주 목표를 설정해주세요!"; progressBar.style.width = '0%'; progressBar.textContent = ''; return; }
    const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || [];
    const startOfWeek = getStartOfWeek(new Date());
    let currentWeekCount = 0;
    stats.forEach(session => { if (session.date >= startOfWeek) { currentWeekCount++; } });
    goalProgressText.textContent = `진행 상황: ${currentWeekCount} / ${weeklyGoal} 회`;
    if (currentWeekCount >= weeklyGoal) { progressBar.style.width = '100%'; progressBar.style.backgroundColor = '#e5c07b'; progressBar.textContent = '목표 달성!'; }
    else { const percentage = (currentWeekCount / weeklyGoal) * 100; progressBar.style.width = `${percentage}%`; progressBar.style.backgroundColor = '#a3da8d'; progressBar.textContent = `${Math.round(percentage)}%`; }
}
function saveGoal() {
    const goalValue = parseInt(goalInput.value);
    if (isNaN(goalValue) || goalValue < 1) { alert("유효한 목표 횟수를 입력해주세요."); return; }
    localStorage.setItem('weeklyGoal', goalValue);
    alert("이번 주 목표가 저장되었습니다!");
    updateGoalProgress();
}
saveGoalBtn.addEventListener('click', saveGoal);

function updateQuestProgress() {
    let dailyQuestData = JSON.parse(localStorage.getItem('dailyQuest')) || { date: null, count: 0, goal: 4 };
    const today = new Date().toISOString().slice(0, 10);

    // 날짜가 바뀌었으면 퀘스트 초기화
    if (dailyQuestData.date !== today) {
        // ⭐⭐ 여기부터 수정! ⭐⭐
        // 3, 4, 5 중에서 랜덤으로 목표를 설정합니다.
        const questGoals = [3, 4, 5];
        const randomGoal = questGoals[Math.floor(Math.random() * questGoals.length)];
        
        dailyQuestData = { date: today, count: 0, goal: randomGoal };
        // ⭐⭐ 여기까지 수정! ⭐⭐
    }

    // 전역 변수에도 오늘의 목표를 업데이트
    DAILY_QUEST_GOAL = dailyQuestData.goal;

    // 통계 데이터를 기반으로 오늘 달성 횟수를 다시 계산 (정확성을 위해)
    const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || [];
    let todayCount = 0;
    stats.forEach(session => {
        if (session.date === today) {
            todayCount++;
        }
    });
    dailyQuestData.count = todayCount;
    localStorage.setItem('dailyQuest', JSON.stringify(dailyQuestData));


    // UI 업데이트
    questProgressText.textContent = `달성 현황: ${dailyQuestData.count} / ${DAILY_QUEST_GOAL} 회`;
    questDescription.textContent = `뽀모도로 ${DAILY_QUEST_GOAL}회 완료하기`;

    // 보상 메시지 표시/숨김
    if (dailyQuestData.count >= DAILY_QUEST_GOAL) {
        rewardMessage.classList.remove('hidden');
    } else {
        rewardMessage.classList.add('hidden');
    }
}

// ==========================================================
//                     기록 기능 (통계, 일지)
// ==========================================================
function generateStatsChart() {
    const stats = JSON.parse(localStorage.getItem('pomodoroStats')) || [];
    const processedData = {}; let totalMinutes = 0;
    stats.forEach(session => { processedData[session.date] = (processedData[session.date] || 0) + session.duration; totalMinutes += session.duration; });
    const labels = Object.keys(processedData).sort().slice(-7);
    const data = labels.map(label => processedData[label]);
    const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60;
    totalFocusTimeDisplay.textContent = `총 집중 시간: ${hours}시간 ${minutes}분`;
    if (chartInstance) { chartInstance.destroy(); }
    chartInstance = new Chart(pomodoroChartCanvas, {
        type: 'bar', data: { labels: labels, datasets: [{ label: '집중 시간 (분)', data: data, backgroundColor: 'rgba(163, 218, 141, 0.6)', borderColor: 'rgba(163, 218, 141, 1)', borderWidth: 1 }] },
        options: { scales: { y: { beginAtZero: true, ticks: { color: '#e0e0e0' } }, x: { ticks: { color: '#e0e0e0' } } }, plugins: { legend: { labels: { color: '#e0e0e0' } } } }
    });
}
function saveJournalEntry() {
    const entryText = journalEntryInput.value.trim();
    if (!entryText) { alert("일기 내용을 입력해주세요."); return; }
    const journalEntries = JSON.parse(localStorage.getItem('pomodoroJournal')) || [];
    const today = new Date().toISOString().slice(0, 10);
    journalEntries.push({ date: today, text: entryText });
    localStorage.setItem('pomodoroJournal', JSON.stringify(journalEntries));
    journalEntryInput.value = ''; alert("일기가 저장되었습니다!");
    displayPastEntries();
}
function displayPastEntries() {
    const journalEntries = JSON.parse(localStorage.getItem('pomodoroJournal')) || [];
    pastEntriesContainer.innerHTML = '';
    if (journalEntries.length === 0) { pastEntriesContainer.innerHTML = '<p>작성된 일기가 없습니다.</p>'; return; }
    journalEntries.slice().reverse().forEach(entry => {
        const entryDiv = document.createElement('div'); entryDiv.className = 'journal-entry';
        const dateDiv = document.createElement('div'); dateDiv.className = 'date'; dateDiv.textContent = entry.date;
        const textP = document.createElement('p'); textP.className = 'text'; textP.textContent = entry.text;
        entryDiv.appendChild(dateDiv); entryDiv.appendChild(textP);
        pastEntriesContainer.appendChild(entryDiv);
    });
}
saveJournalBtn.addEventListener('click', saveJournalEntry);