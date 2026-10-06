/**
 * Opa! – servizio per la pagina admin (Google Apps Script)
 *
 * Salva i contenuti modificabili del sito (prezzi, chef, galleria, avviso, WhatsApp)
 * e carica le foto in una cartella del Google Drive di chi distribuisce lo script.
 *
 * ATTIVAZIONE (una volta sola, dal computer):
 *  1. Vai su https://script.google.com → "Nuovo progetto", chiamalo "Opa sito".
 *  2. Cancella il contenuto di Codice.gs e incolla tutto questo file. Salva.
 *  3. Ingranaggio "Impostazioni progetto" → in fondo "Proprietà script" → "Aggiungi proprietà":
 *       nome  ADMIN_PASSWORD   valore  (la password che userà Opa)
 *  4. "Esegui il deployment" → "Nuovo deployment" → tipo "App web":
 *       Esegui come: Me    Chi ha accesso: Chiunque
 *     Autorizza l'accesso a Drive quando richiesto e copia l'URL che termina con /exec.
 *  5. Incolla l'URL in config.js (CMS_URL) e pubblica config.js sul sito.
 *
 * La password non è scritta qui: resta solo nelle Proprietà script.
 */

const FOLDER_NAME = "Opa sito – foto";
const MAX_CONTENT = 8500; // limite di una proprietà script (9 KB)

function doGet() {
  const content = PropertiesService.getScriptProperties().getProperty("CONTENT") || "{}";
  return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const password = props.getProperty("ADMIN_PASSWORD");

    if (!password) return reply({ ok: false, error: "no_password_set" });
    if (req.password !== password) {
      Utilities.sleep(1500); // rallenta i tentativi a caso
      return reply({ ok: false, error: "wrong_password" });
    }

    switch (req.action) {
      case "check":
        return reply({ ok: true });

      case "save": {
        const content = sanitize(req.content || {});
        content.updatedAt = new Date().toISOString();
        const json = JSON.stringify(content);
        if (json.length > MAX_CONTENT) return reply({ ok: false, error: "too_big" });
        const lock = LockService.getScriptLock();
        lock.waitLock(10000);
        try { props.setProperty("CONTENT", json); } finally { lock.releaseLock(); }
        return reply({ ok: true, content });
      }

      case "upload": {
        const mime = /^image\/(jpeg|png|webp)$/.test(req.mime) ? req.mime : "image/jpeg";
        const bytes = Utilities.base64Decode(req.data);
        if (bytes.length > 5 * 1024 * 1024) return reply({ ok: false, error: "too_big" });
        const name = (req.name || "foto").replace(/[^\w.\- ]/g, "_").slice(0, 60);
        const file = getFolder().createFile(Utilities.newBlob(bytes, mime, name));
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return reply({ ok: true, url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1600" });
      }

      default:
        return reply({ ok: false, error: "unknown_action" });
    }
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

// Tiene solo i campi previsti, con lunghezze ragionevoli
function sanitize(c) {
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const url = v => (typeof v === "string" && /^https:\/\/[^\s"'<>]+$/.test(v) ? v.slice(0, 300) : "");
  const bi = (v, max) => ({ it: str(v && v.it, max), en: str(v && v.en, max) });
  return {
    whatsapp: str(c.whatsapp, 20).replace(/\D/g, ""),
    notice: bi(c.notice, 160),
    prices: [0, 1, 2].map(i => {
      const n = parseFloat(c.prices && c.prices[i]);
      return n > 0 && n < 10000 ? Math.round(n * 100) / 100 : null;
    }),
    priceNote: bi(c.priceNote, 60),
    chef: {
      name: str(c.chef && c.chef.name, 60),
      bio: bi(c.chef && c.chef.bio, 900),
      photo: url(c.chef && c.chef.photo)
    },
    gallery: [0, 1, 2, 3, 4, 5].map(i => {
      const g = (c.gallery && c.gallery[i]) || {};
      return { title: str(g.title, 40), photo: url(g.photo) };
    })
  };
}

function getFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
