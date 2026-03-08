import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DDaySection from './components/DDaySection';
import CalendarView from './components/CalendarView';
import PomodoroTimer from './components/PomodoroTimer';
import TodoSection from './components/TodoSection';
import PomoHeatmap from './components/PomoHeatmap';
import GardenAlbum from './components/GardenAlbum';
import WeatherOverlay from './components/WeatherOverlay';

// 🚀 성능 최적화: 당장 화면에 보이지 않는 거대한 모달/리포트 컴포넌트는 지연 로딩(Lazy Loading) 적용
const Modals = lazy(() => import('./components/Modals'));
const ReportDashboard = lazy(() => import('./components/ReportDashboard'));

import { useLocalStorage } from './hooks/useLocalStorage';
import useAchievements from './hooks/useAchievements';
import useAppInit from './hooks/useAppInit';
import { CATEGORIES, WEEKDAYS, DEFAULT_QUOTES, SUBJECT_COLORS, MOODS, SEASONS } from './constants';
import { formatYMD, parseYMD, generateId } from './utils/dateHelpers';
import {
  fetchStatus, redirectToGoogleLogin, redirectToLogout,
  fetchTasks, addGoogleTask, addCalendarEvent,
  fetchWeather, addCustomCalendarEvent
} from './utils/api';
import { loadStoredPlaylist, saveTrackToDB, deleteTrackFromDB } from './utils/playlistStore';
import { playNotificationSound } from './utils/audioEffects';
import { generateCottageGreeting } from './utils/aiBot';
import { sendSmartDailyNotification } from './utils/notifications';

