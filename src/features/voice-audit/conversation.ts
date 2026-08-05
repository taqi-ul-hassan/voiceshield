import { generateAgentDraftResponse, generatePersonTurn } from "./agents";
import { evaluateTranscripts } from "./evaluator";
import type { AgentConfig, Conversation, Persona, RuntimeSettings } from "./types";
import { makeId } from "./types";

export function createConversation(agentConfig: AgentConfig, persona: Persona): Conversation {
  return {
    id: makeId("conversation"),
    status: "active",
    agentConfig,
    persona,
    turns: [],
    createdAt: new Date().toISOString(),
  };
}

export async function advanceConversation(
  conversation: Conversation,
  settings: RuntimeSettings
): Promise<Conversation> {
  if (conversation.status !== "active") return conversation;

  const history = conversation.turns.map(({ speaker, text }) => ({ speaker, text }));
  const personText = await generatePersonTurn(conversation.agentConfig, conversation.persona, history, settings);
  const personTurn = Math.floor(conversation.turns.length / 2) + 1;
  const turns = [
    ...conversation.turns,
    { id: makeId("turn"), speaker: "agent_person" as const, text: personText, turn: personTurn },
  ];
  const draftText = await generateAgentDraftResponse(
    conversation.agentConfig,
    turns.map(({ speaker, text }) => ({ speaker, text })),
    settings
  );

  return {
    ...conversation,
    turns: [
      ...turns,
      { id: makeId("turn"), speaker: "agent_draft" as const, text: draftText, turn: personTurn },
    ],
  };
}

export async function submitCallerTurn(
  conversation: Conversation,
  text: string,
  settings: RuntimeSettings
): Promise<Conversation> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Caller turn cannot be empty.");

  const callerTurn = conversation.turns.filter((turn) => turn.speaker === "agent_person").length + 1;
  const turns = [
    ...conversation.turns,
    { id: makeId("turn"), speaker: "agent_person" as const, text: trimmed, turn: callerTurn },
  ];
  const draftText = await generateAgentDraftResponse(
    conversation.agentConfig,
    turns.map(({ speaker, text: turnText }) => ({ speaker, text: turnText })),
    settings
  );

  return {
    ...conversation,
    turns: [...turns, { id: makeId("turn"), speaker: "agent_draft", text: draftText, turn: callerTurn }],
  };
}

export async function evaluateConversation(
  conversation: Conversation,
  settings: RuntimeSettings
): Promise<Conversation> {
  const draftTranscript = conversation.turns
    .filter((turn) => turn.speaker === "agent_draft")
    .map((turn) => turn.text)
    .join("\n");
  const personTranscript = conversation.turns
    .filter((turn) => turn.speaker === "agent_person")
    .map((turn) => turn.text)
    .join("\n");

  if (!draftTranscript || !personTranscript) {
    throw new Error("Add at least one caller and agent exchange before evaluating.");
  }

  const result = await evaluateTranscripts(draftTranscript, personTranscript, conversation.persona, settings);
  return { ...conversation, status: "evaluated", result };
}
