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
import { dramaService, DramaScript, DramaEpisode, Character, Scene } from './services/dramaService';

type Stage = 'input' | 'parsing' | 'script' | 'characters' | 'scenes' | 'audio' | 'preview' | 'marketing';

export default function App() {
  const [stage, setStage] = useState<Stage>('input');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('都市言情');
  const [script, setScript] = useState<DramaScript | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState(0);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: any;
    if (isPlayingAll && audioRef.current) {
      interval = setInterval(() => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setAudioProgress(progress);
        }
      }, 100);
    } else {
      setAudioProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPlayingAll]);

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
      const generatedScript = await dramaService.parsePrompt(prompt, selectedStyle);
      generatedScript.style = selectedStyle;
      setScript(generatedScript);
      setActiveEpisodeIndex(0);
      setActiveSceneIndex(0);
      setProgress(prev => ({ ...prev, parsing: 100 }));
      
      // Move to Script Review
      setStage('script');
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || "剧本解析失败");
      setIsProcessing(false);
      setStage('input');
    }
  };

  const handleUpdateCharacter = (charId: string, updates: Partial<Character>) => {
    if (!script) return;
    const updatedCharacters = script.characters.map(c => 
      c.id === charId ? { ...c, ...updates } : c
    );
    setScript({ ...script, characters: updatedCharacters });
  };

  const handleAddCharacter = () => {
    if (!script) return;
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: "新角色",
      role: "配角",
      description: "描述该角色的性格与背景...",
      visualPrompt: "Detailed visual description in English..."
    };
    setScript({ ...script, characters: [...script.characters, newChar] });
  };

  const handleGenerateCharacters = async () => {
    if (!script) return;
    setIsProcessing(true);
    
    try {
      const updatedCharacters = [...script.characters];
      let completed = 0;
      
      await Promise.all(updatedCharacters.map(async (char, i) => {
        if (char.imageUrl) {
          completed++;
          return;
        }
        // Add a small staggered delay to avoid hitting rate limits simultaneously
        await new Promise(resolve => setTimeout(resolve, i * 500));
        const imageUrl = await dramaService.generateCharacterImage(char, script.style);
        updatedCharacters[i] = { ...char, imageUrl };
        completed++;
        setProgress(prev => ({ ...prev, characters: Math.round((completed / updatedCharacters.length) * 100) }));
      }));

      setScript({ ...script, characters: updatedCharacters });
    } catch (err: any) {
      setError(err.message || "生成角色视觉图失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateCharacter = async (charId: string) => {
    if (!script) return;
    setIsProcessing(true);
    try {
      const charIndex = script.characters.findIndex(c => c.id === charId);
      if (charIndex === -1) return;
      
      const imageUrl = await dramaService.generateCharacterImage(script.characters[charIndex], script.style);
      const updatedCharacters = [...script.characters];
      updatedCharacters[charIndex] = { ...updatedCharacters[charIndex], imageUrl };
      setScript({ ...script, characters: updatedCharacters });
    } catch (err: any) {
      setError(err.message || "重新生成角色失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddScene = () => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      title: "新场景",
      setting: "时间与地点",
      description: "描述本场景发生的故事内容...",
      visualPrompt: "Detailed visual description in English...",
      emotion: "情感倾向",
      dialogue: []
    };
    const updatedEpisodes = [...script.episodes];
    updatedEpisodes[activeEpisodeIndex].scenes.push(newScene);
    setScript({ ...script, episodes: updatedEpisodes });
  };

  const handleGenerateScenes = async () => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    setIsProcessing(true);
    
    try {
      const updatedEpisodes = [...script.episodes];
      const currentEpisode = updatedEpisodes[activeEpisodeIndex];
      const updatedScenes = [...currentEpisode.scenes];
      let completed = 0;

      await Promise.all(updatedScenes.map(async (scene, i) => {
        if (scene.imageUrl) {
          completed++;
          return;
        }
        // Add a small staggered delay to avoid hitting rate limits simultaneously
        await new Promise(resolve => setTimeout(resolve, i * 800));
        const imageUrl = await dramaService.generateSceneImage(scene, script.characters, script.style);
        updatedScenes[i] = { ...scene, imageUrl };
        completed++;
        setProgress(prev => ({ ...prev, scenes: Math.round((completed / updatedScenes.length) * 100) }));
      }));

      currentEpisode.scenes = updatedScenes;
      setScript({ ...script, episodes: updatedEpisodes });
    } catch (err: any) {
      setError(err.message || "生成场景剧照失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateScene = async (sceneId: string) => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    setIsProcessing(true);
    try {
      const currentEpisode = script.episodes[activeEpisodeIndex];
      const sceneIndex = currentEpisode.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex === -1) return;
      
      const imageUrl = await dramaService.generateSceneImage(currentEpisode.scenes[sceneIndex], script.characters, script.style);
      const updatedEpisodes = [...script.episodes];
      updatedEpisodes[activeEpisodeIndex].scenes[sceneIndex] = { ...updatedEpisodes[activeEpisodeIndex].scenes[sceneIndex], imageUrl };
      setScript({ ...script, episodes: updatedEpisodes });
    } catch (err: any) {
      setError(err.message || "重新生成场景失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    setIsProcessing(true);
    
    try {
      const updatedEpisodes = [...script.episodes];
      const currentEpisode = updatedEpisodes[activeEpisodeIndex];
      const updatedScenes = [...currentEpisode.scenes];
      let completed = 0;

      // Use sequential processing to avoid rate limits and hanging
      for (let i = 0; i < updatedScenes.length; i++) {
        const scene = updatedScenes[i];
        if (scene.audioUrl) {
          completed++;
          continue;
        }

        const fullDialogue = scene.dialogue.map(d => `${d.speaker}: ${d.text}`).join(". ");
        if (!fullDialogue.trim()) {
          completed++;
          continue;
        }

        const audioUrl = await dramaService.generateVoice(fullDialogue);
        
        // Calculate audio duration with timeout and error handling
        let audioDuration = 0;
        try {
          const audio = new Audio(audioUrl);
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.warn("Audio metadata load timeout");
              resolve(null);
            }, 3000);

            audio.onloadedmetadata = () => {
              clearTimeout(timeout);
              audioDuration = audio.duration;
              resolve(null);
            };

            audio.onerror = () => {
              clearTimeout(timeout);
              console.error("Audio load error");
              resolve(null);
            };
          });
        } catch (e) {
          console.error("Failed to get audio duration", e);
        }

        updatedScenes[i] = { ...scene, audioUrl, audioDuration };
        completed++;
        setProgress(prev => ({ ...prev, audio: Math.round((completed / updatedScenes.length) * 100) }));
      }

      currentEpisode.scenes = updatedScenes;
      setScript({ ...script, episodes: updatedEpisodes });
    } catch (err: any) {
      setError(err.message || "生成音频失败");
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
      const url = await dramaService.generatePoster(script, script.style);
      setPosterUrl(url);
      setProgress(prev => ({ ...prev, marketing: 100 }));
    } catch (err: any) {
      setError(err.message || "生成营销物料失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDialogue = (episodeIdx: number, sceneIdx: number, dialogueIdx: number, text: string) => {
    if (!script) return;
    const updatedEpisodes = [...script.episodes];
    updatedEpisodes[episodeIdx].scenes[sceneIdx].dialogue[dialogueIdx].text = text;
    setScript({ ...script, episodes: updatedEpisodes });
  };

  const handleUpdateEpisode = (episodeIdx: number, updates: Partial<DramaEpisode>) => {
    if (!script) return;
    const updatedEpisodes = [...script.episodes];
    updatedEpisodes[episodeIdx] = { ...updatedEpisodes[episodeIdx], ...updates };
    setScript({ ...script, episodes: updatedEpisodes });
  };

  const handleUpdateScriptInfo = (updates: Partial<DramaScript>) => {
    if (!script) return;
    setScript({ ...script, ...updates });
  };

  const handlePlayAll = async () => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    setIsPlayingAll(true);
    
    const scenes = script.episodes[activeEpisodeIndex].scenes;
    for (let i = 0; i < scenes.length; i++) {
      setActiveSceneIndex(i);
      const scene = scenes[i];
      
      if (scene.audioUrl) {
        const audio = new Audio(scene.audioUrl);
        audioRef.current = audio;
        audio.play();
        
        // Wait for audio to finish
        await new Promise((resolve) => {
          audio.onended = resolve;
          // Safety timeout
          setTimeout(resolve, (scene.audioDuration || 5) * 1000 + 500);
        });
      } else {
        // Wait for a default duration if no audio
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!isPlayingAll) break;
    }
    
    setIsPlayingAll(false);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAll(false);
  };

  const handleRegenerateScript = () => {
    setScript(null);
    setStage('input');
    setPrompt(prompt); // Keep the prompt
    setActiveEpisodeIndex(0);
    setActiveSceneIndex(0);
    setProgress({
      parsing: 0,
      characters: 0,
      scenes: 0,
      audio: 0,
      synthesis: 0,
      marketing: 0
    });
  };

  const handleRenderVideo = async () => {
    if (!script || !script.episodes[activeEpisodeIndex]) return;
    
    // Check for API key as per guidelines for Veo
    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio?.openSelectKey();
      // Proceed assuming success as per guidelines
    }

    setIsRenderingVideo(true);
    try {
      const currentEpisode = script.episodes[activeEpisodeIndex];
      const scene = currentEpisode.scenes[activeSceneIndex];
      const videoUrl = await dramaService.generateVideo(scene, script.characters, process.env.API_KEY || "", script.style);
      const updatedEpisodes = [...script.episodes];
      updatedEpisodes[activeEpisodeIndex].scenes[activeSceneIndex] = { ...scene, videoUrl };
      setScript({ ...script, episodes: updatedEpisodes });
    } catch (err: any) {
      if (err.message.includes("Requested entity was not found")) {
        await (window as any).aistudio?.openSelectKey();
      }
      setError(err.message || "视频渲染失败");
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
              <p className="text-[10px] uppercase tracking-widest text-[#151619]/50 font-mono">生产系统 v1.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={async () => await (window as any).aistudio?.openSelectKey()}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#151619]/10 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-[#151619] hover:text-white transition-all"
            >
              <Settings size={14} />
              更换 API Key
            </button>
            <div className="h-4 w-[1px] bg-[#151619]/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151619] text-white rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              AI 引擎在线
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
              { id: 'input', icon: Sparkles, label: '创意构思' },
              { id: 'parsing', icon: Film, label: '剧本解析' },
              { id: 'script', icon: Film, label: '剧本确认' },
              { id: 'characters', icon: Users, label: '角色设计' },
              { id: 'scenes', icon: ImageIcon, label: '场景视觉' },
              { id: 'audio', icon: Music, label: '音频合成' },
              { id: 'preview', icon: Play, label: '成片预览' },
              { id: 'marketing', icon: Share2, label: '营销物料' }
            ].map((s, i) => {
              const isActive = stage === s.id;
              const isPast = ['input', 'parsing', 'script', 'characters', 'scenes', 'audio', 'preview', 'marketing'].indexOf(stage) > i;
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
                  <h2 className="text-3xl font-bold mb-2">你的故事是什么？</h2>
                  <p className="text-[#151619]/60 mb-8">只需一句话，即可开启你的短剧生产之旅。</p>
                  
                  <div className="relative mb-8">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="例如：一个穷学生一夜之间变成亿万富翁，并与前女友对质..."
                      className="w-full h-48 bg-[#F5F5F5] rounded-2xl p-6 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#151619]/10 transition-all"
                    />
                    <button
                      onClick={handleStartProduction}
                      disabled={!prompt.trim() || isProcessing}
                      className="absolute bottom-4 right-4 bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      开始生产
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">选择短剧风格</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { id: '都市言情', label: '都市言情', desc: '现代职场、浪漫爱情' },
                        { id: '霸道总裁', label: '霸道总裁', desc: '豪门恩怨、极致宠溺' },
                        { id: '复仇逆袭', label: '复仇逆袭', desc: '爽文节奏、打脸翻身' },
                        { id: '古装穿越', label: '古装穿越', desc: '唯美古风、时空交错' },
                        { id: '悬疑惊悚', label: '悬疑惊悚', desc: '烧脑反转、紧张刺激' },
                        { id: '家庭伦理', label: '家庭伦理', desc: '生活百态、情感纠葛' }
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            selectedStyle === style.id 
                              ? 'border-[#151619] bg-[#151619]/5 shadow-sm' 
                              : 'border-[#151619]/5 hover:border-[#151619]/20'
                          }`}
                        >
                          <div className="font-bold text-sm mb-1">{style.label}</div>
                          <div className="text-[10px] text-[#151619]/40">{style.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-[#151619]/5 bg-[#F5F5F5]/50">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40 mb-2">专业提示</h4>
                      <p className="text-xs leading-relaxed">加入“令人心碎”或“紧张激烈”等情感词汇，AI 的表现会更好。</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-[#151619]/5 bg-[#F5F5F5]/50">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40 mb-2">系统状态</h4>
                      <p className="text-xs leading-relaxed">Gemini 3.1 Pro 已准备好构建你的叙事结构。</p>
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
                  <h3 className="text-xl font-bold mb-2">正在分析叙事结构</h3>
                  <p className="text-[#151619]/60 text-center max-w-xs">
                    我们的 AI 导演正在从你的提示词中提取角色、场景和情感节奏。
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

               {stage === 'script' && script && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#151619]/5">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold">剧本确认</h2>
                        <p className="text-[#151619]/60">检查并编辑 AI 生成的剧本结构。</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setStage('input')}
                          className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                        >
                          <ChevronLeft size={16} /> 返回
                        </button>
                        <button
                          onClick={handleRegenerateScript}
                          className="px-6 py-3 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all"
                        >
                          重新生成
                        </button>
                        <button
                          onClick={() => setStage('characters')}
                          className="bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
                        >
                          确认并进入下一步 <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Series Info */}
                      <div className="p-6 bg-[#F5F5F5] rounded-2xl border border-[#151619]/5 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40">系列剧名</label>
                          <input 
                            type="text"
                            value={script.title}
                            onChange={(e) => handleUpdateScriptInfo({ title: e.target.value })}
                            className="w-full text-xl font-bold bg-transparent border-b border-transparent focus:border-[#151619]/20 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40">全剧梗概</label>
                          <textarea 
                            value={script.summary}
                            onChange={(e) => handleUpdateScriptInfo({ summary: e.target.value })}
                            className="w-full text-sm text-[#151619]/60 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 h-24 resize-none focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Episodes List */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">剧集列表</h3>
                        {script.episodes.map((ep, idx) => (
                          <div key={ep.id} className="p-6 bg-white border border-[#151619]/10 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 flex items-center gap-4">
                                <span className="w-8 h-8 bg-[#151619] text-white rounded-lg flex items-center justify-center font-bold text-sm">{ep.episodeNumber}</span>
                                <input 
                                  type="text"
                                  value={ep.title}
                                  onChange={(e) => handleUpdateEpisode(idx, { title: e.target.value })}
                                  className="flex-1 font-bold bg-transparent border-b border-transparent focus:border-[#151619]/20 focus:outline-none"
                                />
                              </div>
                            </div>
                            <textarea 
                              value={ep.summary}
                              onChange={(e) => handleUpdateEpisode(idx, { summary: e.target.value })}
                              className="w-full text-xs text-[#151619]/60 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 h-16 resize-none focus:outline-none"
                            />
                            <div className="text-[10px] text-[#151619]/40 font-bold uppercase tracking-widest">
                              包含 {ep.scenes.length} 个场景
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                        <h2 className="text-2xl font-bold">角色设计</h2>
                        <p className="text-[#151619]/60">查看并编辑你的角色，确保视觉一致性。</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setStage('script')}
                          className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                        >
                          <ChevronLeft size={16} /> 返回
                        </button>
                        <button
                          onClick={handleAddCharacter}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          <Plus size={16} /> 添加角色
                        </button>
                        <button
                          onClick={handleRegenerateScript}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all disabled:opacity-50 text-sm"
                        >
                          重新生成剧本
                        </button>
                        <button
                          onClick={handleGenerateCharacters}
                          disabled={isProcessing}
                          className="bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                          生成所有角色图
                        </button>
                        <button
                          onClick={() => setStage('scenes')}
                          disabled={!script.characters.every(c => c.imageUrl)}
                          className={`bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                            !script.characters.every(c => c.imageUrl) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'
                          }`}
                          title={!script.characters.every(c => c.imageUrl) ? "请先为所有角色生成形象图" : ""}
                        >
                          确认并进入下一步 <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                    {!script.characters.every(c => c.imageUrl) && (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-sm">
                        <AlertCircle size={18} />
                        <span>提示：请先为所有角色生成形象图，以确保系列视觉的一致性。</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {script.characters.map((char) => (
                        <div key={char.id} className="group relative bg-[#F5F5F5] rounded-2xl overflow-hidden border border-[#151619]/5 transition-all hover:shadow-md flex flex-col">
                          <div className="aspect-square bg-[#D1D1D1] relative flex-shrink-0">
                            {char.imageUrl ? (
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[#151619]/20 flex-col gap-2">
                                <Users size={48} />
                                <button 
                                  onClick={() => handleRegenerateCharacter(char.id)}
                                  disabled={isProcessing}
                                  className="px-4 py-2 bg-[#151619] text-white rounded-lg text-xs font-bold flex items-center gap-2"
                                >
                                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                                  生成形象
                                </button>
                              </div>
                            )}
                            <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider">
                              <select 
                                value={char.role}
                                onChange={(e) => handleUpdateCharacter(char.id, { role: e.target.value })}
                                className="bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                              >
                                <option value="主角">主角</option>
                                <option value="反派">反派</option>
                                <option value="配角">配角</option>
                              </select>
                            </div>
                            <div className="absolute top-4 right-4 flex gap-2">
                              {char.imageUrl && (
                                <button
                                  onClick={() => handleRegenerateCharacter(char.id)}
                                  disabled={isProcessing}
                                  className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                  title="重新生成此角色"
                                >
                                  <Sparkles size={16} className="text-[#151619]" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (script) {
                                    setScript({ ...script, characters: script.characters.filter(c => c.id !== char.id) });
                                  }
                                }}
                                disabled={isProcessing}
                                className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-red-500"
                                title="删除角色"
                              >
                                <Plus size={16} className="rotate-45" />
                              </button>
                            </div>
                          </div>
                          <div className="p-6 flex-1 flex flex-col gap-4">
                            <input 
                              type="text"
                              value={char.name}
                              onChange={(e) => handleUpdateCharacter(char.id, { name: e.target.value })}
                              className="font-bold text-lg bg-transparent border-b border-transparent focus:border-[#151619]/20 focus:outline-none w-full"
                              placeholder="角色姓名"
                            />
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40">性格与背景</label>
                              <textarea 
                                value={char.description}
                                onChange={(e) => handleUpdateCharacter(char.id, { description: e.target.value })}
                                className="text-xs text-[#151619]/60 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 w-full h-20 resize-none focus:outline-none"
                                placeholder="描述该角色的性格与背景..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40">视觉提示词 (英文)</label>
                              <textarea 
                                value={char.visualPrompt}
                                onChange={(e) => handleUpdateCharacter(char.id, { visualPrompt: e.target.value })}
                                className="text-[10px] font-mono text-[#151619]/40 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 w-full h-20 resize-none focus:outline-none"
                                placeholder="Detailed visual description in English..."
                              />
                            </div>
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
                          <h2 className="text-2xl font-bold">场景视觉化</h2>
                          <p className="text-[#151619]/60">为每个关键时刻打造视觉世界。</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setStage('characters')}
                            className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                          >
                            <ChevronLeft size={16} /> 返回
                          </button>
                          <button
                            onClick={handleAddScene}
                            disabled={isProcessing}
                            className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                          >
                            <Plus size={16} /> 添加场景
                          </button>
                          <button
                            onClick={handleGenerateScenes}
                            disabled={isProcessing}
                            className="bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
                            生成所有剧照
                          </button>
                          <button
                            onClick={() => setStage('audio')}
                            disabled={!script.episodes.every(ep => ep.scenes.every(s => s.imageUrl))}
                            className={`bg-[#151619] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                              !script.episodes.every(ep => ep.scenes.every(s => s.imageUrl)) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105'
                            }`}
                            title={!script.episodes.every(ep => ep.scenes.every(s => s.imageUrl)) ? "请先为所有集的所有场景生成剧照" : ""}
                          >
                            确认并进入下一步 <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                      {!script.episodes.every(ep => ep.scenes.every(s => s.imageUrl)) && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-sm">
                          <AlertCircle size={18} />
                          <span>提示：请确保所有剧集的场景剧照均已生成。您可以切换上方剧集标签来检查。</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                        {script.episodes.map((ep, idx) => (
                          <button
                            key={ep.id}
                            onClick={() => {
                              setActiveEpisodeIndex(idx);
                              setActiveSceneIndex(0);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                              activeEpisodeIndex === idx 
                                ? 'bg-[#151619] text-white shadow-lg' 
                                : 'bg-white border border-[#151619]/10 text-[#151619]/60 hover:bg-[#151619]/5'
                            }`}
                          >
                            第 {ep.episodeNumber} 集: {ep.title}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        {script.episodes[activeEpisodeIndex].scenes.map((scene, idx) => (
                          <div key={scene.id} className="group flex gap-6 p-4 rounded-2xl bg-[#F5F5F5] border border-[#151619]/5 relative">
                            <div className="w-48 aspect-video bg-[#D1D1D1] rounded-xl overflow-hidden flex-shrink-0 relative">
                              {scene.imageUrl ? (
                                <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#151619]/20">
                                  <ImageIcon size={32} />
                                </div>
                              )}
                              {scene.imageUrl && (
                                <button
                                  onClick={() => handleRegenerateScene(scene.id)}
                                  disabled={isProcessing}
                                  className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                  title="重新生成此场景"
                                >
                                  <Sparkles size={14} className="text-[#151619]" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (script) {
                                    const updatedEpisodes = [...script.episodes];
                                    updatedEpisodes[activeEpisodeIndex].scenes = updatedEpisodes[activeEpisodeIndex].scenes.filter(s => s.id !== scene.id);
                                    setScript({ ...script, episodes: updatedEpisodes });
                                  }
                                }}
                                disabled={isProcessing}
                                className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-red-500"
                                title="删除场景"
                              >
                                <Plus size={14} className="rotate-45" />
                              </button>
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between gap-4">
                                <input 
                                  type="text"
                                  value={scene.title}
                                  onChange={(e) => {
                                    const updatedEpisodes = [...script.episodes];
                                    updatedEpisodes[activeEpisodeIndex].scenes[idx].title = e.target.value;
                                    setScript({ ...script, episodes: updatedEpisodes });
                                  }}
                                  className="font-bold bg-transparent border-b border-transparent focus:border-[#151619]/20 focus:outline-none flex-1"
                                  placeholder="场景标题"
                                />
                                <input 
                                  type="text"
                                  value={scene.setting}
                                  onChange={(e) => {
                                    const updatedEpisodes = [...script.episodes];
                                    updatedEpisodes[activeEpisodeIndex].scenes[idx].setting = e.target.value;
                                    setScript({ ...script, episodes: updatedEpisodes });
                                  }}
                                  className="text-[10px] font-bold uppercase tracking-widest text-[#151619]/40 bg-transparent border-b border-transparent focus:border-[#151619]/20 focus:outline-none text-right"
                                  placeholder="时间与地点"
                                />
                              </div>
                              <textarea 
                                value={scene.description}
                                onChange={(e) => {
                                  const updatedEpisodes = [...script.episodes];
                                  updatedEpisodes[activeEpisodeIndex].scenes[idx].description = e.target.value;
                                  setScript({ ...script, episodes: updatedEpisodes });
                                }}
                                className="text-xs text-[#151619]/60 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 w-full h-16 resize-none focus:outline-none"
                                placeholder="本场景发生的故事内容..."
                              />
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-[#151619]/40">视觉提示词 (英文)</label>
                                <textarea 
                                  value={scene.visualPrompt}
                                  onChange={(e) => {
                                    const updatedEpisodes = [...script.episodes];
                                    updatedEpisodes[activeEpisodeIndex].scenes[idx].visualPrompt = e.target.value;
                                    setScript({ ...script, episodes: updatedEpisodes });
                                  }}
                                  className="text-[10px] font-mono text-[#151619]/40 bg-transparent border border-transparent focus:border-[#151619]/10 focus:bg-white rounded-lg p-2 w-full h-12 resize-none focus:outline-none"
                                  placeholder="Detailed visual description in English..."
                                />
                              </div>
                              <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
                                {scene.dialogue.map((d, i) => (
                                  <div key={i} className="px-3 py-1 bg-white rounded-lg text-[10px] border border-[#151619]/5 flex-1 min-w-[200px]">
                                    <div className="font-bold mb-1">{d.speaker}:</div>
                                    <textarea 
                                      value={d.text}
                                      onChange={(e) => handleUpdateDialogue(activeEpisodeIndex, idx, i, e.target.value)}
                                      className="w-full bg-transparent border-none focus:ring-0 p-0 text-[10px] resize-none h-8"
                                    />
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
                  <h3 className="text-xl font-bold mb-2">正在生成语音与音频</h3>
                  <p className="text-[#151619]/60 text-center max-w-xs mb-4">
                    正在为第 {script.episodes[activeEpisodeIndex].episodeNumber} 集合成角色配音和环境音效。
                  </p>
                  <div className="w-full max-w-md mb-8 h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#151619]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.audio}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setStage('scenes')}
                      className="px-6 py-3 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> 返回
                    </button>
                    <button
                      onClick={handleGenerateAudio}
                      disabled={isProcessing}
                      className="bg-[#151619] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
                      开始音频合成
                    </button>
                    <button
                      onClick={() => setStage('preview')}
                      disabled={!script.episodes.every(ep => ep.scenes.every(s => s.audioUrl))}
                      className={`px-8 py-4 rounded-2xl font-bold border border-[#151619]/10 transition-all ${
                        !script.episodes.every(ep => ep.scenes.every(s => s.audioUrl)) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#151619]/5'
                      }`}
                      title={!script.episodes.every(ep => ep.scenes.every(s => s.audioUrl)) ? "请先为所有集的所有场景生成音频" : ""}
                    >
                      确认并进入下一步 <ChevronRight size={20} />
                    </button>
                  </div>
                  {!script.episodes.every(ep => ep.scenes.every(s => s.audioUrl)) && (
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 text-sm max-w-md mx-auto">
                      <AlertCircle size={18} />
                      <span>提示：请确保所有剧集的音频均已合成。您可以切换剧集标签进行操作。</span>
                    </div>
                  )}
                </motion.div>
              )}

              {stage === 'preview' && script && script.episodes[activeEpisodeIndex] && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {script.episodes.map((ep, idx) => (
                      <button
                        key={ep.id}
                        onClick={() => {
                          setActiveEpisodeIndex(idx);
                          setActiveSceneIndex(0);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          activeEpisodeIndex === idx 
                            ? 'bg-[#151619] text-white shadow-lg' 
                            : 'bg-white border border-[#151619]/10 text-[#151619]/60 hover:bg-[#151619]/5'
                        }`}
                      >
                        第 {ep.episodeNumber} 集
                      </button>
                    ))}
                  </div>

                  <div className="bg-[#151619] rounded-3xl overflow-hidden shadow-2xl aspect-video relative group">
                    {script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.videoUrl ? (
                      <video 
                        src={script.episodes[activeEpisodeIndex].scenes[activeSceneIndex].videoUrl} 
                        className="w-full h-full object-cover" 
                        controls 
                        autoPlay
                      />
                    ) : script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.imageUrl ? (
                      <img 
                        src={script.episodes[activeEpisodeIndex].scenes[activeSceneIndex].imageUrl} 
                        className="w-full h-full object-cover opacity-80" 
                        alt="Preview"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    
                    {/* Video Overlay Info */}
                    {!script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.videoUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-8 flex flex-col justify-end">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white text-2xl font-bold mb-1">{script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.title}</h3>
                            <p className="text-white/60 text-sm">{script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.setting}</p>
                          </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={isPlayingAll ? stopPlayback : handlePlayAll}
                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                              isPlayingAll ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white hover:scale-105'
                            }`}
                          >
                            {isPlayingAll ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                            {isPlayingAll ? '正在播放全片...' : '播放全片 (卡点同步)'}
                          </button>
                          <button 
                            onClick={handleRenderVideo}
                            disabled={isRenderingVideo}
                            className="bg-white text-[#151619] px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-all disabled:opacity-50"
                          >
                            {isRenderingVideo ? <Loader2 className="animate-spin" size={20} /> : <Video size={20} />}
                            渲染当前场景视频 (Veo)
                          </button>
                          {script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.audioUrl && (
                            <button 
                              onClick={() => {
                                const audio = new Audio(script.episodes[activeEpisodeIndex].scenes[activeSceneIndex].audioUrl);
                                audio.play();
                              }}
                              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#151619] hover:scale-110 transition-all"
                            >
                              <Play fill="currentColor" size={20} />
                            </button>
                          )}
                        </div>
                        </div>
                      </div>
                    )}

                    {/* Subtitles & Progress */}
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl text-center px-8 space-y-4">
                      {isPlayingAll && (
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${audioProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                      )}
                      <p className="text-white text-lg font-medium drop-shadow-lg italic">
                        "{script.episodes[activeEpisodeIndex].scenes[activeSceneIndex]?.dialogue[0]?.text}"
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {script.episodes[activeEpisodeIndex].scenes.map((s, i) => (
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

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setStage('audio')}
                      className="px-6 py-3 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> 返回
                    </button>
                    <button
                      onClick={handleGenerateMarketing}
                      className="bg-[#151619] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all"
                    >
                      下一步：营销物料 <ChevronRight size={20} />
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
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-bold">营销与分发</h2>
                      <button
                        onClick={() => setStage('preview')}
                        className="px-4 py-2 rounded-xl font-bold border border-[#151619]/10 hover:bg-[#151619]/5 transition-all text-sm flex items-center gap-1"
                      >
                        <ChevronLeft size={16} /> 返回
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Poster */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">官方海报</h3>
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
                          <Download size={16} /> 下载海报
                        </button>
                      </div>

                      {/* Social Media Copy */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">社交媒体文案</h3>
                          <div className="p-6 bg-[#F5F5F5] rounded-2xl border border-[#151619]/5">
                            <textarea 
                              value={script.marketingCopy || `“当${script.summary}时会发生什么？在我们的最新短剧《${script.title}》中寻找答案。”`}
                              onChange={(e) => handleUpdateScriptInfo({ marketingCopy: e.target.value })}
                              className="w-full text-sm font-medium italic bg-transparent border-none focus:ring-0 p-0 h-24 resize-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">卡司阵容</h3>
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
                            <Share2 size={20} /> 发布作品
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
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#151619]/40">制作简报</h3>
                  </div>
                  <h2 className="text-xl font-bold mb-2">{script.title}</h2>
                  <div className="inline-block px-2 py-1 bg-[#151619]/5 rounded text-[10px] font-bold uppercase tracking-wider text-[#151619]/60 mb-4">
                    基调: {script.tone}
                  </div>
                  <p className="text-sm text-[#151619]/70 leading-relaxed mb-6">
                    {script.summary}
                  </p>
                  
                  <div className="space-y-4 pt-4 border-t border-[#151619]/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#151619]/40">剧集数量</span>
                      <span className="font-bold">{script.episodes.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#151619]/40">当前集场景</span>
                      <span className="font-bold">{script.episodes[activeEpisodeIndex].scenes.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#151619]/40">角色总数</span>
                      <span className="font-bold">{script.characters.length}</span>
                    </div>
                  </div>
              </motion.div>
            )}

            {/* System Log */}
            <div className="bg-[#151619] rounded-3xl p-6 text-white/90 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Loader2 size={16} className="text-white/40 animate-spin" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">AI 引擎日志</h3>
              </div>
              <div className="space-y-3 font-mono text-[10px]">
                <div className="flex gap-2">
                  <span className="text-emerald-400">[OK]</span>
                  <span>系统已就绪。</span>
                </div>
                {stage !== 'input' && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400">[OK]</span>
                    <span>收到提示词: "{prompt.substring(0, 20)}..."</span>
                  </div>
                )}
                {script && (
                  <div className="flex gap-2">
                    <span className="text-emerald-400">[OK]</span>
                    <span>剧本结构化成功。</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex gap-2">
                    <span className="text-blue-400">[忙碌]</span>
                    <span className="animate-pulse">正在处理当前阶段...</span>
                  </div>
                )}
                {error && (
                  <div className="flex gap-2">
                    <span className="text-red-400">[错误]</span>
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
                  <span className="text-[10px] font-bold uppercase tracking-wider">导出视频</span>
                </button>
                <button className="bg-white border border-[#151619]/10 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-[#F5F5F5] transition-all">
                  <Share2 size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">分享作品</span>
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
            <span className="text-xs font-medium">由 Google Gemini 3.1 Pro & Veo 提供技术支持</span>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-[#151619]/40">
            <a href="#" className="hover:text-[#151619] transition-colors">使用文档</a>
            <a href="#" className="hover:text-[#151619] transition-colors">API 参考</a>
            <a href="#" className="hover:text-[#151619] transition-colors">隐私政策</a>
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
