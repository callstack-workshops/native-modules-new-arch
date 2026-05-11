import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface NitroMapViewProps extends HybridViewProps {
  region?: Region;
  onRegionChange?: (region: Region) => void;
}

export interface NitroMapViewMethods extends HybridViewMethods {}

export type NitroMapView = HybridView<NitroMapViewProps, NitroMapViewMethods>;
