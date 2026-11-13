# Agent Note: DeepCanvas research assistant

Status: proposed

English | [中文](2026-11-13-deepcanvas-research-assistant.zh.md)

## Problem

DeepCanvas answers in the reply with live interfaces written as `openui` fences, and publishes long results to versioned boards. Every answer stands alone: the plan a student accepts on Monday, the papers they read, and the concepts they learned are gone in the next conversation, and the application never raises anything on its own. Graduate students need help with three recurring problems: getting into an unfamiliar field, keeping up with papers, and fitting work around deadlines. An assistant for them needs answers that are interfaces, a record of the student's tasks, papers and learning that outlives a conversation, and reminders derived from that record.

The full task breakdown, evaluation protocol and course deliverables live in [deepcanvas/PLAN.md](../../../../deepcanvas/PLAN.md).

## Proposal

### Scene components

Ten finished components in `ui-openui` cover the recurring needs: `WeekPlan`, `Roadmap`, `Countdown`, `Timeline`, `ReadingList`, `ConceptMap`, `PaperBrief`, `FollowUps`, `Quiz` and `Decision`. The model passes data; the component owns layout, copy and controls. Prompt rules name the need each component fits and when a question stays plain text. Each component splits into a view that takes data, state and callbacks, and a thin `defineComponent` binding, so the same view renders in a reply and on a page.

State that the user changes inside a scene (ticks, moves, answers, weights) is stored as a named page field through `useStateField`. The field survives a remount of the fence and travels with any `@ToAssistant` message, so "re-plan from what I changed" reaches the model as data.

### One record of the student's data

A Host package opens a storage domain named `assistant` through `ctx.storageDomain` and serves it to the client as a Typert Remote service that emits a change notification after every commit. The domain holds the profile, tasks with separate planned and due dates, weekly fixed slots, papers, fields and concepts, quiz attempts, and reminder state.

A scene in a reply is a proposal until the user adopts it: adopted items receive ids, and later ticks and moves on items with ids write back to the record. A view showing the record and a reply showing the same items therefore agree.

### What the model sees

The model reads and writes the record through at most four tools, whose calls and results are logged like any tool call. Each turn also carries a short summary (today's date and weekday, the student's field and stage, today's tasks, the nearest deadlines) registered with `ctx.systemPrompt.context`, which logs it as a runtime-context snapshot and leaves the cached system prompt unchanged. The summary has a configurable size limit and is omitted when the record is empty. A new context order name is the one change to `packages/core/system-prompt`.

### Pages and reminders

A client package registers Today, Week, Learning, Papers and My data pages through the `main` slot and `sidebar.panellist`, and selects Today on start with `ctx.layout.selectPanel`. A rule engine, a pure function of the record and the current time, computes reminders such as deadline risk, unfinished work from yesterday, overloaded days and reading that has fallen behind. It never calls the model; a reminder's action either edits the record locally or opens a conversation with the relevant data.

## Alternatives considered

**Keep each answer independent and rely on the conversation history.** Rejected: history is per conversation, so the second conversation knows nothing, and the student cannot see or edit what the assistant believes.

**Store the record in browser storage.** Rejected: it is lost with the browser profile, and neither the Host nor the model can read it.

**Record the student's data as session events.** Rejected: a Session log cannot be queried from another conversation, and new event types oblige changes to both SDK projections and the session format catalog.

**Put the whole record into the system prompt.** Rejected: it grows without bound and changes on every edit, which breaks the prompt cache that currently hits about 98% of input tokens.

**Let the model compute reminders on open.** Rejected: each open would wait tens of seconds, cost tokens and could fail, and the result could not be tested deterministically.

**Save every plan the model writes.** Rejected: casual questions would fill the record with drafts. Adoption is one click.

**Add a hero body slot for the landing view.** Rejected after reading `ctx.layout.selectPanel`, which selects a registered page without changing upstream code.

## Acceptance criteria

- The story in the plan (a new field, a paper, a week plan adopted, a reminder acted on the next day, a quiz) runs end to end with the mock model and sample data, and with the real model.
- A fact saved in one conversation is answered in a new conversation without the student repeating it.
- Ticking an item in a reply or on a page shows the same state in the other place after a reload.
- Scene choice, clean rendering, plan constraints, verifiable sources and recall meet the targets in the plan, measured by the evaluation protocol in `deepcanvas/eval/`.

## Risks

- Ten or more scenes can be confused with one another by the model; the evaluation reports a confusion table, and scenes that do not earn their place are removed.
- The reference prompt grows with every scene, which slows the first token; a length test caps it.
- The storage domain format will change while the product is young; the domain carries a version and a migration entry.
- Papers and dates the model writes can be invented; sources must come from tool results and unverified items are marked in the interface.
- The plan gives up background model calls, push notifications, synchronization between devices and programming-specific scenes.
