export interface Cotizacion {
  ccl: number;
  blue: number;
  fecha: string;
}

export async function getCotizacion(): Promise<Cotizacion> {
  const [cclRes, blueRes] = await Promise.allSettled([
    fetch("https://dolarapi.com/v1/dolares/contadoconliqui", { next: { revalidate: 3600 } }),
    fetch("https://dolarapi.com/v1/dolares/blue", { next: { revalidate: 3600 } }),
  ]);

  let ccl = 1548;
  let blue = 1520;
  const fecha = new Date().toISOString().split("T")[0];

  if (cclRes.status === "fulfilled" && cclRes.value.ok) {
    const d = await cclRes.value.json();
    ccl = d.venta ?? ccl;
  }

  if (blueRes.status === "fulfilled" && blueRes.value.ok) {
    const d = await blueRes.value.json();
    blue = d.venta ?? blue;
  }

  return { ccl, blue, fecha };
}
