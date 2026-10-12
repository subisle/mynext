# MyNext — Your AI Life Director's Chair

> **Project Description ｜ v1.0 ｜ October 2026**
> A WeChat Mini Program that simulates your life with AI, explores your possible futures, and turns them into realistic, actionable plans — while you stay the director.

---

## 1. Overview

**MyNext** is a WeChat Mini Program that acts as a personal life simulation and planning studio. Users describe their life — background, education, career, finances, health, family, and aspirations — and the AI builds a structured "parallel life simulator": projecting possible futures at 1, 3, 5, and 10-year horizons, comparing divergent life paths, and converting a chosen path into small, realistic weekly actions.

Unlike chat-based AI assistants that answer one question at a time, MyNext maintains a persistent, evolving understanding of **one real user**. It remembers what users say across sessions, tracks what actually happened against what was planned, and continuously recalibrates its guidance based on reality.

**Tagline:** *Live your future in AI first, then come back and live today better.*

## 2. The Problem

- **Generic advice**: Existing AI assistants give context-free suggestions — "to grow your career, learn more skills" — disconnected from a user's actual constraints (work hours, health, savings, family duties).
- **No continuity**: Advice resets every session. Nothing remembers that you mentioned a knee injury, a mortgage, or a dream of remote work abroad.
- **Unrealistic plans**: Productivity tools generate idealized schedules ("wake up at 5 AM daily") that ignore real life and collapse within weeks.
- **AI overreach**: Many tools either make decisions for users or push aggressive goals onto them, eroding personal agency.

## 3. The Solution: Four Design Pillars

### 3.1 Information First — a Complete, Compressed Life Profile

An 8-module guided intake covers the whole arc of a life: **Basic info** (nationality, hometown, marital status), **Education**, **Career history**, **Finances** (band-based, not exact amounts), **Health**, **Family**, **Social & interests**, and **Goals & worries**. Every field supports **free-form notes** — and the AI actively cites them back ("You mentioned your knee injury, so running-based actions were excluded"), creating the feeling of being genuinely understood.

Two input modes with no time pressure: a **Detailed mode** (field-by-field forms) and a **Concise mode** — write one natural sentence per module ("I'm Xiao Wang, 95-born, a programmer in Hangzhou, single") — and the AI parses it into structured fields for confirmation. A **voice-chat mode** lets the AI interview the user instead. The simulation unlocks only after a baseline profile exists: garbage in, garbage out.

### 3.2 The User Sets the Direction — AI Never Does

Long-term goals can only come from the user. The AI's job is to **clarify vague goals through one-question-at-a-time interviewing** (inspired by interview-style requirement elicitation), **map paths toward them**, and **break them into near-term steps**. For unset goals, simulations present "possibilities, not prescriptions" with an explicit message: *"These are just simulations. Where you go is up to you."* Goals can be changed or abandoned anytime; the system keeps a goal-history and never nags about abandoned ones.

### 3.3 Reality-Constrained Execution

Every goal gets a **Reality Check Card** at setup: current conditions vs. what the goal typically requires, a gap list, a pace feasibility estimate, and risk factors drawn from the user's own notes. Action plans are generated **inside the user's real life structure** — a 996 work schedule means 30 minutes on weekdays and 2 hours on weekends, not a fantasy timetable. Each action is tagged with its evidence ("30-min weekday study — based on your note about overwork").

During execution, the system continuously reconciles plan vs. reality: sustained under-completion triggers **load reduction, not guilt**; sudden life events can **freeze** a goal cycle; and progress is forecast against deadlines early enough for the user to adjust pace or scope. The language discipline: no "just persist and you'll succeed" platitudes — only conditions, paths, and probabilities.

### 3.4 Daily Check-ins, Mid-week Conversations, and Real Memory

A lightweight **daily check-in** (30 seconds: three taps plus an optional sentence), **user-initiated interim conversations** for anything on their mind, event-triggered check-ins (e.g., two missed days, a life event mentioned in the diary), and a weekly reconciliation report. All notifications only reference goals the user set for themselves: *"The certification you planned — 2 of 3 done this week."* Never: *"You should have…"*

## 4. Technical Architecture

### 4.1 Stack

