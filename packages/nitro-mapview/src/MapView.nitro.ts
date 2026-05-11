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

export interface MapViewProps extends HybridViewProps {
  region?: Region;
  onRegionChange?: (region: Region) => void;
}

export interface MapViewMethods extends HybridViewMethods {}

export type MapView = HybridView<MapViewProps, MapViewMethods>;
