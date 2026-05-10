import { NitroModules } from 'react-native-nitro-modules';
import type { Math as MathSpec } from './specs/Math.nitro';

// Construct the HybridObject once at module load time. Nitro returns the same
// underlying native instance on every call to createHybridObject for a given
// name, so this acts as a module-level singleton.
export const Math = NitroModules.createHybridObject<MathSpec>('Math');

// Re-export the type so consumers can annotate variables when needed.
export type { MathSpec as MathHybridObject };
