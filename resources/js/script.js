// Global variables
let SERVO_POSITION = 3;
let MIN_SER_POS = 0;
let MAX_SER_POS = 4;

// UI elements

// Button connect
const connect = document.getElementById("connect");
const expand = document.getElementById("expand");
const contract = document.getElementById("contract");
//const disconnect = document.getElementById("disconnect");

const paired = document.getElementById("paired");

// Control ui 
const manual = document.getElementById("manual");
const auto = document.getElementById("auto");

// Up and Down servo
const up_servo = document.getElementById("up_pos");
const down_servo = document.getElementById("down_pos");

// Pos servo value
const posServo = document.getElementById("pos_srv");

// Acceleration XYZ ui elements
const acelXUI = document.getElementById("acx");
const acelYUI = document.getElementById("acy");
const acelZUI = document.getElementById("acz");

// Temperature and speed
const tempUI = document.getElementById("temperature");
const spedUI = document.getElementById("velocity");

/**
* BLE parameters
* Foil service 19b10000-e8f2-537e-4f6c-d104768a1214
* Mando characteristic 19b10002-e8f2-537e-4f6c-d104768a1214
* Servo characteristic 19b10001-e8f2-537e-4f6c-d104768a1214
*/

const serviceBLE        = '19b10000-e8f2-537e-4f6c-d104768a1214';
const posServoChar      = '19b10001-e8f2-537e-4f6c-d104768a1214';
const mandoChar         = '19b10002-e8f2-537e-4f6c-d104768a1214';

const acelXChar         = '19b10003-e8f2-537e-4f6c-d104768a1214';
const acelYChar         = '19b10004-e8f2-537e-4f6c-d104768a1214';
const acelZChar         = '19b10005-e8f2-537e-4f6c-d104768a1214';

const mandoServoChar    = '19b10006-e8f2-537e-4f6c-d104768a1214';
const tempChar          = '19b10007-e8f2-537e-4f6c-d104768a1214';
const speedChar         = '19b10008-e8f2-537e-4f6c-d104768a1214';

const defaultDeviceName =  "No terminal";
let deviceName = defaultDeviceName;

const terminal = new BluetoothTerminal();

// Selected device object cache
let deviceCache = null;
let charMandoCache = null;
let charServoCache = null;
let charAcelXCache = null;
let charAcelYCache = null;
let charAcelZCache = null;

let charMandoServoCache = null;
let charTempCache = null;
let charSpeedCache = null;

// Event listeners
connect.addEventListener("click", () => {
    connect.classList.add('active');
    connectTerminal();
});

expand.addEventListener("click", () => {
    document.documentElement.requestFullscreen();
    contract.classList.remove("not-visible");
    expand.classList.add("not-visible");
});

contract.addEventListener("click", ()=> {
    document.exitFullscreen();
    expand.classList.remove("not-visible");
    contract.classList.add("not-visible");

});

// disconnect.addEventListener("click", () => {
//     disconnect.classList.add("active");
//     disconnectTerminal();
// });


// Listeners

manual.addEventListener("click", () => {
    console.log("[MANUAL PULSE]");
    changeMando(0);
    posServo.textContent = SERVO_POSITION;
    manual.classList.add("btn-my-active");
    //manual.classList.add("active");
    auto.classList.remove("btn-my-active");
    up_servo.removeAttribute("disabled");
    down_servo.removeAttribute("disabled");

});

auto.addEventListener("click", () => {
    console.log("[AUTO PULSE]");
    auto.classList.add("btn-my-active");
    //auto.classList.add("active");
    manual.classList.remove("btn-my-active");
    up_servo.setAttribute("disabled", "true");
    down_servo.setAttribute("disabled", "true");
    changeMando(1);
    posServo.textContent = "-";
});

/**
 * Up servo listener
 */
