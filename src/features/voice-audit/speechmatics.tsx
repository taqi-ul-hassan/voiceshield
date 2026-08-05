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

function SpeechmaticsAudioControls({ settings, conversation, onCallerTurn }: SpeechmaticsAudioPanelProps) {
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

    if (!settings.speechmaticsApiKey.trim()) {
      setError("Add a Speechmatics API key in Settings before starting the microphone.");
      return;
    }

    try {
      const tokenResponse = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.speechmaticsApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 300 }),
      });
      const tokenData = (await tokenResponse.json()) as { key_value?: string; message?: string };
      if (!tokenResponse.ok || !tokenData.key_value) {
        throw new Error(tokenData.message || "Unable to create a Speechmatics token.");
      }

      await startTranscription(tokenData.key_value, {
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
  }, [settings.speechmaticsApiKey, startRecording, startTranscription, stopTranscription]);

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
    <section className="bg-card rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Speechmatics Audio Test</h2>
          <p className="text-xs text-gray-500 mt-1">Transcribe a caller turn and send it to Agent Draft.</p>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">{socketState || "closed"}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={isRecording ? stop : start}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-accent-blue hover:bg-blue-600"}`}
        >
          {isRecording ? "Stop microphone" : "Start microphone"}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!conversation || !transcript.trim() || submitting}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Sending..." : "Send caller turn"}
        </button>
      </div>

      <div aria-live="polite" className="mt-4 min-h-14 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {transcript || partialTranscript || "Your transcript will appear here."}
        {partialTranscript && !transcript && <span className="text-gray-400"> ...</span>}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </section>
  );
}

export function SpeechButton({ text, voice, settings }: { text: string; voice: RuntimeSettings["personVoice"]; settings: RuntimeSettings }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const play = async () => {
    if (!settings.speechmaticsApiKey.trim()) {
      setError("Add a Speechmatics key in Settings.");
      return;
    }
    setPlaying(true);
    setError("");
    try {
      const response = await fetch(`${settings.speechmaticsTtsUrl.replace(/\/$/, "")}/generate/${voice}?output_format=wav_16000`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.speechmaticsApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`Speechmatics TTS error ${response.status}.`);
      const audioUrl = URL.createObjectURL(await response.blob());
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
      <button type="button" onClick={() => void play()} disabled={playing} className="text-xs font-medium text-accent-blue hover:underline disabled:text-gray-400">
        {playing ? "Playing..." : "Play Speechmatics audio"}
      </button>
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
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
