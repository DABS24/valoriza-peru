// Stub de `server-only` para el entorno de tests (vitest, node).
// El paquete real lanza al importarse fuera de un bundle server; en tests
// solo necesitamos que la importación sea un no-op para poder ejercer la
// lógica de módulos marcados server-only (p. ej. lib/email/resend.ts).
export {};
