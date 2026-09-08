import {db,check,required} from './runtime.ts';
import {renderCard} from './render.ts';
import {createProcessor} from './pipeline.js';
export const processMessage=createProcessor({db,check,required,renderCard,fetch:globalThis.fetch});
