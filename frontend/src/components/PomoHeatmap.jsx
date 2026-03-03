import { useState, useMemo } from 'react';

// 최근 365일 날짜 배열 생성
function generateYearDates() {
    const days = [];
    const today = new Date();
    // 일요일부터 시작하도록 오늘 기준 끝나는 주의 토요일까지 포함
    const endDate = new Date(today);
    // 365일 전 날짜 계산
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // 시작 날짜를 해당 주 일요일로 맞추기
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const current = new Date(startDate);
    while (current <= today) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

// 날짜를 YYYY-MM-DD 포맷으로
function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 토마토 개수 → 색상 단계 (0~4)
function getIntensity(count) {
    if (!count || count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
}

// 월 라벨 생성
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_LABELS = ['일', '', '화', '', '목', '', '토'];

// 테마별 잔디 색상
const THEME_COLORS = {
    classic: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],    // slate
    rainy: ['#1e293b', '#1e3a5f', '#1e40af', '#3b82f6', '#60a5fa'],    // blue
    campfire: ['#1c1917', '#78350f', '#b45309', '#f59e0b', '#fbbf24'],    // amber-orange
    forest: ['#022c22', '#064e3b', '#047857', '#10b981', '#34d399'],    // emerald-green
};

export default function PomoHeatmap({ pomoHistory, currentMood, onClose }) {
    const [tooltip, setTooltip] = useState(null);

    const dates = useMemo(() => generateYearDates(), []);
    const colors = THEME_COLORS[currentMood] || THEME_COLORS.classic;

    // 주 단위로 그룹화 (각 열 = 1주)
    const weeks = useMemo(() => {
        const result = [];
        let week = [];
        dates.forEach((date, i) => {
            week.push(date);
            if (date.getDay() === 6 || i === dates.length - 1) {
                result.push(week);
                week = [];
            }
        });
        return result;
    }, [dates]);

    // 월 라벨 위치 계산
    const monthLabels = useMemo(() => {
        const labels = [];
        let lastMonth = -1;
        weeks.forEach((week, weekIdx) => {
            const firstDay = week[0];
            if (firstDay.getMonth() !== lastMonth) {
                lastMonth = firstDay.getMonth();
                labels.push({ month: lastMonth, weekIdx });
            }
        });
        return labels;
    }, [weeks]);

    // 총 토마토 수
    const totalTomatoes = useMemo(() => {
        return Object.values(pomoHistory || {}).reduce((sum, v) => sum + v, 0);
    }, [pomoHistory]);

    // 활동 일수
    const activeDays = useMemo(() => {
        return Object.values(pomoHistory || {}).filter(v => v > 0).length;
    }, [pomoHistory]);

    const handleMouseEnter = (e, date, count) => {
        const rect = e.target.getBoundingClientRect();
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            date: toKey(date),
            count: count || 0,
        });
    };

    const handleMouseLeave = () => setTooltip(null);

    return (
        <div className="mt-8 p-6 rounded-[2rem] bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-xl">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                    🌿 나의 1년 성취 기록
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>🍅 총 <strong className="text-white">{totalTomatoes}</strong>개 수확</span>
                    <span>📅 <strong className="text-white">{activeDays}</strong>일 활동</span>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* 히트맵 그리드 */}
            <div className="overflow-x-auto pb-2">
                <div className="inline-flex flex-col gap-0 min-w-fit">
                    {/* 월 라벨 */}
                    <div className="flex ml-8 mb-1">
                        {monthLabels.map(({ month, weekIdx }, i) => {
                            const nextWeekIdx = monthLabels[i + 1]?.weekIdx || weeks.length;
                            const span = nextWeekIdx - weekIdx;
                            return (
                                <div key={`m-${month}`}
                                    style={{ width: `${span * 14}px` }}
                                    className="text-[10px] text-slate-500 font-medium"
                                >
                                    {MONTH_LABELS[month]}
                                </div>
                            );
                        })}
                    </div>

                    {/* 요일 라벨 + 그리드 */}
                    <div className="flex gap-0">
                        {/* 요일 라벨 (왼쪽) */}
                        <div className="flex flex-col gap-[2px] mr-1 pt-0">
                            {DAY_LABELS.map((label, i) => (
                                <div key={i} className="w-7 h-[12px] text-[9px] text-slate-500 font-medium flex items-center justify-end pr-1">
                                    {label}
                                </div>
                            ))}
                        </div>

                        {/* 잔디 그리드 */}
                        <div className="flex gap-[2px]">
                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[2px]">
                                    {/* 일요일(0) ~ 토요일(6) */}
                                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                                        const date = week.find(d => d.getDay() === dayIdx);
                                        if (!date) {
                                            return <div key={dayIdx} className="w-[12px] h-[12px]" />;
                                        }
                                        const key = toKey(date);
                                        const count = pomoHistory?.[key] || 0;
                                        const intensity = getIntensity(count);
                                        const bgColor = count > 0 ? colors[intensity] : 'rgba(255,255,255,0.06)';
                                        const isToday = toKey(new Date()) === key;

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`w-[12px] h-[12px] rounded-[3px] cursor-pointer transition-all duration-200 hover:scale-150 hover:z-10 ${isToday ? 'ring-1 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''}`}
                                                style={{ backgroundColor: bgColor }}
                                                onMouseEnter={(e) => handleMouseEnter(e, date, count)}
                                                onMouseLeave={handleMouseLeave}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 범례 */}
                    <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-slate-500">
                        <span>적게</span>
                        {colors.map((color, i) => (
                            <div
                                key={i}
                                className="w-[12px] h-[12px] rounded-[3px]"
                                style={{ backgroundColor: i === 0 ? 'rgba(255,255,255,0.06)' : color }}
                            />
                        ))}
                        <span>많이</span>
                    </div>
                </div>
            </div>

            {/* 툴팁 */}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
                >
                    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                        <div className="font-bold">{tooltip.date}</div>
                        <div className="text-slate-300">
                            {tooltip.count > 0 ? `🍅 ${tooltip.count}개 수확` : '활동 없음'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
