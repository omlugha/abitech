import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Download, RefreshCw, Globe, MessageCircle, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiResponse {
  status: string;
  data: {
    id: string;
    title: string;
    artist: string;
    links: {
      stream: string;
      download: string;
      thumbnail: string;
    };
    metadata: {
      source: string;
      license: string;
      format: string;
      quality: string;
    };
  };
  timestamp: string;
  endpoint: string;
}

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showJsonResponse, setShowJsonResponse] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Get current domain/URL for the endpoint
  const currentUrl = window.location.origin;
  const endpointUrl = `${currentUrl}/random`;

  const { data: response, isLoading, error, refetch } = useQuery<ApiResponse>({
    queryKey: [`${currentUrl}/random`, refreshKey],
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 3,
    retryDelay: 1000,
  });

  const song = response?.data;

  // Enable auto-play after first user interaction
  useEffect(() => {
    const enableAutoPlay = () => {
      setAutoPlayActive(true);
      document.removeEventListener('click', enableAutoPlay);
      document.removeEventListener('keydown', enableAutoPlay);
      document.removeEventListener('touchstart', enableAutoPlay);
    };

    document.addEventListener('click', enableAutoPlay);
    document.addEventListener('keydown', enableAutoPlay);
    document.addEventListener('touchstart', enableAutoPlay);

    return () => {
      document.removeEventListener('click', enableAutoPlay);
      document.removeEventListener('keydown', enableAutoPlay);
      document.removeEventListener('touchstart', enableAutoPlay);
    };
  }, []);

  // Auto-play every new song that loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song?.links?.stream) return;

    const playNewSong = async () => {
      try {
        // Set the new audio source
        audio.src = song.links.stream;
        audio.load();
        
        // Always try to auto-play the new song if auto-play is active
        if (autoPlayActive) {
          setIsAutoLoading(false); // Reset loading state
          await audio.play();
        }
      } catch (error) {
        console.error("Auto-play failed:", error);
        setIsAutoLoading(false);
        // Try again after a short delay
        setTimeout(() => {
          if (audio.paused && autoPlayActive) {
            audio.play().catch(e => console.error("Retry play failed:", e));
          }
        }, 500);
      }
    };

    playNewSong();
  }, [song?.id, autoPlayActive]);

  // Auto-load next song when current song ends
  const autoLoadNextSong = async () => {
    if (!autoPlayActive) return;
    
    setIsAutoLoading(true);
    setIsPlaying(false);
    
    // Increment refresh key to trigger new song fetch
    setRefreshKey(prev => prev + 1);
    
    // Trigger refetch to get new song immediately
    try {
      await refetch();
    } catch (error) {
      console.error("Failed to fetch next song:", error);
      setIsAutoLoading(false);
      // Retry after a delay
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        refetch();
      }, 1000);
    }
  };

  // Audio event listeners for continuous auto-play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setAutoPlayActive(true);
      setIsAutoLoading(false);
    };

    const handlePause = () => {
      if (!isAutoLoading) {
        setIsPlaying(false);
      }
    };

    const handleEnded = () => {
      console.log("Song ended - auto-loading next song");
      autoLoadNextSong();
    };

    const handleCanPlayThrough = () => {
      if (autoPlayActive && audio.paused) {
        audio.play().catch(e => {
          console.error("Auto-play on canplaythrough failed:", e);
        });
      }
    };

    const handleLoadedData = () => {
      if (autoPlayActive && audio.paused && !isAutoLoading) {
        audio.play().catch(e => {
          console.error("Auto-play on loadeddata failed:", e);
        });
      }
    };

    const handleError = () => {
      console.error("Audio error - trying next song");
      if (autoPlayActive) {
        setTimeout(() => {
          autoLoadNextSong();
        }, 1000);
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
    };
  }, [autoPlayActive, isAutoLoading]);

  // Handle page visibility for continuous playback
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && autoPlayActive && audioRef.current && song?.links?.stream) {
        if (audioRef.current.paused && !isAutoLoading) {
          audioRef.current.play().catch(e => {
            console.error("Auto-play on visibility change failed:", e);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoPlayActive, song, isAutoLoading]);

  const handleNext = async () => {
    setAutoPlayActive(true);
    setIsAutoLoading(true);
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handlePrevious = async () => {
    setAutoPlayActive(true);
    setIsAutoLoading(true);
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const handleDownload = () => {
    setAutoPlayActive(true);
    
    if (song?.links?.download) {
      const link = document.createElement('a');
      link.href = song.links.download;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRefresh = async () => {
    setAutoPlayActive(true);
    setIsAutoLoading(true);
    setRefreshKey(prev => prev + 1);
    await refetch();
  };

  const copyToClipboard = async (text: string, type: 'url' | 'json') => {
    setAutoPlayActive(true);
    
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      }
      toast({
        title: "Copied!",
        description: `${type === 'url' ? 'Endpoint URL' : 'JSON response'} copied to clipboard`,
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Unable to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const toggleJsonResponse = () => {
    setAutoPlayActive(true);
    setShowJsonResponse(!showJsonResponse);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-inter text-slate-100 overflow-x-hidden relative">
      <AnimatedBackground />
      
      {/* Hidden audio element with preload */}
      <audio 
        ref={audioRef} 
        preload="auto"
        style={{ display: 'none' }}
      />
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="font-orbitron font-black text-4xl md:text-6xl lg:text-7xl gradient-text mb-4 tracking-wider">
            BWM XMD
          </h1>
          <h2 className="font-orbitron font-bold text-xl md:text-2xl lg:text-3xl text-slate-300 mb-2">
            No Copyright Sounds
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
            Random NCS Music API - Discover the best royalty-free music
          </p>
        </header>

        {/* API Status Indicator */}
        <div className="glass rounded-full px-6 py-2 mb-8 flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-slate-300">API Status: Online</span>
        </div>

        {/* Main Content Card */}
        <Card className="glass border-slate-700 w-full max-w-lg mx-auto mb-8">
          <CardContent className="p-6 md:p-8">
            {(isLoading || isAutoLoading) && (
              <div className="text-center py-8" data-testid="loading-state">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-400">
                  {isAutoLoading ? "Auto-loading next track..." : "Fetching random NCS track..."}
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-8" data-testid="error-state">
                <div className="text-red-400 mb-4">
                  <RefreshCw className="h-12 w-12 mx-auto mb-2" />
                  <p>Failed to load song</p>
                </div>
                <Button onClick={handleRefresh} variant="outline" data-testid="button-retry">
                  Try Again
                </Button>
              </div>
            )}

            {song && !isLoading && !isAutoLoading && (
              <div data-testid="song-content">
                {/* Song Thumbnail */}
                <div className="relative mb-6">
                  <img 
                    src={song.links.thumbnail}
                    alt={`${song.title} thumbnail`}
                    className="w-full h-64 object-cover rounded-xl shadow-2xl"
                    data-testid="img-thumbnail"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1" data-testid="text-title">
                      {song.title}
                    </h3>
                    <p className="text-slate-300 text-sm">{song.metadata.source}</p>
                  </div>
                  
                  {/* Playing indicator */}
                  {isPlaying && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>Auto Playing</span>
                    </div>
                  )}

                  {/* Auto-play status */}
                  {autoPlayActive && !isPlaying && !isAutoLoading && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>Auto-Play Ready</span>
                    </div>
                  )}
                </div>

                {/* Audio Player */}
                <MusicPlayer 
                  audioRef={audioRef} 
                  streamUrl={song.links.stream}
                  onNext={handleNext}
                  onPrevious={handlePrevious}
                  isPlaying={isPlaying}
                />

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  <Button 
                    onClick={handleDownload}
                    className="btn-secondary w-full py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center space-x-2"
                    data-testid="button-download"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download MP3</span>
                  </Button>
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3 mb-4">
                  <Button 
                    onClick={handlePrevious}
                    variant="outline"
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 border-slate-600"
                    disabled={isAutoLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polygon points="19 20 9 12 19 4 19 20"></polygon>
                      <line x1="5" y1="19" x2="5" y2="5"></line>
                    </svg>
                    <span>Previous</span>
                  </Button>
                  <Button 
                    onClick={handleNext}
                    variant="outline"
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 border-slate-600"
                    disabled={isAutoLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <polygon points="5 4 15 12 5 20 5 4"></polygon>
                      <line x1="19" y1="5" x2="19" y2="19"></line>
                    </svg>
                    <span>Next</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mx-auto">
          <a 
            href="https://bwmxmd.online" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 glass rounded-xl py-3 px-6 text-center font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-300 flex items-center justify-center space-x-2"
            data-testid="link-website"
          >
            <Globe className="h-4 w-4" />
            <span>For more visit</span>
          </a>
          
          <a 
            href="https://whatsapp.com/channel/0029VaZuGSxEawdxZK9CzM0Y" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 glass rounded-xl py-3 px-6 text-center font-medium text-slate-300 hover:text-white hover:bg-green-600/50 transition-all duration-300 flex items-center justify-center space-x-2"
            data-testid="link-whatsapp"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Follow WhatsApp</span>
          </a>
        </div>

            {/* API Documentation */}
        <Card className="glass border-slate-700 w-full max-w-lg mx-auto mt-8">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 gradient-text">API Endpoint</h3>
            
            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(endpointUrl, 'url')}
                data-testid="button-copy-url"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    <span>Copy Endpoint</span>
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                className="flex-1"
                onClick={toggleJsonResponse}
                data-testid="button-test-endpoint"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Test Endpoint</span>
              </Button>
            </div>

            {/* Live JSON Response */}
            {showJsonResponse && response && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-300">API Response:</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 h-8 w-8"
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'json')}
                    data-testid="button-copy-json"
                  >
                    {copiedJson ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto border border-slate-600">
                  <code data-testid="json-response">
{JSON.stringify(response, null, 2)}
                  </code>
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>Made by Ibrahim Adams • Compatible with Bwm xmd tech</p>
        </footer>
      </div>
    </div>
  );
}
