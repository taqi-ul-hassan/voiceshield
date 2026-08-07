import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RealtimeTranscriptionProvider,
  useRealtimeEventListener,
  useRealtimeTranscription,
} from "@speechmatics/real-time-client-react";
import type { ReceiveMessageEvent } from "@speechmatics/real-time-client-react";
import {
  PCMAudioRecorderProvider,
  usePCMAudioListener,
  usePCMAudioRecorderContext,
} from "@speechmatics/browser-audio-input-react";
import type { Conversation, RuntimeSettings } from "./types";
import { fetchSpeechmaticsToken, speechmaticsTts } from "./server-api";

const SAMPLE_RATE = 16_000;

interface SpeechmaticsAudioPanelProps {
  settings: RuntimeSettings;
  conversation?: Conversation;
  onCallerTurn: (text: string) => Promise<void>;
}

export function SpeechmaticsAudioPanel(props: SpeechmaticsAudioPanelProps) {
  const audioContext = useAudioContext();

  return (
    <RealtimeTranscriptionProvider appId="voiceshield-natively">
      <PCMAudioRecorderProvider audioContext={audioContext} workletScriptURL="/pcm-audio-worklet.min.js">
        <SpeechmaticsAudioControls {...props} />
      </PCMAudioRecorderProvider>
    </RealtimeTranscriptionProvider>
  );
}

function SpeechmaticsAudioControls({ conversation, onCallerTurn }: SpeechmaticsAudioPanelProps) {
  const { startTranscription, stopTranscription, sendAudio, socketState } = useRealtimeTranscription();
  const { startRecording, stopRecording, isRecording } = usePCMAudioRecorderContext();
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePCMAudioListener(sendAudio);

  useRealtimeEventListener(
    "receiveMessage",
    useCallback((event: ReceiveMessageEvent) => {
      const message = event.data;
      if (message.message === "AddPartialTranscript") setPartialTranscript(message.metadata.transcript);
      if (message.message === "AddTranscript") {
        setTranscript((current) => [current, message.metadata.transcript].filter(Boolean).join(" "));
        setPartialTranscript("");
      }
      if (message.message === "Error") setError(message.reason || "Speechmatics transcription failed.");
    }, [])
  );

  const start = useCallback(async () => {
    setError("");
    setTranscript("");
    setPartialTranscript("");

    try {
      // The raw Speechmatics key lives on the server. The proxy mints a
      // short-lived (60s) JWT that is safe to use from the browser and is
      // fetched fresh for every session — never cached.
      const token = await fetchSpeechmaticsToken();

      await startTranscription(token, {
        audio_format: { type: "raw", encoding: "pcm_f32le", sample_rate: SAMPLE_RATE },
        transcription_config: {
          language: "en",
          enable_partials: true,
          max_delay: 1,
          conversation_config: { end_of_utterance_silence_trigger: 0.8 },
        },
      });
      await startRecording({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start microphone.");
      await stopTranscription({ noTimeout: true }).catch(() => undefined);
    }
  }, [startRecording, startTranscription, stopTranscription]);

  const stop = useCallback(async () => {
    stopRecording();
    await stopTranscription({ noTimeout: true }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "Unable to stop transcription.");
    });
  }, [stopRecording, stopTranscription]);

  const submit = useCallback(async () => {
    if (!conversation || !transcript.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onCallerTurn(transcript);
      setTranscript("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send caller turn.");
    } finally {
      setSubmitting(false);
    }
  }, [conversation, onCallerTurn, submitting, transcript]);

  useEffect(() => {
    return () => {
      stopRecording();
      void stopTranscription({ noTimeout: true }).catch(() => undefined);
    };
  }, [stopRecording, stopTranscription]);

  return (
    <section className="bg-app-card rounded-xl border border-app-border shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold text-app-fg">Speechmatics Audio Test</h2>
          <p className="text-xs text-app-muted mt-1">Transcribe a caller turn and send it to Agent Draft.</p>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-app-muted">{socketState || "closed"}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={isRecording ? stop : start}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "bg-ab text-ab-fg hover:opacity-90"}`}
        >
          {isRecording ? "Stop microphone" : "Start microphone"}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!conversation || !transcript.trim() || submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-app-soft text-app-muted hover:bg-app-soft2 hover:text-app-fg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Sending..." : "Send caller turn"}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-14 rounded-lg border border-app-border bg-app-soft px-3 py-2 text-sm text-app-fg">
        {transcript || partialTranscript || "Your transcript will appear here."}
        {partialTranscript && !transcript && <span className="text-app-muted"> ...</span>}
      </div>
      {error && <p className="text-xs text-fail-text mt-2">{error}</p>}
    </section>
  );
}

export function SpeechButton({ text, voice }: { text: string; voice: RuntimeSettings["personVoice"] }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const play = async () => {
    setPlaying(true);
    setError("");
    try {
      // TTS audio is generated server-side by the proxy — the browser never
      // sends a raw key to Speechmatics.
      const audioBlob = await speechmaticsTts(text, voice);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPlaying(false);
      };
      await audio.play();
    } catch (cause) {
      setPlaying(false);
      setError(cause instanceof Error ? cause.message : "Speech playback failed.");
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={() => void play()} disabled={playing} className="text-xs font-medium text-ab hover:underline disabled:text-app-muted/60 cursor-pointer transition-colors duration-150">
        {playing ? "Playing..." : "Play Speechmatics audio"}
      </button>
      {error && <p className="text-[10px] text-fail-text mt-1">{error}</p>}
    </div>
  );
}

function useAudioContext(): AudioContext | undefined {
  const audioContext = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new AudioContext({ sampleRate: SAMPLE_RATE });
  }, []);

  useEffect(() => {
    return () => {
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
    };
  }, [audioContext]);

  return audioContext;
}
