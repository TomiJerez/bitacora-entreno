/* Respaldo manual a Drive. El token vive sólo en memoria; nunca en localStorage. */
(function(){
  'use strict';
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var sdkPromise = null, token = '', expiresAt = 0, busy = false;

  function ready(){
    return !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  }
  function prepare(){
    if(ready()) return Promise.resolve();
    if(sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function(resolve, reject){
      var script = document.createElement('script');
      var timer = setTimeout(function(){ finish(new Error('Google no respondió. Revisá tu conexión y reintentá.')); }, 15000);
      function finish(err){
        clearTimeout(timer);
        script.onload = script.onerror = null;
        if(err){ script.remove(); sdkPromise = null; reject(err); }
        else resolve();
      }
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = function(){ finish(ready() ? null : new Error('No se pudo cargar Google. Reintentá.')); };
      script.onerror = function(){ finish(new Error('No se pudo conectar con Google. Revisá tu conexión.')); };
      document.head.appendChild(script);
    });
    return sdkPromise;
  }
  function authorize(clientId){
    if(token && Date.now() < expiresAt) return Promise.resolve(token);
    if(!clientId) return Promise.reject(new Error('Falta configurar la conexión con Google Drive.'));
    if(!ready()) return Promise.reject(new Error('Google todavía no está listo. Reintentá.'));
    return new Promise(function(resolve, reject){
      var client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        include_granted_scopes: false,
        callback: function(response){
          if(response.error || !response.access_token || (response.scope || '').split(' ').indexOf(SCOPE) === -1){
            reject(new Error('No se autorizó el permiso para guardar en Drive.'));
            return;
          }
          token = response.access_token;
          expiresAt = Date.now() + Math.max(0, Number(response.expires_in || 0) - 60) * 1000;
          resolve(token);
        },
        error_callback: function(error){
          reject(new Error(error.type === 'popup_closed' ? 'Se canceló la conexión con Google.' : 'No se pudo abrir Google. Permití las ventanas emergentes y reintentá.'));
        }
      });
      client.requestAccessToken({prompt:''});
    });
  }
  async function save(clientId, payload, testMode){
    if(busy) throw new Error('Ya hay una copia en curso.');
    if(navigator.onLine === false) throw new Error('Necesitás conexión para guardar en Drive.');
    busy = true;
    try{
      // Se pide autorización dentro del toque del usuario, sin cargar scripts antes.
      var accessToken = await authorize(clientId);
      var stamp = new Date().toISOString().replace(/[:.]/g, '-');
      var name = 'bitacora-' + (testMode ? 'PRUEBA-' : '') + stamp + '.json';
      var boundary = 'bitacora_' + Date.now();
      var metadata = {name:name, mimeType:'application/json'};
      var body = new Blob([
        '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n',
        JSON.stringify(payload), '\r\n--' + boundary + '--\r\n'
      ], {type:'multipart/related; boundary=' + boundary});
      var controller = new AbortController();
      var timer = setTimeout(function(){ controller.abort(); }, 30000);
      try{
        var response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
          method:'POST', headers:{Authorization:'Bearer ' + accessToken}, body:body, signal:controller.signal
        });
        if(response.status === 401){ token = ''; expiresAt = 0; throw new Error('Venció la sesión de Google. Tocá Guardar en Drive para volver a autorizar.'); }
        if(!response.ok) throw new Error('Drive no pudo guardar la copia (error ' + response.status + '). Reintentá.');
        var file = await response.json();
        if(!file.id) throw new Error('Drive no confirmó el archivo. Revisá tu Drive antes de reintentar.');
        return file;
      } catch(error){
        if(error.name === 'AbortError') throw new Error('Drive demoró demasiado. Revisá tu Drive antes de reintentar.');
        if(error instanceof TypeError) throw new Error('Se cortó la conexión. Revisá tu Drive antes de reintentar.');
        throw error;
      } finally { clearTimeout(timer); }
    } finally { busy = false; }
  }
  window.BitacoraDrive = {prepare:prepare, save:save};
})();
