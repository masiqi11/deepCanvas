// Checks that the demo model answers every scene keyword with that scene's fence.
// The fence bodies are the programs the ui-openui scene tests render without problems.
// Run: node --test deepcanvas/demo/mock-model.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { datedScene, sceneFor, sceneReply } from './mock-model.mjs'

const scenes = JSON.parse(readFileSync(new URL('../../packages/canvas/ui-openui/tests/fixtures/scene-programs.json', import.meta.url), 'utf8'))
const today = new Date(2026, 10, 12)

test('every keyword of a scene routes to a scene, and the first keyword routes to that scene', () => {
  for (const scene of scenes) {
    assert.equal(sceneFor(`请${scene.keywords[0]}一下`)?.id, scene.id, scene.id)
    for (const word of scene.keywords) assert.notEqual(sceneFor(word), undefined, `${scene.id}: ${word}`)
  }
})

test('a week plan prompt that mentions a paper still gets the week plan', () => {
  assert.equal(sceneFor('周三组会要讲论文，周五交课程设计……帮我排一下')?.id, 'scene-week-rolling')
})

test('prompts without keywords fall through to the other demo answers', () => {
  assert.equal(sceneFor('首都在哪里'), undefined)
})

test('a scene reply carries one openui fence with concrete dates', () => {
  for (const scene of scenes) {
    const [step] = sceneReply(scene, today)
    const fences = step.text.match(/```openui\n[\s\S]*?\n```/g) ?? []
    assert.equal(fences.length, 1, scene.id)
    assert.ok(fences[0].includes(datedScene(scene.code, today)), scene.id)
    assert.doesNotMatch(step.text, /\{\{D/, scene.id)
  }
})

test('dates are counted from the given day across a month boundary', () => {
  assert.equal(datedScene('"{{D+0}}" "{{D+19}}" "{{D-2}}"', today), '"2026-11-12" "2026-12-01" "2026-11-10"')
})
