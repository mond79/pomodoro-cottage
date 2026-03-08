import { useState, useMemo } from 'react';
import { X, TrendingUp, Clock, Flame, Target, BarChart3, Tag } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend
} from 'recharts';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const HOUR_LABELS = ['새벽\n(0-5)', '아침\n(6-8)', '오전\n(9-11)', '점심\n(12-13)', '오후\n(14-17)', '저녁\n(18-20)', '심야\n(21-23)'];
const HOUR_RANGES = [[0, 5], [6, 8], [9, 11], [12, 13], [14, 17], [18, 20], [21, 23]];

// 과목별 도넛 차트 색상 팔레트
const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

function getWeekRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function formatDate(d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportDashboard({ pomoSessions, onClose }) {
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthOffset, setMonthOffset] = useState(0);

    // === 주간 데이터 집계 ===
    const weekData = useMemo(() => {
        const now = new Date();
        const ref = new Date(now);
        ref.setDate(ref.getDate() + weekOffset * 7);
        const { start, end } = getWeekRange(ref);

        const startStr = toDateStr(start);
        const endStr = toDateStr(end);

        const sessions = (pomoSessions || []).filter(s => s.date >= startStr && s.date <= endStr);

        // 요일별 집계
        const byDay = Array(7).fill(0).map(() => ({ count: 0, totalMin: 0 }));
        sessions.forEach(s => {
            const d = new Date(s.date + 'T00:00:00');
            const day = d.getDay();
            byDay[day].count += 1;
            byDay[day].totalMin += s.duration || 25;
        });

        // 과목별 집계
        const bySubject = {};
        sessions.forEach(s => {
            const key = s.subjectName || '자유 집중';
            if (!bySubject[key]) bySubject[key] = { count: 0, totalMin: 0, color: s.subjectColor || 'bg-slate-400' };
            bySubject[key].count += 1;
            bySubject[key].totalMin += s.duration || 25;
        });

        // 태그별 집계
        const byTag = {};
        sessions.forEach(s => {
            if (s.tag) {
                const tags = s.tag.split(' ').map(t => t.trim()).filter(Boolean);
                tags.forEach(t => {
                    const tagKey = t.startsWith('#') ? t : `#${t}`;
                    if (!byTag[tagKey]) byTag[tagKey] = { count: 0, totalMin: 0 };
                    byTag[tagKey].count += 1;
                    byTag[tagKey].totalMin += s.duration || 25;
                });
            }
        });

        const totalPomos = sessions.length;
        const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
        const avgPerDay = totalPomos > 0 ? Math.round(totalMin / 7) : 0;

        return { start, end, byDay, bySubject, byTag, totalPomos, totalMin, avgPerDay, sessions };
    }, [pomoSessions, weekOffset]);

    // === 월간 데이터 집계 ===
    const monthData = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + monthOffset;
        const actualDate = new Date(year, month, 1);
        const y = actualDate.getFullYear();
        const m = actualDate.getMonth();
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
        const sessions = (pomoSessions || []).filter(s => s.date.startsWith(prefix));

        // 일별 집계
        const byDate = {};
        for (let i = 1; i <= daysInMonth; i++) {
            byDate[i] = { count: 0, totalMin: 0 };
        }
        sessions.forEach(s => {
            const day = parseInt(s.date.split('-')[2], 10);
            byDate[day].count += 1;
            byDate[day].totalMin += s.duration || 25;
        });

        // 과목별
        const bySubject = {};
        sessions.forEach(s => {
            const key = s.subjectName || '자유 집중';
            if (!bySubject[key]) bySubject[key] = { count: 0, totalMin: 0, color: s.subjectColor || 'bg-slate-400' };
            bySubject[key].count += 1;
            bySubject[key].totalMin += s.duration || 25;
        });

        // 태그별
        const byTag = {};
        sessions.forEach(s => {
            if (s.tag) {
                const tags = s.tag.split(' ').map(t => t.trim()).filter(Boolean);
                tags.forEach(t => {
                    const tagKey = t.startsWith('#') ? t : `#${t}`;
                    if (!byTag[tagKey]) byTag[tagKey] = { count: 0, totalMin: 0 };
                    byTag[tagKey].count += 1;
                    byTag[tagKey].totalMin += s.duration || 25;
                });
            }
        });

        const totalPomos = sessions.length;
        const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
        const activeDays = Object.values(byDate).filter(d => d.count > 0).length;

        return { year: y, month: m, daysInMonth, byDate, bySubject, byTag, totalPomos, totalMin, activeDays, sessions };
    }, [pomoSessions, monthOffset]);

    // === 시간대별 트렌드 ===
    const hourTrend = useMemo(() => {
        const data = viewMode === 'week' ? weekData.sessions : monthData.sessions;
        const buckets = HOUR_RANGES.map(() => ({ count: 0, totalMin: 0 }));

        data.forEach(s => {
            if (!s.startTime) return;
            const h = parseInt(s.startTime.split(':')[0], 10);
            const idx = HOUR_RANGES.findIndex(([lo, hi]) => h >= lo && h <= hi);
            if (idx >= 0) {
                buckets[idx].count += 1;
                buckets[idx].totalMin += s.duration || 25;
            }
        });

        return buckets;
    }, [viewMode, weekData.sessions, monthData.sessions]);

    // === 요일별 트렌드 (전체 기간) ===
    const dayTrend = useMemo(() => {
        const data = viewMode === 'week' ? weekData.sessions : monthData.sessions;
        const buckets = Array(7).fill(0).map(() => ({ count: 0, totalMin: 0 }));

        data.forEach(s => {
            const d = new Date(s.date + 'T00:00:00');
            const day = d.getDay();
            buckets[day].count += 1;
            buckets[day].totalMin += s.duration || 25;
        });

        return buckets;
    }, [viewMode, weekData.sessions, monthData.sessions]);

    // 현재 표시 데이터
    const current = viewMode === 'week' ? weekData : monthData;
    const maxBarVal = viewMode === 'week'
        ? Math.max(...weekData.byDay.map(d => d.totalMin), 1)
        : Math.max(...Object.values(monthData.byDate).map(d => d.totalMin), 1);

    // 이전 기간 대비
    const prevSessions = useMemo(() => {
        if (viewMode === 'week') {
            const ref = new Date();
            ref.setDate(ref.getDate() + (weekOffset - 1) * 7);
            const { start, end } = getWeekRange(ref);
            return (pomoSessions || []).filter(s => s.date >= toDateStr(start) && s.date <= toDateStr(end));
        } else {
            const now = new Date();
            const prevMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset - 1, 1);
            const prefix = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
            return (pomoSessions || []).filter(s => s.date.startsWith(prefix));
        }
    }, [pomoSessions, viewMode, weekOffset, monthOffset]);

    const prevTotalMin = prevSessions.reduce((sum, s) => sum + (s.duration || 25), 0);
    const changePercent = prevTotalMin > 0 ? Math.round(((current.totalMin - prevTotalMin) / prevTotalMin) * 100) : null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] border border-white/10 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-300 custom-scrollbar">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-xl font-black text-white">📊 집중 리포트</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* 주간/월간 전환 + 네비게이션 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                        {['week', 'month'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer
                                    ${viewMode === mode ? 'bg-yellow-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}
                                `}
                            >
                                {mode === 'week' ? '주간' : '월간'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => viewMode === 'week' ? setWeekOffset(p => p - 1) : setMonthOffset(p => p - 1)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold cursor-pointer transition-all"
                        >
                            ←
                        </button>
                        <span className="text-sm font-bold text-slate-300 min-w-[120px] text-center">
                            {viewMode === 'week'
                                ? `${formatDate(weekData.start)} ~ ${formatDate(weekData.end)}`
                                : `${monthData.year}년 ${monthData.month + 1}월`
                            }
                        </span>
                        <button
                            onClick={() => viewMode === 'week' ? setWeekOffset(p => p + 1) : setMonthOffset(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold cursor-pointer transition-all"
                        >
                            →
                        </button>
                    </div>
                </div>

                {/* 요약 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <SummaryCard icon={<Target className="w-4 h-4" />} label="총 뽀모" value={`${current.totalPomos}개`} color="text-yellow-400" />
                    <SummaryCard icon={<Clock className="w-4 h-4" />} label="총 집중" value={`${Math.round(current.totalMin / 60)}시간 ${current.totalMin % 60}분`} color="text-emerald-400" />
                    <SummaryCard
                        icon={<Flame className="w-4 h-4" />}
                        label={viewMode === 'week' ? '일 평균' : '활동일'}
                        value={viewMode === 'week' ? `${weekData.avgPerDay}분` : `${monthData.activeDays}일`}
                        color="text-orange-400"
                    />
                    <SummaryCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="이전 대비"
                        value={changePercent !== null ? `${changePercent > 0 ? '+' : ''}${changePercent}%` : '-'}
                        color={changePercent > 0 ? 'text-emerald-400' : changePercent < 0 ? 'text-red-400' : 'text-slate-400'}
                    />
                </div>

                {/* 📊 집중 시간 바 차트 (Recharts) */}
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[11px] font-bold text-slate-400 mb-3">
                        {viewMode === 'week' ? '📊 요일별 집중 시간 (분)' : '📊 일별 집중 시간 (분)'}
                    </div>
                    <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={viewMode === 'week'
                                    ? weekData.byDay.map((d, i) => ({ name: WEEKDAY_LABELS[i], min: d.totalMin }))
                                    : Array.from({ length: monthData.daysInMonth }, (_, i) => ({ name: `${i + 1}일`, min: monthData.byDate[i + 1].totalMin }))
                                }
                                margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                            >
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                                    dy={5}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10 }} 
                                    domain={[0, 'dataMax + 10']}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-800 border border-slate-700 p-2 rounded-lg shadow-xl">
                                                    <p className="text-white text-xs font-bold">{payload[0].payload.name}</p>
                                                    <p className="text-yellow-400 text-sm font-black">{payload[0].value}분</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar 
                                    dataKey="min" 
                                    radius={[4, 4, 0, 0]} 
                                    maxBarSize={32}
                                    animationDuration={1500}
                                >
                                    {
                                        (viewMode === 'week' ? weekData.byDay : Array.from({ length: monthData.daysInMonth })).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={viewMode === 'week' ? '#eab308' : '#10b981'} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 시간대별 + 요일별 트렌드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {/* 시간대별 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[11px] font-bold text-slate-400 mb-3">⏰ 시간대별 패턴</div>
                        <div className="flex flex-col gap-1.5">
                            {hourTrend.map((bucket, i) => {
                                const maxCount = Math.max(...hourTrend.map(b => b.count), 1);
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-[9px] text-slate-500 font-bold w-12 text-right whitespace-pre-line leading-tight">
                                            {HOUR_LABELS[i].split('\n')[0]}
                                        </span>
                                        <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                                                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold w-8">{bucket.count}회</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 요일별 */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className="text-[11px] font-bold text-slate-400 mb-3">📅 요일별 패턴</div>
                        <div className="flex flex-col gap-1.5">
                            {dayTrend.map((bucket, i) => {
                                const maxCount = Math.max(...dayTrend.map(b => b.count), 1);
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 font-bold w-6">{WEEKDAY_LABELS[i]}</span>
                                        <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-500"
                                                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold w-8">{bucket.count}회</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 과목별 비율 */}
                {Object.keys(current.bySubject || {}).length > 0 && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                        <div className="text-[11px] font-bold text-slate-400 mb-3">📚 과목별 비율</div>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="w-full sm:w-1/2 h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(current.bySubject)
                                                .sort((a, b) => b[1].totalMin - a[1].totalMin)
                                                .map(([name, data]) => ({ name, value: data.totalMin }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            animationDuration={1500}
                                        >
                                            {
                                                Object.entries(current.bySubject)
                                                    .sort((a, b) => b[1].totalMin - a[1].totalMin)
                                                    .map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))
                                            }
                                        </Pie>
                                        <Tooltip 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-800 border border-slate-700 p-2 rounded-lg shadow-xl text-center">
                                                            <p className="text-white text-xs font-bold mb-1">{payload[0].name}</p>
                                                            <p style={{ color: payload[0].payload.fill }} className="text-sm font-black">{payload[0].value}분</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* 커스텀 범례 (도넛 옆 리스트) */}
                            <div className="w-full sm:w-1/2 flex flex-col gap-2">
                                {Object.entries(current.bySubject)
                                    .sort((a, b) => b[1].totalMin - a[1].totalMin)
                                    .map(([name, data], index) => (
                                        <div key={name} className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                                                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                                            />
                                            <span className="text-xs text-slate-300 font-bold flex-1 truncate leading-tight">{name}</span>
                                            <span className="text-[10px] text-slate-500 font-bold w-8 text-right">{data.count}회</span>
                                            <span className="text-[10.5px] text-white font-bold w-12 text-right">{data.totalMin}분</span>
                                            <span className="text-[9px] text-emerald-400 font-bold w-9 text-right">
                                                {current.totalMin > 0 ? Math.round((data.totalMin / current.totalMin) * 100) : 0}%
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                )}

                {/* 태그별 비율 */}
                {Object.keys(current.byTag || {}).length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-indigo-500/20 mb-4">
                        <div className="text-[11px] font-bold text-indigo-300 mb-3 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> 태그별 분석
                        </div>
                        <div className="flex flex-col gap-2">
                            {Object.entries(current.byTag)
                                .sort((a, b) => b[1].totalMin - a[1].totalMin)
                                .slice(0, 10) // 상위 10개만 표시
                                .map(([name, data]) => (
                                    <div key={name} className="flex items-center gap-2">
                                        <span className="text-xs text-indigo-200 font-bold flex-1 truncate">{name}</span>
                                        <span className="text-[10px] text-slate-500 font-bold">{data.count}회</span>
                                        <span className="text-[10px] text-indigo-400 font-bold w-14 text-right">{data.totalMin}분</span>
                                        <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
                                                style={{ width: `${(data.totalMin / current.totalMin) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* 데이터 없음 */}
                {current.totalPomos === 0 && (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-slate-400 text-sm font-bold">이 기간의 집중 기록이 없어요</p>
                        <p className="text-slate-500 text-xs mt-1">뽀모도로를 완료하면 자동으로 기록됩니다</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, color }) {
    return (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
                <div className={color}>{icon}</div>
                <span className="text-[10px] text-slate-500 font-bold">{label}</span>
            </div>
            <div className={`text-lg font-black ${color}`}>{value}</div>
        </div>
    );
}
