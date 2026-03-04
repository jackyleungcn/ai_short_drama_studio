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
}

export interface DramaScript {
  title: string;
  summary: string;
  characters: Character[];
  scenes: Scene[];
  tone: string;
}

export const dramaService = {
  async parsePrompt(prompt: string): Promise<DramaScript> {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `You are a professional short drama director. Parse the following prompt into a structured script: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            tone: { type: Type.STRING, description: "Overall emotional tone (e.g., Revenge, Romance, Comedy)" },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING, description: "Protagonist, Antagonist, or Supporting" },
                  description: { type: Type.STRING, description: "Personality and background" },
                  visualPrompt: { type: Type.STRING, description: "Detailed physical description for image generation" }
                },
                required: ["id", "name", "role", "description", "visualPrompt"]
              }
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  setting: { type: Type.STRING, description: "Time and Location" },
                  description: { type: Type.STRING, description: "What happens in this scene" },
                  visualPrompt: { type: Type.STRING, description: "Visual description for image/video generation" },
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
          required: ["title", "summary", "characters", "scenes", "tone"]
        }
      }
    }));

    return JSON.parse(response.text || "{}");
  },

  async generateCharacterImage(character: Character): Promise<string> {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Professional character concept art for a short drama: ${character.name}. ${character.visualPrompt}. High quality, cinematic lighting, portrait.` }]
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
    throw new Error("Failed to generate character image");
  },

  async generateSceneImage(scene: Scene, characters: Character[]): Promise<string> {
    const ai = getAI();
    const charContext = characters.map(c => `${c.name}: ${c.visualPrompt}`).join(". ");
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Cinematic scene still for a short drama. Scene: ${scene.title}. Setting: ${scene.setting}. Description: ${scene.visualPrompt}. Characters present: ${charContext}. High quality, 16:9 aspect ratio, movie-like lighting.` }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate scene image");
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
    throw new Error("Failed to generate voice");
  },

  async generatePoster(script: DramaScript): Promise<string> {
    const ai = getAI();
    const charContext = script.characters.map(c => c.name).join(", ");
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: `Professional movie poster for a short drama titled "${script.title}". Summary: ${script.summary}. Tone: ${script.tone}. Characters: ${charContext}. Cinematic, high contrast, dramatic typography, 2:3 aspect ratio.` }]
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
    throw new Error("Failed to generate poster");
  },

  async generateVideo(scene: Scene, characters: Character[], apiKey: string): Promise<string> {
    const ai = getAI(apiKey);
    const charContext = characters.map(c => `${c.name}: ${c.visualPrompt}`).join(". ");
    
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic video for a short drama. Scene: ${scene.title}. Setting: ${scene.setting}. Description: ${scene.visualPrompt}. Characters: ${charContext}. High quality, 16:9, movie lighting.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey },
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
};
