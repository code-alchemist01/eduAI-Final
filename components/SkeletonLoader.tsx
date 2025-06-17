import React from 'react';

const SkeletonLoader: React.FC = () => {
  return (
    <div className="w-full p-2 animate-fadeIn">
      {/* Title Placeholder */}
      <div className="h-10 bg-slate-200 rounded-md w-3/4 mb-8 animate-shimmer"></div>

      {/* Paragraph Placeholders */}
      <div className="space-y-3 mb-8">
        <div className="h-4 bg-slate-200 rounded-md w-full animate-shimmer" style={{ animationDelay: '0.1s' }}></div>
        <div className="h-4 bg-slate-200 rounded-md w-5/6 animate-shimmer" style={{ animationDelay: '0.2s' }}></div>
        <div className="h-4 bg-slate-200 rounded-md w-full animate-shimmer" style={{ animationDelay: '0.3s' }}></div>
        <div className="h-4 bg-slate-200 rounded-md w-3/4 animate-shimmer" style={{ animationDelay: '0.4s' }}></div>
        <div className="h-4 bg-slate-200 rounded-md w-4/5 animate-shimmer" style={{ animationDelay: '0.5s' }}></div>
      </div>
      
      {/* List Placeholder (optional, can be more text lines) */}
      <div className="space-y-3 mb-10">
        <div className="h-4 bg-slate-200 rounded-md w-1/2 mb-2 animate-shimmer" style={{ animationDelay: '0.6s' }}></div> {/* List item title */}
        <div className="h-4 bg-slate-200 rounded-md w-5/6 ml-4 animate-shimmer" style={{ animationDelay: '0.7s' }}></div>
        <div className="h-4 bg-slate-200 rounded-md w-4/6 ml-4 animate-shimmer" style={{ animationDelay: '0.8s' }}></div>
      </div>


      {/* Button Placeholders */}
      <div className="mt-10 space-y-3 sm:space-y-0 sm:flex sm:space-x-4">
        <div className="h-12 bg-slate-200 rounded-lg w-full sm:flex-1 animate-shimmer" style={{ animationDelay: '0.9s' }}></div>
        <div className="h-12 bg-slate-200 rounded-lg w-full sm:flex-1 animate-shimmer" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;