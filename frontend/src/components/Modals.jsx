import { useState } from 'react';
import { X, Save, UploadCloud, Plus, Trash2, Palette, Database, Trophy } from 'lucide-react';
import { CATEGORIES, ACHIEVEMENTS } from '../constants';

export default function Modals({
    showSettingsModal, setShowSettingsModal, settingsMessage, handleBackup, handleRestore, showConfirmReset, setShowConfirmReset, handleResetAll,
    showQuoteModal, setShowQuoteModal, addQuote, newQuoteInput, setNewQuoteInput, customQuotes, deleteQuote,
    showDDayModal, setShowDDayModal, editingDDayIdx, setEditingDDayIdx, saveDDay, modalTitle, setModalTitle, modalDate, setModalDate,
    showAddModal, setShowAddModal, addEvent, newEventTitle, setNewEventTitle, newEventDate, setNewEventDate, newEventCategory, setNewEventCategory,
    newEventTime, setNewEventTime, newEventLocation, setNewEventLocation,
    appTheme, setAppTheme,
    achievements = [], totalHarvest = 0,
    setWeatherData
}) {
    const [settingsTab, setSettingsTab] = useState('achievements'); // 'achievements' | 'data' | 'theme'

    return (
        <>
            {/* Settings (타임캡슐) Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                ⚙️ 설정
                            </h2>
                            <button onClick={() => setShowSettingsModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        {/* 탭 메뉴 */}
                        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                            <button onClick={() => setSettingsTab('achievements')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-all cursor-pointer ${settingsTab === 'achievements' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <Trophy className="w-4 h-4" /> 나의 성취
                            </button>
                            <button onClick={() => setSettingsTab('theme')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-all cursor-pointer ${settingsTab === 'theme' ? 'bg-white dark:bg-slate-700 text-pink-500 dark:text-pink-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <Palette className="w-4 h-4" /> 테마 설정
                            </button>
                            <button onClick={() => setSettingsTab('data')} className={`flex-1 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 transition-all cursor-pointer ${settingsTab === 'data' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <Database className="w-4 h-4" /> 데이터 관리
                            </button>
                        </div>

                        {settingsMessage && (
                            <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-sm font-bold rounded-xl text-center animate-in fade-in">
                                {settingsMessage}
                            </div>
                        )}

                        {settingsTab === 'achievements' && (
                            <div className="space-y-4 animate-in slide-in-from-left-2 duration-200 hide-scrollbar overflow-y-auto max-h-[60vh] pb-4">
                                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 flex items-center justify-between border border-amber-100 dark:border-amber-900/30">
                                    <div>
                                        <h3 className="text-amber-700 dark:text-amber-500 font-extrabold text-sm mb-1">총 수확한 토마토 🍅</h3>
                                        <p className="text-xs text-amber-600/70 dark:text-amber-400/70 font-semibold">지금까지 오두막에서 가꾼 시간들</p>
                                    </div>
                                    <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{totalHarvest}개</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {ACHIEVEMENTS.map(badge => {
                                        const isUnlocked = achievements.includes(badge.id);
                                        return (
                                            <div key={badge.id} className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${isUnlocked ? 'bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 opacity-60 grayscale'}`}>
                                                <div className="text-4xl mb-2 filter drop-shadow-sm">{badge.icon}</div>
                                                <h4 className={`text-sm font-extrabold mb-1 ${isUnlocked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{badge.name}</h4>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-snug">{badge.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {settingsTab === 'data' && (
                            <div className="space-y-4 animate-in slide-in-from-left-2 duration-200">
                                <p className="text-sm text-slate-500 mb-2 font-medium">소중한 땀방울과 기록들을 안전하게 보관하세요.</p>
                                <button
                                    onClick={handleBackup}
                                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black transition-all cursor-pointer"
                                >
                                    <Save className="w-5 h-5 text-blue-500" /> 데이터 백업하기 (다운로드)
                                </button>

                                <label className="w-full flex items-center justify-center gap-3 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black transition-all cursor-pointer">
                                    <UploadCloud className="w-5 h-5 text-green-500" /> 데이터 복원하기 (업로드)
                                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                                </label>

                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                                    {!showConfirmReset ? (
                                        <button
                                            onClick={() => setShowConfirmReset(true)}
                                            className="w-full py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl font-black transition-all cursor-pointer"
                                        >
                                            모든 기록 지우기 (초기화)
                                        </button>
                                    ) : (
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-center animate-in slide-in-from-bottom-2">
                                            <p className="text-red-600 dark:text-red-400 font-bold mb-3 text-sm">정말 모든 별빛(기록)을 지울까요?</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-2 bg-white dark:bg-slate-800 text-slate-600 rounded-xl font-bold cursor-pointer">취소</button>
                                                <button onClick={handleResetAll} className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold cursor-pointer">네, 지울게요</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {settingsTab === 'theme' && (
                            <div className="space-y-6 animate-in slide-in-from-right-2 duration-200 hide-scrollbar overflow-y-auto max-h-[60vh] pb-4">
                                {/* 폰트 설정 */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">글꼴 스타일</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'font-sans', name: '기본 (고딕)' },
                                            { id: 'font-serif', name: '단정 (명조)' },
                                            { id: 'font-mono', name: '단색 (모노)' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setAppTheme(p => ({ ...p, font: f.id }))}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${f.id} ${appTheme?.font === f.id ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-400 text-pink-600 dark:text-pink-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 오버레이 밝기 설정 */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">배경 밝기 (오버레이)</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'bg-slate-900/20', name: '밝게' },
                                            { id: 'bg-slate-900/40', name: '기본' },
                                            { id: 'bg-slate-900/70', name: '어둡게' }
                                        ].map(bg => (
                                            <button
                                                key={bg.id}
                                                onClick={() => setAppTheme(p => ({ ...p, bgDim: bg.id }))}
                                                className={`py-2 rounded-xl text-xs border font-bold transition-all cursor-pointer ${appTheme?.bgDim === bg.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {bg.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 블러 효과 설정 */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">배경 선명도 제어</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'backdrop-blur-none', name: '선명하게' },
                                            { id: 'backdrop-blur-sm', name: '기본 블러' },
                                            { id: 'backdrop-blur-md', name: '강한 블러' }
                                        ].map(blur => (
                                            <button
                                                key={blur.id}
                                                onClick={() => setAppTheme(p => ({ ...p, bgBlur: blur.id }))}
                                                className={`py-2 rounded-xl text-xs border font-bold transition-all cursor-pointer ${appTheme?.bgBlur === blur.id ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-400 text-teal-600 dark:text-teal-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                {blur.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 🌡️ 날씨 분위기 설정 */}
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                                        🌦️ 날씨 분위기 직접 설정
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { name: '맑음', id: 800 },
                                            { name: '비', id: 500 },
                                            { name: '눈', id: 600 },
                                            { name: '낙뢰', id: 200 }
                                        ].map(w => (
                                            <button
                                                key={w.id}
                                                onClick={() => setWeatherData({ weather: [{ id: w.id }], main: { temp: 20 } })}
                                                className="py-2 rounded-xl text-[10px] font-black bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 transition-all cursor-pointer border border-transparent hover:border-blue-300"
                                            >
                                                {w.name}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[9px] text-slate-400 font-medium">※ 현재 날씨와 상관없이 오두막의 분위기를 내 마음대로 바꿀 수 있습니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quote Edit Modal */}
            {showQuoteModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400">마법 주문서 편집</h2>
                            <button onClick={() => setShowQuoteModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={addQuote} className="flex gap-2 mb-6">
                            <input
                                type="text" placeholder="새로운 명언을 입력하세요..."
                                className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100"
                                value={newQuoteInput} onChange={(e) => setNewQuoteInput(e.target.value)}
                            />
                            <button type="submit" className="px-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black cursor-pointer"><Plus className="w-5 h-5" /></button>
                        </form>

                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {customQuotes.map((q, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 pr-4">{q}</p>
                                    <button onClick={() => deleteQuote(idx)} className="cursor-pointer text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
            }

            {/* D-Day Edit Modal */}
            {
                showDDayModal && editingDDayIdx !== null && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black mb-6">목표 수정하기</h2>
                            <form onSubmit={saveDDay} className="space-y-5">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">목표 이름</label>
                                    <input value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} name="title" type="text" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">날짜 설정</label>
                                    <input value={modalDate} onChange={(e) => setModalDate(e.target.value)} name="date" type="date" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark]" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setShowDDayModal(false); setEditingDDayIdx(null); }} className="cursor-pointer flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">닫기</button>
                                    <button type="submit" className="cursor-pointer flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 transition-all hover:scale-105">저장 완료</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Event Add Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400">새로운 일정 기록</h2>
                                <button onClick={() => setShowAddModal(false)} className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                            </div>
                            <form onSubmit={addEvent} className="space-y-5">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">일정 제목</label>
                                    <input required value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} type="text" placeholder="도서관 가서 공부하기" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder-slate-400 text-slate-800 dark:text-slate-100" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">날짜</label>
                                        <input required value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} type="date" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">시간</label>
                                        <input required value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} type="time" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800 dark:text-slate-100 dark:[color-scheme:dark]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">분류</label>
                                        <select value={newEventCategory} onChange={(e) => setNewEventCategory(e.target.value)} className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold appearance-none text-slate-800 dark:text-slate-100">
                                            {CATEGORIES.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">장소 (선택)</label>
                                        <input value={newEventLocation} onChange={(e) => setNewEventLocation(e.target.value)} type="text" placeholder="예: 구글 미트, 강남역" className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder-slate-400 text-slate-800 dark:text-slate-100" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 transition-all hover:scale-105 cursor-pointer mt-4">일정 추가하기</button>
                            </form>
                        </div>
                    </div>
                )
            }
        </>
    );
}
