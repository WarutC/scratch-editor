// extension_spark_command_report.js — a Sparky COMMAND block must not report a value.
// execute.js shows String(returnValue) in a bubble when a stack-clicked block returns anything but
// undefined, so a command that returned the middleware reply object showed "[object Object]" (and a
// disconnected board's null showed "null").
const test = require('tap').test;
const Scratch3SparkBlocks = require('../../src/extensions/scratch3_spark/index.js');

const makeExt = ({connected, reply}) => {
    const runtime = {
        registerPeripheralExtension: () => {},
        emit: () => {},
        constructor: {PERIPHERAL_CONNECTED: 'c', PERIPHERAL_DISCONNECTED: 'd'},
        currentMSecs: 1000
    };
    const ext = new Scratch3SparkBlocks(runtime);
    ext._peripheral.isConnected = () => connected;
    // Same contract as the real send(): the reply object when connected, null when not.
    ext._peripheral.send = () => Promise.resolve(connected ? reply : null);
    return ext;
};

// Arguments that exercise each command's send path (menu values are valid).
const COMMAND_ARGS = {
    setLedColor: {WHICH: 'both', COLOR: 'green'},
    setLedBrightness: {WHICH: 'both', BRIGHTNESS: 128},
    playTone: {FREQ: 440, DUR: 500},
    stopBuzzer: {},
    setImuFusion: {ALGO: 'kalman'},
    setShakeSensitivity: {LEVEL: 2},
    setMicThreshold: {LEVEL: 2},
    setLightThreshold: {LEVEL: 2},
    setTofThreshold: {LEVEL: 2},
    setQrScan: {STATE: 'on'}
};

test('every Sparky command block is covered by this test', t => {
    const ext = makeExt({connected: true, reply: {status: 'ok'}});
    const commands = ext.getInfo().blocks
        .filter(b => typeof b === 'object' && b.blockType === 'command')
        .map(b => b.opcode);
    t.same(commands.sort(), Object.keys(COMMAND_ARGS).sort(), 'COMMAND_ARGS lists exactly the command opcodes');
    t.end();
});

for (const connected of [true, false]) {
    test(`Sparky commands resolve to undefined (${connected ? 'connected' : 'disconnected'})`, async t => {
        const ext = makeExt({connected, reply: {status: 'ok', pin: 2}});
        t.teardown(() => ext._peripheral._clearQrHintTimer());
        for (const [opcode, args] of Object.entries(COMMAND_ARGS)) {
            const result = await ext[opcode](args);
            t.equal(typeof result, 'undefined', `${opcode} reports nothing`);
        }
        t.end();
    });
}

test('Sparky commands with an invalid argument also report nothing', async t => {
    const ext = makeExt({connected: true, reply: {status: 'ok'}});
    t.equal(typeof await ext.setImuFusion({ALGO: 'bogus'}), 'undefined', 'unknown fusion algorithm');
    t.equal(typeof await ext.setShakeSensitivity({LEVEL: 9}), 'undefined', 'shake level out of range');
    t.equal(typeof await ext.setMicThreshold({LEVEL: 9}), 'undefined', 'threshold level out of range');
    t.end();
});
