import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BuonoRow, BuonoStato, BuonoTipo } from "@/types/database";
import type {
  BuonoConServizio,
  BuonoCreateResponse,
  BuonoDeleteResponse,
  BuoniListResponse,
  BuonoUpdateResponse,
} from "@/types/buoni";

const ALFABETO_CODICE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza caratteri ambigui (0/O, 1/I)

function generaCodice(): string {
  let suffisso = "";
  for (let i = 0; i < 6; i++) {
    suffisso += ALFABETO_CODICE[Math.floor(Math.random() * ALFABETO_CODICE.length)];
  }
  return `SHOGA-${suffisso}`;
}

async function arricchisciConServizio(
  supabase: ReturnType<typeof createClient>,
  buoni: BuonoRow[]
): Promise<BuonoConServizio[]> {
  const serviceIds = [...new Set(buoni.map((b) => b.service_id).filter(Boolean) as string[])];
  if (serviceIds.length === 0) {
    return buoni.map((b) => ({ ...b, servizio_nome: null }));
  }

  const { data: servizi } = await supabase.from("services").select("id, nome").in("id", serviceIds);
  const nomeById = new Map<string, string>((servizi ?? []).map((s) => [s.id, s.nome]));

  return buoni.map((b) => ({
    ...b,
    servizio_nome: b.service_id ? nomeById.get(b.service_id) ?? null : null,
  }));
}

async function richiedeAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const supabase = createClient();
  if (!(await richiedeAdmin(supabase))) {
    return NextResponse.json<BuoniListResponse>({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const { data, error } = await supabase.from("buoni").select("*").order("creato_il", { ascending: false });

  if (error) {
    return NextResponse.json<BuoniListResponse>(
      { ok: false, error: `Errore database: ${error.message}` },
      { status: 500 }
    );
  }

  const buoni = await arricchisciConServizio(supabase, data ?? []);
  return NextResponse.json<BuoniListResponse>({ ok: true, buoni });
}

export async function POST(request: Request) {
  const supabase = createClient();
  if (!(await richiedeAdmin(supabase))) {
    return NextResponse.json<BuonoCreateResponse>({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    codice?: string;
    tipo?: BuonoTipo;
    valoreChf?: number;
    serviceId?: string;
    beneficiario?: string;
    note?: string;
  };

  if (body.tipo !== "valore" && body.tipo !== "servizio") {
    return NextResponse.json<BuonoCreateResponse>({ ok: false, error: "Tipo di buono non valido." }, { status: 400 });
  }
  if (body.tipo === "valore" && (!body.valoreChf || body.valoreChf <= 0)) {
    return NextResponse.json<BuonoCreateResponse>(
      { ok: false, error: "Inserisci un valore in CHF maggiore di zero." },
      { status: 400 }
    );
  }
  if (body.tipo === "servizio" && !body.serviceId) {
    return NextResponse.json<BuonoCreateResponse>(
      { ok: false, error: "Scegli il servizio a cui è legato il buono." },
      { status: 400 }
    );
  }

  const riga = {
    codice: (body.codice?.trim() || generaCodice()).toUpperCase(),
    tipo: body.tipo,
    valore_chf: body.tipo === "valore" ? body.valoreChf : null,
    service_id: body.tipo === "servizio" ? body.serviceId : null,
    beneficiario: body.beneficiario?.trim() || null,
    note: body.note?.trim() || null,
  };

  // Ritenta con un nuovo codice generato in caso di collisione (solo se il
  // codice non è stato scelto a mano dall'admin).
  for (let tentativo = 0; tentativo < 3; tentativo++) {
    const { data: row, error } = await supabase.from("buoni").insert(riga).select("*").single();

    if (!error && row) {
      const [buono] = await arricchisciConServizio(supabase, [row]);
      return NextResponse.json<BuonoCreateResponse>({ ok: true, buono });
    }

    const collisione = error?.code === "23505";
    if (!collisione || body.codice?.trim()) {
      return NextResponse.json<BuonoCreateResponse>(
        { ok: false, error: collisione ? "Questo codice esiste già." : `Errore database: ${error?.message}` },
        { status: collisione ? 409 : 500 }
      );
    }
    riga.codice = generaCodice();
  }

  return NextResponse.json<BuonoCreateResponse>(
    { ok: false, error: "Non sono riuscito a generare un codice univoco, riprova." },
    { status: 500 }
  );
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  if (!(await richiedeAdmin(supabase))) {
    return NextResponse.json<BuonoUpdateResponse>({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    stato?: BuonoStato;
    beneficiario?: string | null;
    note?: string | null;
  };

  if (!body.id) {
    return NextResponse.json<BuonoUpdateResponse>({ ok: false, error: "ID mancante." }, { status: 400 });
  }

  const patch: Partial<BuonoRow> = {};
  if (body.stato) {
    patch.stato = body.stato;
    patch.usato_il = body.stato === "usato" ? new Date().toISOString() : null;
  }
  if (body.beneficiario !== undefined) patch.beneficiario = body.beneficiario?.trim() || null;
  if (body.note !== undefined) patch.note = body.note?.trim() || null;

  const { data: row, error } = await supabase
    .from("buoni")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json<BuonoUpdateResponse>(
      { ok: false, error: `Errore database: ${error?.message ?? "buono non trovato"}` },
      { status: 500 }
    );
  }

  const [buono] = await arricchisciConServizio(supabase, [row]);
  return NextResponse.json<BuonoUpdateResponse>({ ok: true, buono });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  if (!(await richiedeAdmin(supabase))) {
    return NextResponse.json<BuonoDeleteResponse>({ ok: false, error: "Non autenticato." }, { status: 401 });
  }

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) {
    return NextResponse.json<BuonoDeleteResponse>({ ok: false, error: "ID mancante." }, { status: 400 });
  }

  const { error } = await supabase.from("buoni").delete().eq("id", id).eq("stato", "attivo");

  if (error) {
    return NextResponse.json<BuonoDeleteResponse>(
      { ok: false, error: `Errore database: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json<BuonoDeleteResponse>({ ok: true });
}
