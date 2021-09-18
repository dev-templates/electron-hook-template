import { BrowserWindow } from "electron";
import { mkdir, readFile, stat, writeFile } from "original-fs";
import { createDefaultLogger } from "./logger";
import * as path from "path";

const logger = createDefaultLogger('log/fetches.log');

export function catchFetches (win: BrowserWindow, cachePath: string, ignoreUrls: RegExp[]): void {
  try {
    win.webContents.debugger.attach('1.3');
  } catch (err) {
    logger.warn(`Debugger attach failed: ${err}`);
  }

  win.webContents.debugger.on('detach', (event, reason) => {
    logger.warn(`Debugger detached due to: ${reason}`);
  })

  win.webContents.debugger.sendCommand('Fetch.enable', { handleAuthRequests: false, patterns: [{ requestStage: 'Response' }] });
  win.webContents.debugger.on('message', (event, method, params) => {
    if (method == 'Fetch.requestPaused') {
      const requestId = params.requestId;
      const request = params.request;
      // let frameId = params.frameId;
      // let resourceType = params.resourceType;
      const uri = new URL(request.url);
      if (uri.protocol == 'file:') {
        // read local file
        // logger.info(`fetch: ${request.url} (local)`);
        win.webContents.debugger.sendCommand('Fetch.continueRequest', { requestId: requestId });
        return;
      }
      for (const exp of ignoreUrls) {
        if (exp.test(request.url)) {
          // in ignore list
          logger.info(`fetch: ${request.url} (ignore)`);
          win.webContents.debugger.sendCommand('Fetch.continueRequest', { requestId: requestId });
          return;
        }
      }
      // logger.info(`requestPaused: ${request.url}`);
      let filePath = `${uri.host}${uri.pathname}`;
      if (filePath[filePath.length - 1] == '/') {
        logger.info(`fetch: fix dir path ${filePath} => ${filePath}index.html`);
        filePath += 'index.html';
      }
      const fileFullPath = path.join(__dirname, `${cachePath}/${filePath}`);
      stat(fileFullPath, (e, s) => {
        if (e) {
          if (e.code != 'ENOENT') {
            logger.warn(`unknown error: ${e}`);
          }
          // local file not exists
          logger.info(`fetch: ${request.url} (expired)`);
          win.webContents.debugger.sendCommand('Fetch.getResponseBody', { requestId: requestId }).then(response => {
            const buf = response.base64Encoded ? Buffer.from(response.body, 'base64') : Buffer.from(response.body);
            mkdir(path.dirname(fileFullPath), { recursive: true }, e => {
              if (e && e.code != 'EEXIST') {
                // mkdir failed.
                logger.warn(`fetch: mkdir (${filePath}) failed. err: ${e}`);
                win.webContents.debugger.sendCommand('Fetch.failRequest', { requestId: requestId, errorReason: 'Failed' });
                return;
              }

              // mkdir ok
              writeFile(fileFullPath, buf, e => {
                if (e) {
                  logger.warn(`fetch: save (${filePath}) failed. err: ${e}`);
                  win.webContents.debugger.sendCommand('Fetch.failRequest', { requestId: requestId, errorReason: 'Failed' });
                  return
                }
                logger.info(`fetch: (${filePath}) saved`);
                win.webContents.debugger.sendCommand('Fetch.continueRequest', { requestId: requestId });
              });
            })
          }).catch(e => {
            logger.warn(`getResponseBody failed. ${e}`);
            console.log(params);
            win.webContents.debugger.sendCommand('Fetch.failRequest', { requestId: requestId, errorReason: 'Failed' });
          });
          return
        }
        // local file exists
        if (s.isFile() && s.size > 0) {
          // has valid body. override it
          readFile(fileFullPath, (err, data) => {
            if (err) {
              logger.error(`fetch: read (${filePath}) failed. err: ${err}`);
              win.webContents.debugger.sendCommand('Fetch.failRequest', { requestId: requestId, errorReason: 'Failed' });
              return;
            }
            logger.info(`fetch: ${request.url} (cached)`);
            win.webContents.debugger.sendCommand('Fetch.fulfillRequest', { requestId: requestId, responseCode: 200, body: data.toString('base64') });
          })
        } else {
          // no body response or HTTP 204 No Content
          win.webContents.debugger.sendCommand('Fetch.continueRequest', { requestId: requestId });
        }
      });
    }
  });
}
