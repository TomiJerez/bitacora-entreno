const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const scope = 'https://www.googleapis.com/auth/drive.file';

function app({response = {access_token:'test-token', expires_in:3600, scope}, status = 200, popupError} = {}) {
  const calls = [], auth = [], storage = new Map();
  const window = {google:{accounts:{oauth2:{initTokenClient(config) {
    auth.push(config);
    return {requestAccessToken() {
      if(popupError) config.error_callback({type:popupError});
      else config.callback(response);
    }};
  }}}}};
  const context = {window, Blob, AbortController, Date, setTimeout, clearTimeout,
    navigator:{onLine:true},
    fetch:async (url, options) => {
      calls.push({url, options});
      return {ok:status === 200, status, json:async()=>({id:'backup-id',webViewLink:'https://drive.google.com/file/d/backup-id/view'})};
    },
    localStorage:{setItem:(k,v)=>storage.set(k,v)}
  };
  vm.runInNewContext(readFileSync(path.join(__dirname,'../drive-backup.js'),'utf8'), context);
  return {drive:window.BitacoraDrive, calls, auth, storage, context};
}
const payload = {app:'bitacora-entreno',version:2,exportedAt:'2026-10-23T18:00:00.000Z',template:{mon:{focus:'Pecho'}},sessions:{'2026-10-22':{exercises:[{name:'Press',weight:'42',done:true}]}}};

test('sube una copia JSON completa con permiso limitado y devuelve el archivo creado', async () => {
  const a = app();
  const result = await a.drive.save('public-client-id', payload, false);
  assert.equal(result.id, 'backup-id');
  assert.equal(a.auth[0].scope, scope);
  assert.equal(a.calls.length, 1);
  assert.match(a.calls[0].url, /^https:\/\/www.googleapis.com\/upload\/drive\/v3\/files\?uploadType=multipart/);
  assert.equal(a.calls[0].options.method, 'POST');
  assert.equal(a.calls[0].options.headers.Authorization, 'Bearer test-token');
  const body = await a.calls[0].options.body.text();
  assert.ok(body.includes(JSON.stringify(payload)));
  assert.match(body, /"name":"bitacora-.*\.json"/);
  assert.equal(a.storage.size, 0, 'el token no se persiste');
});
test('rechazo de consentimiento no sube ni confirma un respaldo', async () => {
  const a = app({response:{error:'access_denied'}});
  await assert.rejects(a.drive.save('client', payload, false), /permiso|autoriz/i);
  assert.equal(a.calls.length, 0);
});
test('permiso incompleto no permite enviar los datos', async () => {
  const a = app({response:{access_token:'token',expires_in:3600,scope:'openid'}});
  await assert.rejects(a.drive.save('client', payload, false), /permiso|autoriz/i);
  assert.equal(a.calls.length, 0);
});
test('ventana de Google cerrada libera la operación y permite reintentar', async () => {
  const a = app({popupError:'popup_closed'});
  await assert.rejects(a.drive.save('client', payload, false), /cancel|cerr/i);
  await assert.rejects(a.drive.save('client', payload, false), /cancel|cerr/i);
  assert.equal(a.calls.length, 0);
});
test('respuesta 401 invalida la autorización y no reintenta crear copias automáticamente', async () => {
  const a = app({status:401});
  await assert.rejects(a.drive.save('client', payload, false), /sesión|autoriz/i);
  await assert.rejects(a.drive.save('client', payload, false), /sesión|autoriz/i);
  assert.equal(a.auth.length, 2);
  assert.equal(a.calls.length, 2);
});
test('un fallo de Drive no se presenta como copia guardada', async () => {
  const a = app({status:500});
  await assert.rejects(a.drive.save('client', payload, false), /Drive/);
  assert.equal(a.calls.length, 1);
});
test('sin conexión no abre Google ni sube datos', async () => {
  const a = app(); a.context.navigator.onLine = false;
  await assert.rejects(a.drive.save('client', payload, false), /conexión/);
  assert.equal(a.calls.length, 0);
  assert.equal(a.auth.length, 0);
});
test('las copias del modo prueba quedan identificadas', async () => {
  const a = app(); await a.drive.save('client', payload, true);
  assert.match(await a.calls[0].options.body.text(), /"name":"bitacora-PRUEBA-/);
});
