import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Play, Download, RefreshCw, Globe, MessageCircle, Copy, Check } from "lucide-react";
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

  const handleStream = () => {
    if (audioRef.current && song?.links?.stream) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleDownload = () => {
    if (song?.links?.download) {
      const link = document.createElement('a');
      link.href = song.links.download;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  const copyToClipboard = async (text: string, type: 'url' | 'json') => {
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
    setShowJsonResponse(!showJsonResponse);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-inter text-slate-100 overflow-x-hidden relative">
      <AnimatedBackground />
      
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
            {isLoading && (
              <div className="text-center py-8" data-testid="loading-state">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-slate-400">Fetching random NCS track...</p>
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

            {song && !isLoading && (
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
                </div>

                {/* Audio Player */}
                <MusicPlayer audioRef={audioRef} streamUrl={song.links.stream} />

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  <Button 
                    onClick={handleStream}
                    className="btn-primary w-full py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center space-x-2"
                    data-testid="button-stream"
                  >
                    <Play className="h-4 w-4" />
                    <span>Stream Now</span>
                  </Button>
                  
                  <Button 
                    onClick={handleDownload}
                    className="btn-secondary w-full py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center space-x-2"
                    data-testid="button-download"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download MP3</span>
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 border-slate-600"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Get Another Random Song</span>
                </Button>
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
    <div className="flex gap-3">
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
        {showJsonResponse ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            <span>Response Shown</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Test Endpoint</span>
          </>
        )}
      </Button>
    </div>

    {/* Live JSON Response */}
    {showJsonResponse && response && (
      <div className="mt-4">
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
          <p>Made by Ibrahim Adams • Compatible with Render & Vercel</p>
        </footer>
      </div>
    </div>
  );
}
