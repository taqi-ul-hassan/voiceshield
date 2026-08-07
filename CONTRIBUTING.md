---
title: "Contributing to VoiceShield"
version: "2026.08.01.00"
keywords: ["contributing", "pull-request", "code-style", "testing"]
---

# Contributing to VoiceShield

Thank you for contributing to the VoiceGate / X Voice X project.

## Table of Contents

- [Abstract](#abstract)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Changelog](#changelog)

---

## Abstract

This document defines the contribution process, coding conventions, testing
requirements, and pull-request expectations for the VoiceShield submodule. All
contributions must follow the standards described here and in the root
`voice_processing_specifications/005_voicegate_coding_standards.txt`.

---

## Code of Conduct

1.1. Be respectful and constructive in all interactions.

1.2. Contributions that contain discriminatory, hostile, or deceptive content will
be rejected.

---

## Getting Started

2.1. Fork the repository and create your branch from `main`:

```bash
git checkout -b feat/your-feature-name
```

2.2. Install dependencies:

```bash
npm install
pip install -r requirements.txt
```

2.3. Copy `.env.example` to `.env` and set your test keys.

---

## Development Workflow

3.1. Make your changes, following the coding standards below.

3.2. Build the frontend to validate no compile errors:

```bash
npm run build
```

3.3. Run the full test suite:

```bash
pytest tests/ -v
```

3.4. All 63 tests must pass (or new tests must be added for new behaviour).

---

## Coding Standards

4.1. **TypeScript/React:** Follow the conventions in `src/`. Use the `cn()` utility
for className composition. Never hardcode colours — use the CSS variable tokens
(`var(--vs-*)`, `text-app-fg`, `bg-app-card`, etc.).

4.2. **Python:** Follow PEP 8. All new functions must have a docstring. No
bare `except:` clauses.

4.3. **Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `test:`, `chore:`.

4.4. **No raw API keys** in source code, comments, or commit messages.

4.5. **No console.log / print** in production code paths (debug logging only,
removed before merge).

---

## Testing Requirements

5.1. New features must include unit tests in `tests/test_serve.py` (Python) or
`src/__tests__/` (TypeScript — when applicable).

5.2. Security-related changes (key handling, CORS, rate limiting) require security
test coverage.

5.3. Coverage must not decrease from the current baseline (63 tests, all passing).

---

## Pull Request Process

6.1. Fill in the PR template completely.

6.2. Link the PR to the relevant task (`TASK-NN`) in `TODO_LIST/`.

6.3. Ensure `npm run build` and `pytest tests/ -v` both pass cleanly in CI.

6.4. At least one maintainer review is required before merge.

6.5. Squash commits on merge; keep the commit message in Conventional Commits format.

---

## Security Vulnerabilities

Do not open a public issue for security vulnerabilities. Follow the process in
[SECURITY.md](SECURITY.md).

---

## Changelog

| Version | Date | Author | Description |
|---|---|---|---|
| 2026.08.01.00 | 2026-08-07 | VoiceGate Agent | Initial creation — TASK-04. |
