import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Search, Quote, Edit2, Calendar as CalendarIcon, Flame, LogIn, LogOut, Palette, Bot, BarChart3, BookOpen, TrendingUp } from 'lucide-react';

export default function Header({
    isDarkMode, setIsDarkMode,
    searchQuery, setSearchQuery,
    setShowSettingsModal, setShowQuoteModal,
    streakData, rankTitle, todaysQuote, aiGreeting,
    currentMood, setCurrentMood, MOODS,
    isGoogleLoggedIn, onGoogleLogin, onGoogleLogout,
    onShowHeatmap,
    onShowGardenAlbum,
    onShowReport,
    weatherData
}) {
    const [showMoodMenu, setShowMoodMenu] = useState(false);
    const [showBotMessage, setShowBotMessage] = useState(true);

    // 15초마다 명언과 AI 인사말 교차 노출
    useEffect(() => {
        const interval = setInterval(() => {
            setShowBotMessage(prev => !prev);
        }, 15000); // 15초 간격
        return () => clearInterval(interval);
    }, []);
    return (
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-8 px-2 sm:px-0">
            <div>
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-black rounded-full shadow-md transform hover:scale-105 transition-transform cursor-default">
                            {rankTitle}
                        </div>
                        {streakData.streak > 0 && (
                            <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black rounded-full shadow-md transform hover:scale-105 transition-transform cursor-default animate-pulse shadow-red-500/30">
                                <Flame className="w-3.5 h-3.5 mr-1" />
                                연속 {streakData.streak}일째 불타오르는 중!
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8" />
                        GONGGONG <span className="text-slate-400 font-light">|</span> PLANNER
                    </h1>
                </div>

                <div className="mt-2 text-slate-500 dark:text-slate-400 italic group max-w-xl grid [grid-template-areas:'stack'] items-center">
                    <div className={`[grid-area:stack] flex items-center gap-2 transition-all duration-500 w-full ${aiGreeting && showBotMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                        <Bot className="w-5 h-5 text-indigo-500 animate-pulse flex-shrink-0" />
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 leading-relaxed">{aiGreeting}</p>
                    </div>

                    <div className={`[grid-area:stack] flex items-center gap-2 transition-all duration-500 w-full ${!aiGreeting || !showBotMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <Quote className="w-4 h-4 text-blue-400 opacity-50 flex-shrink-0" />
                        <p className="text-sm font-medium leading-relaxed">{todaysQuote}</p>
                        <button
                            onClick={() => setShowQuoteModal(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md flex-shrink-0"
                            aria-label="명언 편집"
                        >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                    onClick={onShowHeatmap}
                    aria-label="성취 기록 보기"
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition-all text-emerald-500 dark:text-emerald-400 hover:text-emerald-600"
                >
                    <BarChart3 className="w-5 h-5" />
                </button>
                <button
                    onClick={onShowReport}
                    aria-label="집중 리포트"
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition-all text-purple-500 dark:text-purple-400 hover:text-purple-600 cursor-pointer"
                >
                    <TrendingUp className="w-5 h-5" />
                </button>
                <button
                    onClick={onShowGardenAlbum}
                    aria-label="정원 앨범 보기"
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition-all text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 cursor-pointer"
                >
                    <BookOpen className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setShowSettingsModal(true)}
                    aria-label="설정 및 타임캡슐"
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:rotate-90 transition-all text-slate-500 dark:text-slate-400 hover:text-indigo-500"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {/* 구글 캘린더 연동 버튼 */}
                {isGoogleLoggedIn ? (
                    <button
                        onClick={onGoogleLogout}
                        aria-label="구글 캘린더 연결 해제"
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 shadow-sm text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all text-xs font-bold"
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">캘린더 연결됨</span>
                        <LogOut className="w-3 h-3 opacity-50" />
                    </button>
                ) : (
                    <button
                        onClick={onGoogleLogin}
                        aria-label="구글 캘린더 연동"
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 shadow-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-xs font-bold"
                    >
                        <LogIn className="w-4 h-4" />
                        <span className="hidden sm:inline">구글 캘린더 연동</span>
                    </button>
                )}

                {/* ☁️ 실시간 날씨 (Glassmorphism 적용) */}
                {weatherData && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl shadow-sm transition-all hover:scale-105 cursor-default
                                    ${currentMood === 'classic' || isDarkMode ? 'bg-black/30 backdrop-blur-md border border-white/10 text-white' : 'bg-white/50 backdrop-blur-md border border-white/40 text-slate-800'}`}>
                        <img
                            src={`https://openweathermap.org/img/wn/${weatherData.icon}.png`}
                            alt={weatherData.description}
                            className="w-10 h-10 -my-2 drop-shadow-md"
                        />
                        <div className="flex flex-col py-0.5">
                            <span className={`text-[10px] font-bold leading-none ${currentMood === 'classic' || isDarkMode ? 'text-white/70' : 'text-slate-500'}`}>
                                {weatherData.city}
                            </span>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-sm font-black ${currentMood === 'classic' || isDarkMode ? 'text-white' : 'text-slate-700'}`}>
                                    {Math.round(weatherData.temp)}°C
                                </span>
                                <span className={`text-[9px] font-medium hidden sm:inline ${currentMood === 'classic' || isDarkMode ? 'text-white/60' : 'text-slate-400'}`}>
                                    {weatherData.description}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative">
                    <button
                        onClick={() => setShowMoodMenu(!showMoodMenu)}
                        aria-label="테마 변경"
                        className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 transition-all text-slate-700 dark:text-slate-300"
                    >
                        <Palette className="w-5 h-5 text-pink-500" />
                        <span className="hidden lg:inline text-sm font-bold">{MOODS[currentMood]?.icon} {MOODS[currentMood]?.name}</span>
                    </button>

                    {showMoodMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                            {Object.entries(MOODS).map(([key, mood]) => (
                                <button
                                    key={key}
                                    onClick={() => { setCurrentMood(key); setShowMoodMenu(false); }}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${currentMood === key ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    <span className="text-xl">{mood.icon}</span>
                                    {mood.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    aria-label="다크 모드 토글"
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:rotate-12 transition-all"
                >
                    {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                </button>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="일정 검색..."
                        className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full md:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
        </header>
    );
}