up_servo.addEventListener("click", () => {
    
    if (SERVO_POSITION < MAX_SER_POS) {
        SERVO_POSITION++;
        changePosServo(SERVO_POSITION);
        posServo.textContent = SERVO_POSITION;
        console.log("[INFO] Subir posición servo", SERVO_POSITION);
    }

    if (SERVO_POSITION === MAX_SER_POS) {
        up_servo.setAttribute("disabled", "true");
    }

    if (SERVO_POSITION > MIN_SER_POS) {
        down_servo.removeAttribute("disabled");
    }

});

/**
 * Down servo listener
 */
down_servo.addEventListener("click", () => {
    if (SERVO_POSITION > MIN_SER_POS) {
        SERVO_POSITION--;
        changePosServo(SERVO_POSITION);
        posServo.textContent = SERVO_POSITION;
        console.log("[INFO] Bajar posición servo", SERVO_POSITION);
    }
    
    if (SERVO_POSITION === MIN_SER_POS) {
        down_servo.setAttribute("disabled", "true");
    }

    if (SERVO_POSITION < MAX_SER_POS) {
        up_servo.removeAttribute("disabled");
    }
    
});


// Bluetooth manager
const connectTerminal = (() => {
    return (deviceCache ? Promise.resolve(deviceCache): requestBluetoothDevice())
        .then(device => {
            connectDeviceAndCacheCharacteristic(device);
            connect.classList.add("not-visible");
            paired.classList.remove("not-visible");
        })
        .catch(error => console.log("[ERROR] connecting: ", error));
});

const disconnectTerminal = (() => {
    if (!deviceCache) {
      return;
    }
    console.log('[INFO] Disconnecting from Bluetooth Device...');
    if (deviceCache.gatt.connected) {
        deviceCache.gatt.disconnect();
    } else {
      console.log('[INFO] Bluetooth Device is already disconnected');
    }
});

const requestBluetoothDevice = (() => {
    console.log("[INFO] Conectando con el terminal");
    
    return navigator.bluetooth.requestDevice({ 
        filters: [{
            services: ['19b10000-e8f2-537e-4f6c-d104768a1214']
        }]
    })
    .then(device => {
        console.log('[INFO] "' + device.name + '" bluetooth device selected');
        deviceCache = device;
        
        // Reconnect function
        deviceCache.addEventListener('gattserverdisconnected', handleDisconnection);

        return deviceCache;
    });
});


// Connect to the device specified, get service and characteristic
const connectDeviceAndCacheCharacteristic = (device => {

    if (device.gatt.connected && charServoCache 
                              && charMandoCache 
                              && charAcelXCache
                              && charAcelYCache
                              && charAcelYCache
                              && charMandoServoCache
                              && charTempCache
                              && charSpeedCache) {
        
        const promServo = Promise.resolve(charServoCache);
        const promMando = Promise.resolve(charMandoCache);
        const promAcelX = Promise.resolve(charAcelXCache);
        const promAcelY = Promise.resolve(charAcelYCache);
        const promAcelZ = Promise.resolve(charAcelZCache);
        const promManServ  = Promise.resolve(charMandoServoCache);
        const promTemp  = Promise.resolve(charTempCache);
        const promSpeed = Promise.resolve(charSpeedCache);

        return Promise.all([promServo, promMando, promAcelX, promAcelY, 
            promAcelZ, promManServ, promTemp, promSpeed]);
    }

    console.log('[INFO ]Connecting to GATT server...');

    return device.gatt.connect().
        then(server => {
            console.log('[INFO] GATT server connected, getting service...');
            
            return server.getPrimaryService(serviceBLE);
        })
        .then(service => {
            console.log('[INFO] Service found, getting characteristics ...');
            
            service.getCharacteristic(posServoChar)
                .then(characteristic => {
                    console.log('[INFO] - SERVO Characteristic found');
                    charServoCache = characteristic;
                });
            
            service.getCharacteristic(mandoChar)
                .then(characteristic => {
                    console.log('[INFO] - MANDO Characteristic found');
                    charMandoCache = characteristic;
                });
            
            service.getCharacteristic(acelXChar)
                .then(characteristic => {
                    console.log('[INFO] - Acelerometer X Characteristic found');
                    startNotifications(characteristic);
                    charAcelXCache = characteristic;
                });
            
            service.getCharacteristic(acelYChar)
                .then(characteristic => {
                    console.log('[INFO] - Acelerometer Y Characteristic found');
                    startNotifications(characteristic);
                    charAcelYCache = characteristic;
                });
            
            service.getCharacteristic(acelZChar)
                .then(characteristic => {
                    console.log('[INFO] - Acelerometer Z Characteristic found');
                    startNotifications(characteristic);
                    charAcelZCache = characteristic;
                });
            
            service.getCharacteristic(mandoServoChar)
                .then(characteristic => {
                    console.log('[INFO] - Mando servo Characteristic found');
                    charMandoServoCache = characteristic;
                });

            service.getCharacteristic(tempChar)
                .then(characteristic => {
                    console.log('[INFO] - Temperature Characteristic found');
                    startNotifications(characteristic);
                    charTempCache = characteristic;
                });
            
            service.getCharacteristic(speedChar)
                .then(characteristic => {
                    console.log('[INFO] - Speed Characteristic found');
                    startNotifications(characteristic);
                    charSpeedCache = characteristic;
                });

            return charSpeedCache;

        });
        
}); 



