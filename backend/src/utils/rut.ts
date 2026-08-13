export class RutUtil {
  /**
   * Sanitiza un RUT eliminando puntos, guiones y espacios.
   */
  static clean(rut: string): string {
    if (typeof rut !== 'string') return '';
    return rut.replace(/[^0-9Kk]/g, '').toUpperCase();
  }

  /**
   * Formatea un RUT limpio al formato 12.345.678-K o 12345678-K.
   */
  static format(rut: string): string {
    const cleaned = this.clean(rut);
    if (cleaned.length < 2) return cleaned;
    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);
    return `${body}-${dv}`;
  }

  /**
   * Valida la concordancia del dígito verificador usando el algoritmo Módulo 11.
   */
  static isValid(rut: string): boolean {
    const cleaned = this.clean(rut);
    if (cleaned.length < 7 || cleaned.length > 9) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    if (!/^\d+$/.test(body)) return false;

    let suma = 0;
    let multiplicador = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      suma += parseInt(body.charAt(i), 10) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const res = 11 - (suma % 11);
    let expectedDv = '0';
    if (res === 11) expectedDv = '0';
    else if (res === 10) expectedDv = 'K';
    else expectedDv = res.toString();

    return dv === expectedDv;
  }
}
