import { Flame, Target, TrendingUp, BarChart3 } from 'lucide-react';

export default function Dashboard({
    totalReadings, todoCompletionRate, requiredPace,
    targetReadings, setTargetReadings, weeklyChartData
}) {
    return (
        <section className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-orange-500 mb-2"><Flame className="w-5 h-5" /><h3 className="text-xs font-black tracking-widest uppercase">총 회독 합계</h3></div>
                <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{totalReadings}</span><span className="text-sm font-bold text-slate-400">회</span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-green-500"><Target className="w-5 h-5" /><h3 className="text-xs font-black tracking-widest uppercase">오늘의 달성률</h3></div>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">{todoCompletionRate}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${todoCompletionRate}%` }} />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between group relative">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-500"><TrendingUp className="w-5 h-5" /><h3 className="text-xs font-black tracking-widest uppercase">페이스 메이커</h3></div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold cursor-pointer" onClick={() => {
                        const newTarget = prompt("전체 목표 회독 수를 입력하세요!", targetReadings);
                        if (newTarget && !isNaN(newTarget)) setTargetReadings(Number(newTarget));
                    }}>목표 수정</div>
                </div>
                <div className="flex flex-col mt-2">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">하루 {requiredPace}</span><span className="text-sm font-bold text-slate-400">회독 필요</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">(목표: {targetReadings}회독 기준)</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-purple-500 mb-2"><BarChart3 className="w-5 h-5" /><h3 className="text-xs font-black tracking-widest uppercase">최근 7일 흐름</h3></div>
                <div className="flex items-end gap-2 h-10 mt-2">
                    {weeklyChartData.map((data, i) => (
                        <div key={i} className="flex-1 bg-purple-100 dark:bg-purple-900/30 rounded-t-md hover:bg-purple-300 transition-colors relative group h-full flex items-end">
                            <div className="w-full bg-purple-500 rounded-t-md transition-all duration-700" style={{ height: `${data.height}%`, minHeight: data.total > 0 ? '4px' : '0px' }} />
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {data.label}: {data.total}회
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