// Enable the characteristic changes notification
const startNotifications = ((characteristic) => {
  
    const uuid = characteristic.uuid;
    console.log('[INFO] Starting notifications...' , uuid);

    return characteristic.startNotifications()
            .then((characteristic) => {
                console.log('[INFO] Notifications started char uuid: ' , uuid);
                console.log('[INFO] Association handling value change: ', uuid);
                characteristic.addEventListener('characteristicvaluechanged', 
                handleCharacteristicChanged);
            })
            .catch(error => "[ERROR] - Starting Notifications"); 

});


const handleDisconnection = (event => {
    let device = event.target;

    console.log('"' + device.name +
      '" [INFO] bluetooth device disconnected, trying to reconnect...');

    connectDeviceAndCacheCharacteristic(device)
        .then(console.log("[INFO] - Handle disconnection succesfull."))
        .catch(error => console.log("[ERROR] - Handling disconnection: " , error));

    // connectDeviceAndMandoCharacteristic(device)
    //     .then(characteristic => startNotifications(characteristic))
    //     .catch(error => console.log(error));
    
});


const changePosServo = ((data) => {

    console.log(data, 'out');

    if (charMandoServoCache && (data >= MIN_SER_POS && data <= MAX_SER_POS )) {
        charMandoServoCache.writeValue(Uint8Array.of(data));
    } else {
        console.log("[ERROR]: No hay dato: ", data);
    }
});


const changeMando = ((data) => {
    
    if (charMandoCache && data >= 0) {
        charMandoCache.writeValue(Uint8Array.of(data));
        console.log(data, 'out');
    }    
});


const writeToCharacteristic = ((characteristic, data) => {
    characteristic.writeValue(new TextEncoder().encode(data));
});


const  handleCharacteristicChanged  = (( event) => {
    const uuid = event.target.uuid;
    let value = event.target.value;
    value = value.buffer ? value : new DataView(value);
    value = value.getUint8(0);

    if (uuid === acelXChar) {
        acelXUI.textContent = value;
    } else if (uuid === acelYChar) {
        acelYUI.textContent = value;
    } else if (uuid === acelZChar) {
        acelZUI.textContent = value;
    } else if (uuid === tempChar) {
        tempUI.textContent = value;
    } else if (uuid === speedChar) {
        spedUI.textContent = value;
    } 

    //console.log('[EVENT TARGET] ', event.target);
    // TODO: Parse Heart Rate Measurement value.
    // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
});
