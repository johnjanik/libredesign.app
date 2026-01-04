Home_screen
import React from 'react';
import { Clock, Star, Zap } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { useTheme } from './contexts/ThemeContext';

interface Preset {
  id: string;
  name: string;
  description: string;
  layerCount: number;
  tags: string[];
  baseFrequency?: number;
  beatFrequency?: number;
  brainwaveState?: string;
  noiseColors?: string[];
}

interface HomeProps {
  onNavigate?: (screen: 'now-playing' | 'presets' | 'settings' | 'home') => void;
}

export default function Home({ onNavigate }: HomeProps) {
  const { colors } = useTheme();

  // Mock data - In production, this would come from user's history/favorites
  const recentPresets: Preset[] = [
    {
      id: '1',
      name: 'Focus',
      description: 'Binaural Beat, Pink Noise',
      layerCount: 2,
      tags: ['Focus', 'Productivity'],
      baseFrequency: 200,
      beatFrequency: 18,
      brainwaveState: 'Beta',
      noiseColors: ['Pink']
    },
    {
      id: '3',
      name: 'Deep Sleep',
      description: 'Binaural Beat, Brown Noise',
      layerCount: 2,
      tags: ['Sleep', 'Recovery'],
      baseFrequency: 150,
      beatFrequency: 2,
      brainwaveState: 'Delta',
      noiseColors: ['Brown']
    }
  ];

  const favoritePresets: Preset[] = [
    {
      id: '2',
      name: 'Meditation',
      description: 'Binaural Beat, White Noise',
      layerCount: 2,
      tags: ['Meditation', 'Calm'],
      baseFrequency: 180,
      beatFrequency: 6,
      brainwaveState: 'Theta',
      noiseColors: ['White']
    }
  ];

  const hasRecentSession = false; // Set to true to show "Resume Session" card

  const getBrainwaveColor = (state: string): string => {
    switch (state) {
      case 'Delta': return '#8B5CF6';
      case 'Theta': return '#3B82F6';
      case 'Alpha': return '#10B981';
      case 'Beta': return '#F59E0B';
      case 'Gamma': return '#EF4444';
      default: return colors.textTertiary;
    }
  };

  const PresetCard = ({ preset, showTime }: { preset: Preset; showTime?: boolean }) => (
    <div
      className="flex-shrink-0 w-[280px] rounded-xl p-4 cursor-pointer transition-all active:scale-[0.98]"
      style={{ backgroundColor: colors.cardBg }}
      onClick={() => onNavigate?.('now-playing')}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="mb-1" style={{ color: colors.text }}>
            {preset.name}
          </h3>
          <p className="text-sm" style={{ color: colors.textTertiary }}>
            {preset.layerCount} {preset.layerCount === 1 ? 'layer' : 'layers'}
          </p>
        </div>
        {preset.brainwaveState && (
          <div
            className="px-2 py-1 rounded text-xs"
            style={{
              backgroundColor: `${getBrainwaveColor(preset.brainwaveState)}20`,
              color: getBrainwaveColor(preset.brainwaveState)
            }}
          >
            {preset.brainwaveState}
          </div>
        )}
      </div>
     
      {showTime && (
        <div className="flex items-center gap-1.5 mt-3" style={{ color: colors.textTertiary }}>
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">24 min</span>
        </div>
      )}
     
      {preset.tags.length > 0 && !showTime && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {preset.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs rounded"
              style={{
                backgroundColor: colors.cardBgSecondary,
                color: colors.textTertiary
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
        {/* Status Bar */}
        <div className="h-11 flex items-center justify-center" style={{ color: colors.text }}>
          {colors.bg === '#f5f5f5' ? '07:52' : '10:21'}
        </div>

        {/* Header */}
        <div className="px-6 pb-6 pt-2">
          <h1 className="text-3xl mb-1" style={{ color: colors.text }}>
            {hasRecentSession ? 'Welcome Back' : 'ZenSoundLab'}
          </h1>
          <p className="text-sm" style={{ color: colors.textTertiary }}>
            {hasRecentSession ? 'Pick up where you left off' : 'Professional audio therapy'}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20">
         
          {/* Resume Session Card (if active) */}
          {hasRecentSession && (
            <div className="px-6 mb-6">
              <div
                className="rounded-xl p-5 cursor-pointer transition-all active:scale-[0.99]"
                style={{ backgroundColor: colors.text, color: colors.bg }}
                onClick={() => onNavigate?.('now-playing')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm opacity-80">Last session</span>
                  </div>
                  <span className="text-sm opacity-80">24 min ago</span>
                </div>
                <h3 className="text-xl mb-1">Focus</h3>
                <p className="text-sm opacity-70">2 layers • Beta state</p>
              </div>
            </div>
          )}

          {/* Recent Presets */}
          <div className="mb-8">
            <div className="flex items-center justify-between px-6 mb-3">
              <h2 className="text-lg" style={{ color: colors.text }}>Recent</h2>
              <button
                onClick={() => onNavigate?.('presets')}
                className="text-sm"
                style={{ color: colors.textTertiary }}
              >
                See all
              </button>
            </div>
           
            {recentPresets.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto px-6 scrollbar-hide">
                {recentPresets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} showTime />
                ))}
              </div>
            ) : (
              <div className="px-6">
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ backgroundColor: colors.cardBg }}
                >
                  <p className="text-sm" style={{ color: colors.textTertiary }}>
                    Your recent presets will appear here
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Favorites */}
          <div className="mb-8">
            <div className="flex items-center justify-between px-6 mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: colors.text }} />
                <h2 className="text-lg" style={{ color: colors.text }}>Favorites</h2>
              </div>
              <button
                onClick={() => onNavigate?.('presets')}
                className="text-sm"
                style={{ color: colors.textTertiary }}
              >
                See all
              </button>
            </div>
           
            {favoritePresets.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto px-6 scrollbar-hide">
                {favoritePresets.map((preset) => (
                  <PresetCard key={preset.id} preset={preset} />
                ))}
              </div>
            ) : (
              <div className="px-6">
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ backgroundColor: colors.cardBg }}
                >
                  <Star className="w-5 h-5 mx-auto mb-2" style={{ color: colors.textTertiary }} />
                  <p className="text-sm" style={{ color: colors.textTertiary }}>
                    Star presets to see them here
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="px-6 mb-6">
            <button
              onClick={() => onNavigate?.('now-playing')}
              className="w-full py-4 rounded-lg mb-3 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              style={{
                backgroundColor: colors.text,
                color: colors.bg
              }}
            >
              <Zap className="w-4 h-4" />
              <span>Start Fresh</span>
            </button>
           
            <button
              onClick={() => onNavigate?.('presets')}
              className="w-full py-4 rounded-lg transition-all active:scale-[0.99]"
              style={{
                backgroundColor: colors.cardBg,
                color: colors.text
              }}
            >
              Browse All Presets
            </button>
          </div>

          {/* Quick Stats */}
          <div className="px-6 mb-6">
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: colors.cardBg }}
            >
              <span className="text-sm" style={{ color: colors.textTertiary }}>
                This week
              </span>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg" style={{ color: colors.text }}>24</div>
                  <div className="text-xs" style={{ color: colors.textTertiary }}>sessions</div>
                </div>
                <div className="text-right">
                  <div className="text-lg" style={{ color: colors.text }}>8h 42m</div>
                  <div className="text-xs" style={{ color: colors.textTertiary }}>total time</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Navigation */}
        <BottomNav
          currentScreen="home"
          onNavigate={onNavigate}
        />
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

