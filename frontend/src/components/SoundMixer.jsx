import { useState, useEffect, useRef } from 'react';
import { Headphones, Music, Volume2, Save, Trash2 } from 'lucide-react';
import { fetchAmbientSounds, getAudioUrl } from '../utils/api';
import { BGM_PRESETS } from '../constants';

export default function SoundMixer({
    timerMode, currentMood, defaultSound, weatherData,
    // 로파이 BGM props
    playlist, currentTrackIdx, isPlayingAudio, toggleAudio, handleAudioUpload, audioRef,
    playTrack, removeTrack,
    // 말풍선 콜백
    onSpeechBubble,
    // Zen 모드
    isZenMode = false
}) {
    // === 🎧 감성 사운드 믹서 (다중 동시 재생) ===
    const [serverSounds, setServerSounds] = useState([]);
    const [activeSounds, setActiveSounds] = useState(new Set());
    const [mixerVolumes, setMixerVolumes] = useState({});
    const mixerAudios = useRef(new Map());

    // === 🤖 AI 환경음 자동화 ===
    const [isAutoBGMEnabled, setIsAutoBGMEnabled] = useState(true);

    // === 로파이 BGM (채널 2) ===
    const [lofiVolume, setLofiVolume] = useState(0.5);

    // === 🎧 사운드 프리셋 ===
    const [soundPresets, setSoundPresets] = useState(() => {
        try { return JSON.parse(localStorage.getItem('gplanner-sound-presets') || '[]'); } catch { return []; }
    });
    const [presetName, setPresetName] = useState('');

    const savePresets = (presets) => {
        setSoundPresets(presets);
        localStorage.setItem('gplanner-sound-presets', JSON.stringify(presets));
    };

    const handleSavePreset = () => {
        if (activeSounds.size === 0) return;
        const name = presetName.trim() || `감성 ${soundPresets.length + 1}`;
        const preset = {
            id: Date.now(),
            name,
            sounds: [...activeSounds],
            volumes: { ...mixerVolumes },
        };
        savePresets([...soundPresets, preset]);
        setPresetName('');
    };

    const handleLoadPreset = (preset) => {
        setIsAutoBGMEnabled(false);
        mixerAudios.current.forEach(audio => { audio.pause(); audio.currentTime = 0; });
        const newActive = new Set(preset.sounds);
        const newVolumes = { ...preset.volumes };
        setActiveSounds(newActive);
        setMixerVolumes(newVolumes);
        preset.sounds.forEach(sound => {
            let audio = mixerAudios.current.get(sound);
            if (!audio) {
                audio = new Audio(getAudioUrl(sound));
                audio.loop = true;
                mixerAudios.current.set(sound, audio);
            }
            audio.volume = newVolumes[sound] ?? 0.5;
            audio.play().catch(() => { });
        });
    };

    const handleDeletePreset = (id) => {
        savePresets(soundPresets.filter(p => p.id !== id));
    };

    // 서버에서 환경음 목록 가져오기
    useEffect(() => {
        fetchAmbientSounds().then(data => {
            if (data.sounds && data.sounds.length > 0) {
                setServerSounds(data.sounds);
                const defaultVols = {};
                data.sounds.forEach(s => {
                    defaultVols[s] = 0.5;
                    fetch(getAudioUrl(s)).catch(() => { });
                });
                setMixerVolumes(prev => ({ ...defaultVols, ...prev }));
            }
        });
    }, []);

    // 로파이 볼륨 반영
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = lofiVolume;
    }, [lofiVolume, audioRef]);

    // 🎚️ 개별 소리 토글
    const toggleMixerSound = (filename) => {
        setIsAutoBGMEnabled(false);
        const audioMap = mixerAudios.current;

        if (activeSounds.has(filename)) {
            const audio = audioMap.get(filename);
            if (audio) { audio.pause(); audio.currentTime = 0; }
            setActiveSounds(prev => { const next = new Set(prev); next.delete(filename); return next; });
        } else {
            let audio = audioMap.get(filename);
            if (!audio) {
                audio = new Audio(getAudioUrl(filename));
                audio.loop = true;
                audioMap.set(filename, audio);
            }
            audio.volume = mixerVolumes[filename] ?? 0.5;
            audio.play().catch(e => console.log('Audio play prevented:', e));
            setActiveSounds(prev => new Set(prev).add(filename));
        }
    };

    // 🎚️ 개별 볼륨 변경
    const changeMixerVolume = (filename, vol) => {
        setIsAutoBGMEnabled(false);
        setMixerVolumes(prev => ({ ...prev, [filename]: vol }));
        const audio = mixerAudios.current.get(filename);
        if (audio) audio.volume = vol;
    };

    // 🤖 AI BGM 추천 (날씨 및 상태 변화 시)
    useEffect(() => {
        if (!isAutoBGMEnabled || !weatherData) return;

        const hour = new Date().getHours();
        const mainWeather = weatherData.weather?.[0]?.main || 'Clear';

        let targetPreset = BGM_PRESETS.find(p => p.condition(mainWeather, hour));
        if (!targetPreset) targetPreset = BGM_PRESETS[BGM_PRESETS.length - 1];

        const currentActive = Array.from(activeSounds);
        const presetSounds = targetPreset.sounds;
        if (currentActive.length === presetSounds.length && presetSounds.every(s => currentActive.includes(s))) {
            return;
        }

        console.log(`[AI BGM] '${targetPreset.name}' 프리셋을 적용합니다. (날씨: ${mainWeather}, 시간: ${hour}시)`);

        mixerAudios.current.forEach(audio => { audio.pause(); audio.currentTime = 0; });

        const newActive = new Set(presetSounds);
        const newVolumes = { ...targetPreset.volumes };

        setActiveSounds(newActive);
        setMixerVolumes(prev => ({ ...prev, ...newVolumes }));

        presetSounds.forEach(sound => {
            let audio = mixerAudios.current.get(sound);
            if (!audio) {
                audio = new Audio(getAudioUrl(sound));
                audio.loop = true;
                mixerAudios.current.set(sound, audio);
            }
            audio.volume = newVolumes[sound] ?? 0.5;
            audio.play().catch(() => {
                console.log(`[AI BGM] 브라우저 정책으로 인해 자동 재생이 대기 중입니다.`);
            });
        });

        if (onSpeechBubble) {
            onSpeechBubble({ emoji: '✨', name: '오두막 AI', message: targetPreset.message });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weatherData, isAutoBGMEnabled]);

    // 테마 변경 시 환경음 자동 교체
    useEffect(() => {
        if (!defaultSound || isAutoBGMEnabled) return;

        mixerAudios.current.forEach((audio) => { audio.pause(); audio.currentTime = 0; });

        let audio = mixerAudios.current.get(defaultSound);
        if (!audio) {
            audio = new Audio(getAudioUrl(defaultSound));
            audio.loop = true;
            mixerAudios.current.set(defaultSound, audio);
        }
        audio.volume = mixerVolumes[defaultSound] ?? 0.5;

        audio.play().catch(() => {
            console.log(`[Cottage] '${defaultSound}' 자동 재생이 차단되었습니다. 사용자의 클릭이 필요합니다.`);
        });
        setActiveSounds(new Set([defaultSound]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMood, defaultSound]);

    // 🎧 전체 정지/재생
    const toggleAllAmbient = () => {
        setIsAutoBGMEnabled(false);
        if (activeSounds.size > 0) {
            mixerAudios.current.forEach((audio, filename) => {
                if (activeSounds.has(filename)) audio.pause();
            });
            setActiveSounds(new Set());
        }
    };

    return (
        <div className={`grid gap-4 ${isZenMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* 🎧 채널 1: 환경음 (서버) */}
            <div className={`p-4 rounded-2xl backdrop-blur-sm border transition-colors mb-3 ${timerMode === 'work' ? 'bg-white/10 border-white/5' : 'bg-teal-900/20 border-teal-100/20'}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Volume2 className={`w-4 h-4 ${timerMode === 'work' ? 'text-emerald-400' : 'text-teal-200'}`} />
                        <span className={`text-sm font-bold ${timerMode === 'work' ? 'text-slate-200' : 'text-white'}`}>🎧 사운드 믹서</span>
                        {activeSounds.size > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${timerMode === 'work' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-300/20 text-teal-200'}`}>
                                {activeSounds.size}개 재생 중
                            </span>
                        )}
                        {/* AI BGM 버튼 */}
                        <button
                            onClick={() => setIsAutoBGMEnabled(prev => !prev)}
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold cursor-pointer transition-all
                                ${isAutoBGMEnabled
                                    ? (timerMode === 'work' ? 'bg-yellow-500/30 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.2)]' : 'bg-teal-300/30 text-teal-100')
                                    : (timerMode === 'work' ? 'bg-slate-700 text-slate-500' : 'bg-teal-800/50 text-teal-300/40')
                                }
                            `}
                        >
                            ✨ AI 추천
                        </button>
                    </div>
                    {activeSounds.size > 0 && (
                        <button
                            onClick={toggleAllAmbient}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer
                                ${timerMode === 'work' ? 'bg-red-500/80 text-white hover:bg-red-600' : 'bg-teal-200 text-teal-800'}
                            `}
                        >
                            전체 정지
                        </button>
                    )}
                </div>

                {serverSounds.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {serverSounds.map(sound => {
                            const isActive = activeSounds.has(sound);
                            const label = sound.replace(/\.(mp3|wav|ogg)$/i, '');
                            const vol = mixerVolumes[sound] ?? 0.5;
                            return (
                                <div key={sound} className={`flex items-center gap-2 p-2 rounded-xl transition-all
                                    ${isActive
                                        ? (timerMode === 'work' ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-white/10 border border-teal-200/30')
                                        : (timerMode === 'work' ? 'bg-slate-800/50' : 'bg-teal-800/30')
                                    }
                                `}>
                                    <button
                                        onClick={() => toggleMixerSound(sound)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0
                                            ${isActive
                                                ? (timerMode === 'work'
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                    : 'bg-white text-teal-700 shadow-md')
                                                : (timerMode === 'work'
                                                    ? 'bg-slate-700/80 text-slate-400 hover:bg-slate-600'
                                                    : 'bg-teal-600/50 text-teal-100 hover:bg-teal-500/50')
                                            }
                                        `}
                                    >
                                        <Volume2 className="w-3 h-3" />
                                        {label}
                                    </button>

                                    {isActive && (
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <input
                                                type="range" min="0" max="1" step="0.05"
                                                value={vol}
                                                onChange={(e) => changeMixerVolume(sound, parseFloat(e.target.value))}
                                                className="flex-1 h-1 accent-emerald-500 cursor-pointer"
                                            />
                                            <span className={`text-[9px] font-bold w-7 text-right flex-shrink-0 ${timerMode === 'work' ? 'text-emerald-400' : 'text-teal-200'}`}>
                                                {Math.round(vol * 100)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 🎵 채널 2: 로파이 BGM */}
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
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 🎧 사운드 프리셋 */}
                <div className={`mt-3 pt-3 border-t ${timerMode === 'work' ? 'border-white/5' : 'border-teal-500/20'}`}>
                    <div className={`text-[10px] font-bold mb-2 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                        🎧 나만의 감성 프리셋
                    </div>

                    {activeSounds.size > 0 && (
                        <div className="flex gap-1.5 mb-2">
                            <input
                                type="text"
                                placeholder="프리셋 이름 (예: 비 오는 밤의 서재)"
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] outline-none transition-colors
                                    ${timerMode === 'work' ? 'bg-slate-800/70 text-slate-200 placeholder-slate-500' : 'bg-teal-800/50 text-teal-100 placeholder-teal-300/40'}
                                `}
                            />
                            <button
                                onClick={handleSavePreset}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all
                                    ${timerMode === 'work' ? 'bg-emerald-500/80 text-white hover:bg-emerald-500' : 'bg-teal-200 text-teal-800 hover:bg-teal-100'}
                                `}
                            >
                                <Save className="w-3 h-3" /> 저장
                            </button>
                        </div>
                    )}

                    {soundPresets.length > 0 ? (
                        <div className="flex flex-col gap-1">
                            {soundPresets.map(preset => (
                                <div key={preset.id} className={`flex items-center gap-1.5 p-1.5 rounded-lg text-[11px] group
                                    ${timerMode === 'work' ? 'bg-slate-800/40 hover:bg-slate-700/50' : 'bg-teal-800/30 hover:bg-teal-700/40'}
                                `}>
                                    <button
                                        onClick={() => handleLoadPreset(preset)}
                                        className={`flex-1 text-left font-medium cursor-pointer truncate
                                            ${timerMode === 'work' ? 'text-slate-300 hover:text-white' : 'text-teal-100 hover:text-white'}
                                        `}
                                    >
                                        🎧 {preset.name}
                                        <span className={`ml-1.5 text-[9px] ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-300/50'}`}>
                                            ({preset.sounds.length}개 소리)
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDeletePreset(preset.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 cursor-pointer transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={`text-[10px] text-center py-1 ${timerMode === 'work' ? 'text-slate-600' : 'text-teal-300/40'}`}>
                            소리를 재생한 후 저장해보세요!
                        </p>
                    )}
                </div>

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
    );
}
