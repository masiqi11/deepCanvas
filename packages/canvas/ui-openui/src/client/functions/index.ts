import { colorFunctions } from './colors.ts'
import { dataFunctions } from './data.ts'
import { dateFunctions } from './dates.ts'
import { listFunctions } from './lists.ts'
import { numberFunctions } from './numbers.ts'
import { textFunctions } from './text.ts'

/**
 * Generic functions the model calls as @Name(args) to compute inside a page:
 * edit lists held in $variables, do the math, format text and dates, and
 * shape Query rows for charts. They are pure except @Random, @Pick, @Shuffle
 * and @Now. Bad arguments, or a throw, make a call evaluate to null.
 */
export const functions = [...listFunctions, ...numberFunctions, ...textFunctions, ...colorFunctions, ...dateFunctions, ...dataFunctions]
