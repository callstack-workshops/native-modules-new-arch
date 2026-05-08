import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): { pi: number };
  add(a: number, b: number): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Math');
