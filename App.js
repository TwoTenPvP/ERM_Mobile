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

  // Setup BLE manager
  useEffect(() => {
    BluetoothManager.getInstance().registerStateCallback(onStateChanged, true);

    return () => {
      BluetoothManager.getInstance().deregisterStateCallback(onStateChanged);
    }
  }, []);

  // Setup timer
  const [recordState, setRecordState] = useState({recording: false, file: false, socket: false, recordStartTime: 0});

  useEffect(() => {
    const timer = setInterval(() => {
      BluetoothManager.getInstance().readRecordingState((recording, file, socket, time) => {
        if (recording !== recordState.recording || file !== recordState.file || socket !== recordState.socket || (time !== 0 && Math.abs(recordState.recordStartTime - (((new Date().getTime() / 1000) - time))) > 5)) {
          console.log("Got new record state");
          setRecordState({recording: recording, file: file, socket: socket, recordStartTime: ((new Date().getTime() / 1000) - time)});
        }
      });
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  // Current record time
  const [recordTime, setRecordTime] = useState(0);

  useEffect(() => {
    let timer = null;

    if (recordState.recording) {
      timer = setInterval(() => {
        setRecordTime((new Date().getTime() / 1000) - recordState.recordStartTime);
      }, 1000);
    }
    
    return () => {
      clearInterval(timer);
    };
  });

  return (
    <>
      <SafeAreaView>
        <View style={styles.body}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>ERM</Text>
            {bluetoothState === "Unknown" && <Text style={styles.sectionValue}>Starting Bluetooth...</Text>}
            {bluetoothState === "Resetting" && <Text style={styles.sectionValue}>Bluetooth is restarting...</Text>}
            {bluetoothState === "Unsupported" && <Text style={styles.sectionValue}>This device does not support Bluetooth Low Energy. This is required for the app to work.</Text>}
            {bluetoothState === "Unauthorized" && <Text style={styles.sectionValue}>The app is not allowed to use Bluetooth Low Energy.</Text>}
            {bluetoothState === "PermissionBlocked" && <Text style={styles.sectionValue}>The app is not allowed to use Bluetooth Low Energy. Enable it by allowing the app to use your Location.</Text>}
            {bluetoothState === "PoweredOff" && <Text style={styles.sectionValue}>Bluetooth is not enabled. Enable to to continue.</Text>}
            {bluetoothState === "PoweredOn" && <Text style={styles.sectionValue}>Working...</Text>}
            {bluetoothState === "Scanning" && <Text style={styles.sectionValue}>Scanning for ERM...</Text>}
            {bluetoothState === "Connecting" && <Text style={styles.sectionValue}>Connecting to ERM...</Text>}
            {bluetoothState === "Connected" && <Text style={styles.sectionValue}>Connected to ERM!</Text>}
            {bluetoothState === "Connected" && !recordState.recording && <Text style={styles.sectionValue}>Not Recording</Text>}
            {bluetoothState === "Connected" && recordState.recording && <Text style={styles.sectionValue}>Recording {("0" + Math.floor(recordTime % (3600 * 24) / 3600)).slice(-2)}:{("0" + Math.floor(recordTime % 3600 / 60)).slice(-2)}:{("0" + Math.floor(recordTime % 60)).slice(-2)}</Text>}
            {bluetoothState === "Connected" &&
            <Button
              style={styles.sectionValue}
              onPress={() => BluetoothManager.getInstance().writeSyncNextFrame()}
              title="Syncronize Frame" />}
            {bluetoothState === "Connected" && !recordState.recording &&
            <Button
              style={styles.sectionValue}
              onPress={() => BluetoothManager.getInstance().writeRecordState(true, true, false, () => {
                console.log("Started recording");
                BluetoothManager.getInstance().readRecordingState((recording, file, socket, time) => {
                  setRecordState({recording: recording, file: file, socket: socket, recordStartTime: ((new Date().getTime() / 1000) - time)});
                });
              })}
              title="Start Recording" />}
            {bluetoothState === "Connected" && recordState.recording &&
            <Button
              style={styles.sectionValue}
              onPress={() => BluetoothManager.getInstance().writeRecordState(false, false, false, () => {
                console.log("Stopped recording");
                BluetoothManager.getInstance().readRecordingState((recording, file, socket, time) => {
                  setRecordState({recording: recording, file: file, socket: socket, recordStartTime: ((new Date().getTime() / 1000) - time)});
                });
              })}
              title="Stop Recording" />}
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
  sectionValue: {
    fontSize: 18,
    fontWeight: "400",
    alignItems: "center",
    textAlign: "center"
  }
});

export default App;
