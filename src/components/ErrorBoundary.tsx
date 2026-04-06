import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorInfo = null;
      try {
        errorInfo = JSON.parse(this.state.error?.message || "{}");
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-[2.5rem] p-12 text-center space-y-8 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
            
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
              <AlertCircle size={40} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Something went wrong</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                {errorInfo?.error || "An unexpected error occurred while processing your request."}
              </p>
            </div>

            {errorInfo && (
              <div className="p-6 bg-slate-50 rounded-2xl text-left space-y-3 border border-slate-100 overflow-hidden">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Error Details</div>
                <div className="text-xs font-mono text-slate-600 break-all">
                  <p>Operation: {errorInfo.operationType}</p>
                  <p>Path: {errorInfo.path}</p>
                  <p>Auth: {errorInfo.authInfo?.userId ? "Authenticated" : "Guest"}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95"
              >
                <RotateCcw size={20} />
                Try Again
              </button>
              <Link
                to="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
              >
                <Home size={20} />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
