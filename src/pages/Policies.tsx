import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { euActArticles } from "../data/eu-act";

export default function Policies() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">EU AI Act Policies</h1>
        <p className="text-sm text-gray-500 mt-1">Reference articles used by the voice-agent evaluator</p>
      </div>

      <div className="space-y-4">
        {euActArticles.map((article) => {
          const isExpanded = expanded === article.articleNumber;
          return (
            <section key={article.articleNumber} className="bg-card rounded-xl border border-gray-100 border-l-[3px] border-l-accent-blue shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-semibold text-accent-blue">Article {article.articleNumber}</span><span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">{article.chapter}</span></div>
                    <h2 className="text-base font-semibold text-gray-900 mt-2">{article.title}</h2>
                    <p className="text-sm text-gray-500 mt-1.5">{article.summary}</p>
                  </div>
                  <button type="button" onClick={() => setExpanded(isExpanded ? null : article.articleNumber)} className="p-1 rounded-md text-gray-400 hover:bg-gray-100" aria-label={isExpanded ? "Collapse article" : "Expand article"}>{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                </div>
                {isExpanded && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-sm text-gray-600 leading-relaxed">{article.content}</p><a href={article.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline mt-3">Open source <ExternalLink className="w-3 h-3" /></a></div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
