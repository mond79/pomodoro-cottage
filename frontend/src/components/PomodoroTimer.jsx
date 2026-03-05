import { useState, useEffect, useRef } from 'react';
import { Timer, Wind, Play, Pause, RotateCcw as ResetIcon, Headphones, Music, Volume2, Save, Trash2 } from 'lucide-react';
import { fetchAmbientSounds, getAudioUrl } from '../utils/api';
import { GARDEN_STAGES, BGM_PRESETS } from '../constants';

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
    weatherData
}) {
    // === 🎧 감성 사운드 믹서 (다중 동시 재생) ===
    const [serverSounds, setServerSounds] = useState([]);
    const [activeSounds, setActiveSounds] = useState(new Set()); // 현재 재생 중인 소리 파일명 Set
    const [mixerVolumes, setMixerVolumes] = useState({}); // { filename: volume(0~1) }
    const mixerAudios = useRef(new Map()); // Map<filename, HTMLAudioElement>

    // === 🤖 AI 환경음 자동화 ===
    const [isAutoBGMEnabled, setIsAutoBGMEnabled] = useState(true);

    // === 🐱 식구 말풍선 ===
    const [speechBubble, setSpeechBubble] = useState(null); // { emoji, name, message }
    const speechTimeoutRef = useRef(null);

    // === 로파이 BGM (채널 2) — 기존 audioRef 사용 ===
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
        setIsAutoBGMEnabled(false); // 수동(프리셋) 로드 시 자동화 중지
        // 모든 소리 정지 후 프리셋 적용
        mixerAudios.current.forEach(audio => { audio.pause(); audio.currentTime = 0; });
        const newActive = new Set(preset.sounds);
        const newVolumes = { ...preset.volumes };
        setActiveSounds(newActive);
        setMixerVolumes(newVolumes);
        // 오디오 재생
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
                // 각 소리의 기본 볼륨 초기화 및 PWA 오프라인용 프리로드
                const defaultVols = {};
                data.sounds.forEach(s => {
                    defaultVols[s] = 0.5;

                    // 💡 PWA 우회 기법: <audio>의 Range(206) 요청은 Workbox 캐싱이 불안정하므로
                    // 일반 fetch(200)로 백그라운드에서 다운로드하여 서비스 워커 캐시에 강제로 온전히 밀어넣음
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

    // 🎚️ 개별 소리 토글 (클릭하면 재생/정지)
    const toggleMixerSound = (filename) => {
        setIsAutoBGMEnabled(false); // 수동 조작 시 자동화 중지
        const audioMap = mixerAudios.current;

        if (activeSounds.has(filename)) {
            // 정지
            const audio = audioMap.get(filename);
            if (audio) { audio.pause(); audio.currentTime = 0; }
            setActiveSounds(prev => { const next = new Set(prev); next.delete(filename); return next; });
        } else {
            // 재생 (없으면 새로 생성)
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
        setIsAutoBGMEnabled(false); // 수동 조작 시 자동화 중지
        setMixerVolumes(prev => ({ ...prev, [filename]: vol }));
        const audio = mixerAudios.current.get(filename);
        if (audio) audio.volume = vol;
    };

    // 🤖 AI BGM 추천 렌더링 효과 (날씨 및 상태 변화 시)
    useEffect(() => {
        if (!isAutoBGMEnabled || !weatherData) return;

        const hour = new Date().getHours();
        const mainWeather = weatherData.weather?.[0]?.main || 'Clear';

        let targetPreset = BGM_PRESETS.find(p => p.condition(mainWeather, hour));
        if (!targetPreset) targetPreset = BGM_PRESETS[BGM_PRESETS.length - 1]; // Fallback

        // 이미 목표 프리셋과 완전히 같은 사운드가 재생 중이라면 불필요한 재재생 방지
        const currentActive = Array.from(activeSounds);
        const presetSounds = targetPreset.sounds;
        if (currentActive.length === presetSounds.length && presetSounds.every(s => currentActive.includes(s))) {
            return;
        }

        console.log(`[AI BGM] '${targetPreset.name}' 프리셋을 적용합니다. (날씨: ${mainWeather}, 시간: ${hour}시)`);

        // 기존 사운드 모두 정지
        mixerAudios.current.forEach(audio => { audio.pause(); audio.currentTime = 0; });

        const newActive = new Set(presetSounds);
        const newVolumes = { ...targetPreset.volumes };

        setActiveSounds(newActive);
        setMixerVolumes(prev => ({ ...prev, ...newVolumes }));

        // 새 사운드 재생
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

        // 봇 말풍선으로 알려주기
        setSpeechBubble({ emoji: '✨', name: '오두막 AI', message: targetPreset.message });
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = setTimeout(() => setSpeechBubble(null), 5000);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weatherData, isAutoBGMEnabled]); // activeSounds 제거 (수동 조작 시 AI가 방해하지 않도록)

    // 💡 (기존) 테마 변경 시 환경음 자동 교체 (AI 자동화가 켜져있을 땐 무시하고 AI를 따름)
    useEffect(() => {
        if (!defaultSound || isAutoBGMEnabled) return;

        // 모든 현재 재생 중인 소리 정지
        mixerAudios.current.forEach((audio) => { audio.pause(); audio.currentTime = 0; });

        // 기본 사운드만 재생
        let audio = mixerAudios.current.get(defaultSound);
        if (!audio) {
            audio = new Audio(getAudioUrl(defaultSound));
            audio.loop = true;
            mixerAudios.current.set(defaultSound, audio);
        }
        audio.volume = mixerVolumes[defaultSound] ?? 0.5;

        // 브라우저 정책상 첫 인터랙션 전 자동 재생은 차단될 수 있음
        audio.play().catch(() => {
            console.log(`[Cottage] '${defaultSound}' 자동 재생이 차단되었습니다. 사용자의 클릭이 필요합니다.`);
        });
        setActiveSounds(new Set([defaultSound]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMood, defaultSound]); // isAutoBGMEnabled, mixerVolumes 제거 (볼륨 조절 시 리셋 방지)

    // 🎧 전체 정지/재생
    const toggleAllAmbient = () => {
        setIsAutoBGMEnabled(false);
        if (activeSounds.size > 0) {
            // 모두 정지
            mixerAudios.current.forEach((audio, filename) => {
                if (activeSounds.has(filename)) audio.pause();
            });
            setActiveSounds(new Set());
        }
    };

    const formatPomoTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // 🐱 식구 클릭 시 말풍선 메시지 생성
    const handleCreatureClick = (creature) => {
        // 현재 선택된 과목 이름
        const currentSubject = subjects?.find(s => s.id === selectedSubjectId);
        const subjectName = currentSubject?.name || '공부';
        const todayCount = selectedDateTomatoes || 0;
        const hour = new Date().getHours();

        // 식구별 상황 맞춤 메시지 풀
        const messagePool = {
            '🐛': [
                `꿈틀꿈틀~ ${subjectName} 화이팅! 🌱`,
                '토마토 잎사귀는 정말 맛있는 냄새가 나!',
                todayCount > 0 ? `오늘 벌써 ${todayCount}개나 수확했네! 🍅` : '아직 흙이 차가워, 어서 씨앗을 심자!',
                timerMode === 'rest' ? '나도 낙엽 밑에서 쉬고 있어~' : '조용히 응원할게, 사각사각...',
            ],
            '🦋': [
                `팔랑팔랑~ ${subjectName} 재밌어 보여! ✨`,
                hour < 12 ? '아침부터 예쁜 꽃을 찾아왔어! ☀️' : '오후의 햇살이 참 따뜻해 🌼',
                todayCount >= 3 ? '네 열정에 날개가 더 빛나는 것 같아! 🦋' : '꽃 향기 따라 여기까지 왔는걸~',
                '잠깐 하늘을 보면서 기지개를 켜는 건 어때?',
            ],
            '🐦': [
                `짹짹! 오늘따라 ${subjectName} 책이 술술 넘어가네? 🎶`,
                todayCount >= 5 ? `와, 벌써 ${todayCount}개 수확이야! 대풍년 둥지다 짹! 🎉` : '토마토가 빨갛게 익기를 얌전히 기다리는 중~',
                hour >= 17 ? '노을 질 때 지붕 위가 젤 멋지다구 짹!' : '오늘 벌레 사냥은 성공적이야!',
                timerMode === 'work' ? '집중하는 눈빛이 독수리 같은데?! 🦅' : '노래 한 곡 뽑아줄까? 짹짹🎵',
            ],
            '🐱': [
                `야옹~ 집사, ${subjectName} 열심히 하네? 🐾`,
                todayCount >= 3 ? `${todayCount}개나 수확하다니 츄르 줘도 되겠다 냥냥! 🐟` : '냥냥, 무리하지 말고 내 옆에서 잠깐 쉬어~',
                timerMode === 'work' ? '방해 안 할 테니까 집중해 봐~ (식빵 굽기) 🍞' : '스다듬어도 좋아... 골골골 🐈',
                hour >= 22 ? '밤늦게까지 고생이네... 나도 졸리다 하품 🥱' : '오늘 하루도 잘 부탁해 집사!',
            ],
            '📚': [
                `${subjectName} 마법서(?)를 펼쳤구나! 📖`,
                '한 글자 한 글자 너의 지식이 되어 쌓이고 있어.',
                todayCount >= 5 ? '이 기세라면 오두막이 도서관이 될지도 몰라! 🏛️' : '모르는 게 있으면 언제든 페이지를 넘겨봐.',
            ],
            '🕯️': [
                '따뜻한 불빛 아래서 공부하니까 마음이 차분해지지? 🕯️',
                `${subjectName}, 촛불처럼 은은하게, 하지만 꾸준히 밝혀봐!`,
                hour >= 20 ? '밤에 켜는 촛불은 생각의 깊이를 더해줘...' : '꺼지지 않게 바람을 막아줄게.',
            ],
            '🔥': [
                '타닥, 타닥... 장작 타는 소리 좋아해? 🔥',
                `${subjectName}에 향한 열정이 불꽃보다 뜨거워!`,
                todayCount >= 8 ? '우와! 벽난로가 폭발할 것 같은 열의야! 🌋' : '언제나 널 따뜻하게 데워줄게.',
            ],
            '🌈': [
                '비 온 뒤에는 항상 내가 뜨는 법이지! 🌈',
                `오늘 하루의 끝에 ${subjectName}의 무지개가 뜰 거야! ✨`,
                '오두막 위에서 널 내려다보고 있어. 정말 예뻐!',
            ],
            '⭐': [
                '오늘의 주인공, 가장 빛나는 별! ⭐',
                `${subjectName} 마스터가 되는 그 날까지 밤하늘에서 응원할게!`,
                todayCount >= 10 ? '은하수보다 네가 이룬 오늘이 더 아름다워! 🌌' : '별똥별에 소원 빌었어? 분명 이루어질 거야.',
            ],
        };

        const pool = messagePool[creature.emoji] || [`${creature.name}(이)가 인사해요!`];

        // 클릭 이벤트 핸들러 내부에서 호출되므로 Math.random()은 안전하지만 린트 룰 경고 회피를 위해 Date 활용
        // eslint-disable-next-line react-hooks/purity
        const randomIndex = Date.now() % pool.length;
        const randomMsg = pool[randomIndex];

        // 이전 타이머 정리 후 말풍선 띄우기말풍선
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        setSpeechBubble({ emoji: creature.emoji, name: creature.name, message: randomMsg });
        speechTimeoutRef.current = setTimeout(() => setSpeechBubble(null), 3500);
    };

    return (
        <div className={`p-6 md:p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden transition-colors duration-500 bg-gradient-to-br ${themeBg} backdrop-blur-md border border-white/10`}>
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

                {/* 📚 과목 선택 칩 */}
                {subjects && subjects.length > 0 && (
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
                                // bg-xxx-400 에서 hex 색상 추출하진 않고 Tailwind 클래스를 활용
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

                {/* 🍅 토마토 농장 */}
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

                {/* 🪴 나의 오두막 미니 정원 (Phase 16: 실사 토마토 성장) */}
                <div className={`mb-4 p-4 rounded-xl shadow-inner border transition-colors ${timerMode === 'work' ? 'bg-black/20 border-white/10' : 'bg-teal-900/30 border-teal-500/30'}`}>
                    <div className={`text-[11px] font-black mb-3 text-center flex items-center justify-center gap-2 ${timerMode === 'work' ? 'text-slate-300' : 'text-teal-100'}`}>
                        🪴 나의 미니 정원
                    </div>
                    {(() => {
                        const total = selectedDateTomatoes;
                        // 현재 total이 요구 조건(requiredPomos)을 충족하는 단계 중 가장 높은 단계를 찾음
                        const currentStage = [...GARDEN_STAGES].reverse().find(stage => total >= stage.requiredPomos) || GARDEN_STAGES[0];
                        // 다음 단계 계산
                        const nextStage = GARDEN_STAGES.find(stage => stage.requiredPomos > total);

                        return (
                            <div className="flex flex-col items-center justify-center gap-3">
                                {/* 성장하는 토마토 이미지 */}
                                <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center bg-white/5 rounded-full overflow-hidden shadow-lg border border-white/10">
                                    <img
                                        src={currentStage.image}
                                        alt={currentStage.name}
                                        className="w-full h-full object-cover animate-[fadeIn_1s_ease-out] hover:scale-110 transition-transform duration-700 cursor-pointer"
                                        title={currentStage.name}
                                    />
                                    <div className="absolute bottom-2 bg-black/60 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow">
                                        Lv.{currentStage.level} {currentStage.name.split(' (')[0]}
                                    </div>
                                </div>

                                {/* 진행도 바 & 다음 단계 안내 */}
                                {nextStage ? (
                                    <div className="w-full max-w-[200px] flex flex-col items-center gap-1">
                                        <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${timerMode === 'work' ? 'bg-green-400' : 'bg-teal-300'}`}
                                                style={{ width: `${Math.min(100, Math.max(5, (total / nextStage.requiredPomos) * 100))}%` }}
                                            />
                                        </div>
                                        <div className={`text-[10px] font-medium ${timerMode === 'work' ? 'text-slate-400' : 'text-teal-200'}`}>
                                            다음 단계까지 <b>{nextStage.requiredPomos - total}</b>🍅 남음
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`text-xs font-bold animate-pulse ${timerMode === 'work' ? 'text-yellow-400' : 'text-yellow-200'}`}>
                                        ✨ 토마토 수확 완료! (최고 성장) ✨
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* 🐱 오두막 식구 (누적 달성도) */}
                <div className={`mb-4 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-teal-600/30 border-teal-500/50'}`}>
                    {(() => {
                        // pomoSessions 전체 길이 = 누적 토마토 수
                        const lifetimeTotal = pomoSessions?.length || 0;
                        if (lifetimeTotal === 0) return null;

                        const milestones = [
                            { min: 5, emoji: '🐛', name: '벌레 친구', desc: '정원에 벌레가 놀러 왔어요!' },
                            { min: 10, emoji: '🦋', name: '나비', desc: '예쁜 나비가 날아다녀요!' },
                            { min: 20, emoji: '🐦', name: '참새', desc: '참새가 지붕 위에 앉았어요!' },
                            { min: 35, emoji: '🐱', name: '길고양이', desc: '길고양이가 창가에서 낮잠을 자요!' },
                            { min: 50, emoji: '📚', name: '책장', desc: '오두막에 책이 가득 쌓여요!' },
                            { min: 75, emoji: '🕯️', name: '촛불', desc: '따뜻한 촛불이 켜졌어요!' },
                            { min: 100, emoji: '🔥', name: '벽난로', desc: '따뜻한 벽난로가 활활 타올라요!' },
                            { min: 150, emoji: '🌈', name: '무지개', desc: '오두막 위로 무지개가 떴어요!' },
                            { min: 200, emoji: '⭐', name: '별', desc: '하늘에서 별이 빛나요!' },
                        ];

                        const unlocked = milestones.filter(m => lifetimeTotal >= m.min);
                        const nextMilestone = milestones.find(m => lifetimeTotal < m.min);

                        return (
                            <div className={`mt-2 pt-2 border-t ${timerMode === 'work' ? 'border-slate-700/50' : 'border-teal-500/30'}`}>
                                <div className={`text-[10px] font-bold mb-1.5 flex items-center justify-between ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                                    <span>🐱 오두막 식구 (누적 {lifetimeTotal}🍅)</span>
                                    {nextMilestone && (
                                        <span className={`text-[9px] ${timerMode === 'work' ? 'text-slate-600' : 'text-teal-300/50'}`}>
                                            다음: {nextMilestone.emoji} ({nextMilestone.min - lifetimeTotal}🍅 남음)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {unlocked.map((m, i) => (
                                        <span
                                            key={i}
                                            onClick={() => handleCreatureClick(m)}
                                            className={`text-xl transition-all duration-300 hover:scale-150 cursor-pointer relative
                                                ${speechBubble?.emoji === m.emoji ? 'scale-125 animate-bounce' : ''}
                                            `}
                                            title={`${m.name}을(를) 클릭해 보세요!`}
                                        >
                                            {m.emoji}
                                        </span>
                                    ))}
                                </div>

                                {/* 💬 말풍선 */}
                                {speechBubble && (
                                    <div className={`mt-2 p-2.5 rounded-xl text-[11px] font-medium animate-in fade-in slide-in-from-bottom-2 duration-300
                                        ${timerMode === 'work' ? 'bg-slate-700/80 text-slate-200 border border-slate-600/50' : 'bg-teal-600/40 text-teal-50 border border-teal-400/30'}
                                    `}>
                                        <div className="flex items-start gap-2">
                                            <span className="text-lg flex-shrink-0">{speechBubble.emoji}</span>
                                            <div>
                                                <div className={`text-[9px] font-bold mb-0.5 ${timerMode === 'work' ? 'text-yellow-400' : 'text-teal-200'}`}>
                                                    {speechBubble.name}
                                                </div>
                                                <div>"{speechBubble.message}"</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>


                {/* 📝 최근 세션 타임라인 */}
                {pomoSessions && pomoSessions.length > 0 && (
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
                {todos && todos.length > 0 && (
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

                {/* ═══════════════════════════════════════════ */}
                {/* 🎧 채널 1: 환경음 (서버) */}
                {/* ═══════════════════════════════════════════ */}
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
                                onClick={() => setIsAutoBGMEnabled(true)}
                                title="현재 날씨·시간에 맞는 환경음을 자동으로 골라줍니다"
                                className={`flex items-center gap-1 px-2 py-0.5 ml-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border
                                    ${isAutoBGMEnabled
                                        ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.3)]'
                                        : (timerMode === 'work' ? 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-600' : 'bg-teal-800/50 text-teal-300 border-teal-700/50 hover:bg-teal-700/50')
                                    }
                                `}
                            >
                                <span>✨</span> AI 추천 {isAutoBGMEnabled && 'ON'}
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
                                        {/* 토글 버튼 */}
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

                                        {/* 개별 볼륨 슬라이더 (활성 시만) */}
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

                    {/* 🎧 사운드 프리셋 */}
                    <div className={`mt-3 pt-3 border-t ${timerMode === 'work' ? 'border-white/5' : 'border-teal-500/20'}`}>
                        <div className={`text-[10px] font-bold mb-2 ${timerMode === 'work' ? 'text-slate-500' : 'text-teal-200/70'}`}>
                            🎧 나만의 감성 프리셋
                        </div>

                        {/* 저장 입력 */}
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

                        {/* 프리셋 리스트 */}
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

            {/* 🎁 오두막 소포 팝업 모달 */}
            {showParcel && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-2 border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] p-8 text-center animate-in zoom-in-90 slide-in-from-bottom-8 duration-500 cursor-pointer"
                        onClick={() => setShowParcel(false)}>

                        {/* 팝업 장식용 광원 효과 */}
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
