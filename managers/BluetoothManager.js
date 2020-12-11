import { BleManager } from "react-native-ble-plx";
import {check, request, PERMISSIONS, RESULTS} from "react-native-permissions";
import base64 from 'react-native-base64'
import { readDoubleFromBase64, readBoolFromBase64 } from './BitConverter'

export default class BluetoothManager {
  // Singleton
  static instance = null;

  /**
   * @returns {BluetoothManager}
   */
  static getInstance() {
    if (BluetoothManager.instance == null) {
      BluetoothManager.instance = new BluetoothManager();
    }

    return this.instance;
  }

  // Manager
  bluetoothManager = null;

  // Subscriptions
  bluetoothStateSubscription = null;
  bluetoothDeviceDisconnectSubscription = null;
  bluetoothScanSubscription = null;

  // Current working device
  connectedDevice = null;

  // Current state
  currentState = "Unknown";
  // State callbacks
  stateCallbacks = [];

  // UUIDS
  ERM_SERVICE_UUID = "723ad25e-1572-4d8e-a543-9e2d0020cdfa";
  LEAN_ANGLE_CHARACTERISTIC_UUID = "943edc10-a043-4379-bd51-5257b75b9c54";
  SYNC_NEXT_FRAME_CHARACTERISTIC_UUID = "a94cc3e5-8b2f-4244-9781-8ba98e148760";
  RECORDING_CHARACTERISTIC_UUID = "d25e46ac-2f7d-4f8b-990f-83952deb63e1";
  GPS_CHARACTERISTIC_UUID = "c756cf54-4fd1-48bb-a5c5-7d7fe997319a";

  // PUBLIC API
  registerStateCallback(callback, callOnReigster) {
    this.stateCallbacks.push(callback);

    if (callOnReigster) {
      callback(this.currentState);
    }
  }

  deregisterStateCallback(callback) {
    let index = this.stateCallbacks.indexOf(callback);
    if (index > -1) {
      this.stateCallbacks.splice(index, 1);
    }
  }

  writeSyncNextFrame() {
    if (this.connectedDevice != null) {
      let data = String.fromCharCode(1);

      this.connectedDevice.writeCharacteristicWithResponseForService(this.ERM_SERVICE_UUID, this.SYNC_NEXT_FRAME_CHARACTERISTIC_UUID, base64.encode(data)).then(() => {
        console.log("Wrote sync");
      }).catch((error) => {
        console.log("Failed sync " + error)
      });
    }
  }

  readRecordingState(callback) {
    if (this.connectedDevice != null) {
      this.connectedDevice.readCharacteristicForService(this.ERM_SERVICE_UUID, this.RECORDING_CHARACTERISTIC_UUID).then((characteristic) => {

        let isRecording = readBoolFromBase64(characteristic.value, 0);
        let useFrameFile = readBoolFromBase64(characteristic.value, 1);
        let useFrameSocket = readBoolFromBase64(characteristic.value, 2);
        let recordTime = readDoubleFromBase64(characteristic.value, 3);

        callback(isRecording, useFrameFile, useFrameSocket, recordTime);
      }).catch((error) => {
        console.log("Failed to read recording state: " + error);
      });
    }
  }

  readFix(callback) {
    if (this.connectedDevice != null) {
      this.connectedDevice.readCharacteristicForService(this.ERM_SERVICE_UUID, this.GPS_CHARACTERISTIC_UUID).then((characteristic) => {
        callback(readBoolFromBase64(characteristic.value, 0));
      }).catch((error) => {
        console.log("Failed to read gps state: " + error);
      });
    }
  }

  writeRecordState(record, useFrameFile, useFrameSocket, callback) {
    if (this.connectedDevice != null) {
      let data = String.fromCharCode(record == true ? 1 : 0) + String.fromCharCode(useFrameFile == true ? 1 : 0) + String.fromCharCode(useFrameSocket == true ? 1 : 0);

      this.connectedDevice.writeCharacteristicWithResponseForService(this.ERM_SERVICE_UUID, this.RECORDING_CHARACTERISTIC_UUID, base64.encode(data)).then(() => {
        callback();
      }).catch((error) => {
        console.log("Failed to write recording state: " + error);
      });
    }
  }

