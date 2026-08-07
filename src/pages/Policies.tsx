import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, ExternalLink, FileText, Plus, Shield, Trash2, Upload, X } from "lucide-react";
import { euActArticles } from "../data/eu-act";
import { CustomPolicyRule, deleteCustomPolicy, getCustomPolicies, saveCustomPolicy } from "../features/voice-audit/custom-policies";
import { commitAcceptedCorpus, generateCompliantSampleCorpus, getRejectionLogs, RejectionLogEvent, scanCorpusFile, ScanResult } from "../features/voice-audit/corpus-scanner";

export default function Policies() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customPolicies, setCustomPolicies] = useState<CustomPolicyRule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCorpusModal, setShowCorpusModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<CustomPolicyRule["category"]>("custom_guardrail");
  const [newDescription, setNewDescription] = useState("");

  // Corpus Scanner State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [rejectionLogs, setRejectionLogs] = useState<RejectionLogEvent[]>([]);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCustomPolicies(getCustomPolicies());
    setRejectionLogs(getRejectionLogs());

    const handleUpdate = () => {
      setCustomPolicies(getCustomPolicies());
      setRejectionLogs(getRejectionLogs());
    };

    window.addEventListener("voiceshield:custom-policies-changed", handleUpdate);
    window.addEventListener("voiceshield:corpus-logs-changed", handleUpdate);
    return () => {
      window.removeEventListener("voiceshield:custom-policies-changed", handleUpdate);
      window.removeEventListener("voiceshield:corpus-logs-changed", handleUpdate);
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsScanning(true);
    setScanResult(null);
    setCommitSuccessMsg(null);

    try {
      const result = await scanCorpusFile(file);
      setScanResult(result);
      setRejectionLogs(getRejectionLogs());
    } catch (err) {
      console.error("Scan error", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCommitCorpus = () => {
    if (!scanResult || !scanResult.valid) return;
    const addedCount = commitAcceptedCorpus(scanResult);
    setCommitSuccessMsg(`Successfully committed ${addedCount} policy guardrails to the active VoiceShield corpus store!`);
    setScanResult(null);
    setSelectedFile(null);
    setCustomPolicies(getCustomPolicies());
  };

  const handleDownloadSample = () => {
    const sampleText = generateCompliantSampleCorpus();
    const blob = new Blob([sampleText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "031_organization_voice_policy.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    const policy: CustomPolicyRule = {
      id: `custom-pol-${Date.now()}`,
      article: "Internal Security",
      title: newTitle,
      description: newDescription,
      severity: "high",
      category: newCategory,
      isCustom: true,
    };

    saveCustomPolicy(policy);
    setNewTitle("");
    setNewDescription("");
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomPolicy(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">EU AI Act & Corpus Policies</h1>
          <p className="text-sm text-muted mt-1">Regulatory compliance frameworks, organization guardrails & client-side corpus ingestion</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCorpusModal(true)}
            className="inline-flex items-center gap-2 bg-muted/40 hover:bg-muted text-foreground border border-border/80 font-semibold px-3.5 py-2 rounded-lg transition-all text-sm"
          >
            <Upload className="w-4 h-4 text-accent" /> Upload Corpus (.txt)
          </button>
          <button
            onClick={() => setShowLogsModal(true)}
            className="inline-flex items-center gap-2 bg-muted/40 hover:bg-muted text-foreground border border-border/80 font-semibold px-3.5 py-2 rounded-lg transition-all text-sm relative"
          >
            <Shield className="w-4 h-4 text-warning" /> Rejection Audit Log
            {rejectionLogs.length > 0 && (
              <span className="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {rejectionLogs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-accent text-background font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all text-sm shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Custom Rule
          </button>
        </div>
      </div>

      {customPolicies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" /> Organization Guardrails ({customPolicies.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {customPolicies.map((p) => (
              <div key={p.id} className="bg-muted/30 rounded-xl border border-border/80 p-5 relative group">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-4 right-4 p-1.5 text-muted hover:text-destructive transition-colors rounded-md"
                  title="Delete Custom Policy"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-accent/20 text-accent">
                  {p.category || "Custom Policy"}
                </span>
                <h3 className="text-base font-semibold text-foreground mt-2">{p.title}</h3>
                <p className="text-sm text-muted mt-1.5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border/80 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Add Custom Guardrail Policy</h2>
            <form onSubmit={handleAddPolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial Disclaimer Enforcement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Category / Group</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CustomPolicyRule["category"])}
                  className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="custom_guardrail">Custom Guardrail</option>
                  <option value="financial_disclaimer">Financial Disclaimer</option>
                  <option value="hipaa_privacy">HIPAA / Healthcare Privacy</option>
                  <option value="custom_brand">Brand & Tone Boundary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Rule Description & Constraint</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe what the voice agent MUST or MUST NOT say..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-muted/20 border border-border/80 rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground border border-border/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-background hover:opacity-90"
                >
                  Save Policy Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Corpus Upload Modal */}
      {showCorpusModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background border border-border/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" /> Corpus Ingestion Gate (031 Criteria Compliant)
                </h2>
                <p className="text-xs text-muted mt-0.5">Strict client-side scanner gate enforcing format, nested enumeration & anti-injection screening</p>
              </div>
              <button
                onClick={() => {
                  setShowCorpusModal(false);
                  setScanResult(null);
                  setSelectedFile(null);
                }}
                className="text-muted hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Criteria Banner */}
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3.5 text-xs text-foreground space-y-1.5">
              <div className="font-semibold text-accent flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> 031 Specification Gate Criteria:
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted text-[11px]">
                <li><strong className="text-foreground">Rule 1 (Format):</strong> Strictly single plain .txt file. Extension & magic-byte check against binary spoofing.</li>
                <li><strong className="text-foreground">Rule 2 (Enumeration):</strong> Absolute hierarchical enumeration mandatory (1. → 1.1. → 1.1.1.).</li>
                <li><strong className="text-foreground">Rule 3 (Security):</strong> Client-side scan against prompt injection, SQL injection & command payloads.</li>
                <li><strong className="text-foreground">Rule 4 (Adaptation):</strong> Zero-hallucination adaptation (envelope 0.0) upon hash integrity verification.</li>
              </ul>
            </div>

            {commitSuccessMsg && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 rounded-lg p-3 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{commitSuccessMsg}</span>
              </div>
            )}

            {/* Upload Area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-foreground">Select Corpus Document (.txt)</label>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-accent hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3 h-3" /> Download Compliant Sample (.txt)
                </button>
              </div>

              <label className="border-2 border-dashed border-border hover:border-accent/60 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-muted/20 hover:bg-muted/30">
                <Upload className="w-8 h-8 text-accent/80 mb-2" />
                <span className="text-sm font-medium text-foreground">
                  {selectedFile ? selectedFile.name : "Click or drag plain .txt file here"}
                </span>
                <span className="text-xs text-muted mt-1">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Strictly .txt files up to 5MB"}
                </span>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Scanning Indicator */}
            {isScanning && (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/60 flex items-center justify-center gap-3 text-sm text-foreground">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Running client-side scanner gate (format, MIME magic bytes, enumeration lint & injection checks)...
              </div>
            )}

            {/* Scan Results */}
            {scanResult && (
              <div className={`p-4 rounded-xl border ${scanResult.valid ? "bg-emerald-500/10 border-emerald-500/40" : "bg-destructive/10 border-destructive/40"} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scanResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-bold text-sm text-foreground">
                      {scanResult.valid ? "Corpus Passed All Pre-Upload Gates" : "Corpus Rejected by Pre-Upload Gate"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded text-muted">
                    {scanResult.scannerVersion}
                  </span>
                </div>

                {!scanResult.valid && (
                  <div className="space-y-2 text-xs">
                    <p className="text-destructive font-semibold">Rejection Details (Rule Violation):</p>
                    {scanResult.errors.map((err, i) => (
                      <div key={i} className="bg-background/80 border border-destructive/30 rounded p-2.5 text-foreground leading-relaxed">
                        <span className="font-mono text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded mr-2 uppercase">
                          {err.category} [{err.code}]
                        </span>
                        {err.message}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted italic">
                      This rejection event has been logged to the Maintainer audit trail per §5.7.3.4.
                    </p>
                  </div>
                )}

                {scanResult.valid && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-background/60 p-2.5 rounded border border-border/60">
                      <div>
                        <span className="text-muted block text-[10px]">Enumerated Nodes:</span>
                        <strong className="text-foreground">{scanResult.enumerationStats?.totalNodes} nodes</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Max Nesting Depth:</span>
                        <strong className="text-foreground">Level {scanResult.enumerationStats?.maxDepth}</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">SHA-256 Checksum:</span>
                        <strong className="text-foreground font-mono text-[10px]">{scanResult.checksum?.substring(0, 16)}...</strong>
                      </div>
                      <div>
                        <span className="text-muted block text-[10px]">Hallucination Envelope:</span>
                        <strong className="text-accent font-semibold">0.0 (Strict Corpus Grounding)</strong>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground mb-1">Extracted Policy Guardrails ({scanResult.extractedRules.length}):</p>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {scanResult.extractedRules.map((rule, i) => (
                          <div key={i} className="bg-background/80 p-2 rounded border border-border/60 text-[11px]">
                            <span className="font-mono font-bold text-accent mr-1 font-semibold">{rule.nodeId}</span>
                            <span className="text-foreground">{rule.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleCommitCorpus}
                        className="bg-accent text-background font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-all text-xs inline-flex items-center gap-1.5 shadow"
                      >
                        <Shield className="w-3.5 h-3.5" /> Commit to Voice Agent Policy Corpus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCorpusModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-muted hover:text-foreground border border-border/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Audit Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-background border border-border/80 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-warning" /> Maintainer Rejection Audit Log (§5.7.3.4)
                </h2>
                <p className="text-xs text-muted">Auditable log of all blocked upload transactions and security scan rejections</p>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-muted hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rejectionLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No corpus upload rejections logged yet. All scan events will record here for Maintainer RACI review.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {rejectionLogs.map((log) => (
                  <div key={log.id} className="bg-muted/20 border border-border/80 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground font-mono">{log.fileName}</span>
                      <span className="text-muted font-mono text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                        {log.category} REJECTION
                      </span>
                      <span className="text-[10px] font-mono text-muted">Version: {log.scannerVersion}</span>
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed pt-1">{log.reason}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-muted hover:text-foreground border border-border/80"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
        {euActArticles.map((article) => {
          const isExpanded = expanded === article.articleNumber;
          return (
            <section
              key={article.articleNumber}
              className="bg-card rounded-xl border border-border/80 border-l-[3px] border-l-accent shadow-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-accent">Article {article.articleNumber}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted uppercase tracking-wide">
                        {article.chapter}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-foreground mt-2">{article.title}</h2>
                    <p className="text-sm text-muted mt-1.5">{article.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : article.articleNumber)}
                    className="p-1.5 rounded-md text-muted hover:bg-muted/30 transition-colors"
                    aria-label={isExpanded ? "Collapse article" : "Expand article"}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/80">
                    <p className="text-sm text-foreground/90 leading-relaxed">{article.content}</p>
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-3"
                    >
                      Open official source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </section>
          );
        })}
    </div>
  );
}
