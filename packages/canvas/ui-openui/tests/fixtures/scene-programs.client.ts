// Mock answers that exercise every scene component with graduate-student data.
// The programs live in scene-programs.json, shared with the keyless demo model
// (deepcanvas/demo/mock-model.mjs). Dates are written as {{D+n}}: n days after
// a base day, which the tests fix at Thursday 2026-11-12 and the demo model
// sets to today.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Program } from './programs.client.ts'

/** One scenario: its program and the words that make the demo model answer with it. */
export type SceneProgram = Program & { keywords: string[]; intro: string }

// Specs run from the repository root; jsdom specs have no file: module URL to resolve against.
const FILE = resolve(process.cwd(), 'packages/canvas/ui-openui/tests/fixtures/scene-programs.json')
const raw = JSON.parse(readFileSync(FILE, 'utf8')) as SceneProgram[]

/**
 * Replace each {{D+n}} with the date n days after `base`, as YYYY-MM-DD.
 * @param code - program text with placeholders.
 * @param base - the day {{D+0}} stands for.
 * @returns the program with concrete dates.
 */
export function withDates(code: string, base: Date): string {
  return code.replace(/\{\{D([+-]\d+)\}\}/g, (_, offset: string) => {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(offset))
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  })
}

/** The base day of the tests' frozen clock. */
export const SCENE_BASE = new Date(2026, 10, 12)

/** One program per scenario, dated from {@link SCENE_BASE}; ids name the scenario. */
export const scenePrograms: SceneProgram[] = raw.map(program => ({ ...program, code: withDates(program.code, SCENE_BASE) }))
