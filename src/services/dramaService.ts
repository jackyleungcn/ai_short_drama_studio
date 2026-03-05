import { GoogleGenAI, Type, Modality } from "@google/genai";

// Initialize AI with the key from environment
// Note: For Veo/Imagen models, we might need to re-initialize with user-provided key
// but for the "Brain" (scripting), we use the system key.
const getAI = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err.message?.includes("429") || err.status === 429 || JSON.stringify(err).includes("429");
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  visualPrompt: string;
  imageUrl?: string;
}

export interface Scene {
  id: string;
  title: string;
  setting: string;
  description: string;
  visualPrompt: string;
  dialogue: { speaker: string; text: string }[];
  emotion: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface DramaEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  summary: string;
  scenes: Scene[];
}

export interface DramaScript {
  title: string;
  summary: string;
  tone: string;
  characters: Character[];
  episodes: DramaEpisode[];
  // For backward compatibility if needed during transition
  scenes?: Scene[];
  marketingCopy?: string;
  style?: string;
}

export const dramaService = {
  async parsePrompt(prompt: string, style: string = '真人短剧'): Promise<DramaScript> {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `你是一位专业的短剧导演和编剧。请将以下提示词解析为一个结构化的系列短剧剧本（通常包含3-5集），所有文本内容必须使用中文。
      
      短剧风格：${style}
      
      关键要求：
      1. 角色一致性：为每个核心角色提供极其详细的视觉描述（英文），包括发型、发色、瞳色、特定服装风格。这些角色将贯穿所有剧集。
      2. 剧集结构：将故事拆分为多个剧集（episodes），每一集都有自己的标题、梗概和场景。
      3. 场景一致性：确保环境描述在剧集之间保持逻辑连贯。
      4. 情感卡点：在对白中通过文字描述引导节奏。
      5. 风格契合：剧本内容、角色设定和场景描述必须高度契合“${style}”的风格特点。
      
      解析提示词： "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "系列剧名" },
            summary: { type: Type.STRING, description: "全剧梗概" },
            tone: { type: Type.STRING, description: "整体情感基调" },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  description: { type: Type.STRING },
                  visualPrompt: { type: Type.STRING, description: "英文视觉描述" }
                },
                required: ["id", "name", "role", "description", "visualPrompt"]
              }
            },
            episodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  episodeNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        setting: { type: Type.STRING },
                        description: { type: Type.STRING },
                        visualPrompt: { type: Type.STRING },
                        emotion: { type: Type.STRING },
                        dialogue: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              speaker: { type: Type.STRING },
                              text: { type: Type.STRING }
                            }
                          }
                        }
                      },
                      required: ["id", "title", "setting", "description", "visualPrompt", "emotion", "dialogue"]
                    }
                  }
                },
                required: ["id", "episodeNumber", "title", "summary", "scenes"]
              }
            }
          },
          required: ["title", "summary", "characters", "episodes", "tone"]
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  },

  async generateCharacterImage(character: Character, style: string = '真人短剧'): Promise<string> {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Professional character concept art for a "${style}" style drama: ${character.name}. ${character.visualPrompt}. High quality, cinematic lighting, portrait, consistent style, neutral background, sharp focus.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("生成角色图像失败");
  },

  async generateSceneImage(scene: Scene, characters: Character[], style: string = '真人短剧'): Promise<string> {
    const ai = getAI();
    
    // Prepare multimodal parts: text prompt + character reference images
    const parts: any[] = [];
    
    // 1. Add character reference images to the prompt for consistency
    characters.forEach(char => {
      if (char.imageUrl) {
        const base64Data = char.imageUrl.split(',')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/png"
          }
        });
      }
    });

    // 2. Add the descriptive text prompt
    const charContext = characters.map(c => `${c.name} (as shown in the reference image): ${c.visualPrompt}`).join(". ");
    parts.push({ 
      text: `Cinematic scene still for a "${style}" style drama. Scene: ${scene.title}. Setting: ${scene.setting}. Description: ${scene.visualPrompt}. Characters present: ${charContext}. 
      REQUIREMENT: The characters MUST look EXACTLY like the provided reference images. 
      STYLE: High quality, 16:9 aspect ratio, movie-like lighting, consistent color grading, photorealistic.` 
    });

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("生成场景图像失败");
  },

  async generateVoice(text: string, voiceName: string = 'Kore'): Promise<string> {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    throw new Error("生成语音失败");
  },

  async generatePoster(script: DramaScript, style: string = '真人短剧'): Promise<string> {
    const ai = getAI();
    const charContext = script.characters.map(c => c.name).join(", ");
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Professional movie poster for a "${style}" style drama titled "${script.title}". Summary: ${script.summary}. Tone: ${script.tone}. Characters: ${charContext}. Cinematic, high contrast, dramatic typography, 2:3 aspect ratio, title in Chinese characters.` }]
      },
      config: {
        imageConfig: { aspectRatio: "3:4" } // Closest to 2:3
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("生成海报失败");
  },

  async generateVideo(scene: Scene, characters: Character[], apiKey: string, style: string = '真人短剧'): Promise<string> {
    const ai = getAI(apiKey);
    const charContext = characters.map(c => `${c.name}: ${c.visualPrompt}`).join(". ");
    
    const videoConfig: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic video for a "${style}" style drama. Scene: ${scene.title}. Setting: ${scene.setting}. Description: ${scene.visualPrompt}. Characters: ${charContext}. High quality, 16:9, movie lighting, smooth motion, consistent with the starting frame.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    };

    // Use the scene image as the starting frame for consistency
    if (scene.imageUrl) {
      videoConfig.image = {
        imageBytes: scene.imageUrl.split(',')[1],
        mimeType: 'image/png'
      };
    }
    
    let operation = await ai.models.generateVideos(videoConfig);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("视频生成失败");

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
};
