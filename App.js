import React, { useState, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";
import base64 from 'react-native-base64'
import {check, request, PERMISSIONS, RESULTS} from "react-native-permissions";
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
} from "react-native";

const App = () => {
  // State
  const [bluetoothState, setBluetoothState] = useState("Unknown");
  const [rotationValue, setRotationValue] = useState(0);

  let stateSubscription = null;
  let scanSubscription = null;
  let bluetoothManager = null;
  let isCancelled = false;
  let connectedDevice = null;
  let deviceDisconnectedSubscription = null;

  useEffect(() => {
    isCancelled = false;

    console.log("Requesting permission ACCESS_FINE_LOCATION")
    check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
    .then((result) => {
      if (!isCancelled) {
        switch (result) {
          case RESULTS.DENIED:
            console.log("The permission has not been requested / is denied but requestable");
            request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, {
              title: "Allow Bluetooth Access",
              message: "ERM needs the location permission to use Bluetooth. This is required to communicate with the ERM.",
              buttonPositive: "Allow",
              buttonNegative: "Deny"
            }).then((results) => {
              if (!isCancelled) {
                startBluetooth();
              }
            });
            break;
          case RESULTS.UNAVAILABLE:
            console.log("This feature is not available (on this device / in this context). Assuming we are GRANTED");
          case RESULTS.GRANTED:
            console.log("The permission is granted");
            startBluetooth();
            break;
          case RESULTS.BLOCKED:
            console.log("The permission is denied and not requestable anymore");
            setBluetoothState("PermissionBlocked");
            break;
        }
      }
    });

    function startBluetooth() {
      console.log("Starting bluetooth");

      bluetoothManager = new BleManager()

      stateSubscription = bluetoothManager.onStateChange((state) => {
        if (!isCancelled) {
          console.log("New state: " + state);
          setBluetoothState(state);
          if (state === "PoweredOn") {
              scanAndConnect(bluetoothManager);
              setBluetoothState("Scanning")
          }
        }
      }, true);
    }

    return () => {
      isCancelled = true;

      if (stateSubscription != null) {
        stateSubscription.remove();
        stateSubscription = null;
      }

      if (scanSubscription != null) {
        scanSubscription.remove();
        scanSubscription = null;
      }

      if (bluetoothManager != null) {
        bluetoothManager.stopDeviceScan();
        bluetoothManager = null;
      }

      if (connectedDevice != null) {
        connectedDevice.cancelConnection();
        connectedDevice = null;
      }

      if (deviceDisconnectedSubscription != null) {
        deviceDisconnectedSubscription.remove()
        deviceDisconnectedSubscription = null;
      }
    }
  }, []);

  function scanAndConnect(bluetoothManager) {
    // Only scan for this service
    uuids = ["723ad25e-1572-4d8e-a543-9e2d0020cdfa"];

    setBluetoothState("Scanning");

    scanSubscription = bluetoothManager.startDeviceScan(uuids, null, (error, device) => {
        if (error) {
            // Handle error (scanning will be stopped automatically)
            console.log("Error scanning: " + error);
            return;
        }

        if (isCancelled) {
          return;
        }

        setBluetoothState("Connecting");

        console.log("Found device: " + device.name);

        bluetoothManager.stopDeviceScan();

        bluetoothManager.connectToDevice(device.id).then((device) => {
          console.log("Connected");
          if (!isCancelled) {
            deviceDisconnectedSubscription = bluetoothManager.onDeviceDisconnected(device.id, (error, device) => {
              if (error) {
                console.log("Device disconnected due to: " + error);
              }

              console.log("Device " + device.id + " disconnected");
            });
            connectedDevice = device;

            setBluetoothState("Connected")

            device.discoverAllServicesAndCharacteristics().then(() => {
              device.monitorCharacteristicForService("723ad25e-1572-4d8e-a543-9e2d0020cdfa", "943edc10-a043-4379-bd51-5257b75b9c54", (error, characteristic) => {
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
                  setRotationValue(byteArray[0])
                }
              });
            }).catch((error) => {
              console.log("monitor error: " + error);
            })
          }
        }).catch((error) => {
          console.log("Error connecting: " + error);
        })
        
    });
  }

  return (
    <>
      <SafeAreaView>
        <ScrollView ontentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
          <View style={styles.body}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>ERM</Text>
              {bluetoothState === "Unknown" && <Text style={styles.sectionStatus}>Starting Bluetooth...</Text>}
              {bluetoothState === "Resetting" && <Text style={styles.sectionStatus}>Bluetooth is restarting...</Text>}
              {bluetoothState === "Unsupported" && <Text style={styles.sectionStatus}>This device does not support Bluetooth Low Energy. This is required for the app to work.</Text>}
              {bluetoothState === "Unauthorized" && <Text style={styles.sectionStatus}>The app is not allowed to use Bluetooth Low Energy.</Text>}
              {bluetoothState === "PermissionBlocked" && <Text style={styles.sectionStatus}>The app is not allowed to use Bluetooth Low Energy. Enable it by allowing the app to use your Location.</Text>}
              {bluetoothState === "PoweredOff" && <Text style={styles.sectionStatus}>Bluetooth is not enabled. Enable to to continue.</Text>}
              {bluetoothState === "PoweredOn" && <Text style={styles.sectionStatus}>Working...</Text>}
              {bluetoothState === "Scanning" && <Text style={styles.sectionStatus}>Scanning for ERM...</Text>}
              {bluetoothState === "Connecting" && <Text style={styles.sectionStatus}>Connecting to ERM...</Text>}
              {bluetoothState === "Connected" && <Text style={styles.sectionStatus}>Connected to ERM!</Text>}
              {bluetoothState === "Connected" && <Text stlye={styles.sectionRotation}>Current Lean Angle:{rotationValue}°</Text>}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
  },
  engine: {
  },
  body: {
  },
  sectionRotation: {
    fontSize: 18,
    alignItems: "center",
    textAlign: "center"
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 38,
    fontWeight: "600",
    alignItems: "center"
  },
  sectionStatus: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
    alignItems: "center",
    textAlign: "center"
  },
  highlight: {
    fontWeight: "700",
  },
  footer: {
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
    paddingRight: 12,
    textAlign: "right",
  },
});

export default App;
