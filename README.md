# MyNext

**Your AI life simulation & planning studio — a WeChat Mini Program.**

> *Live your possible futures in AI first, then come back and live today better.*

MyNext helps a person understand themselves, simulate divergent life paths, and convert a chosen path into small, realistic, reviewable actions. It simulates **one real user** — not a cast of fictional characters — and keeps learning from what actually happens.

---

## Status

| | |
|---|---|
| Stage | Design finalized (v1.1) · pre-implementation |
| Target | 2026 WeChat Mini Program Development Competition (*Coexisting with AI*), submission closes **2026-10-17** |
| Stack | WeChat Mini Program (native + TypeScript) · WeChat Cloud Development (serverless) · LLM via swappable adapter · Mem0 for semantic memory |

## What it does

1. **Build a life profile** — gradual intake across basics, education, career, finances (band-based), health, family, interests, goals and worries. Every field accepts free-form notes, and the AI cites them back so users feel understood.
2. **Simulate paths** — 2–3 explainable scenarios per topic, each with preconditions, key variables, opportunities and costs, risks, early-warning signals, low-cost validating actions, and an explicit statement of what is still unknown.
3. **The user decides** — long-term goals can only come from the user. The AI clarifies, maps, and decomposes; it never sets goals, never moralizes, never says "you should have".
4. **Execute realistically** — a Reality Check Card per goal; action plans generated inside the user's actual life structure (working hours, health limits, cash flow, family duties), each action tagged with the evidence behind it.
5. **Review continuously** — a 30-second daily check-in, user-initiated interim conversations, event-triggered check-ins, and a weekly reconciliation of plan vs. reality. Notifications only ever reference goals the user set for themselves.

## Design pillars

- **Time-horizon discipline** — 7 days: actionable; 1 year: stageable; 3 years: key forks and conditions; 5 years: scenario maps; 10 years: broad directions and drivers only. No pseudo-precise predictions.
- **Personality as input, not destiny** — Big Five (BFI-2, Chinese version, subject to licensing and psychometric review) plus a product-authored *self-reflection questionnaire* clearly labelled exploratory. No percentile without norms; no single score excludes a life path.
- **Memory with transparency** — the business database is the single source of truth; a semantic memory layer (Mem0) is rebuildable. Users can view, correct, and delete memories.
- **Responsible AI by design** — no investment, medical, or legal conclusions; no illegal-path simulation; AI-generated content labelling; content-security filtering on all input and output.

## Repository layout

```
docs/
  MyNext-设计文档-v1.1-人生模拟与性格评估.md   # 主文档 v1.1（产品与合规标准，source of truth）
  人生导演台-设计文档.md                      # v1.0 工程细节补充（采集/回访/记忆/推演实现）
  MyNext-Project-Description-EN.md            # English project description (submission / collaboration)
  ADR/ADR-0001-v1.1与v1.0合并裁决.md           # 文档冲突裁决与决策记录
  暖芯-设计文档.md                            # 已终止项目（归档）
  设计文档.md                                 # 前置项目（归档）
```

## Documentation precedence

When documents disagree, follow **ADR-0001**: v1.1 product & compliance standards > v1.0 engineering details.

## Development methodology

Adapted from proven agent-skill practices (mattpocock/skills, addyosmani/agent-skills, affaan-m/ECC):

- Spec before code; small, composable, editable rules files
- Atomic thin vertical slices; one slice at a time
- Golden-sample regression for the simulation engine (same profile input → assert structure and boundary compliance); run on every prompt change
- Secrets server-side only; prompt-injection defence; double output filtering (JSON schema + content safety)
- Architecture decisions recorded as ADRs

## Roadmap

| Phase | Scope |
|---|---|
| 0 · Prototype (~5 days) | Minimal profile + one life topic · 2–3 explainable scenarios · 7-day action experiment · one feedback submission · disclaimers and confirmation flow · exploratory reflection questions only |
| 1 · First usable MVP | Gradual life profile · licensed & reviewed personality instrument · Big Five report + self-reflection questionnaire · 1-year scenarios with 7-day actions · corrections, history, daily/weekly review · optional subscribe-message notifications |
| 2 | Memory book, reality-calibrated plans, 3-year path comparison, risk alerts, instrument history |
| 3 | 5-year scenario maps, diary analysis, visualized life timeline, city-level external data with sources |
| 4 | 10-year broad scenarios, voice interviews, AI-ecosystem (Skill/MCP) extensions after prior phases are validated |

## License

Not yet decided. All rights reserved until a license is added.