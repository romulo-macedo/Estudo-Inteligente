/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import Parser from "rss-parser";

dotenv.config();

class FallbackDatabase {
  appState: Record<string, string> = {};
  notebooks: Array<{ id: string; name: string; color: string; createdAt: number; updatedAt: number }> = [];
  notes: Array<{ id: string; notebookId: string; title: string; strokes: string; textNotes: string; createdAt: number; updatedAt: number }> = [];

  constructor() {
    // Seed default notebooks and notes
    const defaultNotebookId = "caderno-principal";
    const now = Date.now();
    this.notebooks.push({
      id: defaultNotebookId,
      name: "Caderno Principal 📘",
      color: "#6366f1",
      createdAt: now,
      updatedAt: now
    });

    this.notes.push({
      id: "nota-ponto-partida",
      notebookId: defaultNotebookId,
      title: "Minha Primeira Aula",
      strokes: "[]",
      textNotes: `📝 Bem-vindo ao seu Caderno Principal!\n\nEste espaço foi criado de forma automática para guardar suas anotações e desenhos.\n\nDicas rápidas:\n- Use a caneta digital (Modo Caneta) para desenhar ou escrever à mão no Blackboard acima.\n- Digite anotações estruturadas abaixo e clique em Salvar!\n- Todos os seus cadernos e anotações agora estão persistidos na memória nativa!`,
      createdAt: now,
      updatedAt: now
    });
  }

