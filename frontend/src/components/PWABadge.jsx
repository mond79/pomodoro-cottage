import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // 10분(600초)마다 새 버전이 있는지 체크합니다.
      if (r) {
        setInterval(() => {
          r.update()
        }, 60 * 10 * 1000)
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  // 업데이트도 없고 오프라인 준비도 안 되었다면 미표시
  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] m-0 p-0" role="alert" aria-labelledby="toast-message">
      <div className="bg-slate-800 border border-slate-600 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏕️</span>
            <h3 className="font-bold text-slate-100 text-sm">오두막 알림</h3>
          </div>
          <p id="toast-message" className="text-xs text-slate-300">
            {offlineReady
              ? <span>앱이 오프라인 모드로 설치되어 인터넷 없이도 작동합니다.</span>
              : <span>✨ 새로운 오두막 자재(업데이트)가 도착했어요!</span>}
          </p>
        </div>
        
        <div className="flex gap-2">
          {needRefresh && (
            <button 
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              onClick={() => updateServiceWorker(true)}
            >
              새로고침
            </button>
          )}
          <button 
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            onClick={() => close()}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
