import { RefObject } from 'react';

interface MusicPlayerProps {
  audioRef: RefObject<HTMLAudioElement>;
  streamUrl: string;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isPlaying: boolean;
}

export function MusicPlayer({ 
  audioRef, 
  streamUrl, 
  onPlayPause, 
  onNext, 
  onPrevious,
  isPlaying
}: MusicPlayerProps) {
  return (
    <div className="audio-player rounded-xl p-4 mb-6" data-testid="audio-player">
      <audio 
        ref={audioRef}
        className="w-full" 
        controls
        preload="none"
        data-testid="audio-element"
      >
        <source src={streamUrl} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      <div className="flex justify-center items-center mt-4 space-x-4">
        <button 
          onClick={onPrevious}
          className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
          aria-label="Previous song"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
          </svg>
        </button>
        <button 
          onClick={onPlayPause}
          className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          )}
        </button>
        <button 
          onClick={onNext}
          className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
          aria-label="Next song"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
