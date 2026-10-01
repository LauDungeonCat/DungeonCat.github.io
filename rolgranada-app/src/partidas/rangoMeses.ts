export function obtenerRangoMeses(fechaReferencia = new Date()) {
	const mesActual = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), 1);
	const ultimoDia = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 0).getDate();
	const siguienteDisponible = ultimoDia - fechaReferencia.getDate() <= 3;
	const mesSiguiente = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 1);

	return {
		mesActual,
		mesSiguiente,
		siguienteDisponible,
		mesInicial: siguienteDisponible ? mesSiguiente : mesActual,
	};
}
