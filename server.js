'use strict';

const net = require('node:net');

const PORT = Number.parseInt(process.env.PORT || '5013', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SERVER_TIMEZONE = process.env.SERVER_TIMEZONE || 'Asia/Colombo';
const SECTION_LINE = '='.repeat(88);
const SUBSECTION_LINE = '-'.repeat(88);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

let connectionNumber = 0;
let packetNumber = 0;

function timeDetails(date = new Date()) {
  return {
    utc: date.toISOString(),
    server: new Intl.DateTimeFormat('en-CA', {
      timeZone: SERVER_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hourCycle: 'h23',
      timeZoneName: 'shortOffset'
    }).format(date)
  };
}

function eventLog(event, details) {
  const time = timeDetails();
  console.log(`\n${SUBSECTION_LINE}`);
  console.log(`EVENT       : ${event}`);
  console.log(`SERVER TIME : ${time.server} (${SERVER_TIMEZONE})`);
  console.log(`UTC TIME    : ${time.utc}`);
  console.log(details);
  console.log(SUBSECTION_LINE);
}

function parseH02(message) {
  if (!message.startsWith('*') || !message.endsWith('#')) return null;

  const fields = message.slice(1, -1).split(',');
  return {
    supplier: fields[0] || null,
    deviceId: fields[1] || null,
    command: fields[2] || null,
    fields
  };
}

const server = net.createServer((socket) => {
  const id = ++connectionNumber;
  const client = `${socket.remoteAddress}:${socket.remotePort}`;
  let textBuffer = '';

  socket.setKeepAlive(true, 30_000);
  eventLog('TRACKER CONNECTED', `CONNECTION  : #${id}\nCLIENT      : ${client}`);

  socket.on('data', (chunk) => {
    const receivedAt = new Date();
    const receivedTime = timeDetails(receivedAt);
    const chunkHex = chunk.toString('hex');

    textBuffer += chunk.toString('utf8');

    // H02 text frames end with '#'. One TCP chunk can contain a partial frame
    // or several frames, so retain unfinished data for the next chunk.
    let endIndex;
    while ((endIndex = textBuffer.indexOf('#')) !== -1) {
      const frame = textBuffer.slice(0, endIndex + 1).trim();
      textBuffer = textBuffer.slice(endIndex + 1);
      if (!frame) continue;

      const currentPacket = ++packetNumber;
      const parsed = parseH02(frame);

      console.log(`\n${SECTION_LINE}`);
      console.log(`GPS PACKET  : #${currentPacket}`);
      console.log(`CONNECTION  : #${id}`);
      console.log(`CLIENT      : ${client}`);
      console.log(`SERVER TIME : ${receivedTime.server} (${SERVER_TIMEZONE})`);
      console.log(`UTC TIME    : ${receivedTime.utc}`);
      console.log(`CHUNK SIZE  : ${chunk.length} bytes`);
      console.log(SUBSECTION_LINE);
      console.log('HEX');
      console.log(chunkHex);
      console.log(SUBSECTION_LINE);
      console.log('RAW H02 PACKET');
      console.log(frame);

      if (parsed) {
        console.log(SUBSECTION_LINE);
        console.log('BASIC PARSED DATA');
        console.log(JSON.stringify(parsed, null, 2));
      }
      console.log(`${SECTION_LINE}\n`);
    }

    // Prevent an invalid/non-text client from growing memory indefinitely.
    if (textBuffer.length > 64 * 1024) {
      eventLog('BUFFER CLEARED', 'No H02 frame terminator was found within 64 KiB.');
      textBuffer = '';
    }
  });

  socket.on('end', () => {
    if (textBuffer.trim()) console.log(`UNFINISHED: ${JSON.stringify(textBuffer)}`);
    eventLog('TRACKER ENDED CONNECTION', `CONNECTION  : #${id}\nCLIENT      : ${client}`);
  });

  socket.on('close', () => {
    eventLog('TRACKER CONNECTION CLOSED', `CONNECTION  : #${id}\nCLIENT      : ${client}`);
  });

  socket.on('error', (error) => {
    eventLog('SOCKET ERROR', `CONNECTION  : #${id}\nCLIENT      : ${client}\nERROR       : ${error.message}`);
  });
});

server.on('error', (error) => {
  eventLog('SERVER ERROR', `ERROR       : ${error.stack || error.message}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  eventLog(
    'GPS TCP LOGGER STARTED',
    `LISTENING   : ${HOST}:${PORT}\nTIMEZONE    : ${SERVER_TIMEZONE}\nSTATUS      : Waiting for SinoTrack / H02 packets...`
  );
});

function shutdown(signal) {
  console.log(`\n${signal} received; closing server...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
