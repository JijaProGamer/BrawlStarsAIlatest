const ref = require("ref-napi");
const os = require("os");
const ffi = require("ffi-rs");

const arch = os.arch();
const Struct = require("ref-struct-di")(ref);

const Input = Struct({
    type: "int",
    "???": "int", // Padding
    wVK: "short",
    wScan: "short",
    dwFlags: "int",
    time: "int",
    dwExtraInfo: "longlong"
});

const user32 = ffi.define({
    SendInput: {
      library: "user32",
      retType: ffi.DataType.I32,
      paramsType: [ffi.DataType.I32, ffi.DataType.I32, ffi.DataType.I32],
    },
    MapVirtualKeyExA: {
      library: "user32",
      retType: ffi.DataType.I32,
      paramsType: [ffi.DataType.I32, ffi.DataType.I32, ffi.DataType.I32],
    }
})

const extendedKeyPrefix = 0xe000;
const INPUT_KEYBOARD = 1;
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP = 0x0002;
const KEYEVENTF_UNICODE = 0x0004;
const KEYEVENTF_SCANCODE = 0x0008;

class KeyToggleOptions {
    constructor() {
        this.asScanCode = true;
        this.keyCodeIsScanCode = false;
        this.flags = 0;
        this.async = false;
    }
}

const entry = new Input();
entry.type = INPUT_KEYBOARD;
entry.time = 0;
entry.dwExtraInfo = 0;

function KeyToggle(keyCode = 65, type = "down", options = {}) {
    const opt = Object.assign({}, new KeyToggleOptions(), options);

    if (opt.asScanCode) {
        const scanCode = opt.keyCodeIsScanCode ? keyCode : ConvertKeyCodeToScanCode(keyCode);
        const isExtendedKey = (scanCode & extendedKeyPrefix) === extendedKeyPrefix;

        entry.dwFlags = KEYEVENTF_SCANCODE;
        if (isExtendedKey) {
            entry.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        }

        entry.wVK = 0;
        entry.wScan = isExtendedKey ? scanCode - extendedKeyPrefix : scanCode;
    } else {
        entry.dwFlags = 0;
        entry.wVK = keyCode;
        entry.wScan = 0;
    }

    if (opt.flags != null) {
        entry.dwFlags = opt.flags;
    }
    if (type == "up") {
        entry.dwFlags |= KEYEVENTF_KEYUP;
    }

    if (opt.async) {
        return new Promise((resolve, reject) => {
            user32.SendInput.async([1, entry.ref(), arch === "x64" ? 40 : 28], (error, result) => {
                if (error) reject(error);
                resolve(result);
            });
        });
    }
    return user32.SendInput(1, entry.ref(), arch === "x64" ? 40 : 28);
}

function KeyTap(keyCode, opt) {
    KeyToggle(keyCode, "down", opt);
    KeyToggle(keyCode, "up", opt);
}

function ConvertKeyCodeToScanCode(keyCode) {
    return user32.MapVirtualKeyExA([keyCode, 0, 0]);
}

module.exports = { ConvertKeyCodeToScanCode, KeyTap, KeyToggle };


/*const ffi = require("ffi-napi")
const ref = require("ref-napi")
const os = require("os")
const import_Struct = require("ref-struct-di")

var arch = os.arch();
const Struct = import_Struct(ref);

var Input = Struct({
    "type": "int",

    // For some reason, the wScan value is only recognized as the wScan value when we add this filler slot.
    // It might be because it's expecting the values after this to be inside a "wrapper" substructure, as seen here:
    //     https://msdn.microsoft.com/en-us/library/windows/desktop/ms646270(v=vs.85).aspx
    "???": "int",
     
    "wVK": "short",
    "wScan": "short",
    "dwFlags": "int",
    "time": "int",
    "dwExtraInfo": "int64"
});

var user32 = ffi.Library("user32", {
    SendInput: ["int", ["int", Input, "int"]],
    MapVirtualKeyExA: ["uint", ["uint", "uint", "int"]],
});

const extendedKeyPrefix = 0xe000;
const INPUT_KEYBOARD = 1;
const KEYEVENTF_EXTENDEDKEY = 0x0001;
const KEYEVENTF_KEYUP       = 0x0002;
const KEYEVENTF_UNICODE     = 0x0004;
const KEYEVENTF_SCANCODE    = 0x0008;
//const MAPVK_VK_TO_VSC = 0;

class KeyToggle_Options {
    asScanCode = true;
    keyCodeIsScanCode = false;
    flags = 0;
    async = false;
}

let entry = new Input();
entry.type = INPUT_KEYBOARD;
entry.time = 0;
entry.dwExtraInfo = 0;

function KeyToggle(keyCode=65, type="down", options={}) {
    const opt = Object.assign({}, new KeyToggle_Options(), options);
    
    if (opt.asScanCode) {
        let scanCode = opt.keyCodeIsScanCode ? keyCode : ConvertKeyCodeToScanCode(keyCode);
        let isExtendedKey = (scanCode & extendedKeyPrefix) == extendedKeyPrefix;

        entry.dwFlags = KEYEVENTF_SCANCODE;
        if (isExtendedKey) {
            entry.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        }

        entry.wVK = 0;
        entry.wScan = isExtendedKey ? scanCode - extendedKeyPrefix : scanCode;
    }
    // (virtual) key-code approach
    else {
        entry.dwFlags = 0;
        entry.wVK = keyCode;
        //info.wScan = 0x0200;
        entry.wScan = 0;
    }

    if (opt.flags != null) {
        entry.dwFlags = opt.flags;
    }
    if (type == "up") {
        entry.dwFlags |= KEYEVENTF_KEYUP;
    }

    if (opt.async) {
        return new Promise((resolve, reject)=> {
            user32.SendInput.async(1, entry, arch === "x64" ? 40 : 28, (error, result)=> {
                if (error) reject(error);
                resolve(result);
            });
        });
    }
    return user32.SendInput(1, entry, arch === "x64" ? 40 : 28);
}

export function KeyTap(keyCode, opt) {
    KeyToggle(keyCode, "down", opt);
    KeyToggle(keyCode, "up", opt);
}

export function ConvertKeyCodeToScanCode(keyCode) {
    //return user32.MapVirtualKeyExA(keyCode, MAPVK_VK_TO_VSC, 0);
    return user32.MapVirtualKeyExA(keyCode, 0, 0);
}

module.exports = { ConvertKeyCodeToScanCode, KeyTap, KeyToggle}*/