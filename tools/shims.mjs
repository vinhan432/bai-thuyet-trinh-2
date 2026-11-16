// Minimal DOM shims so three.js loaders/exporters run under Node.
// No browser, no extra dependencies beyond what the project already has.

export function installShims() {
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
      URL: globalThis.URL,
    };
  }

  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis.window;
  }

  if (typeof globalThis.FileReader === 'undefined') {
    class FileReaderShim {
      constructor() {
        this.result = null;
        this.onload = null;
        this.onloadend = null;
        this.onerror = null;
        this.readyState = 0;
      }
      readAsArrayBuffer(blob) {
        blob
          .arrayBuffer()
          .then((buf) => {
            this.result = buf;
            this.readyState = 2;
            if (this.onload) this.onload({ target: this });
            if (this.onloadend) this.onloadend({ target: this });
          })
          .catch((err) => {
            if (this.onerror) this.onerror(err);
          });
      }
      readAsDataURL(blob) {
        blob
          .arrayBuffer()
          .then((buf) => {
            const b64 = Buffer.from(buf).toString('base64');
            this.result = `data:${blob.type || 'application/octet-stream'};base64,${b64}`;
            this.readyState = 2;
            if (this.onload) this.onload({ target: this });
            if (this.onloadend) this.onloadend({ target: this });
          })
          .catch((err) => {
            if (this.onerror) this.onerror(err);
          });
      }
      readAsText(blob) {
        blob
          .text()
          .then((t) => {
            this.result = t;
            this.readyState = 2;
            if (this.onload) this.onload({ target: this });
            if (this.onloadend) this.onloadend({ target: this });
          })
          .catch((err) => {
            if (this.onerror) this.onerror(err);
          });
      }
    }
    globalThis.FileReader = FileReaderShim;
  }

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement(tag) {
        if (tag === 'img') {
          return {
            width: 0,
            height: 0,
            set src(_v) {},
            get src() {
              return '';
            },
            addEventListener() {},
            removeEventListener() {},
          };
        }
        return {
          style: {},
          getContext() {
            return null;
          },
          addEventListener() {},
          removeEventListener() {},
        };
      },
      createElementNS() {
        return this.createElement('div');
      },
      addEventListener() {},
      removeEventListener() {},
    };
  }
}
