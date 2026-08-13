export type ReportFilAsignatura = {
  asignatura_id: number;
  asignatura_nombre: string;
  n1: string | number;
  n2: string | number;
  n3: string | number;
  n4: string | number;
  n5: string | number;
  n6: string | number;
  n7: string | number;
  n8: string | number;
  promedio: string | number;
  observacion?: string;
};

export type StudentReportData = {
  alumno: {
    id: number;
    rut: string;
    nombre_completo: string;
  };
  curso: {
    id: number;
    nombre: string;
    profesor_jefe_nombre: string;
  };
  periodo: 's1' | 's2' | 'anual';
  filasAsignaturas: ReportFilAsignatura[];
  promedioGeneral: string;
  asistenciaPct: string;
};

type Props = {
  report: StudentReportData;
  schoolYear?: string;
};

export default function GradeReportTemplate({ report, schoolYear = '2026' }: Props) {
  const getPeriodoText = (p: 's1' | 's2' | 'anual') => {
    if (p === 's1') return '1º SEMESTRE';
    if (p === 's2') return '2º SEMESTRE';
    return 'ANUAL';
  };

  const getTitleText = (p: 's1' | 's2' | 'anual') => {
    if (p === 'anual') return `INFORME ANUAL DE NOTAS  ${report.curso.nombre}`;
    return `INFORME SEMESTRAL DE NOTAS  ${report.curso.nombre}`;
  };

  return (
    <div className="report-card-page bg-white text-black p-6 sm:p-10 font-sans max-w-[1000px] mx-auto text-xs leading-normal select-none shadow-xl rounded-sm print:shadow-none print:max-w-none print:p-0 print:m-0 print:w-full print:h-auto">
      {/* 1. Cabecera Institucional */}
      <div className="flex justify-between items-start pb-4 border-b border-black/10 print:border-none">
        {/* Izquierda: Escudo Institucional */}
        <div className="w-20 h-24 flex items-center justify-center">
          <img
            src="/logo_liceo.png"
            alt="Escudo Liceo Polivalente de Molina"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Centro: Ministerio y Liceo */}
        <div className="text-center font-bold tracking-wide uppercase space-y-0.5 text-[11px] leading-snug">
          <div>REPUBLICA DE CHILE</div>
          <div>MINISTERIO DE EDUCACION</div>
          <div className="text-[13px]">LICEO POLIVALENTE DE MOLINA</div>
        </div>

        {/* Derecha: Año y Semestre */}
        <div className="text-right text-[11px] font-bold space-y-1">
          <div>AÑO ESCOLAR: {schoolYear}</div>
          <div>SEMESTRE: <span className="underline underline-offset-4 font-mono">{getPeriodoText(report.periodo)}</span></div>
        </div>
      </div>

      {/* 2. Título Central */}
      <div className="text-center my-6">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
          {getTitleText(report.periodo)}
        </h1>
      </div>

      {/* 3. Subcabecera Estudiante y Profesor Jefe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-[12px] font-medium">
        <div className="flex items-baseline gap-2">
          <span className="font-bold shrink-0">Nombre del estudiante:</span>
          <div className="border-b border-black flex-1 font-semibold uppercase px-2 py-0.5 min-h-[22px]">
            {report.alumno.nombre_completo}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold shrink-0">Profesor(a) Jefe:</span>
          <div className="border-b border-black flex-1 font-semibold uppercase px-2 py-0.5 min-h-[22px]">
            {report.curso.profesor_jefe_nombre}
          </div>
        </div>
      </div>

      {/* 4. Matriz de Notas */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px]">
          <thead>
            <tr className="bg-slate-100 print:bg-slate-100 font-bold uppercase tracking-tight">
              <th className="border border-black p-2 text-left w-1/3 text-[10px] leading-tight">
                ASIGNATURA / MÓDULO / TALLER
              </th>
              <th className="border border-black p-1.5 w-8">N1</th>
              <th className="border border-black p-1.5 w-8">N2</th>
              <th className="border border-black p-1.5 w-8">N3</th>
              <th className="border border-black p-1.5 w-8">N4</th>
              <th className="border border-black p-1.5 w-8">N5</th>
              <th className="border border-black p-1.5 w-8">N6</th>
              <th className="border border-black p-1.5 w-8">N7</th>
              <th className="border border-black p-1.5 w-8">N8</th>
              <th className="border border-black p-1.5 w-12 bg-slate-200 print:bg-slate-200 font-black">PROM.</th>
              <th className="border border-black p-1.5 text-left pl-3">OBS.</th>
            </tr>
          </thead>
          <tbody>
            {report.filasAsignaturas.length > 0 ? (
              report.filasAsignaturas.map((fila, idx) => (
                <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                  <td className="border border-black p-2 text-left font-semibold text-[11px] leading-tight">
                    {fila.asignatura_nombre}
                  </td>
                  <td className="border border-black p-1 font-mono">{fila.n1 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n2 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n3 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n4 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n5 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n6 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n7 || ''}</td>
                  <td className="border border-black p-1 font-mono">{fila.n8 || ''}</td>
                  <td className="border border-black p-1 font-mono font-bold bg-slate-100/50 print:bg-slate-100/50 text-[12px]">
                    {fila.promedio || ''}
                  </td>
                  <td className="border border-black p-1 text-left pl-2 text-[10px] italic text-slate-700">
                    {fila.observacion || ''}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="border border-black p-6 text-center text-slate-500 italic">
                  No hay asignaturas registradas para este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Pie de Página: Promedio General y Asistencia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-[12px] font-bold">
        <div className="flex items-baseline gap-2">
          <span className="uppercase tracking-wider">PROMEDIO GENERAL:</span>
          <div className="border-b border-black flex-1 font-black font-mono text-[14px] px-2 py-0.5 min-h-[22px]">
            {report.promedioGeneral}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="uppercase tracking-wider">ASISTENCIA:</span>
          <div className="border-b border-black flex-1 font-black font-mono text-[14px] px-2 py-0.5 min-h-[22px]">
            {report.asistenciaPct}
          </div>
        </div>
      </div>
    </div>
  );
}
