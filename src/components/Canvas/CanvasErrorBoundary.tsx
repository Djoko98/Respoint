import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Canvas Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 bg-gray-900 relative flex items-center justify-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <svg 
                className="w-6 h-6 text-red-400 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
              <h3 className="text-white font-semibold">Canvas Error</h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              Something went wrong with the canvas component. This might be related to:
            </p>
            
            <ul className="text-gray-400 text-sm space-y-1 mb-4">
              <li>• Layout data corruption</li>
              <li>• Network connectivity issues</li>
              <li>• Browser compatibility problems</li>
            </ul>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                }}
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors text-sm"
              >
                Try Again
              </button>
              
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 rounded transition-colors text-sm"
              >
                Reload Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-red-400 cursor-pointer text-sm">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-gray-400 mt-2 p-2 bg-black/20 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary; 