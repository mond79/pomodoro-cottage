import { useState, useMemo, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Search, Quote, Edit2, Calendar as CalendarIcon, Flame, LogIn, LogOut } from 'lucide-react';
import { DEFAULT_QUOTES } from '../constants';

export default function Header({
    isDarkMode, setIsDarkMode,
    searchQuery, setSearchQuery,
    setShowSettingsModal, setShowQuoteModal,
    streakData, rankTitle, todaysQuote,
    isGoogleLoggedIn, onGoogleLogin, onGoogleLogout
}) {
    return (
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                    <h1 className="text-3xl font-black tracking-tighter text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8" />
                        GONGGONG <span className="text-slate-400 font-light">|</span> PLANNER
                    </h1>
                </div>

                <div className="flex items-center gap-2 mt-2 text-slate-500 dark:text-slate-400 italic group">
                    <Quote className="w-4 h-4 text-blue-400 opacity-50" />
                    <p className="text-sm font-medium">{todaysQuote}</p>
                    <button
                        onClick={() => setShowQuoteModal(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
                        aria-label="명언 편집"
                    >
                        <Edit2 className="w-3 h-3 text-slate-400" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
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
                        <CalendarIcon className="w-4 h-4" /> 캘린더 연결됨
                        <LogOut className="w-3 h-3 opacity-50" />
                    </button>
                ) : (
                    <button
                        onClick={onGoogleLogin}
                        aria-label="구글 캘린더 연동"
                        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 shadow-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all text-xs font-bold"
                    >
                        <LogIn className="w-4 h-4" /> 구글 캘린더 연동
                    </button>
                )}
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
