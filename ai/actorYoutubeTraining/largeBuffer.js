const { Writable } = require('stream');

class LargeBuffer extends Writable {
  constructor() {
    super();
    this.buffers = [];
    this.totalSize = 0;
    this.maxBufferSize = 2 * 1024 * 1024 * 1024;
    this.currentLength = 0;
    this._ensureCapacity(0);
  }

  _ensureCapacity(size) {
    while (size >= this.totalSize) {
      try {
        const newBuffer = Buffer.allocUnsafe(this.maxBufferSize);
        this.buffers.push(newBuffer);
        this.totalSize += this.maxBufferSize;
      } catch (e) {
        console.error('Failed to allocate buffer:', e);
        throw new Error('Unable to allocate more buffers. The system may be out of memory.');
      }
    }
  }

  _write(chunk, encoding, callback) {
    const offset = this.currentLength;
    this._ensureCapacity(offset + chunk.length);
    this.writeToLargeBuffer(offset, chunk);

    this.currentLength += chunk.length;
    callback();
  }

  writeToLargeBuffer(position, data) {
    let bytesWritten = 0;

    while (bytesWritten < data.length) {
      const bufferIndex = Math.floor(position / this.maxBufferSize);
      const bufferOffset = position % this.maxBufferSize;
      const buffer = this.buffers[bufferIndex];
      const writeLength = Math.min(data.length - bytesWritten, buffer.length - bufferOffset);

      data.copy(buffer, bufferOffset, bytesWritten, bytesWritten + writeLength);
      bytesWritten += writeLength;
      position += writeLength;
    }
  }

  readFromLargeBuffer(position, length) {
    let bytesRead = 0;
    const result = Buffer.alloc(length);

    while (bytesRead < length) {
      const bufferIndex = Math.floor(position / this.maxBufferSize);
      const bufferOffset = position % this.maxBufferSize;
      const buffer = this.buffers[bufferIndex];
      const readLength = Math.min(length - bytesRead, buffer.length - bufferOffset);

      buffer.copy(result, bytesRead, bufferOffset, bufferOffset + readLength);
      bytesRead += readLength;
      position += readLength;
    }

    return result;
  }

  get(index) {
    const bufferIndex = Math.floor(index / this.maxBufferSize);
    const bufferOffset = index % this.maxBufferSize;
    return this.buffers[bufferIndex][bufferOffset];
  }

  set(index, value) {
    const bufferIndex = Math.floor(index / this.maxBufferSize);
    const bufferOffset = index % this.maxBufferSize;
    this.buffers[bufferIndex][bufferOffset] = value;
  }

  get length() {
    return this.currentLength;
  }
}

module.exports = LargeBuffer