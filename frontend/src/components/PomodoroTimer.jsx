import { useState, useEffect, useRef } from 'react';
import { Timer, Wind, Play, Pause, RotateCcw as ResetIcon, Headphones, Music, Volume2 } from 'lucide-react';
import { formatYMD } from '../utils/dateHelpers';
import { fetchAmbientSounds, getAudioUrl } from '../utils/api';

export default function PomodoroTimer({
    timerMode, setTimerMode, isPomoActive, setIsPomoActive,
    pomoTime, setPomoTime, pomoDuration, changePomoDuration,
    selectedDateTomatoes, selectedDate,
    playlist, currentTrackIdx, isPlayingAudio, toggleAudio, handleAudioUpload, audioRef,
    playTrack, removeTrack, setPlaylist, setIsPlayingAudio, setCurrentTrackIdx
}) {
    // === 서버 환경음 (채널 1) ===
    const [serverSounds, setServerSounds] = useState([]);
    const [activeAmbient, setActiveAmbient] = useState(null);
    const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
    const [ambientVolume, setAmbientVolume] = useState(0.5);
    const ambientRef = useRef(null);

    // === 로파이 BGM (채널 2) — 기존 audioRef 사용 ===
    const [lofiVolume, setLofiVolume] = useState(0.5);

    // 서버에서 환경음 목록 가져오기
    useEffect(() => {
        fetchAmbientSounds().then(data => {
            if (data.sounds && data.sounds.length > 0) {
                setServerSounds(data.sounds);
            }
        });
    }, []);

    // 환경음 볼륨 반영
    useEffect(() => {
        if (ambientRef.current) ambientRef.current.volume = ambientVolume;
    }, [ambientVolume]);

    // 로파이 볼륨 반영
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = lofiVolume;
    }, [lofiVolume]);

    // 서버 환경음 선택
    const selectAmbient = (filename) => {
        if (activeAmbient === filename) {
            // 같은 거 다시 누르면 재생/정지 토글
            toggleAmbient();
            return;
        }
        if (ambientRef.current) {
            ambientRef.current.src = getAudioUrl(filename);
            ambientRef.current.load();
            ambientRef.current.volume = ambientVolume;
            ambientRef.current.play();
        }
        setActiveAmbient(filename);
        setIsAmbientPlaying(true);
    };

    const toggleAmbient = () => {
        if (!ambientRef.current || !activeAmbient) return;
        if (isAmbientPlaying) ambientRef.current.pause();
        else ambientRef.current.play();
        setIsAmbientPlaying(!isAmbientPlaying);
    };

    const formatPomoTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className={`p-6 md:p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden transition-colors duration-500
      ${timerMode === 'work' ? 'bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black' : 'bg-gradient-to-br from-teal-500 to-cyan-600'}
    `}>
            <div className="absolute top-0 right-0 p-8 opacity-10">
                {timerMode === 'work' ? <Timer className="w-32 h-32" /> : <Wind className="w-32 h-32" />}
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

                {/* 타이머 */}
                <div className="flex items-center justify-between mb-6">
                    <span className={`text-6xl font-black tabular-nums tracking-tighter transition-all 
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

                {/* 🍅 토마토 농장 */}
                <div className={`mb-6 p-3 rounded-xl border flex flex-col gap-2 transition-colors ${timerMode === 'work' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-teal-600/30 border-teal-500/50'}`}>
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

                {/* ═══════════════════════════════════════════ */}
                {/* 🎧 채널 1: 환경음 (서버) */}
                {/* ═══════════════════════════════════════════ */}
                <div className={`p-4 rounded-2xl backdrop-blur-sm border transition-colors mb-3 ${timerMode === 'work' ? 'bg-white/10 border-white/5' : 'bg-teal-900/20 border-teal-100/20'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Volume2 className={`w-4 h-4 ${timerMode === 'work' ? 'text-emerald-400' : 'text-teal-200'}`} />
                            <span className={`text-sm font-bold ${timerMode === 'work' ? 'text-slate-200' : 'text-white'}`}>🌧️ 환경음</span>
                        </div>
                        {activeAmbient && (
                            <button
                                onClick={toggleAmbient}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer
                  ${isAmbientPlaying
                                        ? (timerMode === 'work' ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-teal-200 text-teal-800')
                                        : (timerMode === 'work' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-teal-700 text-teal-100')
                                    }
                `}
                            >
                                {isAmbientPlaying ? '일시정지' : '재생'}
                            </button>
                        )}
                    </div>

                    {serverSounds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {serverSounds.map(sound => {
                                const isActive = activeAmbient === sound;
                                const label = sound.replace(/\.(mp3|wav|ogg)$/i, '');
                                return (
                                    <button
                                        key={sound}
                                        onClick={() => selectAmbient(sound)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${isActive
                                                ? (timerMode === 'work'
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                    : 'bg-white text-teal-700 shadow-md')
                                                : (timerMode === 'work'
                                                    ? 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                                                    : 'bg-teal-600/50 text-teal-100 hover:bg-teal-500/50')
                                            }
                      `}
                                    >
                                        <Volume2 className="w-3 h-3" />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* 환경음 볼륨 */}
                    {activeAmbient && (
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>볼륨</span>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={ambientVolume}
                                onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                                className="flex-1 h-1 accent-emerald-500 cursor-pointer"
                            />
                            <span className={`text-[10px] font-bold w-8 text-right ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                                {Math.round(ambientVolume * 100)}%
                            </span>
                        </div>
                    )}
                    <audio ref={ambientRef} loop />
                </div>

                {/* ═══════════════════════════════════════════ */}
                {/* 🎵 채널 2: 로파이 BGM (직접 업로드) */}
                {/* ═══════════════════════════════════════════ */}
                <div className={`p-4 rounded-2xl backdrop-blur-sm border transition-colors ${timerMode === 'work' ? 'bg-white/10 border-white/5' : 'bg-teal-900/20 border-teal-100/20'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Headphones className={`w-4 h-4 ${timerMode === 'work' ? 'text-purple-400' : 'text-teal-200'}`} />
                            <span className={`text-sm font-bold ${timerMode === 'work' ? 'text-slate-200' : 'text-white'}`}>🎶 로파이 BGM</span>
                        </div>
                        {playlist.length > 0 && (
                            <button
                                onClick={toggleAudio}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer
                  ${isPlayingAudio
                                        ? (timerMode === 'work' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-teal-200 text-teal-800')
                                        : (timerMode === 'work' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-teal-700 text-teal-100')
                                    }
                `}
                            >
                                {isPlayingAudio ? '일시정지' : '재생'}
                            </button>
                        )}
                    </div>

                    <label className={`relative flex items-center justify-center w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors group overflow-hidden mb-3
            ${timerMode === 'work' ? 'border-slate-600 hover:border-purple-400' : 'border-teal-400/50 hover:border-teal-200'}
          `}>
                        <input type="file" accept="audio/*" multiple onChange={handleAudioUpload} className="hidden" />
                        <div className={`flex items-center gap-2 truncate ${timerMode === 'work' ? 'text-slate-400 group-hover:text-purple-300' : 'text-teal-200 group-hover:text-white'}`}>
                            <Music className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs font-medium truncate pl-1">
                                {playlist.length > 0 ? `${playlist.length}개의 곡이 있음 (파일 더 추가하기)` : '클릭하여 로파이(mp3) 파일 올리기'}
                            </span>
                        </div>
                    </label>

                    {/* 플레이리스트 목록 */}
                    {playlist.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {playlist.map((track, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => playTrack(idx)}
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all group/item cursor-pointer
                                        ${idx === currentTrackIdx
                                            ? (timerMode === 'work' ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50' : 'bg-white/20 text-white')
                                            : (timerMode === 'work' ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50' : 'bg-teal-700/30 text-teal-100 hover:bg-teal-600/30')}
                                    `}
                                >
                                    <div className="flex items-center gap-2 truncate flex-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${idx === currentTrackIdx ? 'bg-purple-400 animate-pulse' : 'bg-transparent'}`} />
                                        <span className="truncate">{track.name}</span>
                                    </div>
                                    <button
                                        onClick={(e) => removeTrack(e, idx)}
                                        className="p-1 opacity-0 group-hover/item:opacity-100 hover:text-red-400 transition-opacity"
                                    >
                                        <ResetIcon className="w-3 h-3 rotate-45" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 로파이 볼륨 */}
                    {playlist.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>볼륨</span>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={lofiVolume}
                                onChange={(e) => setLofiVolume(parseFloat(e.target.value))}
                                className="flex-1 h-1 accent-purple-500 cursor-pointer"
                            />
                            <span className={`text-[10px] font-bold w-8 text-right ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                                {Math.round(lofiVolume * 100)}%
                            </span>
                        </div>
                    )}
                    <audio
                        ref={audioRef}
                        onEnded={() => {
                            const nextIdx = (currentTrackIdx + 1) % playlist.length;
                            playTrack(nextIdx);
                        }}
                    />
                </div>

            </div>
        </div>
    );
}
