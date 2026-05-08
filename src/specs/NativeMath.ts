import type { TurboModule } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): { pi: number };
  add(a: number, b: number): number;
  fetchScore(userId: string): Promise<number>;
  readonly onValueChanged: EventEmitter<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Math');