2_NowPlaying_preview

import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Moon, MoreVertical, X, Maximize2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { LayerCard } from './components/LayerCard';
import { BottomNav } from './components/BottomNav';
import { OutputIndicator } from './components/OutputIndicator';
import { AudioOutputPicker } from './components/AudioOutputPicker';
import { ContextMenu } from './components/ContextMenu';
import { FrequencyWheel } from './components/FrequencyWheel';
import { AddLayerSheet } from './components/AddLayerSheet';
import { useTheme } from './contexts/ThemeContext';

interface Layer {
  id: string;
  name: string;
  type: string;
  gain: number;
  pan: number;
  solo: boolean;
  mute: boolean;
  enabled: boolean;
}

interface NowPlayingProps {
  onNavigate?: (screen: 'now-playing' | 'presets' | 'settings') => void;
  onAddLayer?: () => void;
  activeNoiseColor?: string | null;
}

export default function NowPlaying({ onNavigate, onAddLayer, activeNoiseColor }: NowPlayingProps) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(true);
  const [masterVolume, setMasterVolume] = useState(80);
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('airpods');
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [currentVisualizationIndex, setCurrentVisualizationIndex] = useState(0);
  const [currentNoiseColor, setCurrentNoiseColor] = useState<string | null>(activeNoiseColor || null);
  const [showAddLayerSheet, setShowAddLayerSheet] = useState(false);
  const [sessionName, setSessionName] = useState('Deep Focus');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState(0);
  const [sleepTimerDuration, setSleepTimerDuration] = useState(600); // 10 minutes default
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showFrequencySection, setShowFrequencySection] = useState(false);

  // Elapsed time counter
  useEffect(() => {
    if (!isPlaying) return;
   
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sleep timer countdown
  useEffect(() => {
    if (!sleepTimerActive) return;

    const interval = setInterval(() => {
      setSleepTimerSeconds(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setSleepTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerActive]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Binaural beat frequency state
  const [baseFrequency, setBaseFrequency] = useState(200);
  const [beatFrequency, setBeatFrequency] = useState(18);

  // Get brainwave state from beat frequency
  const getBrainwaveState = (beatFreq: number): string => {
    if (beatFreq >= 1 && beatFreq < 4) return 'Delta';
    if (beatFreq >= 4 && beatFreq < 8) return 'Theta';
    if (beatFreq >= 8 && beatFreq < 14) return 'Alpha';
    if (beatFreq >= 14 && beatFreq <= 30) return 'Beta';
    if (beatFreq > 30) return 'Gamma';
    return 'Beta';
  };

  // Array of visualization images
  const visualizations = [
    'figma:asset/0aa86e3b62917275455bf16cd5607650f68c3549.png',
    'figma:asset/9bee21d77fb6fea6d2b5604d10dd27302f8e0af6.png',
    'figma:asset/9a0c5b63525371b73c2b318e8931d345a404e43d.png',
    'figma:asset/92320068f25bbba05b5dbe500bc37e0055459b87.png'
  ];

  // Array of color noises in order
  const colorNoises = ['White', 'Pink', 'Brown', 'Blue', 'Violet', 'Grey', 'Black', 'Green'];

  // Get noise color for visualization border
  const getNoiseCardBackground = (name: string): string => {
    const backgrounds: { [key: string]: string } = {
      'White': '#E8E8E8',
      'Pink': '#D8A8B8',
      'Brown': '#8B6A47',
      'Blue': '#6A8BA2',
      'Violet': '#8B7A9B',
      'Grey': '#6A6A6A',
      'Black': '#2a2a2a',
      'Green': '#5A8A5A'
    };
    return backgrounds[name] || '#666';
  };

  const handleNextVisualization = () => {
    if (currentNoiseColor) {
      // Cycle through color noises
      const currentIndex = colorNoises.indexOf(currentNoiseColor);
      const nextIndex = (currentIndex + 1) % colorNoises.length;
      setCurrentNoiseColor(colorNoises[nextIndex]);
    } else {
      // Cycle through visualizations
      setCurrentVisualizationIndex((prev) => (prev + 1) % visualizations.length);
    }
  };

  const handlePrevVisualization = () => {
    if (currentNoiseColor) {
      // Cycle through color noises
      const currentIndex = colorNoises.indexOf(currentNoiseColor);
      const prevIndex = (currentIndex - 1 + colorNoises.length) % colorNoises.length;
      setCurrentNoiseColor(colorNoises[prevIndex]);
    } else {
      // Cycle through visualizations
      setCurrentVisualizationIndex((prev) => (prev - 1 + visualizations.length) % visualizations.length);
    }
  };
 
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      name: 'Binaural Beat',
      type: 'Binaural Beat',
      gain: 50,
      pan: 0,
      solo: false,
      mute: false,
      enabled: true
    },
    {
      id: '2',
      name: 'Brown Noise',
      type: 'Brown Noise',
      gain: 50,
      pan: 0,
      solo: false,
      mute: false,
      enabled: true
    }
  ]);

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const getMasterVolumeSliderStyle = () => {
    const percent = masterVolume;
    return { '--slider-percent': `${percent}%` } as React.CSSProperties;
  };

  const getMasterVolumeDB = () => {
    const db = 20 * Math.log10(masterVolume / 100);
    return db === -Infinity ? '-∞' : db.toFixed(1);
  };

  const audioDevices = [
    { id: 'speaker', name: 'iPhone Speaker', type: 'phone' as const },
    { id: 'airpods', name: 'AirPods Pro', type: 'airpods' as const, batteryLevel: 88, caseBattery: 82 },
    { id: 'tv', name: '85" Crystal UHD', type: 'tv' as const },
    { id: 'other', name: 'PracticallyZen', type: 'other' as const }
  ];

  const selectedDevice = audioDevices.find(d => d.id === selectedDeviceId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: colors.bg }}>
        {/* Status Bar */}
        <div className="h-11 flex items-center justify-center" style={{ color: colors.text }}>
          {colors.bg === '#f5f5f5' ? '07:52' : '10:21'}
        </div>

        {/* Header */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h1 className="text-3xl mb-1" style={{ color: colors.text }}>{sessionName}</h1>
              <div className="flex items-center gap-2">
                {/* Brainwave Badge */}
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: (() => {
                      const state = getBrainwaveState(beatFrequency);
                      const colors: { [key: string]: string } = {
                        'Delta': '#8B7A9B',
                        'Theta': '#6A8BA2',
                        'Alpha': '#5A8A5A',
                        'Beta': '#D8A8B8',
                        'Gamma': '#E8A87C'
                      };
                      return colors[state] || '#666';
                    })(),
                    color: '#fff'
                  }}
                >
                  {getBrainwaveState(beatFrequency)}
                </span>
                {/* Layer count */}
                <span className="text-xs" style={{ color: colors.textTertiary }}>
                  {layers.length} layer{layers.length !== 1 ? 's' : ''}
                </span>
                {/* Elapsed time */}
                <span className="text-xs" style={{ color: colors.textTertiary }}>
                  • {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowContextMenu(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: colors.cardBg
              }}
            >
              <MoreVertical className="w-5 h-5" style={{ color: colors.textSecondary }} />
            </button>
          </div>
          <button
            onClick={() => setShowAudioPicker(true)}
            className="flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3C6.067 3 4.5 4.567 4.5 6.5V9.5C4.5 11.433 6.067 13 8 13C9.933 13 11.5 11.433 11.5 9.5V6.5C11.5 4.567 9.933 3 8 3Z"
                stroke={colors.textTertiary}
                strokeWidth="1.2"
                fill="none"
              />
              <path
                d="M5 10H3C2.5 10 2 10.5 2 11V12C2 12.5 2.5 13 3 13H5"
                stroke={colors.textTertiary}
                strokeWidth="1.2"
                fill="none"
              />
              <path
                d="M11 10H13C13.5 10 14 10.5 14 11V12C14 12.5 13.5 13 13 13H11"
                stroke={colors.textTertiary}
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
            <span className="text-sm" style={{ color: colors.textTertiary }}>
              {selectedDevice?.name || 'AirPods Pro'}
            </span>
            {/* Sleep timer countdown */}
            {sleepTimerActive && sleepTimerSeconds > 0 && (
              <>
                <span className="text-sm" style={{ color: colors.textTertiary }}>•</span>
                <span className="text-sm" style={{ color: colors.textTertiary }}>
                  Sleep: {formatTime(sleepTimerSeconds)}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Empty Space for Animation */}
        <div className="flex-1 flex items-center justify-center px-6 relative">
          {/* Left Arrow */}
          <button
            className="absolute left-2 z-10 w-12 h-20 flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: colors.cardBg,
              opacity: 0.6
            }}
            onClick={handlePrevVisualization}
          >
            <ChevronLeft className="w-6 h-6" style={{ color: colors.textSecondary }} />
          </button>

          {/*
            🎥 VIDEO PLACEHOLDER FOR DEVELOPER
            Replace this image with actual looping video element
            Video source: https://sora.chatgpt.com/g/gen_01ke191g8keek85zwnnn6bfgvw
           
            For Swift/iOS implementation:
            - Use AVPlayer with .loop behavior
            - Video should maintain aspect ratio (aspect-fit)
            - Center aligned in card with padding and shadow
            - Constrain to square aspect ratio, large scale
           
            For HTML5:
            <video autoPlay loop muted playsInline className="w-full aspect-square object-contain">
              <source src="/path/to/sora-visualization.mp4" type="video/mp4" />
            </video>
          */}
          <div
            className="rounded-2xl p-4 w-full max-w-[320px] cursor-pointer"
            style={{
              backgroundColor: colors.cardBg,
              boxShadow: colors.bg === '#0a0a0a'
                ? '0 8px 32px rgba(0, 0, 0, 0.5)'
                : '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
            onClick={() => setShowFullScreen(true)}
          >
            <div
              className="relative rounded-xl overflow-hidden w-full"
              style={{
                backgroundColor: '#000',
                aspectRatio: '1 / 1'
              }}
            >
              {/* Always show Sora visualizations in main view */}
              <img
                src={visualizations[currentVisualizationIndex]}
                alt="Visualization"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
             
              {/* Visualization indicator dots */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                {visualizations.map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{
                      backgroundColor: index === currentVisualizationIndex
                        ? 'rgba(255, 255, 255, 0.9)'
                        : 'rgba(255, 255, 255, 0.3)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button
            className="absolute right-2 z-10 w-12 h-20 flex items-center justify-center rounded-lg"
            style={{
              backgroundColor: colors.cardBg,
              opacity: 0.6
            }}
            onClick={handleNextVisualization}
          >
            <ChevronRight className="w-6 h-6" style={{ color: colors.textSecondary }} />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className="px-6 pb-6 space-y-8">
          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setShowFullScreen(true)}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.cardBg }}
            >
              <Maximize2 className="w-6 h-6" style={{ color: colors.textSecondary }} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isPlaying ? 'bg-white' : 'bg-[#2a2a2a]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-[#0a0a0a] fill-[#0a0a0a]" />
              ) : (
                <Play className="w-8 h-8 text-white fill-white" />
              )}
            </button>
            <button
              onClick={() => setShowSleepTimer(true)}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: sleepTimerActive ? colors.text : colors.cardBg
              }}
            >
              <Moon
                className="w-6 h-6"
                style={{
                  color: sleepTimerActive ? colors.bg : colors.textSecondary
                }}
              />
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav activeTab="now-playing" onTabChange={onNavigate} />
      </div>

      {/* Audio Output Picker */}
      {showAudioPicker && (
        <AudioOutputPicker
          devices={audioDevices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onClose={() => setShowAudioPicker(false)}
        />
      )}

      {/* Edit Sheet - Technical Details */}
      {showEditSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowEditSheet(false)}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />
          <div
            className="relative w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: colors.bg, maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div
                className="w-10 h-1 rounded-full"
                style={{ backgroundColor: colors.textTertiary, opacity: 0.3 }}
              />
            </div>

            {/* Header with Session Context */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1">
                  <h2 className="text-2xl" style={{ color: colors.text }}>Layer Editor</h2>
                </div>
                <button
                  onClick={() => setShowEditSheet(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colors.cardBg }}
                >
                  <X className="w-4 h-4" style={{ color: colors.textSecondary }} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: colors.textSecondary }}>{sessionName}</span>
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: (() => {
                      const state = getBrainwaveState(beatFrequency);
                      const colors: { [key: string]: string } = {
                        'Delta': '#8B7A9B',
                        'Theta': '#6A8BA2',
                        'Alpha': '#5A8A5A',
                        'Beta': '#D8A8B8',
                        'Gamma': '#E8A87C'
                      };
                      return colors[state] || '#666';
                    })(),
                    color: '#fff'
                  }}
                >
                  {getBrainwaveState(beatFrequency)}
                </span>
              </div>
            </div>

            {/* Master Volume - Always Visible at Top */}
            <div className="px-6 pb-4">
              <div className="rounded-xl px-5 py-4" style={{ backgroundColor: colors.cardBg }}>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: colors.textSecondary }}>Master Volume</span>
                  <span style={{ color: colors.text }}>{masterVolume}% ({getMasterVolumeDB()} dB)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  style={getMasterVolumeSliderStyle()}
                  className="w-full h-1 bg-[#2a2a2a] rounded-full appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Scrollable Content with Fade */}
            <div
              className="overflow-y-auto relative"
              style={{ maxHeight: 'calc(85vh - 260px)' }}
            >
              {/* Collapsible Binaural Settings - Only show if there's a binaural beat layer */}
              {layers.some(layer => layer.type === 'Binaural Beat') && (
                <div className="px-6 pb-4">
                  <button
                    onClick={() => setShowFrequencySection(!showFrequencySection)}
                    className="w-full rounded-xl px-5 py-4 flex items-center justify-between transition-colors"
                    style={{ backgroundColor: colors.cardBg }}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 transition-transform"
                        style={{
                          color: colors.textSecondary,
                          transform: showFrequencySection ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="text-left">
                        <div style={{ color: colors.text }}>Binaural Settings</div>
                        <div className="text-sm" style={{ color: colors.textTertiary }}>
                          {baseFrequency} Hz base • {beatFrequency} Hz beat
                        </div>
                      </div>
                    </div>
                  </button>
                 
                  {/* Expanded Frequency Wheel */}
                  {showFrequencySection && (
                    <div className="mt-4">
                      <FrequencyWheel
                        baseFrequency={baseFrequency}
                        beatFrequency={beatFrequency}
                        onBaseFrequencyChange={setBaseFrequency}
                        onBeatFrequencyChange={setBeatFrequency}
                        brainwaveState={getBrainwaveState(beatFrequency)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Layer Cards */}
              <div className="px-6 space-y-3 pb-4">
                {layers.map((layer, index) => (
                  <LayerCard
                    key={layer.id}
                    layer={layer}
                    onUpdate={(updates) => updateLayer(layer.id, updates)}
                    onDelete={() => setLayers(layers.filter(l => l.id !== layer.id))}
                  />
                ))}
              </div>

              {/* Bottom Fade Gradient */}
              <div
                className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${colors.bg}, transparent)`
                }}
              />
            </div>

            {/* Add Layer Button - Pinned at Bottom */}
            <div
              className="px-6 py-4 border-t"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.cardBg
              }}
            >
              <button
                onClick={() => {
                  setShowEditSheet(false);
                  setShowAddLayerSheet(true);
                }}
                className="w-full rounded-xl py-4 flex items-center justify-center gap-2 transition-all"
                style={{
                  backgroundColor: colors.cardBg
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.text;
                  const span = e.currentTarget.querySelector('span');
                  const icon = e.currentTarget.querySelector('svg');
                  if (span) (span as HTMLElement).style.color = colors.bg;
                  if (icon) (icon as SVGElement).style.color = colors.bg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.cardBg;
                  const span = e.currentTarget.querySelector('span');
                  const icon = e.currentTarget.querySelector('svg');
                  if (span) (span as HTMLElement).style.color = colors.textSecondary;
                  if (icon) (icon as SVGElement).style.color = colors.textSecondary;
                }}
              >
                <Plus className="w-5 h-5" style={{ color: colors.textSecondary }} />
                <span style={{ color: colors.textSecondary }}>Add Layer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleep Timer Popup */}
      {showSleepTimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSleepTimer(false)}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }} />
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-xl" style={{ color: colors.text }}>Stop Playback After...</h3>
            </div>

            {/* Options */}
            <div className="divide-y" style={{ borderColor: colors.border }}>
              {['10 minutes', '20 minutes', '30 minutes', '1 hour', 'Custom'].map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    const durations = [600, 1200, 1800, 3600]; // 10, 20, 30, 60 minutes in seconds
                    if (index < 4) {
                      setSleepTimerSeconds(durations[index]);
                      setSleepTimerDuration(durations[index]);
                      setSleepTimerActive(true);
                    }
                    setShowSleepTimer(false);
                  }}
                  className="w-full px-6 py-4 text-left text-lg transition-colors"
                  style={{
                    color: colors.text,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen View */}
      {showFullScreen && (
        <div
          className="fixed inset-0 z-[60]"
          style={{
            backgroundColor: currentNoiseColor ? getNoiseCardBackground(currentNoiseColor) : '#000'
          }}
        >
          <div className="w-full max-w-md h-full mx-auto relative flex flex-col">
            {/* Status Bar */}
            <div
              className="h-11 flex items-center justify-center z-20"
              style={{
                color: currentNoiseColor === 'White' ? '#000' : '#fff'
              }}
            >
              {colors.bg === '#f5f5f5' ? '07:52' : '10:21'}
            </div>

            {/* Fullscreen Visualization with Navigation */}
            <div className="flex-1 relative">
              {/* Left Arrow - Hidden in color noise mode */}
              {!currentNoiseColor && (
                <button
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-20 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm"
                  onClick={handlePrevVisualization}
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}

              {/* Video - Hidden in color noise mode */}
              {!currentNoiseColor && (
                <img
                  src={visualizations[currentVisualizationIndex]}
                  alt="Visualization"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Right Arrow - Hidden in color noise mode */}
              {!currentNoiseColor && (
                <button
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-20 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm"
                  onClick={handleNextVisualization}
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="pb-20 px-6 flex items-center justify-center gap-12 z-20">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: currentNoiseColor === 'White' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                {isPlaying ? (
                  <Pause
                    className="w-5 h-5"
                    style={{
                      color: currentNoiseColor === 'White' ? '#000' : '#fff'
                    }}
                    fill={currentNoiseColor === 'White' ? '#000' : '#fff'}
                  />
                ) : (
                  <Play
                    className="w-5 h-5"
                    style={{
                      color: currentNoiseColor === 'White' ? '#000' : '#fff'
                    }}
                    fill={currentNoiseColor === 'White' ? '#000' : '#fff'}
                  />
                )}
              </button>
              <button
                onClick={() => setShowFullScreen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: currentNoiseColor === 'White' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <X
                  className="w-5 h-5"
                  style={{
                    color: currentNoiseColor === 'White' ? '#000' : '#fff'
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Layer Sheet */}
      {showAddLayerSheet && (
        <AddLayerSheet
          onClose={() => setShowAddLayerSheet(false)}
          onAddBinauralBeat={() => {
            const newLayer: Layer = {
              id: String(layers.length + 1),
              name: 'Binaural Beat',
              type: 'Binaural Beat',
              gain: 50,
              pan: 0,
              solo: false,
              mute: false,
              enabled: true
            };
            setLayers([...layers, newLayer]);
          }}
          onAddColorNoise={(noiseName) => {
            const newLayer: Layer = {
              id: String(layers.length + 1),
              name: `${noiseName} Noise`,
              type: `${noiseName} Noise`,
              gain: 50,
              pan: 0,
              solo: false,
              mute: false,
              enabled: true
            };
            setLayers([...layers, newLayer]);
            setCurrentNoiseColor(noiseName);
          }}
          onAddPureTone={() => {
            const newLayer: Layer = {
              id: String(layers.length + 1),
              name: 'Pure Tone',
              type: 'Pure Tone',
              gain: 50,
              pan: 0,
              solo: false,
              mute: false,
              enabled: true
            };
            setLayers([...layers, newLayer]);
          }}
          onAddShepardTone={() => {
            const newLayer: Layer = {
              id: String(layers.length + 1),
              name: 'Shepard Tone',
              type: 'Shepard Tone',
              gain: 50,
              pan: 0,
              solo: false,
              mute: false,
              enabled: true
            };
            setLayers([...layers, newLayer]);
          }}
        />
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowContextMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0" />

          {/* Menu positioned at top right */}
          <div
            className="absolute top-20 right-6 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              backgroundColor: '#2a2a2a',
              minWidth: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowEditSheet(true);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg className="w-5 h-5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-white">Edit Layers</span>
            </button>
            <button
              onClick={() => {
                // Save preset logic
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg className="w-5 h-5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="text-white">Save as Preset</span>
            </button>
            <button
              onClick={() => {
                // Rename logic
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg className="w-5 h-5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-white">Rename Session</span>
            </button>
            <button
              onClick={() => {
                // Share logic
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5"
              style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg className="w-5 h-5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-white">Share</span>
            </button>
            <button
              onClick={() => {
                setLayers([]);
                setElapsedSeconds(0);
                setShowContextMenu(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5"
            >
              <svg className="w-5 h-5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-white">Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

app

import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { GeneratorTypePicker } from './components/GeneratorTypePicker';
import { BinauralSettings } from './components/BinauralSettings';
import { NoiseSettings } from './components/NoiseSettings';
import { TechnicalStatusBar } from './components/TechnicalStatusBar';
import NowPlaying from './NowPlaying';
import HomeEmpty from './HomeEmpty';
import Home from './Home';
import Presets from './Presets';
import Settings from './Settings';
import ZSL_AL_01A from './ZSL-AL-01A';
import ZSL_AL_01B from './ZSL-AL-01B';
import { DevNav } from './DevNav';
import { ThemeProvider } from './contexts/ThemeContext';

type GeneratorType = 'binaural' | 'noise';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'home-empty' | 'now-playing' | 'add-layer' | 'presets' | 'settings' | 'frame-01a' | 'frame-01b'>('home');
  const [generatorType, setGeneratorType] = useState<GeneratorType>('binaural');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [headphonesConnected, setHeadphonesConnected] = useState(true); // Default to true for development
 
  // Binaural settings
  const [baseFrequency, setBaseFrequency] = useState(200);
  const [beatFrequency, setBeatFrequency] = useState(10);
 
  // Noise settings
  const [noiseColor, setNoiseColor] = useState('white');
 
  // Active noise color for Now Playing visualization
  const [activeNoiseColor, setActiveNoiseColor] = useState<string | null>(null);
 
  const getBrainwaveLabel = (beatFreq: number): string => {
    if (beatFreq >= 1 && beatFreq < 4) return 'Delta';
    if (beatFreq >= 4 && beatFreq < 8) return 'Theta';
    if (beatFreq >= 8 && beatFreq < 14) return 'Alpha';
    if (beatFreq >= 14 && beatFreq <= 30) return 'Beta';
    if (beatFreq > 30) return 'Gamma';
    return '';
  };
 
  const isAddEnabled = () => {
    if (generatorType === 'binaural') {
      return headphonesConnected;
    }
    return true; // Noise is always valid
  };
 
  const getHelperText = () => {
    if (generatorType === 'binaural') {
      return 'Binaural beats for brainwave entrainment.';
    }
    return 'A steady noise layer to mask distractions.';
  };

  const handleNavigation = (screen: 'now-playing' | 'presets' | 'settings' | 'home') => {
    setCurrentScreen(screen);
  };

  return (
    <ThemeProvider>
      <AppContent
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        handleNavigation={handleNavigation}
        generatorType={generatorType}
        setGeneratorType={setGeneratorType}
        showTypePicker={showTypePicker}
        setShowTypePicker={setShowTypePicker}
        headphonesConnected={headphonesConnected}
        setHeadphonesConnected={setHeadphonesConnected}
        baseFrequency={baseFrequency}
        setBaseFrequency={setBaseFrequency}
        beatFrequency={beatFrequency}
        setBeatFrequency={setBeatFrequency}
        noiseColor={noiseColor}
        setNoiseColor={setNoiseColor}
        activeNoiseColor={activeNoiseColor}
        setActiveNoiseColor={setActiveNoiseColor}
        isAddEnabled={isAddEnabled}
        getHelperText={getHelperText}
        getBrainwaveLabel={getBrainwaveLabel}
      />
    </ThemeProvider>
  );
}

function AppContent(props: any) {
  const {
    currentScreen,
    setCurrentScreen,
    handleNavigation,
    generatorType,
    setGeneratorType,
    showTypePicker,
    setShowTypePicker,
    headphonesConnected,
    setHeadphonesConnected,
    baseFrequency,
    setBaseFrequency,
    beatFrequency,
    setBeatFrequency,
    noiseColor,
    setNoiseColor,
    activeNoiseColor,
    setActiveNoiseColor,
    isAddEnabled,
    getHelperText,
    getBrainwaveLabel
  } = props;

  // Show Now Playing
  if (currentScreen === 'now-playing') {
    return <NowPlaying onNavigate={handleNavigation} onAddLayer={() => setCurrentScreen('add-layer')} activeNoiseColor={activeNoiseColor} />;
  }

  // Show Presets
  if (currentScreen === 'presets') {
    return <Presets onNavigate={handleNavigation} onPlayPreset={(noiseColor) => {
      setActiveNoiseColor(noiseColor);
      setCurrentScreen('now-playing');
    }} />;
  }

  // Show Settings
  if (currentScreen === 'settings') {
    return <Settings onNavigate={handleNavigation} />;
  }

  // Show Frame 01A
  if (currentScreen === 'frame-01a') {
    return (
      <>
        <ZSL_AL_01A />
        <DevNav onNavigate={(screen) => setCurrentScreen(screen)} />
      </>
    );
  }

  // Show Frame 01B
  if (currentScreen === 'frame-01b') {
    return (
      <>
        <ZSL_AL_01B />
        <DevNav onNavigate={(screen) => setCurrentScreen(screen)} />
      </>
    );
  }

  // Show Home Empty by default
  if (currentScreen === 'home-empty') {
    return (
      <HomeEmpty
        onAddLayer={() => setCurrentScreen('add-layer')}
        onBrowsePresets={() => setCurrentScreen('presets')}
        onNavigate={handleNavigation}
      />
    );
  }

  // Show Home by default
  if (currentScreen === 'home') {
    return (
      <Home
        onNavigate={handleNavigation}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Main Modal */}
      <div className="w-full max-w-md bg-[#121212] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
          <button
            id="btn_cancel"
            className="text-[#888] px-2 py-1"
            onClick={() => setCurrentScreen('now-playing')}
          >
            Cancel
          </button>
          <h1 className="text-white">Add Layer</h1>
          <button
            id="btn_add"
            disabled={!isAddEnabled()}
            className={`px-4 py-1 rounded-md transition-all ${
              isAddEnabled()
                ? 'bg-white text-[#0a0a0a]'
                : 'bg-[#2a2a2a] text-[#444]'
            }`}
            onClick={() => {
              if (isAddEnabled()) {
                // TODO: Add layer logic here
                setCurrentScreen('now-playing');
              }
            }}
          >
            Add
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Generator Type Row */}
          <button
            id="row_generatorType"
            onClick={() => setShowTypePicker(true)}
            className="w-full bg-[#1a1a1a] rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <span className="text-[#aaa]">Generator Type</span>
            <div className="flex items-center gap-2">
              <span className="text-[#888]">
                {generatorType === 'binaural' ? 'Binaural Beat' : 'Noise'}
              </span>
              <ChevronRight className="w-4 h-4 text-[#666]" />
            </div>
          </button>

          {/* Helper Text */}
          <p className="text-[#666] text-sm px-1">
            {getHelperText()}
          </p>

          {/* Headphones Warning Banner */}
          {generatorType === 'binaural' && !headphonesConnected && (
            <div
              id="banner_headphonesWarning"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3"
            >
              <p className="text-[#888] text-sm">
                Headphones required for binaural beats.
              </p>
            </div>
          )}

          {/* Dynamic Settings */}
          {generatorType === 'binaural' ? (
            <BinauralSettings
              baseFrequency={baseFrequency}
              beatFrequency={beatFrequency}
              onBaseFrequencyChange={setBaseFrequency}
              onBeatFrequencyChange={setBeatFrequency}
              brainwaveLabel={getBrainwaveLabel(beatFrequency)}
            />
          ) : (
            <NoiseSettings
              selectedColor={noiseColor}
              onColorChange={setNoiseColor}
            />
          )}

          {/* Debug Toggle for Headphones (Remove in production) */}
          <div className="pt-8">
            <label className="flex items-center gap-3 text-[#666] text-sm">
              <input
                type="checkbox"
                checked={headphonesConnected}
                onChange={(e) => setHeadphonesConnected(e.target.checked)}
                className="w-4 h-4"
              />
              Simulate headphones connected
            </label>
          </div>
        </div>
      </div>

      {/* Generator Type Picker Sheet */}
      {showTypePicker && (
        <GeneratorTypePicker
          selectedType={generatorType}
          onSelect={(type) => {
            setGeneratorType(type);
            setShowTypePicker(false);
          }}
          onClose={() => setShowTypePicker(false)}
        />
      )}

      {/* Dev Navigation */}
      <DevNav onNavigate={(screen) => setCurrentScreen(screen)} />
    </div>
  );
}
