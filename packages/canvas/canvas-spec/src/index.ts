/**
 * Canvas component vocabulary shared by the model tools and the Web client:
 * types, validation with path-specific problems, and calculator formulas.
 * @module @deepseek-ai/dsh-canvas-spec
 */
export type * from './types.ts'
export {
  BLOCK_TYPES, DEFAULT_LIMITS, validateBlock, validateBoard, validateInline, validateSection,
  type CanvasLimits, type Validation,
} from './validate.ts'
export { evaluateFormula, FormulaError, formulaNames, parseFormula, type FormulaNode } from './formula.ts'
