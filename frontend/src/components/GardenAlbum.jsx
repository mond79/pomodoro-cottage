import { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, TrendingUp, Calendar, Clock, Sparkles, Loader2, BarChart3 } from 'lucide-react';
import { fetchFocusStats } from '../utils/api';
import { GARDEN_STAGES } from '../constants';

export default function GardenAlbum({ pomoSessions, pomoHistory, subjects, onClose }) {
    const [tab, setTab] = useState('weekly'); // 'weekly' | 'monthly'
    const [stats, setStats] = useState(null);
    const [aiReport, setAiReport] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // 통계 데이터 로드
    useEffect(() => {
        let cancelled = false;
        setTimeout(() => setIsLoading(true), 0);
        fetchFocusStats(pomoSessions || []).then(data => {
            if (cancelled) return;
            setStats(data.stats || {});
            setAiReport(data.aiReport || '');
            setIsLoading(false);
        });
        return () => { cancelled = true; };
    }, [pomoSessions]);

    // 최근 7일 / 30일 정원 상태 계산
    const gardenCards = useMemo(() => {
        if (!pomoHistory) return [];
        const cards = [];
        const today = new Date();
        const dayCount = tab === 'weekly' ? 7 : 30;

        for (let i = dayCount - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const count = pomoHistory[key] || 0;
            const stage = [...GARDEN_STAGES].reverse().find(s => count >= s.requiredPomos) || GARDEN_STAGES[0];
            cards.push({
                date: key,
                label: `${d.getMonth() + 1}/${d.getDate()}`,
                dayName: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
                count,
                stage,
            });
        }
        return cards;
    }, [pomoHistory, tab]);

    // 차트 데이터 (주간/월간)
    const chartData = useMemo(() => {
        if (!stats) return [];
        return tab === 'weekly' ? (stats.recent7 || []) : (stats.recent30Weeks || []);
    }, [stats, tab]);

    const maxCount = useMemo(() => Math.max(...chartData.map(d => d.count), 1), [chartData]);

    // 과목별 색상 매핑
    const subjectColorMap = useMemo(() => {
        const map = {};
        (subjects || []).forEach(s => { map[s.name] = s.color; });
        return map;
    }, [subjects]);


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={onClose}>
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 custom-scrollbar"
                onClick={e => e.stopPropagation()}>

                {/* 헤더 */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-[2rem]">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-emerald-500" />
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">🌿 정원 앨범</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* 탭 전환 */}
                    <div className="flex gap-2">
                        {[
                            { id: 'weekly', label: '최근 7일', icon: Calendar },
                            { id: 'monthly', label: '최근 30일', icon: TrendingUp },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${tab === t.id
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-30 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-slate-700 border-t-emerald-500 animate-spin" />
                            </div>
                            <div className="text-center space-y-2 animate-pulse">
                                <p className="text-slate-600 dark:text-slate-300 font-bold text-lg tracking-tight">기억의 씨앗들을 모으고 있어요...</p>
                                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">✨ 요정들이 오두막의 기록을 엮어내는 중입니다</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 핵심 지표 요약 카드 */}
                            {stats && stats.totalSessions > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: '총 수확', value: `${stats.totalSessions}🍅`, color: 'text-red-500' },
                                        { label: '활동 일수', value: `${stats.activeDays}일`, color: 'text-blue-500' },
                                        { label: '주간 평균', value: `${stats.weeklyAvg}회`, color: 'text-emerald-500' },
                                        { label: '최적 요일', value: `${stats.bestDay}요일`, color: 'text-purple-500' },
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 text-center">
                                            <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 수확량 바 차트 */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {tab === 'weekly' ? '일별 수확량' : '주간 수확량'}
                                    </span>
                                </div>
                                <div className="flex items-end gap-1.5 h-32">
                                    {chartData.map((d, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                                {d.count > 0 ? d.count : ''}
                                            </span>
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-700 ${d.count > 0
                                                    ? 'bg-gradient-to-t from-emerald-500 to-emerald-300 dark:from-emerald-600 dark:to-emerald-400'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                    }`}
                                                style={{
                                                    height: `${d.count > 0 ? Math.max(8, (d.count / maxCount) * 100) : 4}%`,
                                                    minHeight: d.count > 0 ? '8px' : '3px',
                                                }}
                                            />
                                            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 truncate w-full text-center">
                                                {d.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 정원 상태 앨범 (주간 모드만) */}
                            {tab === 'weekly' && (
                                <div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        🌱 이번 주 정원 변화
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {gardenCards.map((card, i) => (
                                            <div key={i}
                                                className={`p-2 rounded-xl text-center transition-all hover:scale-105 ${card.count > 0
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50'
                                                    : 'bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30'
                                                    }`}>
                                                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{card.dayName}</div>
                                                <div className="w-10 h-10 mx-auto my-1 rounded-full overflow-hidden bg-white/50 dark:bg-slate-800/50 flex items-center justify-center">
                                                    {card.count > 0 ? (
                                                        <img src={card.stage.image} alt={card.stage.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg opacity-30">🌙</span>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] font-black ${card.count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                                    {card.count > 0 ? `${card.count}🍅` : '-'}
                                                </div>
                                                <div className="text-[8px] text-slate-400 dark:text-slate-500">{card.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 과목별 분포도 */}
                            {stats && stats.subjectStats && Object.keys(stats.subjectStats).length > 0 && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">📚 과목별 집중 분포</div>
                                    <div className="space-y-2">
                                        {Object.entries(stats.subjectStats).map(([name, count]) => {
                                            const total = stats.totalSessions || 1;
                                            const pct = Math.round((count / total) * 100);
                                            const colorClass = subjectColorMap[name] || 'bg-indigo-400';
                                            return (
                                                <div key={name} className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-24 truncate">{name}</span>
                                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-12 text-right">{count}회 ({pct}%)</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 시간대별 집중 분포 */}
                            {stats && stats.timeSlots && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-orange-400" />
                                        시간대별 집중 패턴
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {Object.entries(stats.timeSlots).map(([slot, count]) => {
                                            const icons = { '아침(6-12)': '🌅', '오후(12-18)': '☀️', '저녁(18-22)': '🌇', '밤(22-6)': '🌙' };
                                            const isBest = slot === stats.bestTime;
                                            return (
                                                <div key={slot}
                                                    className={`p-2.5 rounded-xl text-center transition-all ${isBest
                                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 ring-2 ring-orange-200/50 dark:ring-orange-800/30'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50'
                                                        }`}>
                                                    <div className="text-xl mb-1">{icons[slot] || '⏰'}</div>
                                                    <div className={`text-lg font-black ${isBest ? 'text-orange-500' : 'text-slate-700 dark:text-slate-200'}`}>{count}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{slot.replace(/\(.+\)/, '')}</div>
                                                    {isBest && <div className="text-[8px] font-black text-orange-500 mt-0.5">BEST ⭐</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 요일별 집중 분포 */}
                            {stats && stats.dayStats && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">📅 요일별 집중 패턴</div>
                                    <div className="flex items-end gap-2 h-20">
                                        {Object.entries(stats.dayStats).map(([day, count]) => {
                                            const maxDay = Math.max(...Object.values(stats.dayStats), 1);
                                            const isBest = day === stats.bestDay;
                                            return (
                                                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-[9px] font-bold text-slate-500">{count > 0 ? count : ''}</span>
                                                    <div
                                                        className={`w-full rounded-t-lg transition-all duration-500 ${isBest
                                                            ? 'bg-gradient-to-t from-purple-500 to-purple-300'
                                                            : count > 0
                                                                ? 'bg-gradient-to-t from-indigo-400 to-indigo-200 dark:from-indigo-600 dark:to-indigo-400'
                                                                : 'bg-slate-200 dark:bg-slate-700'
                                                            }`}
                                                        style={{ height: `${count > 0 ? Math.max(10, (count / maxDay) * 100) : 4}%`, minHeight: count > 0 ? '6px' : '2px' }}
                                                    />
                                                    <span className={`text-[10px] font-bold ${isBest ? 'text-purple-500' : 'text-slate-400'}`}>{day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* AI 집중 리포트 */}
                            {aiReport && (
                                <div className="mt-4 p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 dark:from-indigo-900/40 dark:via-slate-800/80 dark:to-purple-900/40 border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm relative overflow-hidden group">
                                    {/* 장식용 은은한 빛 반사 효과 (glow) */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-1000 group-hover:scale-150" />

                                    <div className="flex items-center gap-2 mb-4 relative z-10">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                                            <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                        </div>
                                        <h3 className="text-base font-black text-indigo-800 dark:text-indigo-300 tracking-tight">요정의 다이어리</h3>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-[1.8] font-medium whitespace-pre-line">
                                            {aiReport}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
