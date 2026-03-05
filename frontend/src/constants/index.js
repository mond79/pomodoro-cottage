export const CATEGORIES = [
    { id: 'all', name: '전체', color: 'bg-slate-200 text-slate-700' },
    { id: 'exam', name: '시험/채용', color: 'bg-blue-100 text-blue-700' },
    { id: 'event', name: '행사/축제', color: 'bg-purple-100 text-purple-700' },
    { id: 'welfare', name: '복지/혜택', color: 'bg-green-100 text-green-700' },
    { id: 'other', name: '기타', color: 'bg-orange-100 text-orange-700' },
];

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const DEFAULT_QUOTES = [
    "가장 어두운 밤도 결국 지나가고 해는 뜰 것이다.",
    "당신의 노력이 오늘의 당신을 만든다.",
    "천천히 가는 것을 두려워 말고, 멈추는 것을 두려워하라.",
    "작은 성취가 모여 거대한 성공을 이룬다.",
    "오늘의 땀방울은 내일의 웃음꽃이 된다."
];

export const SUBJECT_COLORS = [
    { id: 'red', value: 'bg-red-400' },
    { id: 'orange', value: 'bg-orange-400' },
    { id: 'yellow', value: 'bg-yellow-400' },
    { id: 'green', value: 'bg-green-400' },
    { id: 'blue', value: 'bg-blue-400' },
    { id: 'purple', value: 'bg-purple-400' },
    { id: 'pink', value: 'bg-pink-400' },
];

export const MOODS = {
    classic: { name: '클래식 오두막', icon: '🏡', bgImage: '/img/night.png', defaultSound: '한국 독서실.mp3', workBg: 'from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black', restBg: 'from-teal-500 to-cyan-600' },
    rainy: { name: '비 오는 서재', icon: '🌧️', bgImage: '/img/rain.png', defaultSound: '비와 천둥.wav', workBg: 'from-blue-900 to-slate-800 dark:from-slate-900 dark:to-blue-900', restBg: 'from-blue-500 to-indigo-600' },
    campfire: { name: '한밤의 캠프파이어', icon: '🔥', bgImage: '/img/fireplace.png', defaultSound: '벽난로.mp3', workBg: 'from-orange-900 to-red-900 dark:from-stone-900 dark:to-red-900', restBg: 'from-orange-600 to-red-700' },
    forest: { name: '깊은 숲속', icon: '🌲', bgImage: '/img/forest.png', defaultSound: '숲에 새_1.mp3', workBg: 'from-emerald-900 to-green-900 dark:from-green-900 dark:to-black', restBg: 'from-emerald-500 to-teal-600' }
};

// --- Phase 16: 오두막의 미래 (계절 및 정원 리소스) ---

// 1. 4계절 배경화면 매핑
export const SEASONS = {
    spring: { id: 'spring', name: '화사한 봄날', image: '/bg/spring.png', months: [3, 4, 5] },
    summer: { id: 'summer', name: '짙은 녹음의 여름', image: '/bg/summer.png', months: [6, 7, 8] },
    autumn: { id: 'autumn', name: '노스탤직 가을', image: '/bg/autumn.png', months: [9, 10, 11] },
    winter: { id: 'winter', name: '포근한 겨울 아침', image: '/bg/winter.png', months: [12, 1, 2] }
};

// 2. 정원 4단계 변화 매핑 (토마토)
export const GARDEN_STAGES = [
    { level: 1, name: '씨앗 (Seed)', image: '/garden/tomato_1.png', requiredPomos: 0 },
    { level: 2, name: '새싹 (Sprout)', image: '/garden/tomato_2.png', requiredPomos: 4 }, // 뽀모도로 4번 달성
    { level: 3, name: '줄기와 잎 (Plant)', image: '/garden/tomato_3.png', requiredPomos: 10 }, // 10번 달성
    { level: 4, name: '토마토 수확 (Harvest)', image: '/garden/tomato_4.png', requiredPomos: 20 } // 20번 달성
];

// --- Phase 17: BGM 및 환경음 자동화 명시적 추천 세트 ---
// 날씨, 시간대, 특정 분위기에 맞춘 최적의 환경음 믹싱 프리셋
export const BGM_PRESETS = [
    {
        id: 'rainy_night',
        condition: (weather, hour) => weather === 'Rain' && (hour >= 19 || hour < 6),
        name: '비 오는 밤의 오두막',
        sounds: ['비와 천둥.wav', '벽난로.mp3'],
        volumes: { '비와 천둥.wav': 0.6, '벽난로.mp3': 0.4 },
        message: '비 내리는 쌀쌀한 밤이네요. 따뜻한 벽난로 소리를 준비했어요. 🔥'
    },
    {
        id: 'sunny_morning',
        condition: (weather, hour) => weather === 'Clear' && (hour >= 6 && hour < 12),
        name: '상쾌한 아침 숲',
        sounds: ['숲에 새_1.mp3', '바람 부는 분위기.wav'],
        volumes: { '숲에 새_1.mp3': 0.4, '바람 부는 분위기.wav': 0.3 },
        message: '상쾌한 아침 햇살과 함께 산새 소리가 들려와요. 활기차게 시작해 볼까요? ☀️'
    },
    {
        id: 'snowy_day',
        condition: (weather, hour) => weather === 'Snow',
        name: '눈 내리는 고요함',
        sounds: ['벽난로.mp3', '한국 독서실.mp3'],
        volumes: { '벽난로.mp3': 0.5, '한국 독서실.mp3': 0.2 },
        message: '창밖으로 눈이 내리고 있어요. 포근한 실내에서 조용히 집중해 보아요. ❄️'
    },
    {
        id: 'study_cafe',
        condition: (weather, hour) => true, // 기본 Fallback
        name: '아늑한 카페 한구석',
        sounds: ['카페소음.mp3', '한국 독서실.mp3'],
        volumes: { '카페소음.mp3': 0.5, '한국 독서실.mp3': 0.3 },
        message: '언제나 편안한 단골 카페 창가 자리를 준비해 두었어요. ☕'
    }
];
