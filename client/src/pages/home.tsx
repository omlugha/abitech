import { useState, useEffect } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function Home() {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Redirect after animation completes
    const timeout = setTimeout(() => {
      setRedirecting(true);
      window.location.href = "https://play.bwmxmd.online";
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-inter text-slate-100 overflow-x-hidden relative">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Loading Animation */}
        <div className="text-center max-w-md mx-auto">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto rounded-full border-4 border-slate-700 flex items-center justify-center">
              <div 
                className="absolute w-full h-full rounded-full border-t-4 border-l-4 border-purple-500 animate-spin"
                style={{
                  clipPath: `polygon(0 0, 50% 0, 50% 50%, 0 50%)`,
                  transform: `rotate(${loadingProgress * 3.6}deg)`
                }}
              />
              <div className="text-4xl font-bold gradient-text">BWM</div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-4 gradient-text">Redirecting...</h1>
          
          <div className="w-full bg-slate-700 rounded-full h-2.5 mb-6">
            <div 
              className="bg-purple-500 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          
          <p className="text-slate-400">
            {redirecting ? (
              "Opening Bwm xmd ncs..."
            ) : (
              "Preparing the ultimate music experience..."
            )}
          </p>
          
          {loadingProgress >= 100 && (
            <div className="mt-6 text-green-400 flex items-center justify-center">
              <svg className="animate-pulse w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ready to go!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
