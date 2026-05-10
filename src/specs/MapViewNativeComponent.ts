import type { ViewProps, HostComponent } from 'react-native';
import type {
  Double,
  DirectEventHandler,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type Region = Readonly<{
  latitude: Double;
  longitude: Double;
  latitudeDelta: Double;
  longitudeDelta: Double;
}>;

export interface NativeProps extends ViewProps {
  region?: Region;
  onRegionChange?: DirectEventHandler<Region>;
}

export default codegenNativeComponent<NativeProps>(
  'MapView',
) as HostComponent<NativeProps>;
