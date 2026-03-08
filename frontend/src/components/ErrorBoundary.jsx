import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 리포팅 서비스에 에러를 기록할 수 있습니다.
    console.error('🚨 [ErrorBoundary] 앱 렌더링 중 치명적 오류 발생:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    // 상태를 초기화하고 페이지를 새로고침(또는 특정 상태로 복구)하여 재시도를 유도합니다.
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 컴포넌트 트리가 죽었을 때 보여줄 폴백(Fallback) UI입니다.
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] text-center">
            <div className="text-6xl mb-6">🛠️</div>
            <h2 className="text-2xl font-black mb-3 text-red-400 tracking-tight">앗, 오두막에 문제가 생겼어요!</h2>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              요정들이 열심히 수리하고 있지만, 화면을 그리는 중에 예상치 못한 마법 충돌이 발생했습니다. 
            </p>
            <div className="bg-slate-950/50 p-4 rounded-xl text-left overflow-hidden mb-8 border border-slate-700/50">
              <p className="text-xs font-mono text-red-300 truncate opacity-80">
                {this.state.error?.toString() || 'Unknown Error'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
            >
              🔄 오두막 다시 열기 (새로고침)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