- **Frontend**: WeChat Mini Program (native + TypeScript), large-type adaptive UI
- **Backend**: WeChat Cloud Development (serverless cloud functions, cloud database, scheduled triggers) — zero ops, natural openid integration
- **Long-term memory**: **[Mem0](https://github.com/mem0ai/mem0)** — the dedicated memory layer for personalized AI, hosting the user's cross-session memory with automatic extraction, deduplication, and relevance-based retrieval
- **Life simulation core**: **Proprietary branch-simulation and action-planning engine**, adapted from the **[Generative Agents](https://arxiv.org/abs/2304.03442)** concepts of memory streams, planning, and reflection — but serving **one real user** instead of 25 virtual ones
- **LLM**: GLM / DeepSeek via a swappable provider adapter; API keys server-side only
- **Content safety**: WeChat content-security APIs filter all user input and AI output

### 4.2 The Single-User Loop (Our Core Differentiator)

Generative Agents simulated 25 virtual characters living together. MyNext applies the same three mechanisms to **one real person's life decisions**, forming a closed loop:

| Generative Agents concept | MyNext adaptation |
|---------------------------|-------------------|
| **Memory stream** | The real user's Mem0 memories + action logs + diary entries + profile changes, retrieved by time × importance × relevance |
| **Planning** | The Reality-Constrained Engine — plans generated inside real life structures, with the user as the sole owner of goals |
| **Reflection** | Data-driven weekly reconciliation (completion rates, gap changes, life events) producing insights that recalibrate future simulations — the system understands you better the longer you use it |

Memory is faithful (Mem0), planning is grounded (reality constraints), reflection feeds on real outcomes (actual progress). **That loop is what separates MyNext from every "AI chat" product.**

### 4.3 Geo-Social Context

With optional location consent (city-level granularity only), the simulation engine injects regional social context: local job-market conditions, cost of living, rising industries, and policy variables (hukou, housing eligibility). A user in Hangzhou with frontend skills gets branches about the city's rising AI-application sector rather than generic career advice.

## 5. Memory & Transparency

All AI memory is **visible and editable**: a "Memory Book" page shows everything the AI remembers, and users can delete any single memory. The AI proactively reconciles memory with the profile ("I noticed you mentioned leaving your job — shall we update your profile?"). Sensitive data (ID numbers, phone numbers) is intercepted before it ever reaches memory, and users are told not to enter it.

## 6. Compliance & Ethical Boundaries

MyNext is a **planning and reflection tool, not an oracle**:

- **No investment advice** — no specific securities or asset recommendations; all financial content is principle-based and clearly labeled as simulation
- **No medical or legal conclusions** — users are directed to professionals
- **No illegal paths** — system-level prompt constraints prohibit any simulation branch involving illegal or grey-zone actions; queries about "quick money" are redirected to skill growth and legitimate side-income paths
- **No pseudo-science claims** — the product speaks of "simulation, projection, sandbox" and explicitly states that life cannot be predicted
- **No overreach** — AI never sets goals, never moralizes, never says "you should have"; the user is always the director
- Full AI-content labeling per China's deep-synthesis regulations; WeChat content-security filtering on every input and output

## 7. Why MyNext Wins (Competition Highlights)

For the **2026 WeChat Mini Program Development Competition** (theme: *Coexisting with AI*):

1. **From "asking AI" to "AI simulating life"** — structured multi-branch futures with visualized timelines, not chat transcripts
2. **A closed loop: simulate → act → check in → recalibrate** — AI participates in life management end-to-end, powered by WeChat subscribe-message notifications
3. **Simulation-reality contrast** — a life diary lets the AI see where you actually are, dynamically correcting projections
4. **Memory that earns trust** — powered by Mem0, fully transparent, fully user-controlled
5. **Responsible AI by design** — user agency as a hard constraint, compliance as a feature, not an afterthought

## 8. Roadmap

| Phase | Scope |
|-------|-------|
| MVP (5 days) | Profile intake (dual mode) · branch simulation · action lists · daily check-ins via subscribe messages · content safety |
| Phase 2 | Parallel-life sandbox comparison · life diary analytics · geo-social data packs · weekly reconciliation insights |
| Phase 3 | Voice-first interaction · WeChat AI ecosystem (Skill/MCP) integration per the official developer guide · community features |

---

*MyNext — live your future in AI first, then come back and live today better.*