/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import BluetoothManager from './managers/BluetoothManager'

BluetoothManager.getInstance().init();

AppRegistry.registerComponent(appName, () => App);
