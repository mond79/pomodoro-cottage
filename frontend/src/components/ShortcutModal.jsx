import { Keyboard, X } from 'lucide-react';

export default function ShortcutModal({ onClose }) {
  const shortcuts = [
    { key: 'Space', desc: '현재 집중할 타이머(뽀모도로) 시작/일시정지' },
    { key: 'Esc', desc: '열려있는 창(모달) 닫기 및 입력 취소' },
    { key: 'Z', desc: '방해 금지 모드(Zen Mode) 진입/해제' },
    { key: '?', desc: '단축키 안내 창(현재 창) 열기/닫기' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
      onClick={onClose}
    >
      <div 
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative border border-slate-100 dark:border-slate-800 animate-[scaleIn_200ms_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-slate-800 dark:text-slate-100">
          <Keyboard className="w-6 h-6 text-indigo-500" />
          오두막 단축키 가이드
        </h3>

        <div className="space-y-3">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{desc}</span>
              <kbd className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wider">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400 font-bold">
          오두막을 마우스 없이 더 빠르게 즐겨보세요!
        </p>
      </div>
    </div>
  );
}
