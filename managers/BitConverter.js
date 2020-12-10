import base64 from 'react-native-base64'
import { unpack } from 'byte-data';

export function readDoubleFromBase64(str, offset) {
    let byteCharacters = base64.decode(str);

    let byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    return unpack(byteNumbers, {bits: 64, fp: true}, offset);
}

export function readBoolFromBase64(str, offset) {
    let byteCharacters = base64.decode(str);

    if (byteCharacters.charCodeAt(offset) !== 0) {
        return true;
    } else {
        return false;
    }
}