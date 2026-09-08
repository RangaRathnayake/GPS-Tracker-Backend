'use strict';

const net = require('node:net');

const PORT = Number.parseInt(process.env.PORT || '5013', 10);
const HOST = process.env.HOST || '0.0.0.0';

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

let connectionNumber = 0;

function timestamp() {
  return new Date().toISOString();
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
  console.log(`\n[${timestamp()}] CONNECT #${id} ${client}`);

  socket.on('data', (chunk) => {
    console.log(`[${timestamp()}] DATA #${id} ${chunk.length} bytes`);
    console.log(`HEX: ${chunk.toString('hex')}`);

    textBuffer += chunk.toString('utf8');

    // H02 text frames end with '#'. One TCP chunk can contain a partial frame
    // or several frames, so retain unfinished data for the next chunk.
    let endIndex;
    while ((endIndex = textBuffer.indexOf('#')) !== -1) {
      const frame = textBuffer.slice(0, endIndex + 1).trim();
      textBuffer = textBuffer.slice(endIndex + 1);
      if (!frame) continue;

      console.log(`RAW: ${frame}`);
      const parsed = parseH02(frame);
      if (parsed) {
        console.log('BASIC:', JSON.stringify(parsed, null, 2));
      }
    }

    // Prevent an invalid/non-text client from growing memory indefinitely.
    if (textBuffer.length > 64 * 1024) {
      console.warn(`[${timestamp()}] Buffer cleared: no H02 frame terminator found`);
      textBuffer = '';
    }
  });

  socket.on('end', () => {
    if (textBuffer.trim()) console.log(`UNFINISHED: ${JSON.stringify(textBuffer)}`);
    console.log(`[${timestamp()}] END #${id} ${client}`);
  });

  socket.on('close', () => {
    console.log(`[${timestamp()}] CLOSE #${id} ${client}`);
  });

  socket.on('error', (error) => {
    console.error(`[${timestamp()}] SOCKET ERROR #${id}:`, error.message);
  });
});

server.on('error', (error) => {
  console.error(`[${timestamp()}] SERVER ERROR:`, error);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`GPS TCP logger listening on ${HOST}:${PORT}`);
  console.log('Waiting for SinoTrack / H02 packets...');
});

function shutdown(signal) {
  console.log(`\n${signal} received; closing server...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
