/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Youtube, Search, ArrowRight, CheckCircle, Info, Clock, RotateCcw } from "lucide-react";

interface YouTubeViewerProps {
  onWordLookup: (word: string) => void;
}

export default function YouTubeViewer({ onWordLookup }: YouTubeViewerProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState("v0f1WvF8Rts"); // Default popular video for English learners
  const [searchWord, setSearchWord] = useState("");

  const [playerSize, setPlayerSize] = useState<"normal" | "medium" | "large">("normal");

  const handleLoadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;

    let id = videoUrl.trim();
    // Try to extract video ID from YT link patterns
    try {
      if (id.includes("youtube.com") || id.includes("youtu.be")) {
        const urlObj = new URL(id);
        if (id.includes("youtu.be")) {
          id = urlObj.pathname.substring(1);
        } else {
          id = urlObj.searchParams.get("v") || "";
        }
      }
    } catch (e) {
      // Keep string as is
    }

    if (id) {
      setCurrentVideoId(id);
    }
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchWord.trim()) return;
    onWordLookup(searchWord.trim());
    setSearchWord("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-4 overflow-y-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
            <Youtube className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans tracking-tight">Estudo com Vídeos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Assista no player adaptado, pause e pesquise novos termos.</p>
          </div>
        </div>

        {/* Dynamic Size Controls */}
        <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 hidden sm:inline">Tamanho:</span>
          {(["normal", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setPlayerSize(size)}
              className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold transition ${
                playerSize === size
                  ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {size === "normal" ? "Normal" : size === "medium" ? "Médio" : "Grande"}
            </button>
          ))}
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleLoadVideo} className="mb-4">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5" htmlFor="yt-url-input">
          Colar Endereço do YouTube (Link ou ID):
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="yt-url-input"
              type="text"
              placeholder="Ex: https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full pl-3 pr-2 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900 font-medium text-sm rounded-xl transition duration-150 flex items-center gap-1.5"
          >
            Carregar
          </button>
        </div>
      </form>

      {/* Video Container */}
      <div className="w-full mb-4 flex justify-center">
        <div 
          className={`relative bg-black rounded-2xl overflow-hidden shadow-md border border-slate-200/50 dark:border-slate-800 transition-all duration-350 aspect-video w-full ${
            playerSize === "normal" 
              ? "max-w-md md:max-w-xl" 
              : playerSize === "medium" 
              ? "max-w-2xl md:max-w-3xl" 
              : "max-w-full"
          }`}
        >
          <iframe
            id="youtube-player"
            src={`https://www.youtube.com/embed/${currentVideoId}?enablejsapi=1&origin=${window.location.origin}`}
            title="Estudo do Aluno - YouTube Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      {/* Manual fast Lookup during video */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-sky-100/30 dark:border-sky-800/10 mb-5">
        <h4 className="text-sm font-semibold text-sky-900 dark:text-sky-300 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Foco no Vocabulário do Vídeo
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
          Ative as legendas (CC) no player. Ouviu uma palavra que não conhece? Digite ela abaixo para traduzir e enviar direto para sua bancada de estudos!
        </p>

        <form onSubmit={handleManualLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Digite a palavra em inglês..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs rounded-xl transition duration-150 flex items-center gap-1"
          >
            Pesquisar
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}
