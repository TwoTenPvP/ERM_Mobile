import { BleManager } from "react-native-ble-plx";
import {check, request, PERMISSIONS, RESULTS} from "react-native-permissions";
import base64 from 'react-native-base64'

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

  sendSyncNextFrame() {
    if (this.connectedDevice != null) {
      this.connectedDevice.writeCharacteristicWithResponseForService(this.ERM_SERVICE_UUID, this.SYNC_NEXT_FRAME_CHARACTERISTIC_UUID, base64.encode(String.fromCharCode(1))).then(() => {
        console.log("Wrote sync");
      }).catch((error) => {
        console.log("Failed sync " + error)
      }) 
    }
  }

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

  init() {
    this.checkPermissions(() => {
      this.bluetoothManager = new BleManager();

      this.bluetoothStateSubscription = this.bluetoothManager.onStateChange((state) => {
        console.log("New bluetooth adapter state: " + state);  
        this.onBluetoothStateChange(state)
      }, true);
    });
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

            this.syncNextFrame();
            /*
            device.monitorCharacteristicForService(this.ERM_SERVICE_UUID, this.LEAN_ANGLE_CHARACTERISTIC_UUID, (error, characteristic) => {
              if (error != null) {
                console.log("MonitorErrror: " + error);
              } else {
                console.log("CHARACTER VALUE: " + characteristic.value);

                const byteCharacters = base64.decode(characteristic.value);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                console.log(byteArray[0]);
                //setRotationValue(byteArray[0])
              }
            });
            */
          }).catch((error) => {
            console.log("Discover error: " + error);
          })
          
        }).catch((error) => {
          console.log("Error connecting: " + error);
        })
        
    });
  }
}