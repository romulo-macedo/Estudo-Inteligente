/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Fallback dictionary for common English words if Gemini API Key is missing
const FALLBACK_DICTIONARY: Record<string, any> = {
  "hello": {
    word: "hello",
    translation: "olá",
    phonetic: "/həˈloʊ/",
    partOfSpeech: "interjection / noun",
    definition: "A common greeting used to begin a conversation.",
    explanation: "Usado para saudar alguém em qualquer momento do dia de forma neutra ou amigável.",
    examples: [
      { en: "Hello! How are you doing today?", pt: "Olá! Como você está hoje?" },
      { en: "She said hello helper to everyone.", pt: "Ela disse olá para todo mundo." },
      { en: "A friendly hello can change someone's day.", pt: "Um olá amigável pode mudar o dia de alguém." }
    ],
    level: "A1"
  },
  "water": {
    word: "water",
    translation: "água",
    phonetic: "/ˈwɔːtər/",
    partOfSpeech: "noun / verb",
    definition: "A clear liquid that falls as rain, and is used for drinking, washing, etc.",
    explanation: "Substância líquida vital, inodora e insípida. Também usado como verbo 'regar'.",
    examples: [
      { en: "Please give me a glass of cold water.", pt: "Por favor, me dê um copo de água fria." },
      { en: "Remember to water the plants every morning.", pt: "Lembre-se de regar as plantas todas as manhãs." },
      { en: "The lake water is extremely clear.", pt: "A água do lago é extremamente limpa." }
    ],
    level: "A1"
  },
  "learn": {
    word: "learn",
    translation: "aprender",
    phonetic: "/lɜːrn/",
    partOfSpeech: "verb",
    definition: "To gain knowledge or skill by studying, practicing, or being taught.",
    explanation: "Adquirir novo conhecimento, habilidade ou entendimento através de esforço ou experiência.",
    examples: [
      { en: "I want to learn English quickly.", pt: "Eu quero aprender inglês rapidamente." },
      { en: "Children learn languages faster than adults.", pt: "Crianças aprendem idiomas mais rápido que adultos." },
      { en: "We learn from our daily mistakes.", pt: "Nós aprendemos com nossos erros diários." }
    ],
    level: "A1"
  },
  "study": {
    word: "study",
    translation: "estudar / estudo",
    phonetic: "/ˈstʌdi/",
    partOfSpeech: "verb / noun",
    definition: "To spend time learning about a subject, especially at a school or university.",
    explanation: "Dedicar tempo e esforço intelectual na aquisição de conhecimento.",
    examples: [
      { en: "She has to study for her English exam tonight.", pt: "Ela tem que estudar para a prova de inglês dela hoje à noite." },
      { en: "He launched a new study about tablet interfaces.", pt: "Ele lançou um novo estudo sobre interfaces de tablet." },
      { en: "You should study in a quiet environment.", pt: "Você deve estudar em um ambiente silencioso." }
    ],
    level: "A1"
  },
  "understand": {
    word: "understand",
    translation: "entender",
    phonetic: "/ˌʌndərˈstænd/",
    partOfSpeech: "verb",
    definition: "To perceive the intended meaning of words, language, or logic.",
    explanation: "Compreender totalmente o significado ou funcionamento de algo ou alguém.",
    examples: [
      { en: "Do you understand what this paragraph says?", pt: "Você entende o que este parágrafo diz?" },
      { en: "I don't understand this grammar rule yet.", pt: "Eu ainda não entendo essa regra gramatical." },
      { en: "It is easy to understand the lesson with visuals.", pt: "É fácil entender a lição com recursos visuais." }
    ],
    level: "A2"
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for translation utilizing server-side Gemini SDK
  app.post("/api/translate", async (req, res) => {
    const { word, context } = req.body;
    if (!word || typeof word !== "string") {
      return res.status(400).json({ error: "Parâmetro 'word' é obrigatório e precisa ser texto." });
    }

    const cleanWord = word.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");

    // Read client-specified manual key from headers, or fallback to server environment key
    const clientKey = req.headers["x-gemini-key"] as string;
    const apiKey = (clientKey && clientKey.trim() !== "") ? clientKey.trim() : process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY is not defined. Using smart local fallback resolver.");
      
      // Search in fallback dictionary
      if (FALLBACK_DICTIONARY[cleanWord]) {
        return res.json(FALLBACK_DICTIONARY[cleanWord]);
      }

      // Generate a synthetic translation on the fly so the app does not break without API key
      const syntheticTranslation = {
        word: word.trim(),
        translation: `${word.trim()}`,
        phonetic: "/.../",
        partOfSpeech: "Word (Chave Gemini Pendente)",
        definition: `The word '${word.trim()}' was processed. Configure your Gemini API Key in the settings gear icon (⚙️) on the top-right corner to activate full AI-powered translations.`,
        explanation: `Significado de '${word.trim()}'. Configure a sua própria Chave de API do Google Gemini clicando no ícone de engrenagem (⚙️) no canto superior direito para liberar traduções completas, transcrição de pronúncia e frases de exemplos didáticos via inteligência artificial nativa.`,
        examples: [
          { en: `How do you use the word '${word.trim()}'?`, pt: `Como você usa a palavra '${word.trim()}'?` },
          { en: `Please insert your Google Gemini API Key in the settings gear.`, pt: `Por favor, insira sua Chave de API do Google Gemini na engrenagem de configurações.` },
          { en: `Practice makes perfect. Keep studying!`, pt: `A prática leva à perfeição. Continue estudando!` }
        ],
        level: "A1"
      };
      return res.json(syntheticTranslation);
    }

    try {
      // Initialize GoogleGenAI SDK safely as a default server-side practice
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `Traduza e analise detalhadamente a seguinte palavra ou expressão em inglês para fins de aprendizado de idioma: "${word.trim()}".
${context ? `Contexto de onde o estudante encontrou a palavra: "${context}"` : ""}

Você DEVE preencher todos os campos do formato JSON exigidos no esquema da resposta. Forneça:
1. "word": A própria palavra normalizada (ex: "${word.trim()}").
2. "translation": A tradução mais adequada direta para o português.
3. "phonetic": A escrita fonética aproximada no padrão IPA / inglês (ex: /bəˈnænə/).
4. "partOfSpeech": A classe gramatical em inglês (ex: noun, verb, adjective, etc.).
5. "definition": Uma definição simples e concisa escrita totalmente EM INGLÊS.
6. "explanation": Uma explicação didática em português sobre o uso dessa palavra, nuances ou gírias se houver.
7. "level": O nível CEFR sugerido dessa palavra (valores aceitos: "A1", "A2", "B1", "B2", "C1", "C2").
8. "examples": Uma lista de exatamente 3 exemplos úteis no idioma Inglês com suas respectivas traduções correspondentes para o Português que façam sentido contextual.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "A palavra pesquisada" },
              translation: { type: Type.STRING, description: "Tradução direta para o português" },
              phonetic: { type: Type.STRING, description: "Transcrição fonética no padrão IPA" },
              partOfSpeech: { type: Type.STRING, description: "Classe gramatical em inglês" },
              definition: { type: Type.STRING, description: "Definição do termo escrita totalmente em inglês" },
              explanation: { type: Type.STRING, description: "Explicação em português sobre o uso ou contexto da palavra" },
              level: { type: Type.STRING, description: "Nível sugerido na classificação CEFR (ex: A1, A2, B1, B2, C1, C2)" },
              examples: {
                type: Type.ARRAY,
                description: "Exatamente 3 frases de exemplo realistas em inglês com tradução em português.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING, description: "A frase do exemplo em inglês" },
                    pt: { type: Type.STRING, description: "A tradução fiel da frase em português" }
                  },
                  required: ["en", "pt"]
                }
              }
            },
            required: ["word", "translation", "phonetic", "partOfSpeech", "definition", "explanation", "level", "examples"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Resposta de geração de conteúdo vazia da API do Gemini.");
      }

      const resultJSON = JSON.parse(textOutput.trim());
      res.json(resultJSON);

    } catch (err: any) {
      console.error("Erro na API de tradução / Gemini API error:", err);

      // Check if it's a high demand error (503) or any other API error
      const isOverloadedOrUnavailable = 
        err.message?.includes("503") || 
        err.message?.includes("high demand") || 
        err.message?.includes("UNAVAILABLE") ||
        err.status === 503;

      console.warn(`Applying auto-contingency fallback for word "${word}" (Reason: ${isOverloadedOrUnavailable ? "Gemini experiencing high demand" : "Gemini API error"})`);

      if (FALLBACK_DICTIONARY[cleanWord]) {
        return res.json(FALLBACK_DICTIONARY[cleanWord]);
      }

      // Generate a dynamic contingency fallback payload matching the expected layout schema
      const contingencyExplanation = isOverloadedOrUnavailable
        ? `Nota de Operação: O tradutor de IA do Gemini está temporariamente sob altíssima demanda nos servidores da Google (Erro de indisponibilidade). Para garantir a fluidez total da sua leitura e estudos no tablet, geramos esta análise de segurança inteligente de contingência para a palavra "${word.trim()}".`
        : `Nota de Operação: Ocorreu uma indisponibilidade temporária com o serviço inteligente do Gemini. Ativamos a contingência de segurança para a palavra "${word.trim()}".`;

      const contingencyPayload = {
        word: word.trim(),
        translation: `${word.trim()}`,
        phonetic: "/.../",
        partOfSpeech: "Palavra (Contingência)",
        definition: `Contingency dictionary entry generated for '${word.trim()}' due to a temporary unavailable or high-demand state on the model servers.`,
        explanation: `${contingencyExplanation} Você pode marcá-la como Prioritária do mesmo jeito e testar novamente em instantes.`,
        examples: [
          { 
            en: `The spelling of the word '${word.trim()}' is correct.`, 
            pt: `A grafia da palavra '${word.trim()}' está correta.` 
          },
          { 
            en: `Let's keep practicing English vocab with '${word.trim()}' in safety mode!`, 
            pt: `Vamos continuar praticando o vocabulário de inglês com '${word.trim()}' no modo de segurança!` 
          },
          { 
            en: `The Gemini service will be back shortly to analyze '${word.trim()}'.`, 
            pt: `O serviço do Gemini voltará em breve para analisar '${word.trim()}'.` 
          }
        ],
        level: "A1"
      };

      return res.json(contingencyPayload);
    }
  });

  // Serve static files in production or hook Vite development middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