  async exec(sql: string): Promise<void> {
    // No-op for CREATE TABLE
    return;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    // Parse the query simply by matching keywords
    if (sql.includes("COUNT(*) as count FROM notebooks")) {
      return { count: this.notebooks.length };
    }
    if (sql.includes("SELECT id FROM notebooks WHERE id = ?")) {
      const id = params[0];
      return this.notebooks.find(n => n.id === id) || null;
    }
    if (sql.includes("SELECT id FROM notes WHERE id = ?")) {
      const id = params[0];
      return this.notes.find(n => n.id === id) || null;
    }
    return null;
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    // 1. INSERT/UPDATE app_state
    if (sql.includes("INSERT INTO app_state")) {
      const key = params[0];
      const val = params[1];
      this.appState[key] = val;
      return;
    }
    // 2. INSERT notebooks
    if (sql.includes("INSERT INTO notebooks")) {
      const [id, name, color, createdAt, updatedAt] = params;
      this.notebooks.push({ id, name, color, createdAt, updatedAt });
      return;
    }
    // 3. UPDATE notebooks (Update notebook name, color, updatedAt)
    if (sql.includes("UPDATE notebooks SET name = ?, color = ?, updatedAt = ? WHERE id = ?")) {
      const [name, color, updatedAt, id] = params;
      const notebook = this.notebooks.find(n => n.id === id);
      if (notebook) {
        notebook.name = name;
        notebook.color = color;
        notebook.updatedAt = updatedAt;
      }
      return;
    }
    // 4. DELETE notebooks
    if (sql.includes("DELETE FROM notebooks WHERE id = ?")) {
      const id = params[0];
      this.notebooks = this.notebooks.filter(n => n.id !== id);
      return;
    }
    // 5. DELETE notes where notebookId = ?
    if (sql.includes("DELETE FROM notes WHERE notebookId = ?")) {
      const notebookId = params[0];
      this.notes = this.notes.filter(n => n.notebookId !== notebookId);
      return;
    }
    // 6. DELETE single note
    if (sql.includes("DELETE FROM notes WHERE id = ?")) {
      const id = params[0];
      this.notes = this.notes.filter(n => n.id !== id);
      return;
    }
    // 7. INSERT notes
    if (sql.includes("INSERT INTO notes")) {
      const [id, notebookId, title, strokes, textNotes, createdAt, updatedAt] = params;
      this.notes.push({ id, notebookId, title, strokes, textNotes, createdAt, updatedAt });
      return;
    }
    // 8. UPDATE notes
    if (sql.includes("UPDATE notes SET title = ?, strokes = ?, textNotes = ?, updatedAt = ? WHERE id = ?")) {
      const [title, strokes, textNotes, updatedAt, id] = params;
      const note = this.notes.find(n => n.id === id);
      if (note) {
        note.title = title;
        note.strokes = strokes;
        note.textNotes = textNotes;
        note.updatedAt = updatedAt;
      }
      return;
    }
    // 9. UPDATE notebook updatedAt
    if (sql.includes("UPDATE notebooks SET updatedAt = ? WHERE id = ?")) {
      const [updatedAt, id] = params;
      const notebook = this.notebooks.find(n => n.id === id);
      if (notebook) {
        notebook.updatedAt = updatedAt;
      }
      return;
    }
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (sql.includes("SELECT key, value FROM app_state")) {
      return Object.entries(this.appState).map(([key, value]) => ({ key, value }));
    }
    if (sql.includes("SELECT * FROM notebooks ORDER BY updatedAt DESC")) {
      return [...this.notebooks].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (sql.includes("SELECT * FROM notes WHERE notebookId = ? ORDER BY updatedAt DESC")) {
      const notebookId = params[0];
      return this.notes
        .filter(n => n.notebookId === notebookId)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return [];
  }
}

let db: any = null;

async function setupDatabase() {
  try {
    console.log("Tentando inicializar banco de dados SQLite nativo...");
    // Dynamic imports to prevent crash if native binaries fail to load
    const { open } = await import("sqlite");
    const sqlite3 = (await import("sqlite3")).default;

    db = await open({
      filename: "./database.sqlite",
      driver: sqlite3.Database
    });

    console.log("Banco de dados SQLite aberto com sucesso em ./database.sqlite");

    // Criar tabelas estruturadas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notebooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        notebookId TEXT NOT NULL,
        title TEXT NOT NULL,
        strokes TEXT NOT NULL,
        textNotes TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
      );
    `);

    // Criar caderno padrão se não houver registros
    const row = await db.get("SELECT COUNT(*) as count FROM notebooks");
    if (row.count === 0) {
      const defaultNotebookId = "caderno-principal";
      const now = Date.now();
      await db.run(
        "INSERT INTO notebooks (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
        [defaultNotebookId, "Caderno Principal 📘", "#6366f1", now, now]
      );

      // Criar nota padrão
      await db.run(
        "INSERT INTO notes (id, notebookId, title, strokes, textNotes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          "nota-ponto-partida",
          defaultNotebookId,
          "Minha Primeira Aula",
          "[]",
          `📝 Bem-vindo ao seu Caderno Principal!\n\nEste espaço foi criado de forma automática para guardar suas anotações e desenhos.\n\nDicas rápidas:\n- Use a caneta digital (Modo Caneta) para desenhar ou escrever à mão no Blackboard acima.\n- Digite anotações estruturadas abaixo e clique em Salvar!\n- Todos os seus cadernos e anotações agora estão persistidos remotamente num banco de dados SQLite nativo de alta integridade!`,
          now,
          now
        ]
      );
      console.log("Caderno principal inicializado com sucesso.");
    }

  } catch (error: any) {
    console.error("Falha ao inicializar o banco de dados SQLite nativo. Ativando o banco de dados de contingência robusto na memória:", error.message);
    db = new FallbackDatabase();
  }
}

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

/**
 * Função de contenção: Realiza a tradução via OpenRouter no modelo do usuário
 */
async function translateWithOpenRouter(word: string, context?: string): Promise<any> {
  const openRouterApiKey = "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";
  const model = "nvidia/nemotron-3-super-120b-a12b:free";
  
  const prompt = `Translate and analyze in detail the following English word or expression for Portuguese speakers learning English: "${word.trim()}".
${context ? `Context where the student found the word: "${context}"` : ""}

You MUST respond ONLY with a raw JSON object containing the translation detail. Do not add any conversational text before or after the JSON. Do not wrap the JSON in markdown formatting (like \`\`\`json).

Required JSON Keys (provide translations in Portuguese where specified):
{
  "word": "${word.trim()}",
  "translation": "direct Portuguese translation",
  "phonetic": "IPA standard or phonetic simulation",
  "partOfSpeech": "English grammar category (noun, verb, etc.)",
  "definition": "simple concise English definition",
  "explanation": "pedagogical Portuguese explanation on how to use it, nuances or slang",
  "level": "A1, A2, B1, B2, C1, or C2 CEFR level",
  "examples": [
    { "en": "Example sentence 1 in English", "pt": "Portuguese translation of sentence 1" },
    { "en": "Example sentence 2 in English", "pt": "Portuguese translation of sentence 2" },
    { "en": "Example sentence 3 in English", "pt": "Portuguese translation of sentence 3" }
  ]
}`;

  console.log(`[OpenRouter] Traduzindo palavra "${word.trim()}" utilizando modelo ${model}...`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ai.studio/build",
      "X-Title": "Interactive Tablet English Learner"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (Status ${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter retornou resposta vazia.");
  }

  let jsonText = content.trim();

  // Strip markdown wraps if present
  if (jsonText.startsWith("```")) {
    const firstLineEnd = jsonText.indexOf("\n");
    const lastBackticks = jsonText.lastIndexOf("```");
    if (firstLineEnd !== -1 && lastBackticks !== -1 && lastBackticks > firstLineEnd) {
      jsonText = jsonText.substring(firstLineEnd + 1, lastBackticks).trim();
    }
  }

  // Find first { and last }
  const startIdx = jsonText.indexOf("{");
  const endIdx = jsonText.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonText = jsonText.substring(startIdx, endIdx + 1);
  }

  const parsed = JSON.parse(jsonText);

  // Validate basic schema to satisfy client expectations
  if (!parsed.word || !parsed.translation) {
    throw new Error("JSON do OpenRouter está incompleto em campos fundamentais.");
  }

  return {
    word: parsed.word || word.trim(),
    translation: parsed.translation,
    phonetic: parsed.phonetic || "/.../",
    partOfSpeech: parsed.partOfSpeech || "word",
    definition: parsed.definition || `No English definition retrieved for '${word.trim()}'`,
    explanation: `${parsed.explanation || "Explicação da palavra."} (Análise realizada via canal secundário de contingência: OpenRouter Nemotron-3)`,
    level: parsed.level || "A1",
    examples: Array.isArray(parsed.examples) && parsed.examples.length >= 1 ? parsed.examples : [
      { en: `Use the word '${word.trim()}' to expand your skills.`, pt: `Use a palavra '${word.trim()}' para expandir suas habilidades.` }
    ]
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Inicializar conexão e tabelas do banco de dados SQLite nativo
  await setupDatabase();

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

    // Se não houver chave do Gemini configurada, tenta o OpenRouter antes do fallback local estático
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      console.warn("GEMINI_API_KEY não foi configurada. Acionando canal seguro do OpenRouter.");
      try {
        const openRouterResponse = await translateWithOpenRouter(word, context);
        return res.json(openRouterResponse);
      } catch (orErr: any) {
        console.error("OpenRouter também falhou para chave pendente:", orErr.message);

        // Se OpenRouter falhar também, recorremos ao dicionário estático
        if (FALLBACK_DICTIONARY[cleanWord]) {
          return res.json(FALLBACK_DICTIONARY[cleanWord]);
        }

        const syntheticTranslation = {
          word: word.trim(),
          translation: `${word.trim()}`,
          phonetic: "/.../",
          partOfSpeech: "Word (Modo de Emergência)",
          definition: `The word '${word.trim()}' was processed. Configure your Gemini API Key in the settings gear icon (⚙️) or verify the API integrity.`,
          explanation: `Significado de '${word.trim()}'. Ative a sua própria Chave de API do Google Gemini clicando no ícone de engrenagem (⚙️) no canto superior direito ou verifique as configurações locais.`,
          examples: [
            { en: `How do you use the word '${word.trim()}'?`, pt: `Como você usa a palavra '${word.trim()}'?` },
            { en: `Please insert your Google Gemini API Key in the settings gear.`, pt: `Por favor, insira sua Chave de API do Google Gemini na engrenagem de configurações.` },
            { en: `Practice makes perfect. Keep studying!`, pt: `A prática leva à perfeição. Continue estudando!` }
          ],
          level: "A1"
        };
        return res.json(syntheticTranslation);
      }
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
      console.warn("[Translation] Erro na API do Gemini (acionando contingência):", err.message || err);
      console.warn(`[Translation] Tentando contingência com OpenRouter para a palavra "${word}" após falha no Gemini/API...`);

      try {
        const openRouterResponse = await translateWithOpenRouter(word, context);
        return res.json(openRouterResponse);
      } catch (orErr: any) {
        console.warn("[Translation] OpenRouter também falhou após erro do Gemini:", orErr.message);

        // Se até o OpenRouter falhar, voltamos para o dicionário estático ou contingência padrão
        if (FALLBACK_DICTIONARY[cleanWord]) {
          return res.json(FALLBACK_DICTIONARY[cleanWord]);
        }

        const isOverloadedOrUnavailable = 
          err.message?.includes("503") || 
          err.message?.includes("high demand") || 
          err.message?.includes("UNAVAILABLE") ||
          err.status === 503;

        const contingencyExplanation = isOverloadedOrUnavailable
          ? `Nota de Operação: Ambos tradutores de IA (Gemini e OpenRouter) estão temporariamente sob altíssima demanda ou sem chaves integradas. Geramos esta análise local para a palavra "${word.trim()}".`
          : `Nota de Operação: Ocorreu uma indisponibilidade geral com os serviços inteligentes (Google e OpenRouter). Ativamos a contingência de segurança local para "${word.trim()}".`;

        const contingencyPayload = {
          word: word.trim(),
          translation: `${word.trim()}`,
          phonetic: "/.../",
          partOfSpeech: "Palavra (Contingência)",
          definition: `Contingency dictionary entry generated for '${word.trim()}' due to a temporary unavailable state on both primary and fallback model servers.`,
          explanation: `${contingencyExplanation} Você ainda pode marcá-la como Prioritária do mesmo jeito e testar novamente em instantes.`,
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
              en: `The AI services will be back shortly to analyze '${word.trim()}'.`, 
              pt: `Os serviços de inteligência artificial voltarão em breve para analisar '${word.trim()}'.` 
            }
          ],
          level: "A1"
        };

        return res.json(contingencyPayload);
      }
    }
  });

