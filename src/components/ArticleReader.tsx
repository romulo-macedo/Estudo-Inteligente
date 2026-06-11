/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, Sparkles, FileText, Upload, PlusCircle, Check, Info } from "lucide-react";
import { PresetArticle } from "../types";

interface ArticleReaderProps {
  onWordLookup: (word: string, context?: string) => void;
  activeLookupWord?: string;
}

const PRESET_ARTICLES: PresetArticle[] = [
  {
    id: "art-1",
    title: "Exploring a Coastal Town",
    level: "Iniciante",
    category: "Viagem & Cultura",
    content: "The small town sits right next to the beautiful blue ocean. Every morning, warm sunlight shines on the houses. People wake up early and walk along the quiet beach. Seafood restaurants open their doors, preparing fresh fish for lunch. Tourists love to take pictures of the old lighthouse. It is a peaceful place to learn English and enjoy nature concurrently."
  },
  {
    id: "art-2",
    title: "The Art of Coffee making",
    level: "Intermediário",
    category: "Culinária & Estilo de Vida",
    content: "Brewing the perfect cup of coffee is both a precise science and a passionate art form. Baristas carefully measure the weight of roasted coffee beans before grinding them. The temperature of the hot water must be perfectly controlled to extract the richest flavors without burning the delicate grinds. If the water is too cold, the coffee tastes sour; if it is boiling hot, the beverage becomes bitter. Taking a slow sip in a cozy atmosphere provides an extraordinary sense of comfort."
  },
  {
    id: "art-3",
    title: "Artificial Intelligence and the Future",
    level: "Avançado",
    category: "Tecnologia & Sociedade",
    content: "The unprecedented acceleration of artificial intelligence has sparked fierce debates among developers, regulators, and philosophers worldwide. Generative language models can now draft complex essays, program sophisticated software, and converse with humanlike fluency. While optimistic futurists anticipate a new era of absolute abundance, skeptics express profound concerns regarding labor displacement, computational biases, and cognitive decay. Establishing ethical frameworks remains a complex challenge for contemporary policy makers."
  }
];

export default function ArticleReader({ onWordLookup, activeLookupWord }: ArticleReaderProps) {
  const [selectedArticleId, setSelectedArticleId] = useState<string>("art-1");
  const [userPastedText, setUserPastedText] = useState("");
  const [customArticles, setCustomArticles] = useState<PresetArticle[]>([]);
  const [activeTab, setActiveTab] = useState<"preset" | "paste">("preset");

  // Get current active article content
  const activeArticle =
    activeTab === "preset"
      ? PRESET_ARTICLES.find((a) => a.id === selectedArticleId)
      : customArticles[customArticles.length - 1];

  const handleImportText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPastedText.trim()) return;

    const newArticle: PresetArticle = {
      id: `custom-${Date.now()}`,
      title: "Artigo Copiado / Personalizado",
      level: "Intermediário",
      category: "Importado",
      content: userPastedText.trim()
    };

    setCustomArticles([newArticle]);
    setUserPastedText("");
    // Switch to actual custom view by setting this tab
    alert("Texto importado com sucesso! Clique em qualquer palavra do texto para carregar a tradução.");
  };

  // Helper to split text into words and parse them as clickable elements
  const renderInteractiveText = (text: string) => {
    if (!text) return null;

    // Split by paragraphs first
    const paragraphs = text.split("\n\n");

    return paragraphs.map((para, paraIdx) => {
      // Split paragraph into words, capturing punctuations separately or within
      const tokens = para.split(/(\s+)/);

      return (
        <p key={paraIdx} className="mb-4 text-justify leading-relaxed text-slate-700 dark:text-slate-300 font-sans text-[15px] sm:text-base">
          {tokens.map((token, tokenIdx) => {
            // If token is just whitespace, render it directly
            if (/^\s+$/.test(token)) {
              return <span key={tokenIdx}>{token}</span>;
            }

            // Extract the core word, removing leading/trailing punctuation
            const cleanWord = token.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"']+|[.,\/#!$%\^&\*;:{}=\-_`~()?"']+$/g, "");
            const hasCleanWord = cleanWord.length > 0;
            const isTargetWord = activeLookupWord?.toLowerCase() === cleanWord.toLowerCase();

            if (hasCleanWord) {
              return (
                <span
                  key={tokenIdx}
                  onClick={() => onWordLookup(cleanWord, para)}
                  className={`inline-block cursor-pointer px-0.5 rounded transition ${
                    isTargetWord
                      ? "bg-amber-300 text-slate-900 border-b-2 border-amber-600 font-semibold"
                      : "hover:bg-indigo-100/80 hover:text-indigo-900 dark:hover:bg-indigo-950/70 dark:hover:text-indigo-200 border-b border-transparent"
                  }`}
                  title="Clique para traduzir com IA e salvar"
                >
                  {token}
                </span>
              );
            }

            return <span key={tokenIdx}>{token}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">Leitura de Artigos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Desenvolva vocabulário e aprenda gramática no contexto.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl mb-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("preset")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
            activeTab === "preset"
              ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Artigos Recomendados
        </button>
        <button
          onClick={() => setActiveTab("paste")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${
            activeTab === "paste"
              ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Colar Meu Texto
        </button>
      </div>

      {/* Custom Paste section */}
      {activeTab === "paste" && !activeArticle && (
        <form onSubmit={handleImportText} className="flex-1 flex flex-col mb-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Cole o artigo ou texto que deseja estudar
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            O aplicativo converterá automaticamente todas as palavras em botões clicáveis de tradução inteligente. Ideal para notícias, e-mails, ou posts de blogs.
          </p>
          <textarea
            placeholder="Cole o texto em inglês aqui (mínimo de 3 palavras)..."
            value={userPastedText}
            onChange={(e) => setUserPastedText(e.target.value)}
            className="flex-1 min-h-[160px] p-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none mb-3"
          />
          <button
            type="submit"
            disabled={userPastedText.trim().split(/\s+/).length < 2}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4.5 h-4.5" />
            Ativar Texto Interativo
          </button>
        </form>
      )}

      {/* Article selectors when Preset is active */}
      {activeTab === "preset" && (
        <div className="flex gap-2 pb-3 overflow-x-auto mb-3 scrollbar-none flex-shrink-0">
          {PRESET_ARTICLES.map((art) => (
            <button
              key={art.id}
              onClick={() => setSelectedArticleId(art.id)}
              className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-left border transition ${
                selectedArticleId === art.id
                  ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-white border-slate-200 hover:bg-slate-100/50 dark:bg-slate-800 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-1.5 justify-between">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  art.level === "Iniciante"
                    ? "bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400"
                    : art.level === "Intermediário"
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                }`}>
                  {art.level}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">{art.category}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5 w-32 truncate">{art.title}</h4>
            </button>
          ))}
        </div>
      )}

      {/* Active Article Viewer */}
      {activeArticle ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800 p-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-4 flex-shrink-0">
            <div>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{activeArticle.category}</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans leading-tight mt-0.5">{activeArticle.title}</h3>
            </div>
            {activeTab === "paste" && (
              <button
                onClick={() => setCustomArticles([])}
                className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1"
              >
                Limpar Texto
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {renderInteractiveText(activeArticle.content)}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Toque em qualquer palavra para ver sua tradução inteligente e salvá-la em suas anotações.</span>
          </div>
        </div>
      ) : activeTab === "preset" ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <p>Nenhum artigo selecionado</p>
        </div>
      ) : null}
    </div>
  );
}
