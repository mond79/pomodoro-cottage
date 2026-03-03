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
