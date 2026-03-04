/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  Sparkles, 
  Users, 
  Film, 
  Music, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  ChevronLeft,
  Image as ImageIcon,
  Mic2,
  Video,
  Settings,
  Download,
  Share2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dramaService, DramaScript, Character, Scene } from './services/dramaService';

type Stage = 'input' | 'parsing' | 'characters' | 'scenes' | 'audio' | 'preview' | 'marketing';

export default function App() {
  const [stage, setStage] = useState<Stage>('input');
  const [prompt, setPrompt] = useState('');
  const [script, setScript] = useState<DramaScript | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);

  // Stage progress tracking
  const [progress, setProgress] = useState({
    parsing: 0,
    characters: 0,
    scenes: 0,
    audio: 0,
    synthesis: 0,
    marketing: 0
  });

  const handleStartProduction = async () => {
    if (!prompt.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setStage('parsing');
    
    try {
      // Stage 1: Parsing
      setProgress(prev => ({ ...prev, parsing: 50 }));
      const generatedScript = await dramaService.parsePrompt(prompt);
      setScript(generatedScript);
      setProgress(prev => ({ ...prev, parsing: 100 }));
      
      // Move to Character Design
      setStage('characters');
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || "Failed to parse script");
      setIsProcessing(false);
      setStage('input');
    }
  };

  const handleGenerateCharacters = async () => {
    if (!script) return;
    setIsProcessing(true);
    
    try {
      const updatedCharacters = [...script.characters];
      let completed = 0;
      
      await Promise.all(updatedCharacters.map(async (char, i) => {
        // Add a small staggered delay to avoid hitting rate limits simultaneously
        await new Promise(resolve => setTimeout(resolve, i * 500));
        const imageUrl = await dramaService.generateCharacterImage(char);
        updatedCharacters[i] = { ...char, imageUrl };
        completed++;
        setProgress(prev => ({ ...prev, characters: Math.round((completed / updatedCharacters.length) * 100) }));
      }));

      setScript({ ...script, characters: updatedCharacters });
      setStage('scenes');
    } catch (err: any) {
      setError(err.message || "Failed to generate character visuals");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateScenes = async () => {
    if (!script) return;
    setIsProcessing(true);
    
    try {
      const updatedScenes = [...script.scenes];
      let completed = 0;

      await Promise.all(updatedScenes.map(async (scene, i) => {
        // Add a small staggered delay to avoid hitting rate limits simultaneously
        await new Promise(resolve => setTimeout(resolve, i * 800));
        const imageUrl = await dramaService.generateSceneImage(scene, script.characters);
        updatedScenes[i] = { ...scene, imageUrl };
        completed++;
        setProgress(prev => ({ ...prev, scenes: Math.round((completed / updatedScenes.length) * 100) }));
      }));

      setScript({ ...script, scenes: updatedScenes });
      setStage('audio');
    } catch (err: any) {
      setError(err.message || "Failed to generate scene visuals");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script) return;
    setIsProcessing(true);
    
    try {
      const updatedScenes = [...script.scenes];
      let completed = 0;

      await Promise.all(updatedScenes.map(async (scene, i) => {
        // Add a small staggered delay to avoid hitting rate limits simultaneously
        await new Promise(resolve => setTimeout(resolve, i * 300));
        const fullDialogue = scene.dialogue.map(d => `${d.speaker}: ${d.text}`).join(". ");
        const audioUrl = await dramaService.generateVoice(fullDialogue);
        updatedScenes[i] = { ...scene, audioUrl };
        completed++;
        setProgress(prev => ({ ...prev, audio: Math.round((completed / updatedScenes.length) * 100) }));
      }));

      setScript({ ...script, scenes: updatedScenes });
      setStage('preview');
    } catch (err: any) {
      setError(err.message || "Failed to generate audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateMarketing = async () => {
    if (!script) return;
    setIsProcessing(true);
    setStage('marketing');
    
    try {
      setProgress(prev => ({ ...prev, marketing: 50 }));
      const url = await dramaService.generatePoster(script);
      setPosterUrl(url);
      setProgress(prev => ({ ...prev, marketing: 100 }));
    } catch (err: any) {
      setError(err.message || "Failed to generate marketing assets");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenderVideo = async () => {
    if (!script) return;
    
    // Check for API key as per guidelines for Veo
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio?.openSelectKey();
      // Proceed assuming success as per guidelines
    }

    setIsRenderingVideo(true);
    try {
      const scene = script.scenes[activeSceneIndex];
      const videoUrl = await dramaService.generateVideo(scene, script.characters, process.env.API_KEY || "");
      const updatedScenes = [...script.scenes];
      updatedScenes[activeSceneIndex] = { ...scene, videoUrl };
      setScript({ ...script, scenes: updatedScenes });
    } catch (err: any) {
      if (err.message.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      }
      setError(err.message || "Video rendering failed");
    } finally {
      setIsRenderingVideo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E6E6E6] text-[#151619] font-sans selection:bg-[#151619] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#151619]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#151619] rounded-xl flex items-center justify-center text-white">
              <Film size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">AI Short Drama Studio</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#151619]/50 font-mono">Production System v1.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={async () => await (window as any).aistudio?.openSelectKey()}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#151619]/10 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#151619] hover:text-white transition-all"
            >
              <Settings size={14} />
              Change API Key
            </button>
            <div className="h-4 w-[1px] bg-[#151619]/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151619] text-white rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              AI Engine Online
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#151619]/10 -z-10" />
            {[
              { id: 'input', icon: Sparkles, label: 'Concept' },
              { id: 'parsing', icon: Film, label: 'Script' },
              { id: 'characters', icon: Users, label: 'Cast' },
              { id: 'scenes', icon: ImageIcon, label: 'Visuals' },
              { id: 'audio', icon: Music, label: 'Audio' },
              { id: 'preview', icon: Play, label: 'Preview' },
              { id: 'marketing', icon: Share2, label: 'Marketing' }
            ].map((s, i) => {
              const isActive = stage === s.id;
              const isPast = ['input', 'parsing', 'characters', 'scenes', 'audio', 'preview', 'marketing'].indexOf(stage) > i;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive ? 'bg-[#151619] text-white scale-110 shadow-lg' : 
                    isPast ? 'bg-emerald-500 text-white' : 'bg-white border border-[#151619]/10 text-[#151619]/30'
                  }`}>
                    {isPast ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${isActive ? 'text-[#151619]' : 'text-[#151619]/40'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Editor/Controls */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {stage === 'input' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-3xl p-8 shadow-sm border border-[#151619]/5"
                >
                  <h2 className="text-3xl font-bold mb-2">What's the story?</h2>
                  <p className="text-[#151619]/60 mb-8">One sentence is all it takes to start your production.</p>
                  
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. A poor student becomes a billionaire overnight and confronts his ex-girlfriend..."
                      className="w-full h-48 bg-[#F5F5F5] rounded-2xl p-6 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#151619]/10 transition-all"
                    />
                    <button
                      onClick={handleStartProduction}
                      disabled={!prompt.trim() || isProcessing}
                      className="absolute bottom-4 right-4 bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      Start Production
                    </button>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-[#151619]/5 bg-[#F5F5F5]/50">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40 mb-2">Pro Tip</h4>
                      <p className="text-xs leading-relaxed">Include emotional cues like "heartbreaking" or "intense" for better AI performance.</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-[#151619]/5 bg-[#F5F5F5]/50">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40 mb-2">System Status</h4>
                      <p className="text-xs leading-relaxed">Gemini 3.1 Pro is ready to structure your narrative.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {stage === 'parsing' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-3xl p-12 shadow-sm border border-[#151619]/5 flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border-4 border-[#151619]/10 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 border-4 border-t-[#151619] rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Analyzing Narrative Structure</h3>
                  <p className="text-[#151619]/60 text-center max-w-xs">
                    Our AI Director is extracting characters, scenes, and emotional beats from your prompt.
                  </p>
                  <div className="w-full max-w-md mt-8 h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#151619]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.parsing}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {stage === 'characters' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#151619]/5">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold">Character Design</h2>
                        <p className="text-[#151619]/60">Review and generate visual concepts for your cast.</p>
                      </div>
                      <button
                        onClick={handleGenerateCharacters}
                        disabled={isProcessing}
                        className="bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                        Generate All Visuals
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {script.characters.map((char) => (
                        <div key={char.id} className="group relative bg-[#F5F5F5] rounded-2xl overflow-hidden border border-[#151619]/5 transition-all hover:shadow-md">
                          <div className="aspect-square bg-[#D1D1D1] relative">
                            {char.imageUrl ? (
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[#151619]/20">
                                <Users size={48} />
                              </div>
                            )}
                            <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {char.role}
                            </div>
                          </div>
                          <div className="p-6">
                            <h4 className="font-bold text-lg mb-1">{char.name}</h4>
                            <p className="text-xs text-[#151619]/60 line-clamp-2">{char.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {stage === 'scenes' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#151619]/5">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold">Scene Visualization</h2>
                        <p className="text-[#151619]/60">Crafting the visual world for each key moment.</p>
                      </div>
                      <button
                        onClick={handleGenerateScenes}
                        disabled={isProcessing}
                        className="bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                        Generate Scene Stills
                      </button>
                    </div>

                    <div className="space-y-4">
                      {script.scenes.map((scene, idx) => (
                        <div key={scene.id} className="flex gap-6 p-4 rounded-2xl bg-[#F5F5F5] border border-[#151619]/5">
                          <div className="w-48 aspect-video bg-[#D1D1D1] rounded-xl overflow-hidden flex-shrink-0">
                            {scene.imageUrl ? (
                              <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#151619]/20">
                                <ImageIcon size={32} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold">Scene {idx + 1}: {scene.title}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#151619]/40">{scene.setting}</span>
                            </div>
                            <p className="text-xs text-[#151619]/60 mb-3">{scene.description}</p>
                            <div className="flex gap-2">
                              {scene.dialogue.slice(0, 2).map((d, i) => (
                                <div key={i} className="px-3 py-1 bg-white rounded-lg text-[10px] border border-[#151619]/5">
                                  <span className="font-bold">{d.speaker}:</span> {d.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {stage === 'audio' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-3xl p-12 shadow-sm border border-[#151619]/5 flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <motion.div 
                      className="absolute inset-0 bg-[#151619]/5 rounded-full"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[#151619]">
                      <Mic2 size={32} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Generating Voice & Audio</h3>
                  <p className="text-[#151619]/60 text-center max-w-xs mb-8">
                    Synthesizing character voices and ambient soundscapes for each scene.
                  </p>
                  <button
                    onClick={handleGenerateAudio}
                    disabled={isProcessing}
                    className="bg-[#151619] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
                    Start Audio Synthesis
                  </button>
                </motion.div>
              )}

              {stage === 'preview' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-[#151619] rounded-3xl overflow-hidden shadow-2xl aspect-video relative group">
                    {script.scenes[activeSceneIndex].videoUrl ? (
                      <video 
                        src={script.scenes[activeSceneIndex].videoUrl} 
                        className="w-full h-full object-cover" 
                        controls 
                        autoPlay
                      />
                    ) : script.scenes[activeSceneIndex].imageUrl ? (
                      <img 
                        src={script.scenes[activeSceneIndex].imageUrl} 
                        className="w-full h-full object-cover opacity-80" 
                        alt="Preview"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    
                    {/* Video Overlay Info */}
                    {!script.scenes[activeSceneIndex].videoUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-8 flex flex-col justify-end">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white text-2xl font-bold mb-1">{script.scenes[activeSceneIndex].title}</h3>
                            <p className="text-white/60 text-sm">{script.scenes[activeSceneIndex].setting}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={handleRenderVideo}
                              disabled={isRenderingVideo}
                              className="bg-white text-[#151619] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                            >
                              {isRenderingVideo ? <Loader2 className="animate-spin" size={20} /> : <Video size={20} />}
                              Render Scene Video (Veo)
                            </button>
                            {script.scenes[activeSceneIndex].audioUrl && (
                              <button 
                                onClick={() => new Audio(script.scenes[activeSceneIndex].audioUrl).play()}
                                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#151619] hover:scale-110 transition-all"
                              >
                                <Play fill="currentColor" size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subtitles */}
                    {!script.scenes[activeSceneIndex].videoUrl && (
                      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl text-center px-8">
                        <p className="text-white text-lg font-medium drop-shadow-lg italic">
                          "{script.scenes[activeSceneIndex].dialogue[0]?.text}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {script.scenes.map((s, i) => (
                      <button 
                        key={s.id}
                        onClick={() => setActiveSceneIndex(i)}
                        className={`aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                          activeSceneIndex === i ? 'border-[#151619] scale-105 shadow-lg' : 'border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                        }`}
                      >
                        <img src={s.imageUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleGenerateMarketing}
                      className="bg-[#151619] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
                    >
                      Next: Marketing Assets <ChevronRight size={20} />
                    </button>
                  </div>
                </motion.div>
              )}

              {stage === 'marketing' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#151619]/5">
                    <h2 className="text-2xl font-bold mb-8">Marketing & Distribution</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Poster */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">Official Poster</h3>
                        <div className="aspect-[3/4] bg-[#F5F5F5] rounded-2xl overflow-hidden border border-[#151619]/5 relative group">
                          {posterUrl ? (
                            <img src={posterUrl} className="w-full h-full object-cover" alt="Poster" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              {isProcessing ? <Loader2 className="animate-spin text-[#151619]/20" size={48} /> : <ImageIcon size={48} className="text-[#151619]/20" />}
                            </div>
                          )}
                        </div>
                        <button className="w-full py-3 bg-[#151619] text-white rounded-xl font-bold flex items-center justify-center gap-2">
                          <Download size={16} /> Download Poster
                        </button>
                      </div>

                      {/* Social Media Copy */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">Social Media Hook</h3>
                          <div className="p-6 bg-[#F5F5F5] rounded-2xl border border-[#151619]/5">
                            <p className="text-sm font-medium italic">"What happens when {script.summary.toLowerCase()}? Find out in our latest short drama: {script.title}."</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">Cast Overview</h3>
                          <div className="flex -space-x-4">
                            {script.characters.map((char) => (
                              <div key={char.id} className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-[#D1D1D1]">
                                <img src={char.imageUrl} className="w-full h-full object-cover" alt={char.name} referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-8">
                          <button className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                            <Share2 size={20} /> Publish Production
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Script Summary Card */}
            {script && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-[#151619]/5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Film size={16} className="text-[#151619]/40" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">Production Brief</h3>
                </div>
                <h2 className="text-xl font-bold mb-2">{script.title}</h2>
                <div className="inline-block px-2 py-1 bg-[#151619]/5 rounded text-[10px] font-bold uppercase tracking-wider text-[#151619]/60 mb-4">
                  Tone: {script.tone}
                </div>
                <p className="text-sm text-[#151619]/70 leading-relaxed mb-6">
                  {script.summary}
                </p>
                
                <div className="space-y-4 pt-4 border-t border-[#151619]/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#151619]/40">Scenes</span>
                    <span className="font-bold">{script.scenes.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#151619]/40">Characters</span>
                    <span className="font-bold">{script.characters.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#151619]/40">Est. Duration</span>
                    <span className="font-bold">{script.scenes.length * 15}s</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* System Log */}
            <div className="bg-[#151619] rounded-3xl p-6 text-white/90 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 size={16} className="text-white/40 animate-spin" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">AI Engine Logs</h3>
              </div>
              <div className="space-y-3 font-mono text-[10px]">
                <div className="flex gap-2">
                  <span className="text-emerald-400">[OK]</span>
                  <span>System initialized.</span>
                </div>
                {stage !== 'input' && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400">[OK]</span>
                    <span>Prompt received: "{prompt.substring(0, 20)}..."</span>
                  </div>
                )}
                {script && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400">[OK]</span>
                    <span>Script structured successfully.</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex gap-2">
                    <span className="text-blue-400">[BUSY]</span>
                    <span className="animate-pulse">Processing current stage...</span>
                  </div>
                )}
                {error && (
                  <div className="flex gap-2">
                    <span className="text-red-400">[ERR]</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {stage === 'preview' && (
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-white border border-[#151619]/10 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-[#F5F5F5] transition-all">
                  <Download size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Export</span>
                </button>
                <button className="bg-white border border-[#151619]/10 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-[#F5F5F5] transition-all">
                  <Share2 size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Share</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#151619]/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[#151619]/40">
            <Sparkles size={14} />
            <span className="text-xs font-medium">Powered by Google Gemini 3.1 Pro & Veo</span>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-[#151619]/40">
            <a href="#" className="hover:text-[#151619] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#151619] transition-colors">API Reference</a>
            <a href="#" className="hover:text-[#151619] transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[100]"
          >
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-white/20 rounded-full">
              <ChevronRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
