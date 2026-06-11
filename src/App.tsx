/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Youtube,
  BrainCircuit,
  TrendingUp,
  FileText,
  Volume2,
  Trash2,
  ArrowRight,
  HelpCircle,
  Plus,
  Compass,
  AlertTriangle,
  Award,
  Calendar,
  Lock,
  Layers,
  CheckCircle,
  Clock,
  RotateCcw,
  Sparkle,
  Settings,
  Search,
  Database,
  Star,
  Key,
  History,
  Eye,
  EyeOff,
  Pencil,
  Globe,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import YouTubeViewer from "./components/YouTubeViewer";
import ArticleReader from "./components/ArticleReader";
import StudyCanvas from "./components/StudyCanvas";
import { Translation, PriorityWord, Flashcard, DailyActivity } from "./types";

export default function App() {
  // Navigation & Study Panels Layout State
  const [leftTab, setLeftTab] = useState<"video" | "article">("article");
  const [rightTab, setRightTab] = useState<"notes" | "vocabulary" | "flashcards" | "dashboard" | "challenge">("notes");

  // Core Translation Cache & Priority Vocabulary State
  const [translationCache, setTranslationCache] = useState<Record<string, Translation>>({});
  const [priorityWords, setPriorityWords] = useState<PriorityWord[]>([]);
  const [activeWord, setActiveWord] = useState<string>("");

  // Manual Gemini & OpenRouter API Key Configuration
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("");
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Word Bank Sub-Tabs & Filtering
  const [vocabSubTab, setVocabSubTab] = useState<"priorities" | "history">("priorities");
  const [wordBankSearch, setWordBankSearch] = useState<string>("");
  const [wordBankLevelFilter, setWordBankLevelFilter] = useState<string>("all");
  const [activeTranslation, setActiveTranslation] = useState<Translation | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Leitner SRS Flashcards State
  const [translationMode, setTranslationMode] = useState<"ai" | "no_ai">(() => {
    try {
      const saved = localStorage.getItem("english_translation_mode");
      return saved === "no_ai" ? "no_ai" : "ai";
    } catch (e) {
      return "ai";
    }
  });
  const [isEditingTranslation, setIsEditingTranslation] = useState<boolean>(false);
  const [editWord, setEditWord] = useState<string>("");
  const [editTranslation, setEditTranslation] = useState<string>("");
  const [editPhonetic, setEditPhonetic] = useState<string>("");
  const [editPartOfSpeech, setEditPartOfSpeech] = useState<string>("");
  const [editDefinition, setEditDefinition] = useState<string>("");
  const [editExplanation, setEditExplanation] = useState<string>("");
  const [editLevel, setEditLevel] = useState<string>("A1");
  const [editExamples, setEditExamples] = useState<{ en: string; pt: string }[]>([
    { en: "", pt: "" },
    { en: "", pt: "" },
    { en: "", pt: "" }
  ]);
  const [manualTranslateInput, setManualTranslateInput] = useState<string>("");

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [revealFlashcardAnswer, setRevealFlashcardAnswer] = useState<boolean>(false);

  // Daily learning activity metrics state
  const [activityMetrics, setActivityMetrics] = useState<DailyActivity[]>([]);
  const [sessionStartTime] = useState<number>(Date.now());
  const [activeSeconds, setActiveSeconds] = useState<number>(0);

  // Active Words Riddle Challenge State
  const [challengeStep, setChallengeStep] = useState<"select" | "explaining" | "revealed">("select");
  const [challengeWord, setChallengeWord] = useState<string>("");
  const [challengeTranslation, setChallengeTranslation] = useState<Translation | null>(null);
  const [customChallengeInput, setCustomChallengeInput] = useState<string>("");
  const [challengeLoading, setChallengeLoading] = useState<boolean>(false);
  const [challengeUserGuess, setChallengeUserGuess] = useState<string>("");
  const [challengeFeedback, setChallengeFeedback] = useState<"correct" | "incorrect" | null>(null);

  const saveStateToSQLite = async (key: string, value: any) => {
    try {
      await fetch("/api/app-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
    } catch (err) {
      console.error("Erro ao sincronizar estado com SQLite:", err);
    }
  };

  // Load state from client SQLite, fallback to localStorage on mount
  useEffect(() => {
    // Load custom API Keys
    const savedApiKey = localStorage.getItem("english_gemini_api_key");
    if (savedApiKey) {
      setGeminiApiKey(savedApiKey);
    }
    const savedOpenRouterKey = localStorage.getItem("english_openrouter_api_key");
    if (savedOpenRouterKey) {
      setOpenRouterApiKey(savedOpenRouterKey);
    }

    const loadStateFromLocalStorageOnly = () => {
      console.warn("[App] Usando persistência exclusiva via LocalStorage (Vercel/Static).");
      const savedCache = localStorage.getItem("english_translation_cache");
      if (savedCache) {
        try { setTranslationCache(JSON.parse(savedCache)); } catch (e) {}
      }
      const savedWords = localStorage.getItem("english_priority_words");
      if (savedWords) {
        try { setPriorityWords(JSON.parse(savedWords)); } catch (e) {}
      }
      const savedCards = localStorage.getItem("english_flashcards");
      if (savedCards) {
        try { setFlashcards(JSON.parse(savedCards)); } catch (e) {}
      }
      const todayStr = new Date().toISOString().split("T")[0];
      const savedMetrics = localStorage.getItem("english_daily_metrics");
      if (savedMetrics) {
        try {
          const parsed = JSON.parse(savedMetrics);
          const existingToday = parsed.find((m: any) => m.date === todayStr);
          if (!existingToday) {
            parsed.push({
              date: todayStr,
              translatedCount: 0,
              drawCount: 0,
              flashcardsPracticed: 0,
              activeSeconds: 0
            });
          }
          setActivityMetrics(parsed);
        } catch (e) {}
      } else {
        const initialMetrics = [
          { date: "2026-06-08", translatedCount: 8, drawCount: 4, flashcardsPracticed: 12, activeSeconds: 1540 },
          { date: "2026-06-09", translatedCount: 15, drawCount: 9, flashcardsPracticed: 18, activeSeconds: 2600 },
          { date: "2026-06-10", translatedCount: 11, drawCount: 6, flashcardsPracticed: 10, activeSeconds: 1980 },
          { date: todayStr, translatedCount: 0, drawCount: 0, flashcardsPracticed: 0, activeSeconds: 0 }
        ];
        setActivityMetrics(initialMetrics);
      }
    };

    const loadStateFromSQLite = async () => {
      try {
        const response = await fetch("/api/app-state");
        if (response && response.ok) {
          const state = await response.json();
          
          if (state.english_translation_cache) {
            setTranslationCache(state.english_translation_cache);
          } else {
            const savedCache = localStorage.getItem("english_translation_cache");
            if (savedCache) {
              setTranslationCache(JSON.parse(savedCache));
              saveStateToSQLite("english_translation_cache", JSON.parse(savedCache));
            }
          }

          if (state.english_priority_words) {
            setPriorityWords(state.english_priority_words);
          } else {
            const savedWords = localStorage.getItem("english_priority_words");
            if (savedWords) {
              setPriorityWords(JSON.parse(savedWords));
              saveStateToSQLite("english_priority_words", JSON.parse(savedWords));
            }
          }

          if (state.english_flashcards) {
            setFlashcards(state.english_flashcards);
          } else {
            const savedCards = localStorage.getItem("english_flashcards");
            if (savedCards) {
              setFlashcards(JSON.parse(savedCards));
              saveStateToSQLite("english_flashcards", JSON.parse(savedCards));
            }
          }

          const todayStr = new Date().toISOString().split("T")[0];
          if (state.english_daily_metrics) {
            const parsed = state.english_daily_metrics;
            const existingToday = parsed.find((m: any) => m.date === todayStr);
            if (!existingToday) {
              parsed.push({
                date: todayStr,
                translatedCount: 0,
                drawCount: 0,
                flashcardsPracticed: 0,
                activeSeconds: 0
              });
            }
            setActivityMetrics(parsed);
          } else {
            const savedMetrics = localStorage.getItem("english_daily_metrics");
            if (savedMetrics) {
              const parsed = JSON.parse(savedMetrics);
              const existingToday = parsed.find((m: any) => m.date === todayStr);
              if (!existingToday) {
                parsed.push({
                  date: todayStr,
                  translatedCount: 0,
                  drawCount: 0,
                  flashcardsPracticed: 0,
                  activeSeconds: 0
                });
              }
              setActivityMetrics(parsed);
              saveStateToSQLite("english_daily_metrics", parsed);
            } else {
              const initialMetrics = [
                { date: "2026-06-08", translatedCount: 8, drawCount: 4, flashcardsPracticed: 12, activeSeconds: 1540 },
                { date: "2026-06-09", translatedCount: 15, drawCount: 9, flashcardsPracticed: 18, activeSeconds: 2600 },
                { date: "2026-06-10", translatedCount: 11, drawCount: 6, flashcardsPracticed: 10, activeSeconds: 1980 },
                { date: todayStr, translatedCount: 0, drawCount: 0, flashcardsPracticed: 0, activeSeconds: 0 }
              ];
              setActivityMetrics(initialMetrics);
              saveStateToSQLite("english_daily_metrics", initialMetrics);
            }
          }
        } else {
          // Response not OK (like 404 on Vercel)
          loadStateFromLocalStorageOnly();
        }
      } catch (err) {
        console.warn("Erro ao carregar estados do banco SQLite. Usando contingência local:", err);
        loadStateFromLocalStorageOnly();
      }
    };

    loadStateFromSQLite();
  }, []);

  // Background auto-syncs for states
  useEffect(() => {
    if (Object.keys(translationCache).length > 0) {
      saveStateToSQLite("english_translation_cache", translationCache);
    }
  }, [translationCache]);

  useEffect(() => {
    if (priorityWords.length > 0) {
      saveStateToSQLite("english_priority_words", priorityWords);
    }
  }, [priorityWords]);

  useEffect(() => {
    if (flashcards.length > 0) {
      saveStateToSQLite("english_flashcards", flashcards);
    }
  }, [flashcards]);

  useEffect(() => {
    if (activityMetrics.length > 0) {
      saveStateToSQLite("english_daily_metrics", activityMetrics);
    }
  }, [activityMetrics]);


  // Timer simulation to track duration minutes of tablet study Session
  useEffect(() => {
    const timer = setInterval(() => {
      const currentSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      setActiveSeconds(currentSeconds);

      // Save periodically to Today's activity logs
      const todayStr = new Date().toISOString().split("T")[0];
      setActivityMetrics((prev) => {
        const updated = prev.map((m) => {
          if (m.date === todayStr) {
            return { ...m, activeSeconds: m.activeSeconds + 1 };
          }
          return m;
        });
        localStorage.setItem("english_daily_metrics", JSON.stringify(updated));
        return updated;
      });
    }, 10000); // sync every 10 seconds

    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // General metrics visual logger helper for specific activities
  const logActivityAction = (type: "translated" | "draw" | "flashcard") => {
    const todayStr = new Date().toISOString().split("T")[0];
    setActivityMetrics((prev) => {
      const updated = prev.map((m) => {
        if (m.date === todayStr) {
          return {
            ...m,
            translatedCount: type === "translated" ? m.translatedCount + 1 : m.translatedCount,
            drawCount: type === "draw" ? m.drawCount + 1 : m.drawCount,
            flashcardsPracticed: type === "flashcard" ? m.flashcardsPracticed + 1 : m.flashcardsPracticed
          };
        }
        return m;
      });
      localStorage.setItem("english_daily_metrics", JSON.stringify(updated));
      return updated;
    });
  };

  // Speaks aloud looked up vocabulary words in authentic accent using native Browser SpeechSynthesis API
  const speakTextAloud = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85; // slower learning speech pace
      window.speechSynthesis.speak(utterance);
    } else {
      alert("A síntese de voz não é compatível com este navegador/dispositivo.");
    }
  };

  // Client-side Direct AI Translation Compiler
  const translateDirectlyOnClient = async (word: string, context: string = ""): Promise<Translation> => {
    const cleanWord = word.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
    
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

    // 1. Try Gemini Client-Side if API key is in State (saved in localStorage)
    if (geminiApiKey && geminiApiKey.trim() !== "") {
      try {
        console.log("[Client Translation] Usando chave Gemini direta no cliente...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  word: { type: "STRING" },
                  translation: { type: "STRING" },
                  phonetic: { type: "STRING" },
                  partOfSpeech: { type: "STRING" },
                  definition: { type: "STRING" },
                  explanation: { type: "STRING" },
                  level: { type: "STRING" },
                  examples: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        en: { type: "STRING" },
                        pt: { type: "STRING" }
                      },
                      required: ["en", "pt"]
                    }
                  }
                },
                required: ["word", "translation", "phonetic", "partOfSpeech", "definition", "explanation", "level", "examples"]
              }
            }
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return JSON.parse(text.trim());
          }
        } else {
          console.warn("[Client Translation] Resposta do Gemini Client-side não foi 200 OK:", response.status);
        }
      } catch (gemErr: any) {
        console.warn("[Client Translation] Falha ao traduzir localmente via Gemini:", gemErr.message);
      }
    }

    // 2. Try OpenRouter Client-Side if API key is in State (saved in localStorage)
    if (openRouterApiKey && openRouterApiKey.trim() !== "") {
      try {
        console.log("[Client Translation] Usando chave OpenRouter direta no cliente...");
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterApiKey.trim()}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "English Notebook App"
          },
          body: JSON.stringify({
            model: "google/gemini-1.5-flash", 
            messages: [
              {
                role: "user",
                content: prompt + "\nO retorno corporal deve conter estritamente um JSON estruturado válido e nada mais."
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = resJson.choices?.[0]?.message?.content;
          if (content) {
            return JSON.parse(content.trim());
          }
        } else {
          console.warn("[Client Translation] Resposta do OpenRouter Client-side não foi 200 OK:", response.status);
        }
      } catch (orErr: any) {
        console.warn("[Client Translation] Falha ao traduzir localmente via OpenRouter:", orErr.message);
      }
    }

    // 3. Static dictionary fallback
    const STATIC_DICT: Record<string, Translation> = {
      banana: {
        word: "banana",
        translation: "banana",
        phonetic: "/bəˈnænə/",
        partOfSpeech: "noun",
        definition: "A long curved fruit which grows in clusters and has soft pulpy flesh and yellow skin when ripe.",
        explanation: "Fruta tropical amarela que amadurece em cachos, muito rica em potássio e energia.",
        level: "A1",
        examples: [
          { en: "He peeled a delicious sweet banana.", pt: "Ele descascou uma deliciosa e doce banana." },
          { en: "Add some sliced banana into my yogurt.", pt: "Adicione um pouco de banana fatiada no meu iogurte." },
          { en: "A banana tree is growing in the garden.", pt: "Uma bananeira está crescendo no jardim." }
        ],
        timestamp: Date.now()
      },
      apple: {
        word: "apple",
        translation: "maçã",
        phonetic: "/ˈæp.əl/",
        partOfSpeech: "noun",
        definition: "A round fruit with red, green, or yellow skin and crisp white flesh.",
        explanation: "Fruta redonda e crocante de pele vermelha ou verde, símbolo de saúde.",
        level: "A1",
        examples: [
          { en: "I ate a green apple for snack.", pt: "Eu comi uma maçã verde no lanche." },
          { en: "Her mother baked a delicious apple pie.", pt: "A mãe dela assou uma deliciosa torta de maçã." },
          { en: "The apple fell down from the tall branch.", pt: "A maçã caiu lá de cima do galho alto." }
        ],
        timestamp: Date.now()
      }
    };

    if (STATIC_DICT[cleanWord]) {
      return STATIC_DICT[cleanWord];
    }

    // 4. Ultimate simple automatic translation builder
    return {
      word: word.trim(),
      translation: `${word.trim()}`,
      phonetic: "/.../",
      partOfSpeech: "Palavra (Modo Offline)",
      definition: `The word '${word.trim()}' was processed. Configure your Gemini or OpenRouter API Key in the settings gear icon (⚙️) or verify the API integrity.`,
      explanation: `Significado de '${word.trim()}'. Ative a sua própria Chave de API do Google Gemini ou OpenRouter clicando no ícone de engrenagem (⚙️) no canto superior direito para liberar traduções ricas via IA.`,
      examples: [
        { en: `How do you use the word '${word.trim()}'?`, pt: `Como você usa a palavra '${word.trim()}'?` },
        { en: `Please insert your API Keys in the settings gear.`, pt: `Por favor, insira suas chaves de API na engrenagem de configurações.` },
        { en: `Practice makes perfect. Keep studying!`, pt: `A prática leva à perfeição. Continue estudando!` }
      ],
      level: "A1",
      timestamp: Date.now()
    };
  };

  // Call free public translation API (MyMemory) for offline / No-AI mode
  const translateWithMyMemory = async (word: string): Promise<string> => {
    try {
      const resp = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURI(word)}&langpair=en|pt`);
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.responseData?.translatedText;
        if (text) {
          return text;
        }
      }
    } catch (e) {
      console.warn("Falha ao consultar MyMemory API:", e);
    }
    return word; // fallback if failed
  };

  // Perform translation lookups, calling express server-side Gemini 3.5 API
  const handleWordLookup = async (word: string, context: string = "") => {
    if (!word || word.trim().length === 0) return;

    const queryKey = word.trim().toLowerCase();
    setActiveWord(word.trim());
    setTranslationError(null);

    // 1. Check local lookup cache to save AI computational token processing as requested
    if (translationCache[queryKey]) {
      const cachedResult = translationCache[queryKey];
      setActiveTranslation(cachedResult);
      incrementWordCounter(queryKey, cachedResult);
      // Auto-open vocabulary drawer to view results
      if (rightTab !== "vocabulary") {
        setRightTab("vocabulary");
      }
      return;
    }

    // 2. If translation mode is "no_ai" (Without AI), use MyMemory API and request manual input if desired
    if (translationMode === "no_ai") {
      setIsTranslating(true);
      try {
        const translatedText = await translateWithMyMemory(queryKey);
        const noAiTranslation: Translation = {
          word: word.trim(),
          translation: translatedText,
          phonetic: "/.../",
          partOfSpeech: "Noun (Manual)",
          definition: "English definition - click 'Editar' below to write manually.",
          explanation: "Tradução realizada via API pública externa MyMemory (Sem IA). Você pode refinar as informações e exemplos manualmente clicando em 'Editar'.",
          examples: [
            { en: `This is a sentence containing '${word.trim()}'.`, pt: `Esta é uma frase contendo '${translatedText}'.` }
          ],
          level: "A1",
          timestamp: Date.now()
        };

        const updatedCache = { ...translationCache, [queryKey]: noAiTranslation };
        setTranslationCache(updatedCache);
        localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));
        saveStateToSQLite("english_translation_cache", updatedCache);

        setActiveTranslation(noAiTranslation);
        incrementWordCounter(queryKey, noAiTranslation);
        logActivityAction("translated");

        // Auto-redirect right tab to vocabulary drawer
        setRightTab("vocabulary");
      } catch (err: any) {
        console.error(err);
        setTranslationError(err.message || "Não foi possível carregar a tradução via API pública.");
      } finally {
        setIsTranslating(false);
      }
      return;
    }

    // 3. Fetch from LLM Server-side API gateway proxy (with AI)
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiApiKey || ""
        },
        body: JSON.stringify({ word: queryKey, context })
      });

      if (!response.ok) {
        throw new Error("Erro de comunicação com o servidor de tradução.");
      }

      const translationData: Translation = await response.json();
      translationData.timestamp = Date.now();

      // Store in local browser cache to preserve AI resources next time
      const updatedCache = { ...translationCache, [queryKey]: translationData };
      setTranslationCache(updatedCache);
      localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));
      saveStateToSQLite("english_translation_cache", updatedCache);

      setActiveTranslation(translationData);
      incrementWordCounter(queryKey, translationData);
      logActivityAction("translated");

      // Auto-redirect right tab to vocabulary drawer
      setRightTab("vocabulary");

    } catch (err: any) {
      console.warn("[App] Servidor indisponível ou falha de conexão. Traduzindo diretamente via chaves manuais do usuário...");
      try {
        const translationData = await translateDirectlyOnClient(queryKey, context);
        translationData.timestamp = Date.now();

        const updatedCache = { ...translationCache, [queryKey]: translationData };
        setTranslationCache(updatedCache);
        localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));
        saveStateToSQLite("english_translation_cache", updatedCache);

        setActiveTranslation(translationData);
        incrementWordCounter(queryKey, translationData);
        logActivityAction("translated");
        setRightTab("vocabulary");
      } catch (localErr: any) {
        console.error(localErr);
        setTranslationError(localErr.message || "Não foi possível carregar a tradução com IA.");
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // Starts the inverted active recall guess challenge for any word
  const startWordChallenge = async (wordToChallenge: string) => {
    if (!wordToChallenge || wordToChallenge.trim().length === 0) return;
    const queryKey = wordToChallenge.trim().toLowerCase();
    setChallengeWord(queryKey);
    setChallengeStep("explaining");
    setChallengeLoading(true);
    setChallengeUserGuess("");
    setChallengeFeedback(null);

    // Check cache first to avoid unneeded API processing
    if (translationCache[queryKey]) {
      setChallengeTranslation(translationCache[queryKey]);
      setChallengeLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-key": geminiApiKey || ""
        },
        body: JSON.stringify({ word: queryKey })
      });

      if (!response.ok) {
        throw new Error("Erro de rede.");
      }

      const translationData: Translation = await response.json();
      translationData.timestamp = Date.now();

      // Cache it
      const updatedCache = { ...translationCache, [queryKey]: translationData };
      setTranslationCache(updatedCache);
      localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));

      setChallengeTranslation(translationData);
      incrementWordCounter(queryKey, translationData);
    } catch (err) {
      console.warn("[App] Servidor indisponível para enigma. Traduzindo diretamente via chaves manuais do usuário...");
      try {
        const translationData = await translateDirectlyOnClient(queryKey);
        translationData.timestamp = Date.now();

        const updatedCache = { ...translationCache, [queryKey]: translationData };
        setTranslationCache(updatedCache);
        localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));

        setChallengeTranslation(translationData);
        incrementWordCounter(queryKey, translationData);
      } catch (localErr) {
        console.error(localErr);
        alert("Não foi possível carregar o significado desta palavra via IA.");
        setChallengeStep("select");
      }
    } finally {
      setChallengeLoading(false);
    }
  };

  const handleRandomChallenge = () => {
    const keys = Object.keys(translationCache);
    if (keys.length === 0) {
      // Fallback suggestions
      const fallbackSuggestions = ["reluctance", "masterpiece", "resilience", "compelling", "stunning"];
      const randomFallback = fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];
      startWordChallenge(randomFallback);
    } else {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      startWordChallenge(randomKey);
    }
  };

  // Maintenance and counting tracker for frequent lookup words
  const incrementWordCounter = (word: string, data: Translation) => {
    setPriorityWords((prev) => {
      const existing = prev.find((w) => w.word === word);
      let updated: PriorityWord[];

      if (existing) {
        updated = prev.map((w) =>
          w.word === word
            ? { ...w, count: w.count + 1, lastAnnotated: Date.now() }
            : w
        );
      } else {
        updated = [
          ...prev,
          {
            word,
            translationInfo: data,
            count: 1,
            lastAnnotated: Date.now(),
            manualPriority: false,
            isMastered: false
          }
        ];
      }

      // Automatically sort list by lookup count DESC so most troublesome words always emerge first
      updated.sort((a, b) => b.count - a.count);

      localStorage.setItem("english_priority_words", JSON.stringify(updated));

      // Check if we should automatically link this word to the Flashcard generator if it hits priority rules
      generateFlashcardForWord(word, data, updated);

      return updated;
    });
  };

  const toggleManualPriority = (word: string) => {
    setPriorityWords((prev) => {
      const updated = prev.map((w) =>
        w.word === word ? { ...w, manualPriority: !w.manualPriority } : w
      );
      localStorage.setItem("english_priority_words", JSON.stringify(updated));
      return updated;
    });
  };

  const toggleWordMastery = (word: string) => {
    setPriorityWords((prev) => {
      const updated = prev.map((w) =>
        w.word === word ? { ...w, isMastered: !w.isMastered } : w
      );
      localStorage.setItem("english_priority_words", JSON.stringify(updated));
      return updated;
    });
  };

  const deleteFromWordBank = (word: string) => {
    if (window.confirm(`Deseja remover a palavra "${word}" do seu Banco de Palavras Traduzidas? Ela será excluída do histórico e do cache local.`)) {
      setTranslationCache((prev) => {
        const updated = { ...prev };
        delete updated[word.toLowerCase()];
        localStorage.setItem("english_translation_cache", JSON.stringify(updated));
        return updated;
      });
      // Also remove from priority words if exists
      setPriorityWords((prev) => {
        const updated = prev.filter((w) => w.word.toLowerCase() !== word.toLowerCase());
        localStorage.setItem("english_priority_words", JSON.stringify(updated));
        return updated;
      });
      // Also remove from flashcards
      setFlashcards((prev) => {
        const updated = prev.filter((fc) => fc.word.toLowerCase() !== word.toLowerCase());
        localStorage.setItem("english_flashcards", JSON.stringify(updated));
        return updated;
      });
      // If the active translation was this word, clear it
      if (activeWord.toLowerCase() === word.toLowerCase()) {
        setActiveWord("");
        setActiveTranslation(null);
      }
    }
  };

  const clearEntireWordBank = () => {
    if (window.confirm("Você tem certeza absoluta que deseja LIMPAR TODO o seu Banco de Palavras Traduzidas? Isso apagará todas as palavras salvas, histórico, anotações e flashcards!")) {
      setTranslationCache({});
      localStorage.setItem("english_translation_cache", JSON.stringify({}));
      setPriorityWords([]);
      localStorage.setItem("english_priority_words", JSON.stringify([]));
      setFlashcards([]);
      localStorage.setItem("english_flashcards", JSON.stringify([]));
      setActiveWord("");
      setActiveTranslation(null);
      alert("Banco de Palavras Traduzidas totalmente reiniciado!");
    }
  };

  const deleteSavedWord = (word: string) => {
    if (window.confirm(`Deseja remover "${word}" das suas anotações prioritárias?`)) {
      setPriorityWords((prev) => {
        const updated = prev.filter((w) => w.word !== word);
        localStorage.setItem("english_priority_words", JSON.stringify(updated));
        return updated;
      });
      // Also delete corresponding flashcard
      setFlashcards((prev) => {
        const updated = prev.filter((fc) => fc.word !== word);
        localStorage.setItem("english_flashcards", JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Generate Flashcards automatically based on prioritized vocabulary words
  const generateFlashcardForWord = (word: string, data: Translation, currentPriorities: PriorityWord[]) => {
    setFlashcards((prev) => {
      // Check if already exists in deck
      const exists = prev.some((fc) => fc.word === word);
      if (exists) return prev;

      const newCard: Flashcard = {
        id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        word,
        translationInfo: data,
        incorrectCount: 0,
        correctCount: 0,
        box: 1, // Leitner system starting box
        nextReviewDate: Date.now()
      };

      const updated = [newCard, ...prev];
      localStorage.setItem("english_flashcards", JSON.stringify(updated));
      return updated;
    });
  };

  // Manual generation trigger
  const handleGenerateAllFlashcards = () => {
    if (priorityWords.length === 0) {
      alert("Anotações de vocabulário vazias. Faça pesquisas clicando em palavras ou vídeos primeiro!");
      return;
    }

    let addedCount = 0;
    setFlashcards((prev) => {
      const updated = [...prev];
      priorityWords.forEach((pw) => {
        const exists = updated.some((fc) => fc.word === pw.word);
        if (!exists) {
          updated.push({
            id: `fc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            word: pw.word,
            translationInfo: pw.translationInfo,
            incorrectCount: 0,
            correctCount: 0,
            box: 1,
            nextReviewDate: Date.now()
          });
          addedCount++;
        }
      });

      localStorage.setItem("english_flashcards", JSON.stringify(updated));
      return updated;
    });

    alert(`${addedCount} novos Flashcards de SRS com Leitner foram gerados com base na sua lista de prioridades!`);
  };

  // SRS Review Leitner box transition helpers
  const handleFlashcardRating = (correct: boolean) => {
    if (flashcards.length === 0) return;
    const currentCard = flashcards[currentFlashcardIndex];

    // Log Activity count
    logActivityAction("flashcard");

    setFlashcards((prev) => {
      const updated = prev.map((fc, idx) => {
        if (idx === currentFlashcardIndex) {
          let nextBox = fc.box;
          let nextIntervalDays = 1;

          if (correct) {
            nextBox = Math.min(5, fc.box + 1);
            // Leitner review interval spacing: Box 1 (1 day), Box 2 (2 days), Box 3 (4 days), Box 4 (7 days), Box 5 (14 days)
            const intervals = [0, 1, 2, 4, 7, 14];
            nextIntervalDays = intervals[nextBox] || 1;
          } else {
            nextBox = 1; // Fall back to box 1 on mistake (SRS penalty)
          }

          return {
            ...fc,
            box: nextBox,
            correctCount: correct ? fc.correctCount + 1 : fc.correctCount,
            incorrectCount: !correct ? fc.incorrectCount + 1 : fc.incorrectCount,
            nextReviewDate: Date.now() + nextIntervalDays * 24 * 60 * 60 * 1000
          };
        }
        return fc;
      });

      localStorage.setItem("english_flashcards", JSON.stringify(updated));
      return updated;
    });

    // Reset card turn and advance index safely
    setRevealFlashcardAnswer(false);
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex((prev) => prev + 1);
    } else {
      setCurrentFlashcardIndex(0);
      alert("Revisão concluída! Reiniciando ciclo de deck.");
    }
  };

  const handleResetFlashcardsStats = () => {
    if (window.confirm("Reiniciar todas as pontuações e colocar os flashcards de volta na Caixa 1?")) {
      setFlashcards((prev) => {
        const updated = prev.map((fc) => ({
          ...fc,
          box: 1,
          correctCount: 0,
          incorrectCount: 0,
          nextReviewDate: Date.now()
        }));
        localStorage.setItem("english_flashcards", JSON.stringify(updated));
        return updated;
      });
      setCurrentFlashcardIndex(0);
      setRevealFlashcardAnswer(false);
    }
  };

  // Performance dashboard calculations
  const totalTranslations = priorityWords.length;
  const masteredCount = priorityWords.filter((w) => w.isMastered).length;
  const currentStruggles = priorityWords.filter((w) => w.count > 1 && !w.isMastered);
  
  // Calculate average accuracy of SRS Flashcard quizzes
  const flashcardLogs = flashcards.reduce(
    (acc, fc) => {
      acc.correct += fc.correctCount;
      acc.incorrect += fc.incorrectCount;
      return acc;
    },
    { correct: 0, incorrect: 0 }
  );
  const flashcardTotalReviews = flashcardLogs.correct + flashcardLogs.incorrect;
  const flashcardAccuracyRate =
    flashcardTotalReviews > 0
      ? Math.round((flashcardLogs.correct / flashcardTotalReviews) * 100)
      : 0;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Upper Status / Tablet Command bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative p-1.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg text-white">
            <BrainCircuit className="w-5.5 h-5.5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <h1 className="text-md sm:text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Estudo Inteligente
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">Tablet Co-Pilot Mode</p>
          </div>
        </div>

        {/* Learning Statistics Bar in Header */}
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-5">
            <Compass className="w-4 h-4 text-sky-400" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Masterizados</span>
              <span className="font-bold text-slate-200">{masteredCount} / {totalTranslations} Palavras</span>
            </div>
          </div>
          <div className="flex items-center gap-2 border-r border-slate-800 pr-5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Precisão Flashcards</span>
              <span className="font-bold text-slate-200">
                {flashcardAccuracyRate}% <span className="text-[10px] text-slate-500">({flashcardTotalReviews} revs)</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Minutos Ativos</span>
              <span className="font-bold text-slate-200">
                {Math.round(activeSeconds / 60)} min
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800/80 rounded-lg flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-300">Português ↔ Inglês</span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-indigo-400 rounded-lg border border-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer"
            title="Configurar Chave de API Gemini"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Split Pane Main Layout Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Study Source Screen - Reads Articles & Streams Video (60% width) */}
        <div className="w-full lg:w-[58%] border-r border-slate-800 flex flex-col h-1/2 lg:h-full overflow-hidden bg-slate-950">
          
          {/* Header tabs to toggle media visual tools */}
          <div className="flex px-4 py-2 border-b border-slate-800/80 bg-slate-950 justify-between items-center flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setLeftTab("article")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
                  leftTab === "article"
                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Dicionário e Artigos Interativos
              </button>
              <button
                onClick={() => setLeftTab("video")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
                  leftTab === "video"
                    ? "bg-red-600/10 text-red-400 border border-red-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Youtube className="w-4 h-4" />
                Player de Vídeos YouTube
              </button>
            </div>
            
            <span className="text-[10px] bg-slate-900 text-slate-500 px-2 py-1 rounded font-mono mr-1">TELA ESQUERDA</span>
          </div>

          {/* Interactive components dynamic injection */}
          <div className="flex-1 overflow-hidden">
            {leftTab === "article" ? (
              <ArticleReader onWordLookup={handleWordLookup} activeLookupWord={activeWord} />
            ) : (
              <YouTubeViewer onWordLookup={handleWordLookup} />
            )}
          </div>
        </div>

        {/* Right Study Notes / Translator Companion Pane (42% width) */}
        <div className="w-full lg:w-[42%] flex flex-col h-1/2 lg:h-full bg-slate-900 overflow-hidden">
          
          {/* Top Bar Workspace tool selection */}
          <div className="flex px-3.5 py-2 border-b border-slate-800 bg-slate-950/80 items-center justify-between flex-shrink-0">
            <div className="flex gap-1 overflow-x-auto scrollbar-none pr-2">
              <button
                onClick={() => setRightTab("notes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${
                  rightTab === "notes"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Caderno
              </button>
              <button
                onClick={() => setRightTab("vocabulary")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 relative flex-shrink-0 ${
                  rightTab === "vocabulary"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Vocabulário
                {priorityWords.length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {priorityWords.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab("flashcards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                  rightTab === "flashcards"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Flashcards SRS
                {flashcards.length > 0 && (
                  <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {flashcards.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setRightTab("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${
                  rightTab === "dashboard"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Métricas
              </button>
              <button
                onClick={() => setRightTab("challenge")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                  rightTab === "challenge"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                Estudo Invertido
              </button>
            </div>
            
            <span className="text-[10px] bg-slate-900 border border-slate-800/80 text-slate-500 px-2 py-1 rounded font-mono hidden sm:inline flex-shrink-0">PAINEL WORKSPACE</span>
          </div>

          {/* Active Workspace View Rendering */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {rightTab === "notes" && (
                <motion.div
                  key="notes"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  {/* Digital ink and handwritten canvas workspace */}
                  <StudyCanvas
                    onActivityLogged={(type) => {
                      if (type === "draw") logActivityAction("draw");
                    }}
                  />
                </motion.div>
              )}

              {rightTab === "vocabulary" && (
                <motion.div
                  key="vocabulary"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col p-4 overflow-y-auto"
                >
                  {/* Word translator view container */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkle className="w-4 h-4 text-amber-500" />
                        Tradutor Integrado
                      </h3>
                      <button
                        onClick={() => {
                          setEditWord("");
                          setEditTranslation("");
                          setEditPhonetic("/.../");
                          setEditPartOfSpeech("noun");
                          setEditDefinition("");
                          setEditExplanation("Prontuário de tradução inserido manualmente pelo estudante.");
                          setEditLevel("A1");
                          setEditExamples([
                            { en: "", pt: "" },
                            { en: "", pt: "" },
                            { en: "", pt: "" }
                          ]);
                          setIsEditingTranslation(true);
                        }}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg text-[10px] font-bold border border-slate-800 transition tracking-wide flex items-center gap-1 cursor-pointer"
                        title="Escrever tradução do zero"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Manual
                      </button>
                    </div>

                    {/* Mapeamento entre IA (LLM) e Sem IA (API Pública / Manual) */}
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800/80 mb-3 gap-1">
                      <button
                        onClick={() => {
                          setTranslationMode("ai");
                          localStorage.setItem("english_translation_mode", "ai");
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          translationMode === "ai"
                            ? "bg-indigo-650 bg-indigo-600 text-white shadow"
                            : "text-slate-450 hover:text-slate-200"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Traduzir com IA 🤖
                      </button>
                      <button
                        onClick={() => {
                          setTranslationMode("no_ai");
                          localStorage.setItem("english_translation_mode", "no_ai");
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          translationMode === "no_ai"
                            ? "bg-indigo-650 bg-indigo-600 text-white shadow"
                            : "text-slate-450 hover:text-slate-200"
                        }`}
                      >
                        <Globe className="w-3 h-3 text-sky-400" />
                        Traduzir sem IA 🔌
                      </button>
                    </div>

                    {/* Manual word typing lookup */}
                    <div className="flex gap-1.5 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Digite um termo para traduzir..."
                          value={manualTranslateInput}
                          onChange={(e) => setManualTranslateInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && manualTranslateInput.trim()) {
                              handleWordLookup(manualTranslateInput.trim());
                              setManualTranslateInput("");
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-505 transition"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (manualTranslateInput.trim()) {
                            handleWordLookup(manualTranslateInput.trim());
                            setManualTranslateInput("");
                          }
                        }}
                        className="px-3 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center"
                      >
                        Buscar
                      </button>
                    </div>

                    {isEditingTranslation ? (
                      /* Formulario de Escrita Manual ou Edição */
                      <div className="space-y-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
                          <span className="text-[11px] font-bold text-indigo-400">Escrita Manual de Tradução</span>
                          <button
                            onClick={() => setIsEditingTranslation(false)}
                            className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            ✕ Cancelar
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Input em Inglês</label>
                            <input
                              type="text"
                              value={editWord}
                              onChange={(e) => setEditWord(e.target.value)}
                              placeholder="e.g. delicious"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Tradução Oficial</label>
                            <input
                              type="text"
                              value={editTranslation}
                              onChange={(e) => setEditTranslation(e.target.value)}
                              placeholder="e.g. delicioso"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white focus:outline-none focus:border-indigo-505"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Escrita Fonética</label>
                            <input
                              type="text"
                              value={editPhonetic}
                              onChange={(e) => setEditPhonetic(e.target.value)}
                              placeholder="/dɪˈlɪʃ.əs/"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Classe Gramatical</label>
                            <input
                              type="text"
                              value={editPartOfSpeech}
                              onChange={(e) => setEditPartOfSpeech(e.target.value)}
                              placeholder="adjective"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Nível CEFR</label>
                            <select
                              value={editLevel}
                              onChange={(e) => setEditLevel(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-xs text-white font-medium"
                            >
                              <option value="A1">A1</option>
                              <option value="A2">A2</option>
                              <option value="B1">B1</option>
                              <option value="B2">B2</option>
                              <option value="C1">C1</option>
                              <option value="C2">C2</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Definição em Inglês (Para Aprendizado)</label>
                          <input
                            type="text"
                            value={editDefinition}
                            onChange={(e) => setEditDefinition(e.target.value)}
                            placeholder="Highly pleasant to the taste..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Explicação / Memorização (Em Português)</label>
                          <textarea
                            value={editExplanation}
                            onChange={(e) => setEditExplanation(e.target.value)}
                            rows={2}
                            placeholder="Insira detalhes de uso ou gírias..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2.5 text-xs text-white resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block">Frase de Exemplo Bilíngue</label>
                          {editExamples.slice(0, 1).map((ex, idx) => (
                            <div key={idx} className="space-y-1 p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                              <input
                                type="text"
                                value={ex.en}
                                onChange={(e) => {
                                  const updated = [...editExamples];
                                  updated[idx].en = e.target.value;
                                  setEditExamples(updated);
                                }}
                                placeholder="Frase de Exemplo em Inglês..."
                                className="w-full bg-transparent border-b border-slate-800 pb-0.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                              />
                              <input
                                type="text"
                                value={ex.pt}
                                onChange={(e) => {
                                  const updated = [...editExamples];
                                  updated[idx].pt = e.target.value;
                                  setEditExamples(updated);
                                }}
                                placeholder="Tradução da frase para Português..."
                                className="w-full bg-transparent pt-0.5 text-xs text-slate-450 placeholder-slate-650 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setIsEditingTranslation(false)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 text-[11px] font-bold rounded-lg transition"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              if (!editWord.trim()) return alert("Por favor, informe a palavra original em inglês!");
                              if (!editTranslation.trim()) return alert("Por favor, digite a tradução correta!");

                              const cleanW = editWord.trim().toLowerCase();
                              const updatedTr: Translation = {
                                word: cleanW,
                                translation: editTranslation.trim(),
                                phonetic: editPhonetic.trim() || "/.../",
                                partOfSpeech: editPartOfSpeech.trim() || "Manual",
                                definition: editDefinition.trim() || "Definição manual.",
                                explanation: editExplanation.trim() || "Nenhuma explicação manual fornecida.",
                                level: editLevel,
                                examples: editExamples.filter(ex => ex.en.trim() !== ""),
                                timestamp: Date.now()
                              };

                              const updatedCache = { ...translationCache, [cleanW]: updatedTr };
                              setTranslationCache(updatedCache);
                              localStorage.setItem("english_translation_cache", JSON.stringify(updatedCache));
                              saveStateToSQLite("english_translation_cache", updatedCache);

                              setActiveTranslation(updatedTr);
                              setActiveWord(cleanW);
                              incrementWordCounter(cleanW, updatedTr);

                              setIsEditingTranslation(false);
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    ) : isTranslating ? (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mb-3" />
                        <p className="text-xs font-medium">
                          {translationMode === "ai"
                            ? "Consultando IA para tradução didática..."
                            : "Traduzindo via API pública..."}
                        </p>
                      </div>
                    ) : activeTranslation ? (
                      <div>
                        {/* Word card visualizer header with phonetic audio native read */}
                        <div className="flex items-start justify-between mb-3 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-2xl font-black text-white capitalize">{activeTranslation.word}</h2>
                              <span className="px-2 py-0.5 text-[10px] bg-sky-950 text-sky-400 font-bold uppercase rounded border border-sky-800/30">
                                {activeTranslation.level}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-mono italic mt-0.5">
                              {activeTranslation.phonetic} • {activeTranslation.partOfSpeech}
                            </p>
                          </div>
                          
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setEditWord(activeTranslation.word);
                                setEditTranslation(activeTranslation.translation);
                                setEditPhonetic(activeTranslation.phonetic || "/.../");
                                setEditPartOfSpeech(activeTranslation.partOfSpeech || "noun");
                                setEditDefinition(activeTranslation.definition || "");
                                setEditExplanation(activeTranslation.explanation || "");
                                setEditLevel(activeTranslation.level || "A1");
                                setEditExamples(
                                  activeTranslation.examples && activeTranslation.examples.length > 0
                                    ? [...activeTranslation.examples]
                                    : [{ en: "", pt: "" }, { en: "", pt: "" }, { en: "", pt: "" }]
                                );
                                setIsEditingTranslation(true);
                              }}
                              className="p-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-indigo-400 hover:text-indigo-300 rounded-xl transition border border-slate-800"
                              title="Editar Tradução manualmente"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => speakTextAloud(activeTranslation.word)}
                              className="p-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-sky-400 hover:text-sky-300 rounded-xl transition border border-slate-800"
                              title="Ouvir pronúncia"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Direct translation definition details */}
                        <div className="mb-3.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Tradução Direta</span>
                          <p className="text-sm text-slate-100 font-bold capitalize mt-0.5">{activeTranslation.translation}</p>
                        </div>

                        <div className="mb-3.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Definição em Inglês</span>
                          <p className="text-xs text-slate-300 mt-0.5 bg-slate-900 p-2 rounded-lg leading-relaxed italic border border-slate-800/40">
                            "{activeTranslation.definition}"
                          </p>
                        </div>

                        <div className="mb-4">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Explicação Nuance de Uso</span>
                          <p className="text-xs text-slate-300 pointer-events-auto leading-relaxed mt-1">
                            {activeTranslation.explanation}
                          </p>
                        </div>

                        {/* Examples in bilingual formats */}
                        {activeTranslation.examples && activeTranslation.examples.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-mono font-semibold text-slate-500">Exemplos Práticos Contextuais</span>
                            <div className="space-y-2 mt-1.5">
                              {activeTranslation.examples.map((ex, idx) => (
                                <div key={idx} className="p-2 bg-slate-900 rounded-xl text-xs space-y-0.5 border border-slate-800/30">
                                  <p className="font-semibold text-slate-100 italic">{ex.en}</p>
                                  <p className="text-slate-400">{ex.pt}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-500">
                        <p className="text-xs font-semibold">Nenhuma palavra analisada no momento.</p>
                        <p className="text-[11px] text-slate-550 mt-1">
                          Escreva acima ou selecione e clique em qualquer palavra no texto de leitura para ver sua tradução didática instantânea.
                        </p>
                      </div>
                    )}

                    {translationError && (
                      <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 rounded-xl text-xs flex gap-2 items-start mt-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="font-bold">Aviso do Tradutor</p>
                          <p className="mt-0.5 text-slate-400">{translationError}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector Segmented Control for inner Vocabulary Sub-Tabs */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60 mb-4 gap-1">
                    <button
                      onClick={() => setVocabSubTab("priorities")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        vocabSubTab === "priorities"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      Prioritárias ({priorityWords.length})
                    </button>
                    <button
                      onClick={() => setVocabSubTab("history")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        vocabSubTab === "history"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      Banco ({Object.keys(translationCache).length})
                    </button>
                  </div>

                  {vocabSubTab === "priorities" ? (
                    <>
                      {/* Priority Vocabulary List Header */}
                      <div className="flex items-center justify-between mb-3 mt-1 px-1">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Vocabulário & Dificuldade</h4>
                          <p className="text-[10px] text-slate-500">A ordem reflete os termos mais anotados (Dificuldade Acadêmica)</p>
                        </div>

                        <button
                          onClick={handleGenerateAllFlashcards}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition cursor-pointer"
                        >
                          Gerar Flashcards
                        </button>
                      </div>

                  {/* List of prioritized vocabulary */}
                  {priorityWords.length === 0 ? (
                    <div className="py-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500">
                      <p className="text-xs">Lista de prioridade de vocabulário vazia.</p>
                      <p className="text-[10px] text-slate-650 mt-1 max-w-xs mx-auto">Conforme você estuda e consulta palavras recorrentemente, elas se fixarão aqui ordenadas automaticamente para revisão acelerada.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {priorityWords.map((wordObj) => {
                        const countRank = wordObj.count;
                        // Determine visual threat level based on annotation retry count
                        const isHighPriority = countRank >= 3 || wordObj.manualPriority;

                        return (
                          <div
                            key={wordObj.word}
                            className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                              wordObj.isMastered
                                ? "bg-slate-900/40 border-slate-800 text-slate-500 opacity-70"
                                : isHighPriority
                                ? "bg-amber-950/10 border-amber-500/30 text-amber-100 shadow-sm shadow-amber-500/5 hover:border-amber-500/50"
                                : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  onClick={() => handleWordLookup(wordObj.word)}
                                  className="text-[15px] font-extrabold capitalize cursor-pointer hover:underline text-slate-100"
                                >
                                  {wordObj.word}
                                </span>
                                
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  wordObj.isMastered
                                    ? "bg-slate-800 text-slate-500"
                                    : isHighPriority
                                    ? "bg-amber-500 text-slate-950"
                                    : "bg-slate-800 text-slate-400"
                                }`}>
                                  Consultas: {wordObj.count}x
                                </span>

                                {isHighPriority && !wordObj.isMastered && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-red-650 text-white rounded tracking-wide">
                                    Prioritário (Não Entendido)
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-xs mt-1 truncate pl-0.5 text-slate-405 font-medium">
                                <span className="text-slate-500">Significa:</span> {wordObj.translationInfo.translation}
                              </p>
                              <p className="text-[10px] text-slate-500 pl-0.5 italic mt-0.5 truncate">
                                "{wordObj.translationInfo.definition}"
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleWordMastery(wordObj.word)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition ${
                                  wordObj.isMastered
                                    ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                }`}
                                title={wordObj.isMastered ? "Reverter domínio" : "Marcar como dominado"}
                              >
                                {wordObj.isMastered ? "✓ Aprendido" : "✓ Aprendi"}
                              </button>

                              <button
                                onClick={() => toggleManualPriority(wordObj.word)}
                                className={`p-1.5 rounded-lg border transition ${
                                  wordObj.manualPriority
                                    ? "bg-amber-955 border-amber-500 text-amber-500"
                                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                                }`}
                                title="Destacar como Prioridade"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => deleteSavedWord(wordObj.word)}
                                className="p-1.5 bg-slate-900 hover:bg-red-950/25 border border-slate-800 text-slate-500 hover:text-red-400 rounded-lg transition"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                    </>
                  ) : (
                    <>
                      {/* Word Bank Filters Panel */}
                      <div className="space-y-2 mb-4">
                        <div className="flex gap-2">
                          {/* Search Term Input */}
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={wordBankSearch}
                              onChange={(e) => setWordBankSearch(e.target.value)}
                              placeholder="Pesquisar no banco..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                            />
                            {wordBankSearch && (
                              <button
                                onClick={() => setWordBankSearch("")}
                                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-white cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* CEFR Level filter select */}
                          <select
                            value={wordBankLevelFilter}
                            onChange={(e) => setWordBankLevelFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-505 cursor-pointer"
                          >
                            <option value="all">Todos Níveis</option>
                            <option value="A1">A1 - Iniciante</option>
                            <option value="A2">A2 - Básico</option>
                            <option value="B1">B1 - Intermediário</option>
                            <option value="B2">B2 - Autônomo</option>
                            <option value="C1">C1 - Avançado</option>
                            <option value="C2">C2 - Fluente</option>
                          </select>
                        </div>

                        {/* Database size metrics and clear action button */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-950/60 p-2 rounded-xl border border-slate-800/40 px-3">
                          <span className="flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-indigo-400" />
                            <span>Total indexado: {Object.keys(translationCache).length} termos</span>
                          </span>

                          {Object.keys(translationCache).length > 0 && (
                            <button
                              onClick={clearEntireWordBank}
                              className="text-red-500 hover:text-red-400 font-semibold transition cursor-pointer"
                            >
                              Limpar Banco
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter word bank data list */}
                      {(() => {
                        const wordsEntries = Object.entries(translationCache) as [string, any][];
                        const filteredWords = wordsEntries.filter(([key, item]) => {
                          const matchesSearch = 
                            key.includes(wordBankSearch.toLowerCase()) || 
                            item.translation.toLowerCase().includes(wordBankSearch.toLowerCase()) ||
                            item.definition.toLowerCase().includes(wordBankSearch.toLowerCase());
                          
                          const matchesLevel = 
                            wordBankLevelFilter === "all" || 
                            item.level === wordBankLevelFilter;
                          
                          return matchesSearch && matchesLevel;
                        });

                        if (filteredWords.length === 0) {
                          return (
                            <div className="py-12 border border-dashed border-slate-800 rounded-3xl text-center text-slate-500">
                              <p className="text-xs">Nenhuma palavra encontrada no banco.</p>
                              <p className="text-[10px] text-slate-600 mt-1">Tente ajustar o termo pesquisado ou filtre para outro nível.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {filteredWords.map(([key, item]) => {
                              // Check if this term is already defined in priority list
                              const isPrioritized = priorityWords.some((pw) => pw.word.toLowerCase() === key);

                              return (
                                <div
                                  key={key}
                                  className="p-3.5 bg-slate-950/60 border border-slate-805 hover:border-slate-700 rounded-2xl transition flex items-center justify-between"
                                >
                                  <div className="flex-1 min-w-0 pr-3 font-sans">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        onClick={() => handleWordLookup(item.word)}
                                        className="text-[14px] font-extrabold capitalize cursor-pointer hover:underline text-white flex items-center gap-1.5"
                                        title="Clique para carregar no tradutor principal"
                                      >
                                        {item.word}
                                      </span>
                                      
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-900/30 rounded uppercase font-mono">
                                        {item.level || "A1"}
                                      </span>

                                      {isPrioritized && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/10 text-amber-400 rounded flex items-center gap-0.5 animate-pulse">
                                          ★ Prioritária
                                        </span>
                                      )}
                                    </div>
                                    
                                    <p className="text-xs text-slate-350 mt-1 font-semibold">
                                      {item.translation}
                                    </p>
                                    
                                    <p className="text-[10px] text-slate-500 font-mono italic mt-0.5 capitalize">
                                      {item.partOfSpeech}
                                    </p>
                                  </div>

                                  {/* Quick Actions Panel */}
                                  <div className="flex items-center gap-1">
                                    {/* Promoted star button indicator */}
                                    {!isPrioritized && (
                                      <button
                                        onClick={() => incrementWordCounter(item.word.toLowerCase(), item)}
                                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                                        title="Adicionar às Anotações Prioritárias"
                                      >
                                        <Star className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Audio trigger button */}
                                    <button
                                      onClick={() => speakTextAloud(item.word)}
                                      className="p-1.5 bg-slate-900 hover:bg-slate-805 border border-slate-800 text-slate-400 hover:text-sky-450 rounded-lg transition cursor-pointer"
                                      title="Ouvir pronúncia"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete button option */}
                                    <button
                                      onClick={() => deleteFromWordBank(item.word)}
                                      className="p-1.5 bg-slate-900 hover:bg-red-950/20 border border-slate-800 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                                      title="Excluir do Banco de Palavras"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              )}

              {rightTab === "flashcards" && (
                <motion.div
                  key="flashcards"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col p-4 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revisão SRS (Método Leitner)</h3>
                      <p className="text-[10px] text-slate-500">Memorização espaçada das palavras mais difíceis</p>
                    </div>

                    <button
                      onClick={handleResetFlashcardsStats}
                      className="text-[10px] text-slate-400 font-semibold hover:text-white transition"
                    >
                      Zerar Caixas
                    </button>
                  </div>

                  {flashcards.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center py-20 px-4 border border-dashed border-slate-800 rounded-3xl text-center">
                      <Layers className="w-10 h-10 text-slate-650 mb-3" />
                      <p className="text-xs text-slate-400 font-bold">Sem Flashcards gerados ainda.</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                        Ao consultar palavras recorrentes, o aplicativo as adicionará aqui. Ou adicione todos os flashcards do seu vocabulário clicando abaixo.
                      </p>
                      <button
                        onClick={handleGenerateAllFlashcards}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                      >
                        Gerar a Partir do Meu Vocabulário
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Leitner boxes progression indicator */}
                      <div className="grid grid-cols-5 gap-1 pb-1">
                        {[1, 2, 3, 4, 5].map((box) => {
                          const countInBox = flashcards.filter((fc) => fc.box === box).length;
                          return (
                            <div
                              key={box}
                              className={`p-1 text-center rounded-lg border ${
                                box === flashcards[currentFlashcardIndex]?.box
                                  ? "bg-indigo-950 border-indigo-500 text-white font-bold"
                                  : "bg-slate-950 border-slate-850 text-slate-400"
                              }`}
                            >
                              <span className="block text-[8px] uppercase tracking-wider text-slate-500">C{box}</span>
                              <span className="text-[10px]">{countInBox} card{countInBox !== 1 ? "s" : ""}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Active Flashcard flip component */}
                      <div className="relative min-h-[220px] rounded-3xl border border-slate-850 p-6 bg-slate-950 flex flex-col justify-between overflow-hidden shadow-lg">
                        {/* Top progress metadata */}
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2 flex-shrink-0 text-[10px] text-slate-505 font-mono">
                          <span>
                            CARD {currentFlashcardIndex + 1} DE {flashcards.length}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded font-bold">
                            CAIXA {flashcards[currentFlashcardIndex]?.box} / 5
                          </span>
                        </div>

                        {/* Mid Front / Back contents */}
                        <div className="my-6 text-center flex-1 flex flex-col justify-center">
                          {!revealFlashcardAnswer ? (
                            <div className="space-y-2">
                              <h3 className="text-3xl font-black tracking-tight text-white capitalize">
                                {flashcards[currentFlashcardIndex]?.word}
                              </h3>
                              <p className="text-xs text-slate-400 font-mono italic">
                                {flashcards[currentFlashcardIndex]?.translationInfo.phonetic}
                              </p>
                              <p className="text-[11px] text-slate-500 italic max-w-sm mx-auto mt-2.5">
                                "{flashcards[currentFlashcardIndex]?.translationInfo.definition}"
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3 animation-fade-in">
                              <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 font-bold uppercase rounded">
                                Respostas Corretas
                              </span>
                              <h3 className="text-2xl font-black text-white capitalize mt-1">
                                {flashcards[currentFlashcardIndex]?.translationInfo.translation}
                              </h3>
                              
                              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                                {flashcards[currentFlashcardIndex]?.translationInfo.explanation}
                              </p>

                              <div className="p-2.5 bg-slate-900 rounded-xl max-w-sm mx-auto text-left border border-slate-800">
                                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-550">Exemplo Didático</p>
                                <p className="text-xs text-slate-100 font-semibold italic mt-0.5">
                                  {flashcards[currentFlashcardIndex]?.translationInfo.examples[0]?.en}
                                </p>
                                <p className="text-xs text-slate-450 mt-0.5">
                                  {flashcards[currentFlashcardIndex]?.translationInfo.examples[0]?.pt}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Speech trigger button */}
                        <div className="absolute right-4 bottom-4">
                          <button
                            onClick={() => speakTextAloud(flashcards[currentFlashcardIndex]?.word)}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg transition border border-slate-850"
                            title="Ouvir palavra"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Card flip manual interactions */}
                        <div className="flex-shrink-0 pt-2 border-t border-slate-900 flex justify-center">
                          {!revealFlashcardAnswer ? (
                            <button
                              onClick={() => setRevealFlashcardAnswer(true)}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition duration-150"
                            >
                              Revelar Tradução e Exercício
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-3 w-full">
                              <button
                                onClick={() => handleFlashcardRating(false)}
                                className="py-2.5 bg-red-600/10 hover:bg-red-650/20 text-red-400 border border-red-500/25 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                              >
                                Errei / Retornar Caixa 1
                              </button>
                              <button
                                onClick={() => handleFlashcardRating(true)}
                                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                              >
                                Acertei / Avançar Caixa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card individual scores info */}
                      <p className="text-[10px] text-slate-500 text-center italic">
                        Histórico desse card: {flashcards[currentFlashcardIndex]?.correctCount} acertos, {flashcards[currentFlashcardIndex]?.incorrectCount} erros de memorização.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {rightTab === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col p-4 overflow-y-auto"
                >
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Relatório de Evolução Acadêmica</h3>
                      <p className="text-xs text-slate-400">Dados gerados localmente e atualizados em tempo real.</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-widest">Nível Estimado</span>
                      <span className="text-lg font-black bg-gradient-to-r from-sky-450 to-indigo-400 bg-clip-text text-transparent uppercase font-mono">
                        {totalTranslations > 10 ? "B1 • Intermediate" : totalTranslations > 4 ? "A2 • Elementary" : "A1 • Beginner"}
                      </span>
                    </div>
                  </div>

                  {/* Top Stats Grid counters */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Vocabulário Geral</span>
                      <strong className="block text-2xl text-slate-100 font-extrabold mt-1">{totalTranslations}</strong>
                      <span className="text-[9px] text-emerald-400 font-semibold">{masteredCount} dominados</span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Taxa de Memorização</span>
                      <strong className="block text-2xl text-slate-100 font-extrabold mt-1">
                        {flashcardAccuracyRate}%
                      </strong>
                      <span className="text-[9px] text-slate-400 font-semibold">{flashcardTotalReviews} repetições</span>
                    </div>
                  </div>

                  {/* Handwritten sketches vs AI notes comparison indicator card */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 mb-4 text-xs">
                    <h4 className="font-bold text-slate-350 tracking-wide uppercase text-[10px] mb-3">Atividades Diárias Recentes</h4>

                    <div className="space-y-3.5">
                      {activityMetrics.slice(-4).map((metric) => {
                        const totalActivityPoints = metric.translatedCount + metric.drawCount + metric.flashcardsPracticed;

                        return (
                          <div key={metric.date} className="space-y-1.5">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="font-semibold flex items-center gap-1.5 capitalize font-mono text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(metric.date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                              </span>
                              <span className="text-slate-400 font-semibold">{totalActivityPoints} interações • {Math.round(metric.activeSeconds / 60)}m</span>
                            </div>

                            {/* Multi-layered custom responsive CSS progress bars mapping actions in the day */}
                            <div className="relative h-2.5 w-full bg-slate-900 rounded-lg overflow-hidden flex gap-0.5">
                              {metric.translatedCount > 0 && (
                                <div
                                  style={{ width: `${Math.max(15, (metric.translatedCount / Math.max(1, totalActivityPoints)) * 100)}%` }}
                                  className="h-full bg-emerald-500 hover:opacity-90"
                                  title={`Análise de Termos: ${metric.translatedCount}`}
                                />
                              )}
                              {metric.drawCount > 0 && (
                                <div
                                  style={{ width: `${Math.max(15, (metric.drawCount / Math.max(1, totalActivityPoints)) * 100)}%` }}
                                  className="h-full bg-amber-500 hover:opacity-90"
                                  title={`Desenhos e Caneta: ${metric.drawCount}`}
                                />
                              )}
                              {metric.flashcardsPracticed > 0 && (
                                <div
                                  style={{ width: `${Math.max(15, (metric.flashcardsPracticed / Math.max(1, totalActivityPoints)) * 100)}%` }}
                                  className="h-full bg-indigo-500 hover:opacity-90"
                                  title={`Prática Flashcard: ${metric.flashcardsPracticed}`}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-900 justify-center text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-emerald-500" />
                        <span>Traduções</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-amber-500" />
                        <span>Esboço Caneta</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-indigo-500" />
                        <span>Flashcard SRS</span>
                      </div>
                    </div>
                  </div>

                  {/* CEFR Learning profile assessment analysis card */}
                  <div className="bg-gradient-to-r from-sky-950/20 to-indigo-950/20 p-4 rounded-2xl border border-sky-900/10 text-xs text-sky-400">
                    <h4 className="font-bold text-sky-300 mb-1 flex items-center gap-1.5 text-sm">
                      <Award className="w-4 h-4" />
                      Avaliação de Dificuldades Ativa
                    </h4>
                    
                    {currentStruggles.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-slate-300">
                          Você tem <strong>{currentStruggles.length} termos</strong> em alto risco de esquecimento (palavras consultadas mais de uma vez).
                        </p>
                        <p className="text-slate-400 leading-relaxed mt-1">
                          Pratique o baralho de <strong>Flashcards SRS</strong> para forçar a memorização ativa e transferir estes registros da memória de curto prazo para a memória de longo prazo.
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-300 leading-relaxed">
                        Nenhum bloqueio gramatical de alta frequência detectado ainda. Continue traduzindo termos difíceis nos artigos e vídeos de estudo para calibrar os diagnósticos automatizados.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {rightTab === "challenge" && (
                <motion.div
                  key="challenge"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col p-4 overflow-y-auto"
                >
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <BrainCircuit className="w-4 h-4 text-indigo-400" />
                        Estudo Invertido
                      </h3>
                      <p className="text-xs text-slate-400">Significado em PT-BR primeiro, termo inglês depois!</p>
                    </div>
                  </div>

                  {challengeStep === "select" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-2">
                        <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                          No Estudo Invertido (Active Recall), a IA te apresenta a explicação detalhada do conceito em Português sem revelar a palavra original. Seu objetivo é tentar lembrar ou adivinhar o termo em Inglês, e só então revelar!
                        </p>
                      </div>

                      {/* Manual word selection form */}
                      <div className="p-4 bg-slate-950 rounded-2xl border border-indigo-950 space-y-3 shadow-md">
                        <h4 className="text-xs font-bold text-slate-250">Digite uma palavra para criar o desafio:</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customChallengeInput}
                            onChange={(e) => setCustomChallengeInput(e.target.value)}
                            placeholder="Ex: reluctance, masterpiece, empathy..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition"
                          />
                          <button
                            onClick={() => {
                              if (customChallengeInput.trim()) {
                                startWordChallenge(customChallengeInput);
                              }
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            Criar Desafio <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Suggested keywords list */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Seu Banco de Palavras</h4>
                          <button
                            onClick={handleRandomChallenge}
                            className="bg-slate-950 hover:bg-slate-850 text-indigo-400 text-xs py-1 px-3 rounded-lg border border-slate-800 flex items-center gap-1 transition cursor-pointer"
                          >
                            🎲 Sorteio Rápido
                          </button>
                        </div>

                        {priorityWords.length === 0 ? (
                          <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-850 rounded-2xl">
                            <p className="text-xs text-slate-500">Nenhuma palavra salva no seu cadastro ainda.</p>
                            <p className="text-[10px] text-slate-600 mt-1">Clique em palavras nos artigos ou vídeos para adicioná-las.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                            {priorityWords.slice(0, 12).map((pw) => (
                              <button
                                key={pw.word}
                                onClick={() => startWordChallenge(pw.word)}
                                className="p-2.5 bg-slate-950 border border-slate-855 hover:border-slate-700 text-slate-350 rounded-xl text-left transition flex justify-between items-center text-xs truncate font-medium cursor-pointer"
                              >
                                <span className="capitalize truncate pr-2">{pw.word}</span>
                                <span className="text-[9px] text-indigo-400 font-mono font-bold flex-shrink-0 bg-indigo-950/40 px-1 py-0.5 rounded">
                                  {pw.count}x
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {challengeStep === "explaining" && (
                    <div className="space-y-4">
                      {challengeLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mb-3" />
                          <p className="text-xs font-bold text-slate-300">Desvendando significado...</p>
                          <p className="text-[10px] text-slate-550 mt-1 max-w-xs text-center">IA Gemini organizando explicação didática em português (BR)</p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-2xl border border-slate-850 p-5 bg-slate-950 space-y-4 shadow-lg">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2 text-[10px] text-slate-500 font-mono">
                              <span className="uppercase tracking-wider font-bold text-indigo-400">Recall Ativo</span>
                              <span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 rounded uppercase font-bold">
                                {challengeTranslation?.level || "B1"} • {challengeTranslation?.partOfSpeech || "Vocab"}
                              </span>
                            </div>

                            <div className="space-y-3">
                              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider block font-mono">Explicação da Palavra (Significado):</span>
                              <blockquote className="bg-indigo-950/10 border-l-4 border-indigo-500 p-4 rounded-r-xl text-left text-xs leading-relaxed text-slate-200 font-medium">
                                "{challengeTranslation?.explanation}"
                              </blockquote>
                            </div>

                            <div className="flex justify-center gap-2.5 py-2.5 border-t border-slate-900/60">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="w-2.5 h-2.5 rounded-full bg-slate-850 animate-pulse" />
                              ))}
                            </div>
                          </div>

                          {/* Interactive Guess Checker */}
                          <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                            <label className="block text-xs font-bold text-slate-400">
                              Sabe qual é a palavra em inglês? Teste seu palpite:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={challengeUserGuess}
                                onChange={(e) => {
                                  setChallengeUserGuess(e.target.value);
                                  setChallengeFeedback(null);
                                }}
                                placeholder="Insira o termo em inglês..."
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                              />
                              <button
                                onClick={() => {
                                  if (challengeUserGuess.toLowerCase().trim() === challengeWord.toLowerCase().trim()) {
                                    setChallengeFeedback("correct");
                                  } else {
                                    setChallengeFeedback("incorrect");
                                  }
                                }}
                                className="px-4 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-755 font-semibold text-xs rounded-xl transition cursor-pointer"
                              >
                                Validar
                              </button>
                            </div>

                            {challengeFeedback === "correct" && (
                              <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-bold text-[11px] rounded-lg">
                                ✓ Excelente! Você desvendou! A palavra é "{challengeWord}". Desça e revele para estudar a tradução e exemplos!
                              </div>
                            )}

                            {challengeFeedback === "incorrect" && (
                              <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 font-bold text-[11px] rounded-lg">
                                ✗ Ainda não é essa. Tente outra palavra ou revele o resultado abaixo.
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => {
                                setChallengeStep("select");
                                setChallengeFeedback(null);
                                setChallengeUserGuess("");
                              }}
                              className="py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-semibold text-xs rounded-xl border border-slate-850 transition cursor-pointer"
                            >
                              Voltar
                            </button>
                            <button
                              onClick={() => setChallengeStep("revealed")}
                              className="py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              Revelar Palavra & Tradução <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {challengeStep === "revealed" && challengeTranslation && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-505/20 p-5 bg-slate-950 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 font-bold uppercase rounded-md border border-emerald-900/30">
                            desvendada
                          </span>
                        </div>

                        <div className="space-y-3.5 text-center">
                          <h3 className="text-3xl font-black tracking-tight text-white capitalize flex items-center justify-center gap-2">
                            {challengeTranslation.word}
                            <button
                              onClick={() => speakTextAloud(challengeTranslation.word)}
                              className="p-1 bg-slate-900 hover:bg-slate-850 text-sky-450 border border-slate-820 rounded transition cursor-pointer"
                              title="Pronunciar"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </h3>

                          <div className="flex justify-center gap-2 text-xs font-mono">
                            <span className="text-slate-450">{challengeTranslation.phonetic}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-500 capitalize">{challengeTranslation.partOfSpeech}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-400 font-bold uppercase">{challengeTranslation.level || "B1"}</span>
                          </div>

                          <div className="p-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-left">
                            <span className="text-[9px] uppercase font-mono text-emerald-400 font-bold block mb-0.5">Tradução Direta</span>
                            <p className="text-sm font-bold text-slate-100">
                              {challengeTranslation.translation}
                            </p>
                          </div>

                          <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-left">
                            <span className="text-[9px] uppercase font-mono text-indigo-400 font-bold block mb-0.5">Definição Acadêmica</span>
                            <p className="text-xs text-slate-300 italic">
                              "{challengeTranslation.definition}"
                            </p>
                          </div>

                          {challengeTranslation.examples && challengeTranslation.examples.length > 0 && (
                            <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-left space-y-2">
                              <span className="text-[9px] uppercase font-mono text-slate-500 font-bold block">Frases de Exemplo</span>
                              {challengeTranslation.examples.slice(0, 2).map((ex, idx) => (
                                <div key={idx} className="text-xs border-b border-slate-900/40 pb-1.5 last:border-0 last:pb-0">
                                  <p className="text-slate-200 font-bold">{ex.en}</p>
                                  <p className="text-slate-450 mt-0.5">{ex.pt}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0 pt-3 border-t border-slate-900 flex flex-col gap-2 mt-4">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const q = challengeWord.trim().toLowerCase();
                                incrementWordCounter(q, challengeTranslation);
                                alert("Salva na lista de memorização.");
                              }}
                              className="py-2 bg-slate-900 hover:bg-slate-850 text-rose-400 hover:text-rose-350 font-bold text-[10px] rounded-xl border border-slate-800 transition cursor-pointer text-center"
                            >
                              Errei / Praticar Mais
                            </button>
                            <button
                              onClick={() => {
                                const q = challengeWord.trim().toLowerCase();
                                incrementWordCounter(q, challengeTranslation);
                                toggleWordMastery(q);
                                alert("Palavra marcada como dominada!");
                              }}
                              className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-xl transition cursor-pointer text-center"
                            >
                              Acertei / Dominado!
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setChallengeStep("select");
                              setChallengeFeedback(null);
                              setChallengeUserGuess("");
                              setCustomChallengeInput("");
                            }}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs rounded-xl border border-slate-705 transition cursor-pointer"
                          >
                            Ir para Próximo Enigma
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Settings Modal Component Overlay */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  Configurações da Conta
                </span>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-450 hover:text-white transition cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Gemini Section */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-350">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      Chave de API do Gemini (Opcional)
                    </span>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Sua chave pessoal para tradução ultra rápida via Google Gemini, armazenada localmente de forma privada de maneira 100% segura.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* OpenRouter Section */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-350">
                      <Key className="w-3.5 h-3.5 text-rose-500" />
                      Chave de API do OpenRouter (Opcional - Contingência)
                    </span>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Chave reserva de contingência utilizada automaticamente caso os serviços do Gemini apresentem limites de cota ou instabilidade.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-850 rounded-xl text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-0.5 flex-shrink-0" />
                  <span>
                    As chaves configuradas acima operam diretamente do seu navegador de forma privada em chamadas cruzadas e seguras.
                  </span>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const cleanGeminiKey = geminiApiKey.trim();
                    const cleanOpenRouterKey = openRouterApiKey.trim();
                    setGeminiApiKey(cleanGeminiKey);
                    setOpenRouterApiKey(cleanOpenRouterKey);
                    localStorage.setItem("english_gemini_api_key", cleanGeminiKey);
                    localStorage.setItem("english_openrouter_api_key", cleanOpenRouterKey);
                    setShowSettingsModal(false);
                    alert("Chaves de API atualizadas com sucesso!");
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Confirmar e Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
