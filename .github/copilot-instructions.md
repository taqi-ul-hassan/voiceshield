## Agent Tool Configuration (YAML)

```yaml
agent_tools:
  auto_compaction:
    enabled: true
    trigger: major_or_minor_instruction_applied
    checkpoint_format: markdown
    output_dir: CHATS/
    filename_pattern: "YYYY-MM-DD_HH-MM-SS_session-summary.md"
    front_matter_required: true
    fields: [title, author, date, version, keywords]
    version_scheme: YPSV # YYYY.MAJOR.MINOR.PATCH.
    sections_required:
      - "## Changelog"
    min_keywords: 3
    keywords_order: alphabetical

  todo_list:
    enabled: true
    format: ordered_hierarchical # 1., 1.1., 1.1.1., 1.1.1.1.
    indent: 4
    persist_between_checkpoints: true
    storage: CHATS/TODO.md
    never_delete_existing: true
    status_markers:
      pending: "[ ]"
      in_progress: "[~]"
      done: "[x]"
      deferred: "[>]"

  file_graph_analysis:
    enabled: true
    scope:
      - coding_stds/
      - ai_agent/
      - architecture/
      - project_local
    propagation_log: true
    confirm_uncertain: true
    never_touch_coding_stds_without_reason: true

  model_selection:
    strategy: context_aware
    prefer_token_efficient: true
    never_over_compact: true
    trade_off_policy: context_completeness_over_token_savings

  conflict_resolution:
    tier_0_sources:
      - ai_agent/META_AI_HIGHER_LEVEL_INSTRUCTIONS.txt
      - ai_agent/META_AI_INSTRUCTION_GUIDANCE.txt
      - architecture/project_meta_standards.txt
      - ai_agent/AGENT_WORKFLOW_HIGH_LEVEL_META.txt
    precedence_docs:
      - "coding_stds/README.md §4"
      - coding_stds/MOST_CITED_STANDARDS.md
    rule: tier_0_always_wins

  session_summary:
    enabled: true
    trigger: task_complete
    output: CHATS/
    format: markdown
    must_include:
      - instructions_applied
      - context_summary
      - propagation_decisions
      - todo_status
      - changelog_entry

  read_before_apply:
    enabled: true
    rule: never_act_on_filename_alone
    required_action: read_cited_standard_before_applying

  content_protection:
    never_remove_existing_content: true
    never_modify_without_explicit_permission: true
```

## Authority Hierarchy

- `coding_stds/README.md` §4 and `coding_stds/MOST_CITED_STANDARDS.md` govern precedence for any conflicting instruction across this repository.
- Tier 0 (`ai_agent/META_AI_HIGHER_LEVEL_INSTRUCTIONS.txt`, `ai_agent/META_AI_INSTRUCTION_GUIDANCE.txt`, `architecture/project_meta_standards.txt`, `ai_agent/AGENT_WORKFLOW_HIGH_LEVEL_META.txt`) always wins conflict resolution.
- Never act on a filename alone — read the cited standard itself before applying its directives.

## LaTeX Conventions

- All lists use `\enumerate` only — never `\itemize`
- Use `align` with `&` for math to prevent hbox overflow
- Strict nested hierarchical numbering (no alphabets, no Roman numerals)
- Never remove or modify existing content without explicit permission

## Markdown & Documentation Conventions

- Every document begins with YAML front matter: `title`, `author`, `date`, `version` (YPSV: `YYYY.MINOR.PATCH.HOTFIX`), `keywords` (min 3, alphabetical).
- Section order is strict: Front Matter → TOC → Abstract → Keywords → Executive Summary → Body → Appendix → References → Changelog.
- Heading levels are never skipped (H1 once only, H2/H3/H4 sequential).
- Ordered lists use strict hierarchical numbering only (`1.`, `1.1.`, `1.1.1.`, `1.1.1.1.`) — no alphabetic or Roman-numeral levels, 4 spaces indent per level; unordered lists use `-` only, never mixed with ordered.
- Inline math uses `$...$`; block math uses `$$...$$`; equations numbered with `\tag{n}`.
- Every fenced code block declares a language identifier; code follows Functional Programming, SOLID, and JPL/NASA-style bounded/testable practices.
- Every table has a header row, explicit alignment markers, and a caption; long paths/identifiers in cells use `<br>` to wrap.
- A `## Changelog` section is mandatory as the final section (Version | Date | Author | Description, reverse chronological) — a document missing it is non-compliant and must not be finalized.
- Never remove or modify existing content without explicit permission.

## Cross-File Propagation of Instructions

- When an instruction is given for a single file, actively identify any upstream (files it depends on / inherits from, e.g. Tier 0 sources, `coding_stds/` standards) or downstream (files that depend on it, e.g. templates, generated docs, sibling documents sharing the same standard) files that the same instruction logically applies to.
- Before propagating a change to other files, explicitly state: (a) which files are candidates for the same update, (b) why they are upstream/downstream related, and (c) the precise impact of applying or not applying the update — including risk of drift, inconsistency, or non-compliance if left unsynchronized.
- If it is uncertain whether a file is in scope for propagation, ask for explicit confirmation before modifying it — never assume silently.
- Every propagation decision (applied or deferred) must be logged in that file's `## Changelog` entry, noting the triggering instruction and its origin file, so lag between the global standard and any individual file's state remains traceable.
- Upstream/downstream scope is not limited to `coding_stds/` in submodule repos — it also applies within the specific project itself (e.g. sibling files, generated artifacts, and dependent modules in the active repo), so propagation analysis must span both the shared standards submodules and the project-local file graph.
- In fact, for project purposes, avoid touching the coding_stds/ unless there is a good reason to do so, and provide reasons to create and update new files, and never delete or modify what already exists.

## Compaction & Token Efficiency Per Task

- Auto-compact conversations and have checkpoints whenever major or minor instructions are applied, so that the model can maintain context without reprocessing the entire history.
- Find the most efficient ways to save tokens per instruction set and select the most useful model for the context or contexts, and the contents, constraints and considerations of what must be done.
- Always consider the trade-off between token efficiency and context completeness; do not over-compact at the expense of losing critical instructions.
- When a task is complete, summarize the instructions and their context in a single message to preserve them for future reference, and to avoid re-typing or re-sending them in future sessions.
- save to a root level CHATS/ dir as md file per markdown_standards.txt and commonly referred to MOST_CITED_STANDARDS.md and its associated files
