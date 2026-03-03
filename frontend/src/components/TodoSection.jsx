import { PenTool, CheckSquare, Plus, CheckCircle2, Trash2, CalendarDays, MapPin, Clock } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { formatYMD } from '../utils/dateHelpers';

export default function TodoSection({
    selectedDate, diaries, saveDiary,
    todos, addTodo, toggleTodo, deleteTodo, newTodo, setNewTodo, celebratingId,
    searchQuery, displayedEvents, deleteEvent,
    setNewEventDate, setShowAddModal
}) {
    return (
        <>
            {/* Daily Retrospective (오늘의 항해 일지) */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-black mb-4 flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                    <PenTool className="w-6 h-6" /> 오늘의 항해 일지
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-bold">{selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}의 기록</p>
                <textarea
                    placeholder="오늘 하루는 어땠나요? 사소한 칭찬도, 아쉬운 점도 모두 별빛이 될 거예요."
                    className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed transition-all placeholder-slate-400 custom-scrollbar"
                    value={diaries[formatYMD(selectedDate)] || ''}
                    onChange={(e) => saveDiary(e.target.value)}
                />
            </div>

            {/* Daily To-Do 🎉 폭죽 애니메이션 추가됨 */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3"><CheckSquare className="w-6 h-6 text-green-500" /> 오늘 나의 목표</h3>
                <form onSubmit={addTodo} className="mb-6 flex gap-2">
                    <input type="text" placeholder="오늘 할 일..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 outline-none" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} />
                    <button type="submit" className="bg-green-600 text-white p-2.5 rounded-2xl hover:bg-green-700 transition-all cursor-pointer"><Plus className="w-5 h-5" /></button>
                </form>
                <div className="space-y-3">
                    {todos.map(todo => (
                        <div key={todo.id} className="relative flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                            {/* 🎉 폭죽 파티 효과 */}
                            {celebratingId === todo.id && (
                                <div className="absolute left-2 -top-4 pointer-events-none z-50 flex gap-1 text-2xl">
                                    <span className="confetti-anim" style={{ animationDelay: '0ms' }}>🎉</span>
                                    <span className="confetti-anim" style={{ animationDelay: '100ms' }}>✨</span>
                                    <span className="confetti-anim" style={{ animationDelay: '200ms' }}>🎊</span>
                                </div>
                            )}
                            <div onClick={() => toggleTodo(todo.id)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 z-10 ${todo.completed ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                {todo.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span onClick={() => toggleTodo(todo.id)} className={`text-sm font-medium transition-all flex-1 cursor-pointer z-10 ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{todo.text}</span>
                            <button onClick={() => deleteTodo(todo.id)} className="cursor-pointer text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                    {todos.length === 0 && <p className="text-center text-sm text-slate-400 py-4">모든 할 일을 마쳤거나, 아직 없네요! ☕</p>}
                </div>
            </div>

            {/* Schedule Info */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <CalendarDays className="w-5 h-5" />
                        {searchQuery.trim() ? '검색 결과' : selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </h3>
                    <button onClick={() => { setNewEventDate(formatYMD(selectedDate)); setShowAddModal(true); }} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:scale-110 transition-transform cursor-pointer"><Plus className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayedEvents.length > 0 ? (
                        displayedEvents.map(event => (
                            <div key={event.id} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase inline-block ${CATEGORIES.find(c => c.id === event.category)?.color || CATEGORIES[4].color}`}>
                                        {CATEGORIES.find(c => c.id === event.category)?.name || '기타'}
                                    </span>
                                    <button onClick={() => deleteEvent(event.id)} className="cursor-pointer text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <h4 className="font-black text-slate-800 dark:text-slate-200 mb-2 leading-tight pr-4">{event.title}</h4>
                                <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-400" /> {event.location}</div>
                                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-orange-400" /> {event.date}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-16 text-center text-slate-300 dark:text-slate-700">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-xs font-black uppercase tracking-widest">{searchQuery.trim() ? '검색된 일정이 없어요' : '일정이 없는 편안한 날'}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
