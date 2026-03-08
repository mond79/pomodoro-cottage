import { ChevronLeft, ChevronRight, BookOpen, Palette, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { WEEKDAYS, SUBJECT_COLORS } from '../constants';
import { formatYMD } from '../utils/dateHelpers';

export default function CalendarView({
    currentDate, setCurrentDate, days, events,
    selectedDate, setSelectedDate, searchQuery, setSearchQuery,
    subjects, toggleReading, deleteSubject, addSubject,
    newSubjectName, setNewSubjectName,
    newSubjectColor, setNewSubjectColor
}) {
    return (
        <div className="space-y-8">
            {/* Calendar Card - 노력의 잔디밭 적용 🌱 */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="p-6 md:p-8 flex items-center justify-between">
                    <h2 className="text-2xl font-black">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 text-xs font-bold cursor-pointer"
                        >
                            TODAY
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                            className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border-y border-slate-50 dark:border-slate-800">
                    {WEEKDAYS.map(day => (
                        <div key={day} className={`py-4 text-center text-[10px] font-black uppercase tracking-widest ${day === '일' ? 'text-red-400' : day === '토' ? 'text-blue-400' : 'text-slate-400'}`}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7">
                    {days.map((date, idx) => {
                        const isToday = date && formatYMD(date) === formatYMD(new Date());
                        const isSelected = date && formatYMD(date) === formatYMD(selectedDate);
                        const dayEvents = date ? events.filter(e => e.date === formatYMD(date)) : [];

                        // 노력의 잔디밭 계산 로직
                        const dateStr = date ? formatYMD(date) : null;
                        const dayGrassScore = date ? subjects.reduce((sum, s) => sum + (s.history?.[dateStr] || 0), 0) : 0;

                        // 오늘 공부한 과목들의 색상 (꽃밭 🌈)
                        const subjectsStudiedToday = date ? subjects.filter(s => (s.history?.[dateStr] || 0) > 0) : [];

                        let grassClass = '';
                        let textClass = isToday ? 'text-white' : 'text-slate-700 dark:text-slate-300';

                        if (dayGrassScore > 0) {
                            if (dayGrassScore >= 10) { grassClass = 'bg-slate-200 dark:bg-slate-700'; textClass = 'text-slate-800 dark:text-white'; }
                            else if (dayGrassScore >= 5) { grassClass = 'bg-slate-100 dark:bg-slate-800/80'; textClass = 'text-slate-700 dark:text-slate-200'; }
                            else { grassClass = 'bg-slate-50 dark:bg-slate-900/40'; }
                        }

                        return (
                            <div
                                key={idx}
                                onClick={() => { if (date) { setSelectedDate(date); setSearchQuery(''); } }}
                                className={`min-h-[110px] p-2 md:p-3 border-r border-b border-slate-50 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800/80 relative overflow-hidden
                  ${!date ? 'bg-slate-50/20 dark:bg-slate-950/20' : grassClass}
                  ${isSelected && !searchQuery ? 'ring-4 ring-inset ring-indigo-400 z-10 rounded-lg' : ''}
                `}
                            >
                                {date && (
                                    <>
                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-xl mb-1
                      ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : textClass}
                    `}>
                                            {date.getDate()}
                                        </span>

                                        {/* 별빛 잔디밭 (꽃밭) 렌더링 */}
                                        <div className="flex flex-wrap gap-1 mt-2 max-h-12 overflow-hidden">
                                            {subjectsStudiedToday.map(s => (
                                                <div
                                                    key={s.id}
                                                    className={`w-3 h-3 rounded-sm ${s.color || 'bg-indigo-400'} shadow-sm`}
                                                    title={`${s.name} ${s.history[dateStr]}회독`}
                                                />
                                            ))}
                                        </div>

                                        <div className="space-y-1 mt-1 absolute bottom-2 right-2 flex gap-1">
                                            {dayEvents.map(e => (
                                                <div 
                                                    key={e.id} 
                                                    className={`w-1.5 h-1.5 rounded-full ${e.category === 'birthday' ? 'bg-pink-400' : e.source === 'google' ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'}`} 
                                                    title={`${e.source === 'google' ? '[구글] ' : ''}${e.title}`} 
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Subject Management */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h2 className="text-xl font-black flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-indigo-500" /> 과목별 회독 기록
                    </h2>
                    <form onSubmit={addSubject} className="flex flex-col sm:flex-row gap-2">
                        <div className="flex gap-2 items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <Palette className="w-5 h-5 text-slate-400 ml-2" />
                            <div className="flex gap-1 pr-2">
                                {SUBJECT_COLORS.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => setNewSubjectColor(c.value)}
                                        className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${c.value} ${newSubjectColor === c.value ? 'scale-125 ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-slate-950' : 'opacity-30 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="새로운 과목..." className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-48" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
                            <button type="submit" className="bg-indigo-600 text-white p-2.5 rounded-2xl hover:bg-indigo-700 active:scale-90 transition-all cursor-pointer"><Plus className="w-5 h-5" /></button>
                        </div>
                    </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {subjects.map(subject => {
                        const dateStr = formatYMD(selectedDate);
                        const todayCount = subject.history?.[dateStr] || 0;
                        return (
                            <div key={subject.id} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-indigo-200 transition-all relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 ${subject.color || 'bg-indigo-400'} text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md`}>{todayCount}</div>
                                    <div>
                                        <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm pr-4 truncate max-w-[100px]">{subject.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold tracking-tighter">{selectedDate.getDate()}일 기록</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 z-10">
                                    <button onClick={() => toggleReading(subject.id, 1)} className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" aria-label={`회독 추가 ${subject.name}`}><RotateCcw className="w-4 h-4" /></button>
                                    <button onClick={() => deleteSubject(subject.id)} className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm opacity-0 group-hover:opacity-100 absolute top-2 right-2 md:relative md:top-auto md:right-auto" aria-label={`삭제 ${subject.name}`}><Trash2 className="w-3 h-3" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
