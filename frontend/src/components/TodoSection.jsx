import { useState } from 'react';
import { PenTool, CheckSquare, Plus, CheckCircle2, Trash2, CalendarDays, MapPin, Clock, Sparkles, Loader2, GripVertical, Tag, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { formatYMD } from '../utils/dateHelpers';
import { generateDailySummary } from '../utils/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TodoSection({
    selectedDate, diaries, saveDiary,
    todos, addTodo, toggleTodo, deleteTodo, reorderTodos, newTodo, setNewTodo, celebratingId,
    searchQuery, displayedEvents, deleteEvent,
    setNewEventDate, setShowAddModal,
    pomoSessions, currentMood, weatherData, setCurrentPomoTag
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeId, setActiveId] = useState(null);

    // 할 일 고급 설정 상태
    const [showAdvancedTodo, setShowAdvancedTodo] = useState(false);
    const [todoPriority, setTodoPriority] = useState('none');
    const [todoTag, setTodoTag] = useState('');
    const [todoDeadline, setTodoDeadline] = useState('');

    // 🖱️ PointerSensor: 5px 이상 드래그해야 시작 (클릭과 구분)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // 드래그 종료 시 순서 재배열
    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over || active.id === over.id) return;

        const oldIndex = todos.findIndex(t => t.id === active.id);
        const newIndex = todos.findIndex(t => t.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
            reorderTodos(arrayMove(todos, oldIndex, newIndex));
        }
    };

    // 📝 AI 하루 요약 생성
    const handleAISummary = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const dateStr = formatYMD(selectedDate);
            const todaySessions = (pomoSessions || []).filter(s => s.date === dateStr);
            const weatherDesc = weatherData?.weather?.[0]?.description || '';

            const result = await generateDailySummary({
                tomatoes: todaySessions.length,
                sessions: todaySessions,
                todos: todos || [],
                mood: currentMood || '클래식',
                weather: weatherDesc,
                diary: diaries[dateStr] || '',
            });

            if (result.summary) {
                const existing = diaries[dateStr] || '';
                const divider = existing ? '\n\n--- 🤖 AI 요약 ---\n' : '🤖 AI 요약\n';
                saveDiary(existing + divider + result.summary);
            } else {
                alert(result.error || 'AI 요약 생성에 실패했어요.');
            }
        } catch {
            alert('AI 요약 생성 중 오류가 발생했어요.');
        } finally {
            setIsGenerating(false);
        }
    };

    const activeTodo = activeId ? todos.find(t => t.id === activeId) : null;

    const handleAddTodoSubmit = (e) => {
        e.preventDefault();
        addTodo({
            text: newTodo,
            priority: todoPriority,
            tag: todoTag,
            deadline: todoDeadline
        });
        setTodoPriority('none');
        setTodoTag('');
        setTodoDeadline('');
        setShowAdvancedTodo(false);
    };

    return (
        <>
            {/* 일지 영역이 하단으로 이동되었습니다. */}

            {/* Daily To-Do 🎉 드래그 앤 드롭 정렬 + 폭죽 애니메이션 */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 relative">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-green-500" /> 오늘 나의 목표</h3>
                <form onSubmit={handleAddTodoSubmit} className="mb-6 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <input type="text" placeholder="오늘 할 일..." className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-green-500 outline-none transition-all" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} />
                        <button type="button" onClick={() => setShowAdvancedTodo(!showAdvancedTodo)} className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${showAdvancedTodo ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {showAdvancedTodo ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                        </button>
                        <button type="submit" className="bg-green-600 text-white p-2.5 rounded-2xl hover:bg-green-700 transition-all cursor-pointer flex-shrink-0"><Plus className="w-5 h-5" /></button>
                    </div>
                    {showAdvancedTodo && (
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 min-w-[120px]">
                                <Tag className="w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="태그 (예: 공부)" value={todoTag} onChange={(e) => setTodoTag(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-300" />
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 min-w-[140px]">
                                <Flag className="w-4 h-4 text-slate-400" />
                                <select value={todoPriority} onChange={(e) => setTodoPriority(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-200 cursor-pointer appearance-none dark:[color-scheme:dark]">
                                    <option value="none" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">우선순위 없음</option>
                                    <option value="high" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🔴 높음</option>
                                    <option value="medium" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🟡 보통</option>
                                    <option value="low" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">🔵 낮음</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex-1 min-w-[140px]">
                                <CalendarDays className="w-4 h-4 text-slate-400" />
                                <input type="date" value={todoDeadline} onChange={(e) => setTodoDeadline(e.target.value)} className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-200 cursor-pointer dark:[color-scheme:dark]" />
                            </div>
                        </div>
                    )}
                </form>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={({ active }) => setActiveId(active.id)}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveId(null)}
                >
                    <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {todos.map(todo => (
                                <SortableTodoItem
                                    key={todo.id}
                                    todo={todo}
                                    toggleTodo={toggleTodo}
                                    deleteTodo={deleteTodo}
                                    celebratingId={celebratingId}
                                    isDragging={activeId === todo.id}
                                    setCurrentPomoTag={setCurrentPomoTag}
                                />
                            ))}
                            {todos.length === 0 && <p className="text-center text-sm text-slate-400 py-4">모든 할 일을 마쳤거나, 아직 없네요! ☕</p>}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeTodo ? (
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border-2 border-green-400 opacity-90">
                                <GripVertical className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className={`text-sm font-medium flex-1 ${activeTodo.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{activeTodo.text}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Schedule Info */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-base flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <CalendarDays className="w-5 h-5" />
                        {searchQuery.trim() ? '검색 결과' : selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </h3>
                    <button onClick={() => { setNewEventDate(formatYMD(selectedDate)); setShowAddModal(true); }} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:scale-110 transition-transform cursor-pointer"><Plus className="w-5 h-5" /></button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayedEvents.length > 0 ? (
                        displayedEvents.map(event => (
                            <div key={event.id} className="p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase inline-block ${CATEGORIES.find(c => c.id === event.category)?.color || CATEGORIES[4].color}`}>
                                        {CATEGORIES.find(c => c.id === event.category)?.name || '기타'}
                                    </span>
                                    <button onClick={() => deleteEvent(event.id)} className="cursor-pointer text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <h4 className="font-black text-slate-800 dark:text-slate-200 mb-2 leading-tight pr-4">{event.title}</h4>
                                <div className="flex flex-col gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-400" /> {event.location}</div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-orange-400" />
                                        {event.date} {event.time && <span className="text-slate-400 dark:text-slate-500 ml-1 opacity-80">{event.time}</span>}
                                    </div>
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

            {/* Daily Retrospective (오늘의 항해 일지) */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <PenTool className="w-5 h-5" /> 오늘의 항해 일지
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-bold">{selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}의 기록</p>
                <textarea
                    placeholder="오늘 하루는 어땠나요? 사소한 칭찬도, 아쉬운 점도 모두 별빛이 될 거예요."
                    className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed transition-all placeholder-slate-400 custom-scrollbar"
                    value={diaries[formatYMD(selectedDate)] || ''}
                    onChange={(e) => saveDiary(e.target.value)}
                />
                <button
                    onClick={handleAISummary}
                    disabled={isGenerating}
                    className={`mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer
                        ${isGenerating
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-400 cursor-wait'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 hover:scale-[1.02] active:scale-95'
                        }
                    `}
                >
                    {isGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> AI가 오두막의 기억을 쓰고 있어요...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> 📝 AI 하루 요약 쓰기</>
                    )}
                </button>
            </div>
        </>
    );
}

// 🔀 드래그 가능한 할 일 항목 컴포넌트
function SortableTodoItem({ todo, toggleTodo, deleteTodo, celebratingId, isDragging, setCurrentPomoTag }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: todo.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
        >
            {/* 🎉 폭죽 파티 효과 */}
            {celebratingId === todo.id && (
                <div className="absolute left-2 -top-4 pointer-events-none z-50 flex gap-1 text-2xl">
                    <span className="confetti-anim" style={{ animationDelay: '0ms' }}>🎉</span>
                    <span className="confetti-anim" style={{ animationDelay: '100ms' }}>✨</span>
                    <span className="confetti-anim" style={{ animationDelay: '200ms' }}>🎊</span>
                </div>
            )}

            {/* 🔀 드래그 핸들 */}
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 flex-shrink-0 touch-none"
                title="드래그하여 순서 변경"
            >
                <GripVertical className="w-4 h-4" />
            </button>

            <div onClick={() => toggleTodo(todo.id)} className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 z-10 ${todo.completed ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                {todo.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>

            <div className="flex-1 flex flex-col gap-1 min-w-0 z-10" onClick={() => toggleTodo(todo.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium transition-all truncate cursor-pointer ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {todo.text}
                    </span>
                    {todo.priority === 'high' && <Flag className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    {todo.priority === 'medium' && <Flag className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                    {todo.priority === 'low' && <Flag className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                </div>
                {(todo.tag || todo.deadline) && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {todo.tag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <Tag className="w-3 h-3" /> {todo.tag}
                            </span>
                        )}
                        {todo.deadline && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold
                                ${todo.completed
                                    ? 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-400'
                                    : new Date(todo.deadline) < new Date(new Date().setHours(0, 0, 0, 0))
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400'}`}>
                                <CalendarDays className="w-3 h-3" /> {todo.deadline}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ▶️ 작동 버튼 (타이머 연동) - 완료되지 않은 항목에만 표시 */}
            {!todo.completed && setCurrentPomoTag && (
                <button
                    onClick={() => {
                        setCurrentPomoTag(todo.text);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-1.5 rounded-lg flex items-center justify-center transition-colors shadow-sm ml-1 flex-shrink-0"
                    title="이 할 일로 집중 시작하기"
                >
                    ▶️
                </button>
            )}

            <button onClick={() => deleteTodo(todo.id)} className="cursor-pointer text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 ml-2 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
        </div>
    );
}
