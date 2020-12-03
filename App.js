import React, { useState, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";
import {check, request, PERMISSIONS, RESULTS} from "react-native-permissions";
import BluetoothManager from './managers/BluetoothManager'
import {
  Platform,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Button,
  SectionList
} from "react-native";

const App = () => {
  // State
  const [bluetoothState, setBluetoothState] = useState("Unknown");

  function onStateChanged(state) {
    console.log("new state: " + state);
    setBluetoothState(state);
  }

  useEffect(() => {
    BluetoothManager.getInstance().registerStateCallback(onStateChanged, true);

    return () => {
      BluetoothManager.getInstance().deregisterStateCallback(onStateChanged);
    }
  }, []);

  return (
    <>
      <SafeAreaView>
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
            {bluetoothState === "Connected" &&
            <Button
              onPress={() => BluetoothManager.getInstance().sendSyncNextFrame()}
              title="Syncronize Frame" />}
            {bluetoothState === "Connected" &&
            <Button
              onPress={() => BluetoothManager.getInstance().readRecordingState((recording, file, socket) => {
                console.log("Got callback: " + recording + " " + file + " " + socket);
              })}
              title="Read Recording" />}
          </View>
        </View>
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
