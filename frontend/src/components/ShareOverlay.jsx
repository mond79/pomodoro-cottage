import React from 'react';
import { Sprout } from 'lucide-react';
import { formatYMD } from '../utils/dateHelpers';

export default function ShareOverlay({ totalHarvest, userName = '오두막 주인장' }) {
    const today = new Date();
    const dateString = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="absolute inset-0 pointer-events-none z-[100] flex flex-col justify-end p-8">
            {/* 캡처 시 외곽에 살짝 띄우는 감성 보더 (선택) */}
            <div className="absolute inset-4 border border-white/20 rounded-[2.5rem] mix-blend-overlay"></div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl flex items-center justify-between transform transition-all translate-y-2 opacity-100">
                
                {/* 왼쪽: 앱 로고 및 날짜 */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                            <span className="text-white text-lg drop-shadow-sm">🏕️</span>
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-white drop-shadow-md">
                            Pomodoro <span className="text-green-300">Cottage</span>
                        </h1>
                    </div>
                    <p className="text-white/70 text-sm font-semibold pl-1 tracking-wide flex items-center gap-1.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-green-400"></span>
                        {dateString} - {userName}의 기록
                    </p>
                </div>

                {/* 오른쪽: 하이라이트 지표 (총 수확량) */}
                <div className="text-right">
                    <div className="text-xs font-black tracking-widest text-amber-200/80 uppercase mb-1 flex items-center justify-end gap-1">
                        <Sprout className="w-3.5 h-3.5" /> Total Harvest
                    </div>
                    <div className="text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] flex items-baseline justify-end gap-1.5">
                        <span className="text-amber-400">🍅</span> {totalHarvest}
                    </div>
                </div>

            </div>
        </div>
    );
}
