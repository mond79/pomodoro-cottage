import { useState, useMemo } from 'react';
import { Timer, Wind, Play, Pause, RotateCcw as ResetIcon, Brain, Tag } from 'lucide-react';
import { GARDEN_STAGES } from '../constants';
import SoundMixer from './SoundMixer';
import MiniGarden from './MiniGarden';

export default function PomodoroTimer({
    themeBg, currentMood, defaultSound,
    timerMode, setTimerMode, isPomoActive, setIsPomoActive,
    pomoTime, setPomoTime, pomoDuration, changePomoDuration,
    selectedDateTomatoes, selectedDate,
    subjects, selectedSubjectId, setSelectedSubjectId,
    pomoSessions,
    todos, toggleTodo,
    playlist, currentTrackIdx, isPlayingAudio, toggleAudio, handleAudioUpload, audioRef,
    playTrack, removeTrack,
    showParcel, setShowParcel,
    weatherData,
    isZenMode = false,
    currentPomoTag, setCurrentPomoTag
}) {
    // === 🐱 식구 말풍선 ===
    const [speechBubble, setSpeechBubble] = useState(null);

    // === 🧠 스마트 타이머 추천 (규칙 기반) ===
    const smartRecommendation = useMemo(() => {
        if (!pomoSessions || pomoSessions.length < 3) return null;

        const currentHour = new Date().getHours();
        const relevantSessions = pomoSessions.filter(s => {
            if (!s.startTime) return false;
            const sessionHour = parseInt(s.startTime.split(':')[0], 10);
            return Math.abs(sessionHour - currentHour) <= 2 ||
                Math.abs(sessionHour - currentHour) >= 22;
        });

        const sessions = relevantSessions.length >= 3 ? relevantSessions : pomoSessions;
        const avgDuration = sessions.reduce((sum, s) => sum + (s.duration || 25), 0) / sessions.length;

        const getTimeLabel = (h) => {
            if (h >= 5 && h < 9) return '이른 아침';
            if (h >= 9 && h < 12) return '오전';
            if (h >= 12 && h < 14) return '점심 즈음';
            if (h >= 14 && h < 18) return '오후';
            if (h >= 18 && h < 21) return '저녁';
            return '심야';
        };
        const timeLabel = getTimeLabel(currentHour);

        const presets = [10, 25, 50];
        const recommended = presets.reduce((prev, curr) =>
            Math.abs(curr - avgDuration) < Math.abs(prev - avgDuration) ? curr : prev
        );

        const completedCount = sessions.filter(s => s.duration >= 10).length;
        const successRate = Math.round((completedCount / sessions.length) * 100);

        let reason;
        if (relevantSessions.length >= 3) {
            reason = `${timeLabel} 시간대 평균 집중 ${Math.round(avgDuration)}분 · 성공률 ${successRate}% (${sessions.length}회 기록 기반)`;
        } else {
            reason = `전체 평균 집중 ${Math.round(avgDuration)}분 · 성공률 ${successRate}% (${sessions.length}회 누적 기록)`;
        }

        return { recommended, reason, avgDuration: Math.round(avgDuration) };
    }, [pomoSessions]);

    const formatPomoTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className={`p-6 md:p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden transition-colors duration-500 bg-gradient-to-br ${themeBg} backdrop-blur-md border border-white/10`}>
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Timer className="w-24 h-24" />
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-black flex items-center gap-3 text-white">
                        {timerMode === 'work' ? (
                            <><Timer className="w-6 h-6 text-yellow-400" /> 집중의 시간</>
                        ) : (
                            <><Wind className="w-6 h-6 text-teal-100" /> 산들바람 휴식</>
                        )}
                    </h3>
                    <div className={`flex gap-1 z-20 relative transition-opacity ${timerMode === 'work' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        {[10, 25, 50].map(mins => (
                            <button
                                key={mins}
                                onClick={() => changePomoDuration(mins)}
                                className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${pomoDuration === mins ? 'bg-yellow-500 text-slate-900 shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                            >
                                {mins}분
                            </button>
                        ))}
                    </div>
                </div>
                <p className={`text-xs mb-4 font-medium ${timerMode === 'work' ? 'text-slate-400' : 'text-teal-100'}`}>
                    {timerMode === 'work' ? `세상과 단절하고 몰입하는 ${pomoDuration}분` : '하늘을 보고 기지개를 켜는 10분'}
                </p>

                {/* 🧠 스마트 타이머 추천 */}
                {timerMode === 'work' && smartRecommendation && !isPomoActive && (
                    <button
                        onClick={() => changePomoDuration(smartRecommendation.recommended)}
                        className={`w-full mb-4 p-3 rounded-xl border text-left transition-all cursor-pointer group hover:scale-[1.02] active:scale-95
                            ${pomoDuration === smartRecommendation.recommended
                                ? 'bg-yellow-500/15 border-yellow-500/40 shadow-[0_0_12px_rgba(250,204,21,0.15)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-yellow-500/30'
                            }
                        `}
                    >
                        <div className="flex items-center gap-2.5">
                            <Brain className={`w-4 h-4 flex-shrink-0 ${pomoDuration === smartRecommendation.recommended ? 'text-yellow-400' : 'text-slate-400 group-hover:text-yellow-400'} transition-colors`} />
                            <div className="flex-1 min-w-0">
                                <div className={`text-[11px] font-bold ${pomoDuration === smartRecommendation.recommended ? 'text-yellow-300' : 'text-slate-300'}`}>
                                    🧠 AI 추천: 지금은 <span className="text-yellow-400">{smartRecommendation.recommended}분</span>이 최적이에요
                                </div>
                                <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                                    {smartRecommendation.reason}
                                </div>
                            </div>
                        </div>
                    </button>
                )}

                {/* 타이머 */}
                <div className="flex items-center justify-between mb-6">
                    <span className={`text-4xl md:text-6xl font-black tabular-nums tracking-tighter transition-all 
                        ${isPomoActive
                            ? (timerMode === 'work' ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]')
                            : (timerMode === 'work' ? 'text-white' : 'text-teal-50')
                        }
                    `}>
                        {formatPomoTime(pomoTime)}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsPomoActive(!isPomoActive)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer
                                ${timerMode === 'work'
                                    ? (isPomoActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-slate-900')
                                    : (isPomoActive ? 'bg-cyan-800 hover:bg-cyan-900 text-white' : 'bg-white text-teal-600 hover:bg-teal-50')
                                }
                            `}
                        >
                            {isPomoActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                        </button>
                        <button
                            onClick={() => { setIsPomoActive(false); setTimerMode('work'); setPomoTime(pomoDuration * 60); }}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer
                                ${timerMode === 'work' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-teal-600 hover:bg-teal-700'}
                            `}
                        >
                            <ResetIcon className={`w-5 h-5 ${timerMode === 'work' ? 'text-slate-300' : 'text-teal-100'}`} />
                        </button>
                    </div>
                </div>

                {/* 📚 과목 선택 칩 */}
                {!isZenMode && subjects && subjects.length > 0 && (
                    <div className={`mb-4 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-white/5 border-white/10' : 'bg-teal-900/20 border-teal-500/30'}`}>
                        <div className={`text-[10px] font-bold mb-2 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>📚 지금 공부할 과목</div>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setSelectedSubjectId(null)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${!selectedSubjectId
                                    ? 'bg-white text-slate-800 shadow-md scale-105'
                                    : (timerMode === 'work' ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600' : 'bg-teal-600/50 text-teal-100 hover:bg-teal-500/50')
                                    }`}
                            >
                                자유 집중
                            </button>
                            {subjects.map(sub => {
                                const isActive = selectedSubjectId === sub.id;
                                return (
                                    <button
                                        key={sub.id}
                                        onClick={() => setSelectedSubjectId(sub.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isActive
                                            ? 'bg-white text-slate-800 shadow-md scale-105'
                                            : (timerMode === 'work' ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600' : 'bg-teal-600/50 text-teal-100 hover:bg-teal-500/50')
                                            }`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full ${sub.color}`} />
                                        {sub.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 🏷️ 세부 태그 입력 */}
                {!isZenMode && (
                    <div className={`mb-4 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-white/5 border-white/10' : 'bg-teal-900/20 border-teal-500/30'}`}>
                        <div className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                            <Tag className="w-3 h-3" /> 세부 태그 (옵션)
                        </div>
                        <input
                            type="text"
                            placeholder="예: #1단원 #질문정리"
                            value={currentPomoTag}
                            onChange={(e) => setCurrentPomoTag(e.target.value)}
                            className={`w-full px-3 py-1.5 text-xs rounded-lg outline-none transition-all ${timerMode === 'work' ? 'bg-slate-800 text-slate-200 border border-slate-700 focus:border-slate-500 hover:border-slate-600 focus:ring-1 focus:ring-slate-500' : 'bg-teal-800/50 text-teal-100 border border-teal-600 focus:border-teal-400 placeholder:text-teal-400/50'}`}
                            disabled={isPomoActive}
                        />
                    </div>
                )}

                {/* 🍅 토마토 농장 */}
                {!isZenMode && (
                    <div className={`mb-4 p-3 rounded-xl border flex flex-col gap-2 transition-colors ${timerMode === 'work' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-teal-600/30 border-teal-500/50'}`}>
                        <div className={`flex justify-between items-center text-xs font-bold ${timerMode === 'work' ? 'text-slate-400' : 'text-teal-100'}`}>
                            <span>{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 수확한 토마토</span>
                            <span className={`px-2 py-0.5 rounded-full ${timerMode === 'work' ? 'bg-slate-700' : 'bg-teal-700'}`}>{selectedDateTomatoes}개</span>
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[28px] items-center">
                            {Array.from({ length: selectedDateTomatoes }).map((_, i) => (
                                <span key={i} className="text-xl animate-in zoom-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>🍅</span>
                            ))}
                            {selectedDateTomatoes === 0 && <span className={`text-xs italic ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200'}`}>아직 수확한 토마토가 없어요</span>}
                        </div>
                    </div>
                )}

                {/* 🪴 미니 정원 + 🐱 오두막 식구 */}
                <MiniGarden
                    timerMode={timerMode}
                    selectedDate={selectedDate}
                    selectedDateTomatoes={selectedDateTomatoes}
                    pomoSessions={pomoSessions}
                    subjects={subjects}
                    selectedSubjectId={selectedSubjectId}
                    isZenMode={isZenMode}
                    onSpeechBubble={setSpeechBubble}
                    speechBubble={speechBubble}
                />

                {/* 📝 최근 세션 타임라인 */}
                {!isZenMode && pomoSessions && pomoSessions.length > 0 && (
                    <div className={`mb-4 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-white/5 border-white/10' : 'bg-teal-900/20 border-teal-500/30'}`}>
                        <div className={`text-[10px] font-bold mb-2 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>📝 오늘의 집중 타임라인</div>
                        <div className="flex flex-col gap-1 max-h-28 overflow-y-auto pr-1">
                            {pomoSessions
                                .filter(s => s.date === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`)
                                .slice(0, 10)
                                .map(session => (
                                    <div key={session.id} className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] ${timerMode === 'work' ? 'bg-slate-800/70' : 'bg-teal-700/30'}`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.subjectColor}`} />
                                        <span className={`font-mono font-bold ${timerMode === 'work' ? 'text-yellow-400' : 'text-white'}`}>{session.startTime}</span>
                                        <span className={`flex-1 truncate ${timerMode === 'work' ? 'text-slate-300' : 'text-teal-100'}`}>{session.subjectName}</span>
                                        <span className={`text-[10px] ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>{session.duration}분 🍅</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* 🌱 오늘의 씨앗 (할 일 시각화) */}
                {!isZenMode && todos && todos.length > 0 && (
                    <div className={`mb-3 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-white/10 border-white/5' : 'bg-teal-900/20 border-teal-100/20'}`}>
                        <div className={`text-[10px] font-bold mb-2 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                            🌱 오늘의 씨앗 ({todos.filter(t => t.completed).length}/{todos.length})
                        </div>
                        <div className="flex flex-col gap-1">
                            {todos.slice(0, 6).map(todo => (
                                <button
                                    key={todo.id}
                                    onClick={() => toggleTodo && toggleTodo(todo.id)}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] text-left transition-all cursor-pointer group
                                        ${todo.completed
                                            ? (timerMode === 'work' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-teal-500/20 text-teal-100')
                                            : (timerMode === 'work' ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50' : 'bg-teal-700/30 text-teal-100 hover:bg-teal-600/30')
                                        }
                                    `}
                                >
                                    <span className="text-base transition-transform group-hover:scale-125">
                                        {todo.completed ? '🌸' : '🌱'}
                                    </span>
                                    <span className={`flex-1 truncate ${todo.completed ? 'line-through opacity-60' : ''}`}>
                                        {todo.text}
                                    </span>
                                    {todo.completed && (
                                        <span className="text-[9px] text-emerald-400 font-bold">피었음!</span>
                                    )}
                                </button>
                            ))}
                            {todos.length > 6 && (
                                <span className={`text-[10px] text-center ${timerMode === 'work' ? 'text-slate-600' : 'text-teal-300/50'}`}>
                                    +{todos.length - 6}개 더...
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* 🎧 사운드 믹서 + 로파이 BGM */}
                <SoundMixer
                    timerMode={timerMode}
                    currentMood={currentMood}
                    defaultSound={defaultSound}
                    weatherData={weatherData}
                    playlist={playlist}
                    currentTrackIdx={currentTrackIdx}
                    isPlayingAudio={isPlayingAudio}
                    toggleAudio={toggleAudio}
                    handleAudioUpload={handleAudioUpload}
                    audioRef={audioRef}
                    playTrack={playTrack}
                    removeTrack={removeTrack}
                    onSpeechBubble={setSpeechBubble}
                    isZenMode={isZenMode}
                />
            </div>

            {/* 🎁 오두막 소포 팝업 모달 */}
            {showParcel && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-2 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] p-8 text-center animate-in zoom-in-90 slide-in-from-bottom-8 duration-500 cursor-pointer"
                        onClick={() => setShowParcel(false)}>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl" />

                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <div className="text-6xl mb-4 animate-bounce drop-shadow-2xl">
                                {timerMode === 'work' ? '🍅' : '☕'}
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight drop-shadow-md">
                                {timerMode === 'work' ? '수확의 기쁨!' : '꿀맛 같은 휴식'}
                            </h2>
                            <p className="text-sm font-medium text-white/80 mb-6 drop-shadow">
                                {timerMode === 'work'
                                    ? `정말 고생했어! 뽀모도로 하나를 무사히 수확했어.`
                                    : `충분히 쉬었어? 자, 다시 몰입해 보자!`}
                            </p>

                            <button
                                onClick={() => setShowParcel(false)}
                                className="w-full py-3 px-6 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold backdrop-blur-md border border-white/30 transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">✨</span> 확인 <span className="text-xl">✨</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
