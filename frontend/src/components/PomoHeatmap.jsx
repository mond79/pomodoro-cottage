import { useState, useMemo } from 'react';

// 최근 365일 날짜 배열 생성
function generateYearDates() {
    const days = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const current = new Date(startDate);
    while (current <= today) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getIntensity(count) {
    if (!count || count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const DAY_LABELS = ['일', '', '화', '', '목', '', '토'];

// Tailwind bg 클래스 → hex 색상 매핑 (과목별 잔디 색상)
const BG_TO_HEX = {
    'bg-red-400': ['#fca5a5', '#f87171', '#ef4444', '#dc2626'],
    'bg-orange-400': ['#fdba74', '#fb923c', '#f97316', '#ea580c'],
    'bg-yellow-400': ['#fde68a', '#fbbf24', '#f59e0b', '#d97706'],
    'bg-green-400': ['#86efac', '#4ade80', '#22c55e', '#16a34a'],
    'bg-blue-400': ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'],
    'bg-purple-400': ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed'],
    'bg-pink-400': ['#f9a8d4', '#f472b6', '#ec4899', '#db2777'],
    'bg-indigo-400': ['#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'],
    'bg-slate-400': ['#94a3b8', '#64748b', '#475569', '#334155'],
};

// 테마별 잔디 색상 (과목 미지정 시 기본 폴백)
const THEME_COLORS = {
    classic: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8'],
    rainy: ['#1e293b', '#1e3a5f', '#1e40af', '#3b82f6', '#60a5fa'],
    campfire: ['#1c1917', '#78350f', '#b45309', '#f59e0b', '#fbbf24'],
    forest: ['#022c22', '#064e3b', '#047857', '#10b981', '#34d399'],
};

export default function PomoHeatmap({ pomoHistory, pomoSessions, subjects, currentMood, onClose }) {
    const [tooltip, setTooltip] = useState(null);

    const dates = useMemo(() => generateYearDates(), []);
    const fallbackColors = THEME_COLORS[currentMood] || THEME_COLORS.classic;

    // 날짜별 "가장 많이 공부한 과목" 매핑
    const dateSubjectMap = useMemo(() => {
        const map = {};
        if (!pomoSessions || pomoSessions.length === 0) return map;

        pomoSessions.forEach(session => {
            if (!map[session.date]) map[session.date] = {};
            const subKey = session.subjectColor || 'bg-slate-400';
            map[session.date][subKey] = (map[session.date][subKey] || 0) + 1;
        });

        // 날짜별 최다 과목 색상 결정
        const result = {};
        Object.entries(map).forEach(([date, colorCounts]) => {
            let maxCount = 0;
            let dominantColor = null;
            Object.entries(colorCounts).forEach(([color, cnt]) => {
                if (cnt > maxCount) {
                    maxCount = cnt;
                    dominantColor = color;
                }
            });
            result[date] = { dominantColor, details: colorCounts };
        });
        return result;
    }, [pomoSessions]);

    // 날짜별 과목 상세 요약 (툴팁용)
    const getDateDetails = (dateKey) => {
        if (!pomoSessions) return [];
        const daySessions = pomoSessions.filter(s => s.date === dateKey);
        const subjectMap = {};
        daySessions.forEach(s => {
            if (!subjectMap[s.subjectName]) subjectMap[s.subjectName] = { count: 0, color: s.subjectColor };
            subjectMap[s.subjectName].count++;
        });
        return Object.entries(subjectMap).map(([name, { count, color }]) => ({ name, count, color }));
    };

    // 주 단위로 그룹화
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

    const totalTomatoes = useMemo(() => Object.values(pomoHistory || {}).reduce((sum, v) => sum + v, 0), [pomoHistory]);
    const activeDays = useMemo(() => Object.values(pomoHistory || {}).filter(v => v > 0).length, [pomoHistory]);

    // 셀 배경색 결정: 과목별 색상 우선, 없으면 테마 색상
    const getCellColor = (dateKey, count) => {
        if (count === 0) return 'rgba(255,255,255,0.06)';
        const intensity = getIntensity(count);
        const subjectInfo = dateSubjectMap[dateKey];

        if (subjectInfo && subjectInfo.dominantColor) {
            const hexArr = BG_TO_HEX[subjectInfo.dominantColor];
            if (hexArr) return hexArr[Math.min(intensity - 1, hexArr.length - 1)];
        }

        return fallbackColors[intensity];
    };

    const handleMouseEnter = (e, date, count) => {
        const rect = e.target.getBoundingClientRect();
        const dateKey = toKey(date);
        const details = getDateDetails(dateKey);
        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
            date: dateKey,
            count: count || 0,
            details,
        });
    };
    const handleMouseLeave = () => setTooltip(null);

    return (
        <div className="mt-8 p-6 rounded-[2rem] bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/10 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">🌿 나의 1년 성취 기록</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>🍅 총 <strong className="text-white">{totalTomatoes}</strong>개 수확</span>
                    <span>📅 <strong className="text-white">{activeDays}</strong>일 활동</span>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-700/50 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white">✕</button>
                    )}
                </div>
            </div>

            {/* 과목별 범례 */}
            {subjects && subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {subjects.map(sub => (
                        <div key={sub.id} className="flex items-center gap-1 text-[10px] text-slate-400">
                            <div className={`w-2.5 h-2.5 rounded-sm ${sub.color}`} />
                            <span>{sub.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="overflow-x-auto pb-2">
                <div className="inline-flex flex-col gap-0 min-w-fit">
                    <div className="flex ml-8 mb-1">
                        {monthLabels.map(({ month, weekIdx }, i) => {
                            const nextWeekIdx = monthLabels[i + 1]?.weekIdx || weeks.length;
                            const span = nextWeekIdx - weekIdx;
                            return (
                                <div key={`m-${month}`} style={{ width: `${span * 14}px` }} className="text-[10px] text-slate-500 font-medium">
                                    {MONTH_LABELS[month]}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-0">
                        <div className="flex flex-col gap-[2px] mr-1 pt-0">
                            {DAY_LABELS.map((label, i) => (
                                <div key={i} className="w-7 h-[12px] text-[9px] text-slate-500 font-medium flex items-center justify-end pr-1">{label}</div>
                            ))}
                        </div>

                        <div className="flex gap-[2px]">
                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[2px]">
                                    {Array.from({ length: 7 }).map((_, dayIdx) => {
                                        const date = week.find(d => d.getDay() === dayIdx);
                                        if (!date) return <div key={dayIdx} className="w-[12px] h-[12px]" />;
                                        const key = toKey(date);
                                        const count = pomoHistory?.[key] || 0;
                                        const bgColor = getCellColor(key, count);
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

                    {/* 범례: 강도 */}
                    <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-slate-500">
                        <span>적게</span>
                        {fallbackColors.map((color, i) => (
                            <div key={i} className="w-[12px] h-[12px] rounded-[3px]" style={{ backgroundColor: i === 0 ? 'rgba(255,255,255,0.06)' : color }} />
                        ))}
                        <span>많이</span>
                    </div>
                </div>
            </div>

            {/* 📊 과목별 공부 밸런스 (도넛 차트) */}
            {pomoSessions && pomoSessions.length > 0 && (() => {
                // 이번 달 세션만 필터
                const now = new Date();
                const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const monthSessions = pomoSessions.filter(s => s.date.startsWith(thisMonth));

                if (monthSessions.length === 0) return null;

                // 과목별 집계
                const subjectMap = {};
                monthSessions.forEach(s => {
                    if (!subjectMap[s.subjectName]) subjectMap[s.subjectName] = { count: 0, color: s.subjectColor, totalMin: 0 };
                    subjectMap[s.subjectName].count++;
                    subjectMap[s.subjectName].totalMin += (s.duration || 25);
                });
                const entries = Object.entries(subjectMap).sort((a, b) => b[1].count - a[1].count);
                const total = entries.reduce((sum, [, v]) => sum + v.count, 0);

                // SVG 도넛 차트 계산
                const radius = 50;
                const circumference = 2 * Math.PI * radius;
                let offset = 0;
                const bgHexMap = {
                    'bg-red-400': '#f87171', 'bg-orange-400': '#fb923c', 'bg-yellow-400': '#fbbf24',
                    'bg-green-400': '#4ade80', 'bg-blue-400': '#60a5fa', 'bg-purple-400': '#a78bfa',
                    'bg-pink-400': '#f472b6', 'bg-indigo-400': '#818cf8', 'bg-slate-400': '#94a3b8',
                };
                const segments = entries.map(([name, data]) => {
                    const pct = data.count / total;
                    const dash = pct * circumference;
                    const seg = { name, pct, dash, offset, color: bgHexMap[data.color] || '#94a3b8', count: data.count, totalMin: data.totalMin };
                    offset += dash;
                    return seg;
                });

                return (
                    <div className="mt-6 p-4 rounded-2xl bg-slate-700/30 border border-white/5">
                        <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2">📊 이번 달 공부 밸런스</h4>
                        <div className="flex items-center gap-6">
                            {/* 도넛 차트 */}
                            <div className="relative flex-shrink-0">
                                <svg width="130" height="130" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
                                    {segments.map((seg, i) => (
                                        <circle
                                            key={i} cx="60" cy="60" r={radius} fill="none"
                                            stroke={seg.color} strokeWidth="16"
                                            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                                            strokeDashoffset={-seg.offset}
                                            transform="rotate(-90 60 60)"
                                            style={{ transition: 'all 0.5s ease' }}
                                        />
                                    ))}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-black text-white">{total}</span>
                                    <span className="text-[9px] text-slate-400 font-bold">🍅 이번 달</span>
                                </div>
                            </div>

                            {/* 과목별 상세 */}
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                {segments.map((seg, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
                                        <span className="text-xs text-slate-300 truncate flex-1">{seg.name}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{seg.count}개</span>
                                        <span className="text-[10px] font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded-md">{Math.round(seg.pct * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 🕒 나의 골든타임 분석 */}
            {pomoSessions && pomoSessions.length > 0 && (() => {
                // 시간대별(0~23시) 토마토 수 집계
                const hourMap = new Array(24).fill(0);
                pomoSessions.forEach(s => {
                    if (s.startTime) {
                        const hour = parseInt(s.startTime.split(':')[0], 10);
                        if (!isNaN(hour)) hourMap[hour]++;
                    }
                });
                const maxCount = Math.max(...hourMap, 1);
                const goldenHour = hourMap.indexOf(maxCount);

                return (
                    <div className="mt-6 p-4 rounded-2xl bg-slate-700/30 border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-black text-white flex items-center gap-2">🕒 나의 골든타임</h4>
                            {maxCount > 0 && (
                                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                                    ⭐ {goldenHour}시대가 최고!
                                </span>
                            )}
                        </div>
                        <div className="flex items-end gap-[3px] h-[60px]">
                            {hourMap.map((count, hour) => {
                                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                const isGolden = hour === goldenHour && count > 0;
                                return (
                                    <div
                                        key={hour}
                                        className="flex-1 flex flex-col items-center group relative"
                                        title={`${hour}시: ${count}🍅`}
                                    >
                                        <div
                                            className={`w-full rounded-t-sm transition-all duration-300 ${isGolden ? 'bg-yellow-400' : count > 0 ? 'bg-emerald-500/70' : 'bg-white/5'
                                                }`}
                                            style={{ height: `${Math.max(pct, count > 0 ? 8 : 2)}%`, minHeight: '2px' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-[3px] mt-1">
                            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                                <span key={h} className="text-[8px] text-slate-500 font-bold" style={{ width: `${(3 / 24) * 100}%`, textAlign: 'center' }}>
                                    {h}시
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* 툴팁 */}
            {tooltip && (
                <div className="fixed z-50 pointer-events-none" style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
                    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap">
                        <div className="font-bold mb-1">{tooltip.date}</div>
                        {tooltip.details && tooltip.details.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                                {tooltip.details.map((d, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${d.color}`} />
                                        <span className="text-slate-300">{d.name}: {d.count}개 🍅</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-300">
                                {tooltip.count > 0 ? `🍅 ${tooltip.count}개 수확` : '활동 없음'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
