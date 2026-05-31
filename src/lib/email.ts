// E-mailadressen worden overal genormaliseerd opgeslagen en vergeleken, zodat
// hetzelfde adres in verschillende schrijfwijzen (bijv. "Marisha@rhoost.nl" en
// "marisha@rhoost.nl") altijd als dezelfde persoon wordt herkend. Eén gebruiker
// kan bij meerdere klantomgevingen horen; case-verschillen mogen die koppeling
// nooit breken.

/** Normaliseert een e-mailadres: spaties weg en alles kleine letters. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