  // --- ENDPOINTS SQLite para Cadernos, Anotações e Estados Gerais do App ---

  // 1. Obter o estado global do app (translationCache, priorityWords, flashcards, activityMetrics)
  app.get("/api/app-state", async (req, res) => {
    try {
      const rows = await db.all("SELECT key, value FROM app_state");
      const state: Record<string, any> = {};
      rows.forEach((row: any) => {
        try {
          state[row.key] = JSON.parse(row.value);
        } catch (e) {
          state[row.key] = row.value;
        }
      });
      res.json(state);
    } catch (e: any) {
      console.error("Erro ao carregar app-state do SQLite:", e);
      res.status(500).json({ error: "Erro ao carregar estados do banco de dados: " + e.message });
    }
  });

  // 2. Salvar o estado global do app
  app.post("/api/app-state", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Parâmetro 'key' é obrigatório." });
      }
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      await db.run(
        "INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, stringValue]
      );
      res.json({ success: true, key });
    } catch (e: any) {
      console.error("Erro ao salvar app-state no SQLite:", e);
      res.status(500).json({ error: "Erro ao salvar estado no banco de dados: " + e.message });
    }
  });

  // 3. Listar Cadernos
  app.get("/api/notebooks", async (req, res) => {
    try {
      const notebooks = await db.all("SELECT * FROM notebooks ORDER BY updatedAt DESC");
      res.json(notebooks);
    } catch (e: any) {
      console.error("Erro ao listar cadernos no SQLite:", e);
      res.status(500).json({ error: "Erro ao listar cadernos: " + e.message });
    }
  });

  // 4. Criar ou Atualizar Caderno
  app.post("/api/notebooks", async (req, res) => {
    try {
      const { id, name, color } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: "Parâmetros 'id' e 'name' são obrigatórios." });
      }
      const existing = await db.get("SELECT id FROM notebooks WHERE id = ?", [id]);
      const now = Date.now();
      if (existing) {
        await db.run(
          "UPDATE notebooks SET name = ?, color = ?, updatedAt = ? WHERE id = ?",
          [name, color || "#6366f1", now, id]
        );
      } else {
        await db.run(
          "INSERT INTO notebooks (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
          [id, name, color || "#6366f1", now, now]
        );
      }
      res.json({ success: true, id });
    } catch (e: any) {
      console.error("Erro ao salvar caderno no SQLite:", e);
      res.status(500).json({ error: "Erro ao salvar caderno: " + e.message });
    }
  });

  // 5. Excluir Caderno e todas as suas notas (CASCADE)
  app.delete("/api/notebooks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.run("DELETE FROM notebooks WHERE id = ?", [id]);
      await db.run("DELETE FROM notes WHERE notebookId = ?", [id]);
      res.json({ success: true, id });
    } catch (e: any) {
      console.error("Erro ao remover caderno no SQLite:", e);
      res.status(500).json({ error: "Erro ao remover caderno: " + e.message });
    }
  });

  // 6. Listar Notas de um Caderno específico
  app.get("/api/notebooks/:notebookId/notes", async (req, res) => {
    try {
      const { notebookId } = req.params;
      const notes = await db.all("SELECT * FROM notes WHERE notebookId = ? ORDER BY updatedAt DESC", [notebookId]);
      res.json(notes);
    } catch (e: any) {
      console.error("Erro ao carregar notas do caderno no SQLite:", e);
      res.status(500).json({ error: "Erro ao buscar notas do caderno: " + e.message });
    }
  });

  // 7. Criar ou Atualizar Nota (Contendo strokes de desenho e textNotes de digitação)
  app.post("/api/notes", async (req, res) => {
    try {
      const { id, notebookId, title, strokes, textNotes } = req.body;
      if (!id || !notebookId || !title) {
        return res.status(400).json({ error: "Campos 'id', 'notebookId' e 'title' são obrigatórios." });
      }
      const existing = await db.get("SELECT id FROM notes WHERE id = ?", [id]);
      const now = Date.now();
      const strStrokes = typeof strokes === "string" ? strokes : JSON.stringify(strokes || []);
      const valTextNotes = textNotes || "";

      if (existing) {
        await db.run(
          "UPDATE notes SET title = ?, strokes = ?, textNotes = ?, updatedAt = ? WHERE id = ?",
          [title, strStrokes, valTextNotes, now, id]
        );
        await db.run("UPDATE notebooks SET updatedAt = ? WHERE id = ?", [now, notebookId]);
      } else {
        await db.run(
          "INSERT INTO notes (id, notebookId, title, strokes, textNotes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, notebookId, title, strStrokes, valTextNotes, now, now]
        );
        await db.run("UPDATE notebooks SET updatedAt = ? WHERE id = ?", [now, notebookId]);
      }
      res.json({ success: true, id });
    } catch (e: any) {
      console.error("Erro ao salvar nota no SQLite:", e);
      res.status(500).json({ error: "Erro ao salvar nota: " + e.message });
    }
  });

  // 8. Excluir Nota específica
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.run("DELETE FROM notes WHERE id = ?", [id]);
      res.json({ success: true, id });
    } catch (e: any) {
      console.error("Erro ao excluir nota no SQLite:", e);
      res.status(550).json({ error: "Erro ao excluir nota: " + e.message });
    }
  });

  // --- ENDPOINT PARA BUSCAR NOTÍCIAS DE FEEDS RSS ---
  const parser = new Parser();
  const STANDARD_FEEDS = {
    bbc: { name: "BBC News World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    nyt: { name: "New York Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
    npr: { name: "NPR World News", url: "https://feeds.npr.org/1004/rss.xml" },
    techcrunch: { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    nasa: { name: "NASA Breaking News", url: "https://www.nasa.gov/news-release/feed/" }
  };

  function stripHtml(html: string): string {
    if (!html) return "";
    let clean = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
    clean = clean.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "");
    clean = clean.replace(/<[^>]*>/g, " ");
    clean = clean
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&ndash;/g, "-")
      .replace(/&mdash;/g, "-");
    return clean.replace(/\s+/g, " ").trim();
  }

  async function fetchRealFullArticle(url: string, fallbackText: string): Promise<string> {
    if (!url || url === "#" || !url.startsWith("http")) {
      return fallbackText;
    }
    console.log(`[RSS] Obtendo notícia real diretamente de: ${url}`);
    try {
      // Robust AbortController timeout compatible across all Node.js environments
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`[RSS] Erro HTTP ${response.status} ao obter ${url}. Usando fallback.`);
        return fallbackText;
      }
      
      const html = await response.text();
      
      // Simple parse of article paragraphs
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      const paragraphs: string[] = [];
      let match;
      
      while ((match = pRegex.exec(html)) !== null) {
        const rawP = match[1];
        const cleanP = stripHtml(rawP).trim();
        
        // Skip noise paragraphs
        if (cleanP.length < 40) continue;
        if (cleanP.toLowerCase().includes("cookie") ||
            cleanP.toLowerCase().includes("privacy policy") ||
            cleanP.toLowerCase().includes("all rights reserved") ||
            cleanP.toLowerCase().includes("terms and conditions") ||
            cleanP.toLowerCase().includes("newsletter") ||
            cleanP.toLowerCase().includes("subscribe") ||
            cleanP.toLowerCase().includes("advertisement") ||
            cleanP.toLowerCase().includes("follow us on")) {
          continue;
        }
        
        paragraphs.push(cleanP);
      }
      
      // Filter duplicate paragraphs just in case
      const uniqueParagraphs = paragraphs.filter((v, i, a) => a.indexOf(v) === i);
      
      if (uniqueParagraphs.length >= 2) {
        console.log(`[RSS] Extraído com sucesso ${uniqueParagraphs.length} parágrafos de notícia real.`);
        return uniqueParagraphs.join("\n\n");
      }
      
      console.warn("[RSS] Poucos parágrafos reais encontrados. Usando conteúdo do Feed RSS.");
      return fallbackText;
    } catch (err: any) {
      console.warn("[RSS] Falha ao extrair artigo real do link:", err.message);
      return fallbackText;
    }
  }

  app.get("/api/rss-news", async (req, res) => {
    try {
      const feedKey = (req.query.feed as string) || "bbc";
      let feedUrl = "";
      let feedName = "News Feed";

      if (feedKey === "custom") {
        feedUrl = req.query.url as string;
        feedName = "Custom Feed";
      } else {
        const feedConfig = STANDARD_FEEDS[feedKey as keyof typeof STANDARD_FEEDS];
        if (feedConfig) {
          feedUrl = feedConfig.url;
          feedName = feedConfig.name;
        } else {
          feedUrl = STANDARD_FEEDS.bbc.url;
          feedName = STANDARD_FEEDS.bbc.name;
        }
      }

      if (!feedUrl) {
         return res.status(400).json({ error: "Nenhuma URL de feed RSS fornecida." });
      }

      const feed = await parser.parseURL(feedUrl);
      
      const items = feed.items
        .filter(item => item.title && item.title.trim().length > 0)
        .map(item => {
          const rawContent = item['content:encoded'] || item.content || item.contentSnippet || item.summary || "";
          const cleanContent = stripHtml(rawContent);
          return {
            id: item.guid || item.link || String(Math.random()),
            title: item.title!.trim(),
            link: item.link || "#",
            pubDate: item.pubDate || item.isoDate || "",
            creator: item.creator || item.author || feed.title || feedName,
            content: cleanContent,
            fullContent: cleanContent
          };
        });

      res.json({
        title: feed.title || feedName,
        description: feed.description || "",
        items
      });
    } catch (error: any) {
      console.warn("[RSS] Erro ao obter/processar feed RSS:", error.message);
      res.status(500).json({ error: "Falha ao obter ou ler o feed de notícias RSS: " + error.message });
    }
  });

  app.get("/api/rss-enrich", async (req, res) => {
    try {
      const { title, summary, link } = req.query;
      const titleStr = typeof title === "string" ? title.trim() : "Untitled News";
      const cleanSummary = typeof summary === "string" ? summary.trim() : "";
      const articleLink = typeof link === "string" ? link.trim() : "";

      let fullText = "";
      try {
        if (articleLink && articleLink !== "#" && articleLink.startsWith("http")) {
          fullText = await fetchRealFullArticle(articleLink, cleanSummary);
        } else {
          fullText = cleanSummary;
        }
      } catch (scrapingErr: any) {
        console.warn("[RSS] Erro interno de raspagem, usando summary:", scrapingErr.message);
        fullText = cleanSummary;
      }

      if (!fullText || fullText.trim().length === 0) {
        fullText = cleanSummary || "No detailed paragraphs could be retrieved for this article. Please read the original webpage source.";
      }

      res.json({
        title: titleStr,
        content: fullText
      });
    } catch (e: any) {
      console.warn("[RSS] Falha silenciosa no enrich de notícia, retornando fallback:", e.message);
      res.json({
        title: "News Update",
        content: "No further content could be loaded at this moment."
      });
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
