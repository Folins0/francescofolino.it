import crypto from "crypto";

const FUSO_ORARIO = "Europe/Zurich";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleCalendarError extends Error {}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getCredenziali() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim().replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();

  if (!email || !privateKey || !calendarId) {
    throw new GoogleCalendarError(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY o GOOGLE_CALENDAR_ID mancanti nelle env var."
    );
  }

  return { email, privateKey, calendarId };
}

/** Ottiene un access token OAuth2 per l'account di servizio (JWT Bearer flow). */
async function getAccessToken(): Promise<string> {
  const { email, privateKey } = getCredenziali();
  const ora = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: TOKEN_URL,
    iat: ora,
    exp: ora + 3600,
  };

  const nonFirmato = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const firma = crypto.sign("RSA-SHA256", Buffer.from(nonFirmato), privateKey);
  const jwt = `${nonFirmato}.${base64url(firma)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new GoogleCalendarError(`Errore token Google: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

function aDataOra(giorno: string, ora: string): string {
  return `${giorno}T${ora.slice(0, 5)}:00`;
}

export interface DatiEvento {
  giorno: string; // YYYY-MM-DD
  oraInizio: string; // HH:MM o HH:MM:SS
  oraFine: string;
  titolo: string;
  descrizione?: string;
}

/** Crea un evento su Google Calendar e ritorna il suo id. */
export async function creaEvento(dati: DatiEvento): Promise<string> {
  const { calendarId } = getCredenziali();
  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: dati.titolo,
        description: dati.descrizione,
        start: { dateTime: aDataOra(dati.giorno, dati.oraInizio), timeZone: FUSO_ORARIO },
        end: { dateTime: aDataOra(dati.giorno, dati.oraFine), timeZone: FUSO_ORARIO },
      }),
    }
  );

  if (!res.ok) {
    throw new GoogleCalendarError(`Errore creazione evento Google: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.id as string;
}

/** Aggiorna un evento esistente su Google Calendar. */
export async function aggiornaEvento(eventId: string, dati: DatiEvento): Promise<void> {
  const { calendarId } = getCredenziali();
  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: dati.titolo,
        description: dati.descrizione,
        start: { dateTime: aDataOra(dati.giorno, dati.oraInizio), timeZone: FUSO_ORARIO },
        end: { dateTime: aDataOra(dati.giorno, dati.oraFine), timeZone: FUSO_ORARIO },
      }),
    }
  );

  if (!res.ok) {
    throw new GoogleCalendarError(`Errore aggiornamento evento Google: ${res.status} ${await res.text()}`);
  }
}

/** Elimina un evento da Google Calendar (già rimosso/inesistente = ok, non è un errore). */
export async function eliminaEvento(eventId: string): Promise<void> {
  const { calendarId } = getCredenziali();
  const token = await getAccessToken();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new GoogleCalendarError(`Errore eliminazione evento Google: ${res.status} ${await res.text()}`);
  }
}
