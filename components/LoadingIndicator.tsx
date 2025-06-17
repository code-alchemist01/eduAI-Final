import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = "Yükleniyor..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse delay-0"></div>
        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse delay-150"></div>
        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse delay-300"></div>
      </div>
      <p className="mt-6 text-lg font-medium text-slate-700">{message}</p>
      <style>{`
        .animate-pulse {
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .delay-0 { animation-delay: 0s; }
        .delay-150 { animation-delay: 0.15s; }
        .delay-300 { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
};

export default LoadingIndicator;