import { RefObject } from 'react';

interface MusicPlayerProps {
  audioRef: RefObject<HTMLAudioElement>;
  streamUrl: string;
}

export function MusicPlayer({ audioRef, streamUrl }: MusicPlayerProps) {
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
    </div>
  );
}
