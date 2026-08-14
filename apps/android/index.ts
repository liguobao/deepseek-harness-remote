import { registerRootComponent } from 'expo';
import * as ExpoCrypto from 'expo-crypto';
import { registerGlobals } from 'react-native-webrtc';

import App from './App';

if (globalThis.crypto?.getRandomValues === undefined) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      getRandomValues: ExpoCrypto.getRandomValues,
      randomUUID: ExpoCrypto.randomUUID,
    },
    configurable: true,
  });
}

registerGlobals();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