export default function App() {
  // --- States ---
  const [isDarkMode, setIsDarkMode] = useLocalStorage('gplanner-dark', false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Cottage Moods Theme
  const [currentMood, setCurrentMood] = useLocalStorage('gplanner-mood', 'classic');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDDayModal, setShowDDayModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);
  const [showGardenAlbum, setShowGardenAlbum] = useState(false);
  const [showReportDashboard, setShowReportDashboard] = useState(false);

  // D-Day & Add Event
  const [editingDDayIdx, setEditingDDayIdx] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(formatYMD(new Date()));
  const [newEventTime, setNewEventTime] = useState('14:00'); // 시간 동기화 기본값
  const [newEventCategory, setNewEventCategory] = useState('other');
  const [newEventLocation, setNewEventLocation] = useState('');

  // Pomodoro Timer States 🍅 & 🍃
  const [pomoDuration, setPomoDuration] = useState(25);
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [isPomoActive, setIsPomoActive] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); // 'work' | 'rest'
  const [pomoHistory, setPomoHistory] = useLocalStorage('gplanner-pomos', {});
  const [pomoSessions, setPomoSessions] = useLocalStorage('gplanner-sessions', []);
  const [appTheme, setAppTheme] = useLocalStorage('gplanner-theme', {
    font: 'font-sans',
    bgDim: 'bg-slate-900/40',
    bgBlur: 'backdrop-blur-sm'
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [currentPomoTag, setCurrentPomoTag] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [showParcel, setShowParcel] = useState(false); // 🎁 소포(알림) 모달 상태
  const [isZenMode, setIsZenMode] = useState(false); // 🧘🏼 집중 모드 (Zen Mode)

  const audioRef = useRef(null);
  const [playlist, setPlaylist] = useState([]); // [{ name: string, url: string }]
  const [currentTrackIdx, setCurrentTrackIdx] = useState(-1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Settings / Stats
  const [targetReadings, setTargetReadings] = useLocalStorage('gplanner-target', 100);
  const [celebratingId, setCelebratingId] = useState(null);
  const [streakData, setStreakData] = useLocalStorage('gplanner-streak', { streak: 0, lastDate: '' });

  // Persistent Data States
  const [customQuotes, setCustomQuotes] = useLocalStorage('gplanner-quotes', DEFAULT_QUOTES);
  const [newQuoteInput, setNewQuoteInput] = useState('');

  // 총 수확량 계산 및 성취 배지 훅 연결 🏅
  const totalHarvest = Object.values(pomoHistory).reduce((a, b) => a + b, 0);
  const { achievements, newUnlocked, closeAchievement } = useAchievements(pomoSessions, totalHarvest);

  const [dDays, setDDays] = useLocalStorage('gplanner-ddays', [
    { id: generateId(), title: '국가직 시험', date: '2026-04-05', color: 'from-blue-500 to-blue-700' },
    { id: generateId(), title: '지방직 시험', date: '2026-06-13', color: 'from-purple-500 to-pink-600' }
  ]);

  const [subjects, setSubjects] = useLocalStorage('gplanner-subjects', [
    { id: generateId(), name: '집중 공부 시간', history: {}, color: 'bg-indigo-400' }
  ]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[4].value);

  const [diaries, setDiaries] = useLocalStorage('gplanner-diaries', {});
  const [todos, setTodos] = useLocalStorage('gplanner-todos', [
    { id: generateId(), text: '코티지 플래너 정리하기', completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  // 마지막 접속 날짜 상태 추가
  const [lastActiveDate, setLastActiveDate] = useLocalStorage('gplanner-last-date', formatYMD(new Date()));

  const [events, setEvents] = useLocalStorage('gplanner-events', []);

  // Google Calendar 연동 상태
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);

  // Settings Modal States
  const [settingsMessage, setSettingsMessage] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // --- Effects ---

  // 1️⃣ 앱 초기 로딩 및 데이터 동기화 관리 (분리된 커스텀 훅)
  useAppInit({
    lastActiveDate, setLastActiveDate,
    setTodos, todos,
    setIsGoogleLoggedIn,
    setPlaylist, setCurrentTrackIdx,
    dDays
  });

  // ⌨️ 전역 키보드 단축키 (Zen 모드, 타이머 조작)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 입력창(input, textarea)에서 타이핑 중일 때는 단축키 무시
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputting = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;
      if (isInputting) return;

      switch (e.code) {
        case 'Escape':
          // 열려있는 모달 요소들 닫기
          setShowAddModal(false);
          setShowDDayModal(false);
          setShowSettingsModal(false);
          setShowHeatmapModal(false);
          setShowGardenAlbum(false);
          break;
        case 'Space':
          // 타이머 시작/일시정지 토글 (기본 스크롤 방지)
          e.preventDefault();
          setIsPomoActive(prev => !prev);
          break;
        case 'KeyZ':
          // Zen Mode 토글
          e.preventDefault();
          setIsZenMode(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ☁️ 날씨 정보 패치 및 테마 자동 연동
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await fetchWeather(latitude, longitude);
        if (data) {
          setWeatherData(data);

          // 💡 감성 자동화: 비가 오면 자동으로 'rainy' 테마로 전환 (최초 1회 또는 날씨 변경 시)
          const condition = data.condition?.toLowerCase();
          if (['rain', 'drizzle', 'thunderstorm'].includes(condition)) {
            setCurrentMood('rainy');
            // 사용자에게 알림봇으로 알려주면 더 좋음 (생략 가능)
          }
        }
      }, (err) => {
        console.warn("Geolocation Error:", err.message);
      });
    }
  }, [setCurrentMood]);

  // 뽀모도로 타이머 로직
  useEffect(() => {
    let interval = null;
    if (isPomoActive && pomoTime > 0) {
      interval = setInterval(() => {
        setPomoTime(prev => prev - 1);
      }, 1000);
    } else if (isPomoActive && pomoTime === 0) {
      if (timerMode === 'work') {
        const todayStr = formatYMD(new Date());
        const now = new Date();
        setPomoHistory(prev => ({ ...prev, [todayStr]: (prev[todayStr] || 0) + 1 }));

        // 📝 세션 로그 기록
        const activeSubject = subjects.find(s => s.id === selectedSubjectId);
        setPomoSessions(prev => [
          { id: generateId(), date: todayStr, startTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, duration: pomoDuration, subjectId: activeSubject?.id || null, subjectName: activeSubject?.name || '자유 집중', subjectColor: activeSubject?.color || 'bg-slate-400', tag: currentPomoTag.trim() },
          ...prev
        ].slice(0, 500));
        setCurrentPomoTag('');

        // 구글 캘린더에 이벤트 자동 전송 🗓️
        if (isGoogleLoggedIn) {
          addCalendarEvent(pomoDuration).then(res => {
            if (res.success) console.log('📅 구글 캘린더에 기록 완료!');
          });
        }

        // 알림음 재생 및 모달 활성화 🔔
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('수확의 기쁨! 🍅', {
            body: `대단해요! ${pomoDuration}분 집중을 완료했어요.\n달콤한 휴식을 즐기세요.`,
            icon: '/icon-192x192.png'
          });
        }

        setTimeout(() => {
          setShowParcel(true);
          setTimerMode('rest');
          setPomoTime(10 * 60);
        }, 0);
      } else {
        // 알림음 재생 및 모달 활성화 🔔
        playNotificationSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('이제 다시 시작할 시간 🍃', {
            body: `휴식이 끝났어요. 깊은 호흡 한 번 하고 다시 화이팅!`,
            icon: '/icon-192x192.png'
          });
        }

        setTimeout(() => {
          setShowParcel(true);
          setTimerMode('work');
          setPomoTime(pomoDuration * 60);
          setIsPomoActive(false);
        }, 0);
      }
    }
    return () => clearInterval(interval);
  }, [isPomoActive, pomoTime, timerMode, pomoDuration, setPomoHistory, isGoogleLoggedIn, subjects, selectedSubjectId, setPomoSessions]);

  const changePomoDuration = (mins) => {
    setPomoDuration(mins);
    setTimerMode('work');
    setPomoTime(mins * 60);
    setIsPomoActive(false);
  };

  const handleAudioUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newTracks = [];
      for (const file of files) {
        const id = await saveTrackToDB(file.name, file);
        newTracks.push({
          id,
          name: file.name,
          url: URL.createObjectURL(file)
        });
      }

      const updatedPlaylist = [...playlist, ...newTracks];
      setPlaylist(updatedPlaylist);

      // 처음 올리는 거라면 첫 곡으로 설정
      if (currentTrackIdx === -1) {
        setCurrentTrackIdx(0);
        if (audioRef.current) {
          audioRef.current.src = newTracks[0].url;
          audioRef.current.load();
        }
      }
    }
  };

  const playTrack = (index) => {
    if (index < 0 || index >= playlist.length) return;
    setCurrentTrackIdx(index);
    if (audioRef.current) {
      audioRef.current.src = playlist[index].url;
      audioRef.current.load();
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const removeTrack = async (e, index) => {
    e.stopPropagation();
    const trackToRemove = playlist[index];

    // IndexedDB에서 삭제
    if (trackToRemove.id) {
      await deleteTrackFromDB(trackToRemove.id);
    }

    const updated = playlist.filter((_, i) => i !== index);
    setPlaylist(updated);

    if (index === currentTrackIdx) {
      setIsPlayingAudio(false);
      if (audioRef.current) audioRef.current.pause();
      setCurrentTrackIdx(updated.length > 0 ? 0 : -1);
      if (updated.length > 0 && audioRef.current) {
        audioRef.current.src = updated[0].url;
        audioRef.current.load();
      }
    } else if (index < currentTrackIdx) {
      setCurrentTrackIdx(prev => prev - 1);
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current || currentTrackIdx === -1) return;
    if (isPlayingAudio) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlayingAudio(!isPlayingAudio);
  };

  const saveDiary = (text) => {
    const dateStr = formatYMD(selectedDate);
    setDiaries(prev => ({ ...prev, [dateStr]: text }));
  };

  // --- Data Management ---
  const handleBackup = () => {
    const data = { dDays, events, subjects, todos, isDarkMode, targetReadings, customQuotes, diaries, pomoHistory };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gonggong-planner-backup-${formatYMD(new Date())}.json`;
    a.click();
    setSettingsMessage('✨ 타임캡슐이 안전하게 다운로드 되었습니다!');
    setTimeout(() => setSettingsMessage(''), 3000);
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.dDays) setDDays(data.dDays);
        if (data.events) setEvents(data.events);
        if (data.subjects) setSubjects(data.subjects);
        if (data.todos) setTodos(data.todos);
        if (typeof data.isDarkMode === 'boolean') setIsDarkMode(data.isDarkMode);
        if (data.targetReadings) setTargetReadings(data.targetReadings);
        if (data.customQuotes) setCustomQuotes(data.customQuotes);
        if (data.diaries) setDiaries(data.diaries);
        if (data.pomoHistory) setPomoHistory(data.pomoHistory);
        setSettingsMessage('💖 타임캡슐에서 과거의 기록을 모두 꺼냈습니다!');
      } catch {
        setSettingsMessage('🥲 앗, 파일 형식이 잘못되었습니다.');
      }
      setTimeout(() => setSettingsMessage(''), 3000);
    };
    reader.readAsText(file);
  };

  const handleResetAll = () => {
    localStorage.clear();
    window.location.reload();
  };

  // --- Handlers ---
  const addQuote = (e) => {
    e.preventDefault();
    if (!newQuoteInput.trim()) return;
    setCustomQuotes(prev => [...prev, newQuoteInput.trim()]);
    setNewQuoteInput('');
  };

  const deleteQuote = (idx) => {
    if (customQuotes.length <= 1) {
      setSettingsMessage('최소 1개의 명언은 남겨두어야 합니다! ✨');
      setTimeout(() => setSettingsMessage(''), 2000);
      return;
    }
    setCustomQuotes(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleReading = (id, increment) => {
    const dateStr = formatYMD(selectedDate);
    setSubjects(prev => prev.map(s => {
      if (s.id !== id) return s;
      const currentHistory = s.history || {};
      const currentCount = currentHistory[dateStr] || 0;
      return { ...s, history: { ...currentHistory, [dateStr]: Math.max(0, currentCount + increment) } };
    }));
  };

  const addSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setSubjects(prev => [...prev, { id: generateId(), name: newSubjectName.trim(), history: {}, color: newSubjectColor }]);
    setNewSubjectName('');
  };

  const deleteSubject = (id) => setSubjects(prev => prev.filter(s => s.id !== id));

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        if (!t.completed) {
          setCelebratingId(id);
          setTimeout(() => setCelebratingId(null), 1000);

          const today = formatYMD(new Date());
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = formatYMD(yesterdayDate);

          setStreakData(prevStreak => {
            if (prevStreak.lastDate === today) return prevStreak;
            if (prevStreak.lastDate === yesterday) return { streak: prevStreak.streak + 1, lastDate: today };
            return { streak: 1, lastDate: today };
          });
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const addTodo = async (eOrData) => {
    if (eOrData && eOrData.preventDefault) eOrData.preventDefault();

    const isObject = eOrData && typeof eOrData === 'object' && 'text' in eOrData;
    const text = isObject ? eOrData.text : newTodo;

    if (!text?.trim()) return;

    const todoToAdd = {
      id: generateId(),
      text: text.trim(),
      completed: false,
      ...(isObject && eOrData.priority && eOrData.priority !== 'none' && { priority: eOrData.priority }),
      ...(isObject && eOrData.tag && { tag: eOrData.tag.trim() }),
      ...(isObject && eOrData.deadline && { deadline: eOrData.deadline })
    };

    setTodos(prev => [...prev, todoToAdd]);
    setNewTodo('');

    // 구글 로그인 상태라면 구글 Tasks에도 추가
    if (isGoogleLoggedIn) {
      const res = await addGoogleTask(text.trim());
      if (res.success) {
        console.log('✅ Google Tasks에 할 일 추가 성공!');
      }
    }
  };
  const deleteTodo = (id) => setTodos(prev => prev.filter(t => t.id !== id));

  const saveDDay = (e) => {
    e.preventDefault();
    if (editingDDayIdx === null) return;
    setDDays(prev => prev.map((d, i) => i === editingDDayIdx ? { ...d, title: modalTitle, date: modalDate } : d));
    setShowDDayModal(false);
    setEditingDDayIdx(null);
  };
  const openEditDDay = (idx) => {
    setEditingDDayIdx(idx);
    setModalTitle(dDays[idx].title);
    setModalDate(dDays[idx].date);
    setShowDDayModal(true);
  };

  const addEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;

    // 로컬 상태 추가
    const newEventObj = {
      id: generateId(),
      title: newEventTitle.trim(),
      date: newEventDate,
      time: newEventTime,
      category: newEventCategory,
      location: newEventLocation.trim() || '미정'
    };
    setEvents(prev => [...prev, newEventObj]);

    // 🌍 구글 캘린더 동기화 로직
    if (isGoogleLoggedIn) {
      try {
        const startDateTime = new Date(`${newEventDate}T${newEventTime || '00:00'}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 일정 1시간 부여

        await addCustomCalendarEvent({
          title: newEventObj.title,
          location: newEventObj.location === '미정' ? '' : newEventObj.location,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString()
        });
      } catch (err) {
        console.error("구글 캘린더 동기화 실패:", err);
      }
    }

    setNewEventTitle(''); setNewEventLocation(''); setNewEventCategory('other'); setNewEventTime('14:00'); setShowAddModal(false);
  };
  const deleteEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id));

  // --- Analytics ---
  const totalReadings = useMemo(() => subjects.reduce((sum, s) => sum + Object.values(s.history || {}).reduce((a, b) => a + b, 0), 0), [subjects]);
  const todoCompletionRate = useMemo(() => todos.length === 0 ? 0 : Math.round((todos.filter(t => t.completed).length / todos.length) * 100), [todos]);

  const requiredPace = useMemo(() => {
    const todayStr = new Date().setHours(0, 0, 0, 0);
    const futureDDays = dDays.map(d => {
      const dDate = parseYMD(d.date).getTime();
      return { ...d, diffDays: Math.round((dDate - todayStr) / (1000 * 60 * 60 * 24)) };
    }).filter(d => d.diffDays > 0).sort((a, b) => a.diffDays - b.diffDays);
    if (futureDDays.length === 0) return 0;
    const remainingToRead = Math.max(0, targetReadings - totalReadings);
    return futureDDays[0].diffDays > 0 ? (remainingToRead / futureDDays[0].diffDays).toFixed(1) : 0;
  }, [dDays, totalReadings, targetReadings]);

  const weeklyChartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dStr = formatYMD(d);
      const dayTotal = subjects.reduce((sum, s) => sum + (s.history?.[dStr] || 0), 0);
      data.push({ label: `${d.getDate()}일`, total: dayTotal, fullDate: dStr });
    }
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    return data.map(d => ({ ...d, height: (d.total / maxTotal) * 100 }));
  }, [subjects]);

  const days = useMemo(() => {
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const arr = [];
    const totalDays = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= totalDays; i++) arr.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    return arr;
  }, [currentDate]);

  const displayedEvents = searchQuery.trim() !== ''
    ? events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.location.toLowerCase().includes(searchQuery.toLowerCase()))
    : events.filter(event => event.date === formatYMD(selectedDate));

  const todaysQuote = useMemo(() => customQuotes[new Date().getDate() % customQuotes.length] || DEFAULT_QUOTES[0], [customQuotes]);
  const selectedDateTomatoes = useMemo(() => pomoHistory[formatYMD(selectedDate)] || 0, [pomoHistory, selectedDate]);

  const currentMoodData = MOODS[currentMood] || MOODS.classic;

  // 💡 Phase 16: 현재 월(Month) 기반 계절 배경화면 가져오기
  const currentSeasonImage = useMemo(() => {
    const month = new Date().getMonth() + 1; // 1~12
    const seasonKey = Object.keys(SEASONS).find(key => SEASONS[key].months.includes(month));
    return seasonKey ? SEASONS[seasonKey].image : currentMoodData.bgImage;
  }, [currentMoodData.bgImage]);

  // 'classic' 테마일 경우 계절 이미지로 교체, 그 외는 설정된 테마의 bgImage 사용
  const displayBgImage = currentMood === 'classic' ? currentSeasonImage : currentMoodData.bgImage;

  const aiGreeting = useMemo(() =>
    generateCottageGreeting(streakData.streak, selectedDateTomatoes, currentMoodData, timerMode === 'work'),
    [streakData.streak, selectedDateTomatoes, currentMoodData, timerMode]);

  const rankTitle = useMemo(() => {
    if (totalHarvest >= 100) return '👑 오두막 주인';
    if (totalHarvest >= 50) return '🏅 마을의 자랑';
    if (totalHarvest >= 10) return '🧺 능숙한 농부';
    return '🌱 견습 정원사';
  }, [totalHarvest]);

  const appBgClasses = timerMode === 'work' ? currentMoodData.workBg : currentMoodData.restBg;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen ${appTheme?.font || 'font-sans'} selection:bg-blue-200`}>
      <div
        className="min-h-screen bg-cover bg-center bg-fixed transition-all duration-1000 relative flex flex-col"
        style={{ backgroundImage: displayBgImage ? `url('${displayBgImage}')` : 'none' }}
      >
        {/* 테마 배경 오버레이 (밝기 및 블러 효과) */}
        <div className={`absolute inset-0 z-0 pointer-events-none transition-all duration-1000 ${appTheme?.bgDim || 'bg-slate-900/40'} ${appTheme?.bgBlur || 'backdrop-blur-sm'}`}></div>

        {/* 그라데이션 오버레이 (약하게) */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-1000 opacity-30 dark:opacity-50 ${appBgClasses} pointer-events-none`}></div>

        {/* 🌅 시간대별 창풍경 오버레이 (Lighting Filter) */}
        {(() => {
          const hour = new Date().getHours();
          let timeOverlay = '';
          if (hour >= 5 && hour < 8) {
            // 새벽 — 보라빛 안개
            timeOverlay = 'bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent mix-blend-overlay';
          } else if (hour >= 8 && hour < 16) {
            // 낮 — 밝은 하늘
            timeOverlay = 'bg-gradient-to-b from-sky-400/10 via-amber-200/5 to-transparent mix-blend-overlay';
          } else if (hour >= 16 && hour < 19) {
            // 노을 — 따뜻한 주황/붉은색 (Overlay blend)
            timeOverlay = 'bg-gradient-to-b from-orange-600/30 via-pink-600/20 to-transparent mix-blend-overlay';
          } else {
            // 밤 — 짙은 남색 및 촛불 주위 광원 유도
            timeOverlay = 'bg-gradient-to-b from-indigo-950/50 via-slate-900/40 to-black/30 mix-blend-multiply';
          }
          return <div className={`absolute inset-0 transition-all duration-[3000ms] pointer-events-none z-[2] ${timeOverlay}`} />;
        })()}

        {/* 🌧️ 날씨 파티클 레이어 (근경/중경/원경 3D 효과) */}
        <WeatherOverlay weatherData={weatherData} />

        {/* 실제 컨텐츠 */}
        <div className="relative z-10 flex-1 text-slate-700 dark:text-slate-100 p-4 md:p-8">

          {!isZenMode && (
            <>
              <Header
                isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
                searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                setShowSettingsModal={setShowSettingsModal} setShowQuoteModal={setShowQuoteModal}
                streakData={streakData} rankTitle={rankTitle} todaysQuote={todaysQuote} aiGreeting={aiGreeting}
                currentMood={currentMood} setCurrentMood={setCurrentMood} MOODS={MOODS}
                isGoogleLoggedIn={isGoogleLoggedIn}
                onGoogleLogin={redirectToGoogleLogin}
                onGoogleLogout={redirectToLogout}
                onShowHeatmap={() => setShowHeatmapModal(true)}
                onShowGardenAlbum={() => setShowGardenAlbum(true)}
                onShowReport={() => setShowReportDashboard(true)}
                weatherData={weatherData}
              />

              <Dashboard
                totalReadings={totalReadings} todoCompletionRate={todoCompletionRate}
                requiredPace={requiredPace} targetReadings={targetReadings}
                setTargetReadings={setTargetReadings} weeklyChartData={weeklyChartData}
              />

              <DDaySection dDays={dDays} setDDays={setDDays} openEditDDay={openEditDDay} />
            </>
          )}

          <main className={`mx-auto grid grid-cols-1 gap-4 sm:gap-8 px-3 sm:px-0 ${isZenMode ? 'max-w-4xl place-items-center min-h-[80vh] flex flex-col justify-center' : 'max-w-7xl lg:grid-cols-12'}`}>

            {!isZenMode && (
              <div className="lg:col-span-8 space-y-8">
                <CalendarView
                  currentDate={currentDate} setCurrentDate={setCurrentDate} days={days} events={events}
                  selectedDate={selectedDate} setSelectedDate={setSelectedDate} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                  subjects={subjects} toggleReading={toggleReading} deleteSubject={deleteSubject} addSubject={addSubject}
                  newSubjectName={newSubjectName} setNewSubjectName={setNewSubjectName}
                  newSubjectColor={newSubjectColor} setNewSubjectColor={setNewSubjectColor}
                />
              </div>
            )}

            <div className={`${isZenMode ? 'w-full max-w-2xl mx-auto' : 'lg:col-span-4'} space-y-8 transition-all duration-700`}>

              {isZenMode && (
                <div className="text-center mb-6 animate-pulse text-white/70 tracking-widest text-sm font-medium">
                  🧘🏼 Z 키를 눌러 젠 모드를 종료합니다
                </div>
              )}

              <PomodoroTimer
                themeBg={appBgClasses} currentMood={currentMood} defaultSound={currentMoodData.defaultSound}
                timerMode={timerMode} setTimerMode={setTimerMode} isPomoActive={isPomoActive} setIsPomoActive={setIsPomoActive}
                pomoTime={pomoTime} setPomoTime={setPomoTime} pomoDuration={pomoDuration} changePomoDuration={changePomoDuration}
                selectedDateTomatoes={selectedDateTomatoes} selectedDate={selectedDate}
                subjects={subjects} selectedSubjectId={selectedSubjectId} setSelectedSubjectId={setSelectedSubjectId}
                pomoSessions={pomoSessions}
                todos={todos} toggleTodo={toggleTodo}
                playlist={playlist} currentTrackIdx={currentTrackIdx} isPlayingAudio={isPlayingAudio} toggleAudio={toggleAudio} handleAudioUpload={handleAudioUpload} audioRef={audioRef}
                playTrack={playTrack} removeTrack={removeTrack} setPlaylist={setPlaylist} setIsPlayingAudio={setIsPlayingAudio} setCurrentTrackIdx={setCurrentTrackIdx}
                showParcel={showParcel} setShowParcel={setShowParcel}
                weatherData={weatherData}
                isZenMode={isZenMode} setIsZenMode={setIsZenMode}
                currentPomoTag={currentPomoTag} setCurrentPomoTag={setCurrentPomoTag}
              />

              {!isZenMode && (
                <TodoSection
                  selectedDate={selectedDate} diaries={diaries} saveDiary={saveDiary}
                  todos={todos} addTodo={addTodo} toggleTodo={toggleTodo} deleteTodo={deleteTodo} reorderTodos={setTodos} newTodo={newTodo} setNewTodo={setNewTodo} celebratingId={celebratingId}
                  searchQuery={searchQuery} displayedEvents={displayedEvents} deleteEvent={deleteEvent}
                  setNewEventDate={setNewEventDate} setShowAddModal={setShowAddModal}
                  pomoSessions={pomoSessions} currentMood={currentMood} weatherData={weatherData}
                  setCurrentPomoTag={setCurrentPomoTag}
                />
              )}
            </div>
          </main>

          {/* 히트맵 모달 */}
          {showHeatmapModal && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
              style={{ overscrollBehavior: 'contain' }}
              onClick={() => setShowHeatmapModal(false)}
            >
              <div
                className="max-w-4xl w-full overflow-hidden animate-[scaleIn_250ms_ease-out]"
                style={{ willChange: 'transform, opacity' }}
                onClick={e => e.stopPropagation()}
              >
                <PomoHeatmap pomoHistory={pomoHistory} pomoSessions={pomoSessions} subjects={subjects} currentMood={currentMood} onClose={() => setShowHeatmapModal(false)} />
              </div>
            </div>
          )}

          {/* 🌿 정원 앨범 모달 */}
          {showGardenAlbum && (
            <GardenAlbum
              pomoSessions={pomoSessions}
              pomoHistory={pomoHistory}
              subjects={subjects}
              currentMood={currentMood}
              onClose={() => setShowGardenAlbum(false)}
            />
          )}

          {/* 📊 리포트 대시보드 모달 */}
          {showReportDashboard && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"><div className="animate-spin text-4xl">🌀</div></div>}>
              <ReportDashboard
                pomoSessions={pomoSessions}
                onClose={() => setShowReportDashboard(false)}
              />
            </Suspense>
          )}

          {/* 🌟 성취 배지 달성 토스트 알림 */}
          {newUnlocked && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-indigo-900/90 text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-[slideUp_400ms_cubic-bezier(0.16,1,0.3,1)] pr-12">
              <div className="text-4xl animate-bounce">{newUnlocked.icon}</div>
              <div className="flex flex-col">
                <span className="text-xs text-indigo-200 font-bold tracking-wider">새로운 성취 달성!</span>
                <span className="text-lg font-extrabold">{newUnlocked.name}</span>
                <span className="text-sm text-indigo-100">{newUnlocked.description}</span>
              </div>
              <button 
                onClick={closeAchievement} 
                className="absolute top-3 right-3 text-indigo-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="알림 닫기"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          )}

          {/* ⚙️ 설정 등의 통합 모달 컨테이너 */}
          <Suspense fallback={null}>
            <Modals
              showSettingsModal={showSettingsModal} setShowSettingsModal={setShowSettingsModal} settingsMessage={settingsMessage} handleBackup={handleBackup} handleRestore={handleRestore} showConfirmReset={showConfirmReset} setShowConfirmReset={setShowConfirmReset} handleResetAll={handleResetAll}
              showQuoteModal={showQuoteModal} setShowQuoteModal={setShowQuoteModal} addQuote={addQuote} newQuoteInput={newQuoteInput} setNewQuoteInput={setNewQuoteInput} customQuotes={customQuotes} deleteQuote={deleteQuote}
              showDDayModal={showDDayModal} setShowDDayModal={setShowDDayModal} editingDDayIdx={editingDDayIdx} setEditingDDayIdx={setEditingDDayIdx} saveDDay={saveDDay} modalTitle={modalTitle} setModalTitle={setModalTitle} modalDate={modalDate} setModalDate={setModalDate}
              showAddModal={showAddModal} setShowAddModal={setShowAddModal} addEvent={addEvent} newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle} newEventDate={newEventDate} setNewEventDate={setNewEventDate} newEventCategory={newEventCategory} setNewEventCategory={setNewEventCategory}
              newEventTime={newEventTime} setNewEventTime={setNewEventTime} newEventLocation={newEventLocation} setNewEventLocation={setNewEventLocation}
              appTheme={appTheme} setAppTheme={setAppTheme}
              achievements={achievements} totalHarvest={totalHarvest}
              setWeatherData={setWeatherData}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
