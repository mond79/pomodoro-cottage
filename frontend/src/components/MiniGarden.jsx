import { useRef } from 'react';
import { GARDEN_STAGES } from '../constants';

export default function MiniGarden({
    timerMode,
    selectedDateTomatoes,
    pomoSessions,
    subjects,
    selectedSubjectId,
    isZenMode = false,
    // 말풍선 콜백
    onSpeechBubble,
    speechBubble,
}) {
    const speechTimeoutRef = useRef(null);

    // 🐱 식구 클릭 시 말풍선 메시지 생성
    const handleCreatureClick = (creature) => {
        const currentSubject = subjects?.find(s => s.id === selectedSubjectId);
        const subjectName = currentSubject?.name || '공부';
        const todayCount = selectedDateTomatoes || 0;
        const hour = new Date().getHours();

        const messagePool = {
            '🐛': [
                `꿈틀꿈틀~ ${subjectName} 화이팅! 🌱`,
                '토마토 잎사귀는 정말 맛있는 냄새가 나!',
                todayCount > 0 ? `오늘 벌써 ${todayCount}개나 수확했네! 🍅 더 힘내자!` : '아직 흙이 차가워, 어서 씨앗을 심자!',
                timerMode === 'rest' ? '나도 낙엽 밑에서 쉬고 있어~ 너무 서두르지 마.' : '조용히 응원할게, 사각사각...',
                hour < 12 ? '아침 이슬 먹고 자랐어! 상쾌한 하루 시작이야 💧' : '흙 냄새가 참 좋다, 그치?',
                '느려도 괜찮아요, 조금씩 나아가고 있으니까요 🐛',
            ],
            '🦋': [
                `팔랑팔랑~ ${subjectName} 재밌어 보여! ✨`,
                hour < 12 ? '아침부터 예쁜 꽃을 찾아왔어! 눈부신 하루네 ☀️' : '오후의 햇살이 참 따뜻해 🌼',
                todayCount >= 3 ? '네 열정에 내 날개가 더 빛나는 것 같아! 🦋' : '꽃 향기 따라 여기까지 왔는걸~',
                timerMode === 'rest' ? '잠깐 하늘을 보면서 기지개를 켜는 건 어때? 팔랑~' : '집중하는 모습이 꽃보다 아름다워 🌷',
                '바람이 좋은 날엔 어디든 날아갈 수 있을 것 같아!',
                '가끔은 나풀거리며 쉬어가는 것도 나쁘지 않아 🍃',
            ],
            '🐦': [
                `짹짹! 오늘따라 ${subjectName} 내용이 술술 넘어가네? 🎶`,
                todayCount >= 5 ? `와, 벌써 ${todayCount}개 수확이야! 대풍년이다 짹! 🎉` : '토마토가 빨갛게 익기를 얌전히 둥지에서 기다리는 중~',
                hour >= 17 ? '노을 질 때 지붕 위가 젤 멋지다구 짹! 올려다봐!' : '오늘 벌레 사냥은 성공적이야!',
                timerMode === 'work' ? '집중하는 눈빛이 독수리 같은데?! 🦅 멋지다!' : '노래 한 곡 뽑아줄까? 짹짹🎵',
                '포로롱~ 오두막 굴뚝 옆이 제일 따뜻해 🏠',
                todayCount === 0 ? '시작이 반이라는 말이 있지! 첫 토마토를 응원해 짹!' : '오늘도 알찬 하루야 짹짹!',
            ],
            '🐱': [
                `야옹~ 집사, ${subjectName} 열심히 하네? 🐾`,
                todayCount >= 3 ? `${todayCount}개나 수확하다니! 츄르 하나 까줘도 되겠다 냥냥! 🐟` : '냥냥, 무리하지 말고 내 옆에서 꾹꾹이 하면서 쉬어~',
                timerMode === 'work' ? '방해 안 할 테니까 집중해 봐~ (얌전히 식빵을 굽는다) 🍞' : '스다듬어도 좋아... 골골골 🐈',
                hour >= 22 ? '밤늦게까지 고생이네... 나도 졸리다 하품 🥱 자장구~' : '오늘 하루도 잘 부탁해 집사! 츄릅',
                '책상 위에 올라가도 돼? ...안 된다고? 치사해 꼬리탁!',
                '쉬는 시간에는 나랑 츄르 사냥을 나가는 건 어때? 🐾',
            ],
            '📚': [
                `${subjectName} 구절을 펼쳤구나! 멋진 지혜가 쏟아질 거야 📖`,
                '한 글자 한 글자 너의 세계를 넓혀주는 블록이 되어 쌓이고 있어.',
                todayCount >= 5 ? '이 기세라면 우리 오두막이 거대한 대도서관이 될지도 몰라! 🏛️' : '모르는 게 있으면 언제든 페이지를 천천히 넘겨봐.',
                timerMode === 'rest' ? '책장을 덮고 잠깐 눈을 식히세요. 지식들도 쉴 곳이 필요하니까요 😌' : '집중, 또 집중! 페이지 넘어가는 소리 좋아 🎶',
            ],
            '🕯️': [
                '따뜻한 불빛 아래서 생각하니까 마음이 한결 차분해지지? 🕯️',
                `${subjectName}, 촛불처럼 은은하게, 하지만 흔들림 없이 꾸준히 밝혀봐!`,
                hour >= 20 ? '밤에 켜는 촛불은 생각의 깊이를 더해줘... 몽환적이야 ✨' : '꺼지지 않게 내가 바람을 막아줄게.',
                '다 타버리지 않게 조심해. 넌 소중하니까 🕯️',
            ],
            '🔥': [
                '타닥, 타닥... 장작 타는 소리 좋아해? 불꽃멍 때리기 좋은 날 🔥',
                `${subjectName}에 향한 너의 열정이 장작 불꽃보다 뜨거워! 🔥`,
                todayCount >= 8 ? '우와! 벽난로가 폭발할 것 같은 열의야! 🌋 너무 무리하진 마!' : '언제나 널 따뜻하게 데워줄게. 이리 와서 마저 불 쬐어.',
                timerMode === 'rest' ? '타닥... 타닥... 잠시 불꽃을 바라보며 잡생각을 태워버려 😌' : '활활 타올라 보자구! 🔥',
            ],
            '🌈': [
                '비 온 뒤에는 항상 내가 뜨는 법이지! 예쁜 일곱 빛깔 🌈',
                `오늘 하루의 끝에 ${subjectName}의 영롱한 무지개가 뜰 거야! ✨`,
                '오두막 위에서 널 내려다보고 있어. 너의 하루는 참 예뻐!',
                todayCount >= 4 ? '무지개 다리를 타고 건너갈 수 있을 만큼 많이 모았네! 💖' : '힘들 땐 하늘의 무지개를 떠올려봐 ☁️🌈',
            ],
            '⭐': [
                '오늘의 주인공, 가장 밝게 빛나는 별! ⭐',
                `${subjectName} 마스터가 되는 그 날까지 밤하늘에서 반짝이며 응원할게!`,
                todayCount >= 10 ? '오늘 하루, 은하수보다 네가 이룬 성취가 더 웅장하고 아름다워! 🌌' : '별똥별에 소원 빌었어? 분명 이루어질 거야 ☄️',
                hour >= 23 ? '모두가 잠든 밤에도 널 비춰주고 있어... 수고했어 정말로 🌙' : '반짝반짝 작은 별~ 널 비춰줄게 ✨',
            ],
        };

        const pool = messagePool[creature.emoji] || [`${creature.name}(이)가 인사해요!`];
        // eslint-disable-next-line react-hooks/purity
        const randomIndex = Date.now() % pool.length;
        const randomMsg = pool[randomIndex];

        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        if (onSpeechBubble) {
            onSpeechBubble({ emoji: creature.emoji, name: creature.name, message: randomMsg });
        }
        speechTimeoutRef.current = setTimeout(() => {
            if (onSpeechBubble) onSpeechBubble(null);
        }, 3500);
    };

    return (
        <>
            {/* 🪴 나의 오두막 미니 정원 */}
            <div className={`mb-4 p-4 rounded-xl shadow-inner border transition-colors ${timerMode === 'work' ? 'bg-black/20 border-white/10' : 'bg-teal-900/30 border-teal-500/30'}`}>
                <div className={`text-[11px] font-black mb-3 text-center flex items-center justify-center gap-2 ${timerMode === 'work' ? 'text-slate-300' : 'text-teal-100'}`}>
                    🪴 나의 미니 정원
                </div>
                {(() => {
                    const total = selectedDateTomatoes;
                    const currentStage = [...GARDEN_STAGES].reverse().find(stage => total >= stage.requiredPomos) || GARDEN_STAGES[0];
                    const nextStage = GARDEN_STAGES.find(stage => stage.requiredPomos > total);

                    return (
                        <div className="flex flex-col items-center justify-center gap-3">
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

                            {nextStage && (
                                <div className="w-full">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                        <span>{currentStage.name.split(' (')[0]}</span>
                                        <span>{nextStage.name.split(' (')[0]} (🍅 {nextStage.requiredPomos - total}개 남음)</span>
                                    </div>
                                    <div className={`w-full h-2 rounded-full overflow-hidden ${timerMode === 'work' ? 'bg-slate-700' : 'bg-teal-700'}`}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${timerMode === 'work'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                : 'bg-gradient-to-r from-teal-400 to-cyan-300'
                                                }`}
                                            style={{ width: `${Math.min(100, (total / nextStage.requiredPomos) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* 🐱 오두막 식구 (누적 달성도) */}
            {!isZenMode && (
                <div className={`mb-4 p-3 rounded-xl border transition-colors ${timerMode === 'work' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-teal-600/30 border-teal-500/50'}`}>
                    {(() => {
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
            )}
        </>
    );
}
