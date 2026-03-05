import React, { useState, useMemo, useRef, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import DDaySection from './components/DDaySection';
import CalendarView from './components/CalendarView';
import PomodoroTimer from './components/PomodoroTimer';
import TodoSection from './components/TodoSection';
import PomoHeatmap from './components/PomoHeatmap';
import Modals from './components/Modals';

import { useLocalStorage } from './hooks/useLocalStorage';
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
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [showParcel, setShowParcel] = useState(false); // 🎁 소포(알림) 모달 상태

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

  // 앱 시작 시: 구글 로그인 상태 확인, 로컬 데이터 로드 및 💡 날짜 변경(자정 넘김) 초기화
  useEffect(() => {
    // 1. 날짜 변경 감지 로직 (자정이 지났으면 할 일 비우기)
    const todayStr = formatYMD(new Date());
    if (lastActiveDate !== todayStr) {
      console.log('🌅 새로운 날이 밝았습니다! 할 일 목록을 정리합니다.');
      // 어제 완료된(또는 모든) 할 일을 지우고 새로운 시작을 준비 (옵션: 완료되지 않은 것만 남길 수도 있음)
      // 여기서는 사용자의 요청에 따라 모든 할 일을 비우거나 초기 상태로 되돌립니다.
      setTodos([]);
      setLastActiveDate(todayStr); // 오늘 날짜로 갱신
    }

    // 2. 백엔드 상태 확인 및 초기 데이터 로드
    fetchStatus().then(data => {
      setIsGoogleLoggedIn(data.is_logged_in);

      // 구글 로그인 상태라면 할 일 목록 가져오기
      if (data.is_logged_in) {
        fetchTasks().then(googleTasks => {
          if (googleTasks && googleTasks.length > 0) {
            setTodos(prev => {
              // 중복 방지 (텍스트 기준)
              const existingTexts = new Set(prev.map(t => t.text));
              const newTasksFromGoogle = googleTasks.filter(gt => !existingTexts.has(gt.text));
              return [...prev, ...newTasksFromGoogle];
            });
          }
        });
      }
    });

    // IndexedDB에서 저장된 플레이리스트 로드
    loadStoredPlaylist().then(stored => {
      if (stored && stored.length > 0) {
        const withUrls = stored.map(track => ({
          ...track,
          url: URL.createObjectURL(track.blob)
        }));
        setPlaylist(withUrls);
        setCurrentTrackIdx(0);
      }
    });
  }, [lastActiveDate, setLastActiveDate, setTodos]);

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
          { id: generateId(), date: todayStr, startTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, duration: pomoDuration, subjectId: activeSubject?.id || null, subjectName: activeSubject?.name || '자유 집중', subjectColor: activeSubject?.color || 'bg-slate-400' },
          ...prev
        ].slice(0, 500));

        // 구글 캘린더에 이벤트 자동 전송 🗓️
        if (isGoogleLoggedIn) {
          addCalendarEvent(pomoDuration).then(res => {
            if (res.success) console.log('📅 구글 캘린더에 기록 완료!');
          });
        }

        // 알림음 재생 및 모달 활성화 🔔
        playNotificationSound();

        setTimeout(() => {
          setShowParcel(true);
          setTimerMode('rest');
          setPomoTime(10 * 60);
        }, 0);
      } else {
        // 알림음 재생 및 모달 활성화 🔔
        playNotificationSound();

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

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const todoToAdd = { id: generateId(), text: newTodo.trim(), completed: false };
    setTodos(prev => [...prev, todoToAdd]);
    setNewTodo('');

    // 구글 로그인 상태라면 구글 Tasks에도 추가
    if (isGoogleLoggedIn) {
      const res = await addGoogleTask(newTodo.trim());
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
    if (totalReadings >= 100) return '👑 공공의 지배자';
    if (totalReadings >= 50) return '🔥 열정적인 불꽃';
    if (totalReadings >= 10) return '🧙‍♂️ 수습 마법사';
    return '🌱 새싹 항해사';
  }, [totalReadings]);

  const appBgClasses = timerMode === 'work' ? currentMoodData.workBg : currentMoodData.restBg;

  return (
    <div className={`${isDarkMode ? 'dark' : ''} min-h-screen font-sans selection:bg-blue-200`}>
      <div
        className="min-h-screen bg-cover bg-center bg-fixed transition-all duration-1000 relative flex flex-col"
        style={{ backgroundImage: displayBgImage ? `url('${displayBgImage}')` : 'none' }}
      >
        {/* 그라데이션 오버레이 (약하게) */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-1000 opacity-30 dark:opacity-50 ${appBgClasses} pointer-events-none`}></div>

        {/* 🌅 시간대별 창풍경 오버레이 */}
        {(() => {
          const hour = new Date().getHours();
          let timeOverlay = '';
          if (hour >= 5 && hour < 8) {
            // 새벽 — 보라빛 안개
            timeOverlay = 'bg-gradient-to-b from-indigo-900/20 via-purple-800/10 to-transparent';
          } else if (hour >= 8 && hour < 16) {
            // 낮 — 밝은 하늘
            timeOverlay = 'bg-gradient-to-b from-sky-400/5 via-transparent to-transparent';
          } else if (hour >= 16 && hour < 19) {
            // 노을 — 오렌지/핑크
            timeOverlay = 'bg-gradient-to-b from-orange-500/15 via-pink-500/10 to-transparent';
          } else {
            // 밤 — 짙은 남색
            timeOverlay = 'bg-gradient-to-b from-indigo-950/30 via-slate-900/20 to-transparent';
          }
          return <div className={`absolute inset-0 transition-all duration-[3000ms] pointer-events-none ${timeOverlay}`} />;
        })()}

        {/* 🌧️ 날씨 오버레이 (비/눈 효과) */}
        {weatherData && (() => {
          const wId = weatherData.weather?.[0]?.id;
          // 2xx=뇌우, 3xx=이슬비, 5xx=비, 6xx=눈
          const isRain = wId && (wId >= 200 && wId < 600);
          const isSnow = wId && (wId >= 600 && wId < 700);
          if (!isRain && !isSnow) return null;
          return (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
              <style>{`
                @keyframes rainDrop { 0% { transform: translateY(-10vh) translateX(0); opacity: 0.7; } 100% { transform: translateY(110vh) translateX(-20px); opacity: 0; } }
                @keyframes snowFall { 0% { transform: translateY(-5vh) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(110vh) rotate(360deg); opacity: 0; } }
                .rain-particle { position: absolute; width: 1px; height: 15px; background: linear-gradient(to bottom, transparent, rgba(174,194,224,0.5)); animation: rainDrop linear infinite; }
                .snow-particle { position: absolute; width: 4px; height: 4px; background: white; border-radius: 50%; animation: snowFall linear infinite; }
              `}</style>
              {Array.from({ length: isSnow ? 30 : 40 }, (_, i) => (
                <div
                  key={i}
                  className={isSnow ? 'snow-particle' : 'rain-particle'}
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: isSnow ? `${4 + Math.random() * 6}s` : `${0.6 + Math.random() * 0.8}s`,
                    animationDelay: `${Math.random() * 3}s`,
                    opacity: 0.3 + Math.random() * 0.4,
                  }}
                />
              ))}
            </div>
          );
        })()}

        {/* 실제 컨텐츠 */}
        <div className="relative z-10 flex-1 text-slate-700 dark:text-slate-100 p-4 md:p-8">

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
            weatherData={weatherData}
          />

          <Dashboard
            totalReadings={totalReadings} todoCompletionRate={todoCompletionRate}
            requiredPace={requiredPace} targetReadings={targetReadings}
            setTargetReadings={setTargetReadings} weeklyChartData={weeklyChartData}
          />

          <DDaySection dDays={dDays} setDDays={setDDays} openEditDDay={openEditDDay} />

          <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <CalendarView
                currentDate={currentDate} setCurrentDate={setCurrentDate} days={days} events={events}
                selectedDate={selectedDate} setSelectedDate={setSelectedDate} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                subjects={subjects} toggleReading={toggleReading} deleteSubject={deleteSubject} addSubject={addSubject}
                newSubjectName={newSubjectName} setNewSubjectName={setNewSubjectName}
                newSubjectColor={newSubjectColor} setNewSubjectColor={setNewSubjectColor}
              />
            </div>

            <div className="lg:col-span-4 space-y-8">
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
              />

              <TodoSection
                selectedDate={selectedDate} diaries={diaries} saveDiary={saveDiary}
                todos={todos} addTodo={addTodo} toggleTodo={toggleTodo} deleteTodo={deleteTodo} newTodo={newTodo} setNewTodo={setNewTodo} celebratingId={celebratingId}
                searchQuery={searchQuery} displayedEvents={displayedEvents} deleteEvent={deleteEvent}
                setNewEventDate={setNewEventDate} setShowAddModal={setShowAddModal}
                pomoSessions={pomoSessions} currentMood={currentMood} weatherData={weatherData}
              />
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

          <Modals
            showSettingsModal={showSettingsModal} setShowSettingsModal={setShowSettingsModal} settingsMessage={settingsMessage} handleBackup={handleBackup} handleRestore={handleRestore} showConfirmReset={showConfirmReset} setShowConfirmReset={setShowConfirmReset} handleResetAll={handleResetAll}
            showQuoteModal={showQuoteModal} setShowQuoteModal={setShowQuoteModal} addQuote={addQuote} newQuoteInput={newQuoteInput} setNewQuoteInput={setNewQuoteInput} customQuotes={customQuotes} deleteQuote={deleteQuote}
            showDDayModal={showDDayModal} setShowDDayModal={setShowDDayModal} editingDDayIdx={editingDDayIdx} setEditingDDayIdx={setEditingDDayIdx} saveDDay={saveDDay} modalTitle={modalTitle} setModalTitle={setModalTitle} modalDate={modalDate} setModalDate={setModalDate}
            showAddModal={showAddModal} setShowAddModal={setShowAddModal} addEvent={addEvent} newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle} newEventDate={newEventDate} setNewEventDate={setNewEventDate} newEventCategory={newEventCategory} setNewEventCategory={setNewEventCategory}
            newEventTime={newEventTime} setNewEventTime={setNewEventTime} newEventLocation={newEventLocation} setNewEventLocation={setNewEventLocation}
          />
        </div>
      </div>
    </div>
  );
}