  init() {
    this.checkPermissions(() => {
      this.bluetoothManager = new BleManager();

      this.bluetoothStateSubscription = this.bluetoothManager.onStateChange((state) => {
        console.log("New bluetooth adapter state: " + state);  
        this.onBluetoothStateChange(state)
      }, true);
    });
  }

  // INTERNAL
  checkPermissions(successCallback) {
    if (Platform.OS == "android") {
      check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION).then((result) => {
        switch (result) {
          case RESULTS.DENIED:
            console.log("The permission has not been requested / is denied but requestable");
            request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, {
              title: "Allow Bluetooth Access",
              message: "ERM needs the location permission to use Bluetooth. This is required to communicate with the ERM.",
              buttonPositive: "Allow",
              buttonNegative: "Deny"
            }).then((results) => {
              if (results == RESULTS.GRANTED) {
                // Continue flow
                successCallback();
              } else {
                // Restart flow
                this.checkPermissions(successCallback);
              }
            }).catch((error) => {
              // TODO: Handle
              console.log("Failed to request Bluetooth permissions: " + error);
            });
            break;
            case RESULTS.UNAVAILABLE:
              console.log("This feature is not available (on this device / in this context). Assuming we are GRANTED");
              this.setCurrentState("Unsupported");
              this.checkPermissions(successCallback);
            case RESULTS.GRANTED:
              console.log("The permission is granted");
              successCallback();
              break;
            case RESULTS.BLOCKED:
              console.log("The permission is denied and not requestable anymore");
              this.setCurrentState("PermissionBlocked");
              this.checkPermissions(successCallback);
              break;
        }
      }).catch((error) => {
        // TODO: Handle
        console.log("Failed to check location permissions: " + error);
      });
    } else {
      successCallback();
    }
  }

  onBluetoothStateChange(state) {
    this.setCurrentState(state);
    
    if (state === "PoweredOn") {
      this.scanAndConnect();
    }
  }

  setCurrentState(state) {
    this.currentState = state;

    for (let i = 0; i < this.stateCallbacks.length; i++) {
      this.stateCallbacks[i](state);
    }
  }

  scanAndConnect() {
    // Only scan for this service
    uuids = [this.ERM_SERVICE_UUID];

    this.setCurrentState("Scanning");

    this.bluetoothScanSubscription = this.bluetoothManager.startDeviceScan(uuids, null, (error, device) => {
        if (error) {
            // Handle error (scanning will be stopped automatically)
            console.log("Error scanning: " + error);
            this.bluetoothScanSubscription = null;
            return;
        }

        this.setCurrentState("Connecting");

        console.log("Found device: " + device.name);

        this.bluetoothManager.stopDeviceScan();

        this.bluetoothManager.connectToDevice(device.id).then((device) => {
          // Set the connected device
          this.connectedDevice = device;

          this.bluetoothDeviceDisconnectSubscription = this.bluetoothManager.onDeviceDisconnected(device.id, (error, device) => {
            if (this.connectedDevice != null &&  this.connectedDevice.id === device.id) {
              // Device was disconnected
              if (error) {
                console.log("Device disconnected due to: " + error);
              } else {
                console.log("Device " + device.id + " disconnected");
              }

              // Remove disconnect subscription
              if (this.bluetoothDeviceDisconnectSubscription != null) {
                this.bluetoothDeviceDisconnectSubscription.remove();
              }

              // Remove the connected device
              this.connectedDevice = null;

              // Restart scanning
              this.scanAndConnect();
            }
          });

          
          device.discoverAllServicesAndCharacteristics().then(() => {
            // When everything is discovered. We are connected
            this.setCurrentState("Connected");
          }).catch((error) => {
            console.log("Discover error: " + error);
            this.scanAndConnect();
          })
          
        }).catch((error) => {
          console.log("Error connecting: " + error);
          this.scanAndConnect();
        })
        
    });
  }
}