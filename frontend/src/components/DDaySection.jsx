import { Trophy, Edit2, Plus, X } from 'lucide-react';
import { formatDDay, generateId } from '../utils/dateHelpers';

const DDAY_COLORS = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
];

export default function DDaySection({ dDays, setDDays, openEditDDay }) {
    const addDDay = () => {
        const colorIdx = dDays.length % DDAY_COLORS.length;
        setDDays(prev => [...prev, {
            id: generateId(),
            title: '새 목표',
            date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
            color: DDAY_COLORS[colorIdx]
        }]);
    };

    const deleteDDay = (id) => {
        if (dDays.length <= 1) return; // 최소 1개 유지
        setDDays(prev => prev.filter(d => d.id !== id));
    };

    return (
        <section className="max-w-7xl mx-auto mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dDays.map((d, idx) => (
                    <div key={d.id} className={`bg-gradient-to-br ${d.color} p-6 rounded-[2rem] shadow-xl text-white relative group`}>
                        <Trophy className="absolute right-[-10px] bottom-[-10px] w-32 h-32 opacity-10 group-hover:scale-110 transition-transform pointer-events-none" />

                        {/* 편집/삭제 버튼 컨테이너 */}
                        <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* 삭제 버튼 (2개 이상일 때만) */}
                            {dDays.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteDDay(d.id); }}
                                    aria-label={`삭제 ${d.title}`}
                                    className="w-9 h-9 flex items-center justify-center bg-red-500/40 hover:bg-red-500/70 rounded-full cursor-pointer transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            {/* 편집 버튼 */}
                            <button
                                onClick={(e) => { e.stopPropagation(); openEditDDay(idx); }}
                                aria-label={`편집 ${d.title}`}
                                className="w-9 h-9 flex items-center justify-center bg-white/25 hover:bg-white/45 rounded-full cursor-pointer transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-white/80 font-bold mb-1 tracking-tight">{d.title}</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-5xl font-black drop-shadow-md">{formatDDay(d.date)}</span>
                                <span className="text-sm text-white/70 mb-1.5 font-medium">{d.date.replace(/-/g, '.')}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* D-Day 추가 버튼 */}
                <button
                    onClick={addDDay}
                    className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer min-h-[120px]"
                >
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">D-Day 추가</span>
                </button>
            </div>
        </section>
    );
}
