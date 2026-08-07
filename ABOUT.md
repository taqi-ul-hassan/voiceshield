---
title: "About VoiceShield"
version: "2026.08.01.00"
keywords: ["voiceshield", "voicegate", "about", "product-identity", "voice-compliance-qa"]
---

# About VoiceShield

## Table of Contents

- [Abstract](#abstract)
- [What Is VoiceShield?](#what-is-voiceshield)
- [Why It Exists](#why-it-exists)
- [Product Identity](#product-identity)
- [Branding](#branding)
- [Project Origin](#project-origin)
- [Changelog](#changelog)

---

## Abstract

VoiceShield is the frontend application of the VoiceGate Voice Compliance QA (VCQ)
platform, developed as part of the LabLab AI Factory hackathon (Natively AI,
2026-08-03 to 2026-08-10). It provides a browser-based test bench for automated
red-teaming and compliance scoring of voice AI agents against statutory requirements
and company-specific policy corpora.

---

## What Is VoiceShield?

VoiceShield simulates adversarial and vulnerable callers across a curated scenario
catalog, drives them through a live five-phase call lifecycle with a target voice
agent, transcribes both channels in real time, and produces a structured compliance
verdict (Pass / Flag / Fail) with explicit rule citations. On failure, it generates
an advisory-only suggested system-prompt patch, which can be fed back into the agent
and retested.

---

## Why It Exists

The Air Canada tribunal (2024) established that a company can be held liable for
statements made by its AI agent even when those statements contradict the company's
own policies. California SB 243 imposes a $1,000-per-violation penalty for voice
agents that fail to disclose their AI nature to sensitive callers. EU AI Act
Article 50 mandates disclosure obligations for all AI systems that interact directly
with humans via voice. VoiceShield makes the gap between *what an agent says* and
*what it is legally required to say* measurable before a single real call is taken.

---

## Product Identity

| Field | Value |
|---|---|
| Product name | VoiceShield |
| Platform | VoiceGate (Voice Compliance QA) |
| Category | Voice AI red-teaming + compliance |
| Primary regulation | EU AI Act Art. 50; CA SB 243 |
| Verdict system | Pass / Flag / Fail + rule citation |
| Patch flow | Advisory-only suggested system-prompt patch |

---

## Branding

VoiceShield uses the X Voice X visual identity:

- **Rose variant**: canvas `#FFAEC9`, ink `#000000`, accent `#B76E79`
- **Noir variant**: canvas `#000000`, ink `#FFAEC9`, accent `#B76E79`

Brand assets are in [`promotions/`](promotions/) in `.png`, `.ico`, and `.svg`
formats across all standard sizes (16 × 16 through 1024 × 1024).

---

## Project Origin

VoiceShield is developed by TAQI's team as part of the X Voice X project
(repository: `X_Voice_X`), forked and adapted from the DarkStrategy_XParadoxX
prototype. The core architecture — specifications → standards → coding standards →
testing → CI/CD → deployment — mirrors the X Paradox X project's own
document-driven methodology.

---

## Changelog

| Version | Date | Author | Description |
|---|---|---|---|
| 2026.08.01.00 | 2026-08-07 | VoiceGate Agent | Initial creation — TASK-04. |
