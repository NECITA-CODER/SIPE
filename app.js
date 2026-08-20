const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item:not(.locked)');
const title = document.getElementById('page-title');
const toast = document.getElementById('toast');

function showView(id) {
  views.forEach(view => view.classList.toggle('active-view', view.id === id));
  const activeNavigation = ['vacaciones', 'informacion'].includes(id) ? 'portal' : id;
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === activeNavigation));
  const pageTitles = {
    inicio: 'Inicio',
    jpm: 'Jefe de la Plana Mayor',
    p1: 'P-1 Personal — SIPE',
    portal: 'Portal del Personal',
    vacaciones: 'Reporte individual de vacaciones',
    informacion: 'Disposiciones generales',
    cuadros: 'Parte del personal de cuadros'
  };
  title.textContent = pageTitles[id] || pageTitles.inicio;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
document.querySelectorAll('[data-open-p1]').forEach(item => {
  item.addEventListener('click', () => showView('p1'));
  item.addEventListener('keydown', event => { if (event.key === 'Enter') showView('p1'); });
});
document.querySelectorAll('[data-open-jpm]').forEach(item => item.addEventListener('click', () => showView('jpm')));
document.querySelectorAll('[data-open-portal]').forEach(item => item.addEventListener('click', () => showView('portal')));
document.querySelectorAll('[data-open-vacations]').forEach(item => item.addEventListener('click', () => showView('vacaciones')));
document.querySelectorAll('[data-open-info]').forEach(item => item.addEventListener('click', () => showView('informacion')));
document.querySelectorAll('.locked, .chief-card:not(.operative)').forEach(item => item.addEventListener('click', () => notify(`${item.dataset.field}: módulo previsto para desarrollo futuro.`)));
document.querySelectorAll('[data-demo]').forEach(item => item.addEventListener('click', () => notify('Esta función se habilitará en la siguiente etapa del SIPE.')));

const generalInformationForm = document.getElementById('general-information-form');
document.getElementById('information-date').value = new Date().toISOString().slice(0, 10);
generalInformationForm.addEventListener('submit', event => {
  event.preventDefault();
  notify('Formulario preparado. La publicación compartida requiere activar Supabase Storage.');
});

document.getElementById('current-date').textContent = new Intl.DateTimeFormat('es-BO', { day:'2-digit', month:'long', year:'numeric' }).format(new Date());

const weeklyPartForm = document.getElementById('weekly-part-form');
const partDateInput = document.getElementById('part-date');
const partEffectiveCurrentInput = document.getElementById('part-effective-current');
const noveltyInputs = [...document.querySelectorAll('[data-novelty]')];
const partValidationMessage = document.getElementById('part-validation-message');
const weeklyPartStorageKey = 'simu_demo_weekly_part_v2';

function integerValue(input) {
  const value = Number.parseInt(input.value, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function calculateWeeklyPart() {
  const effectiveCurrent = integerValue(partEffectiveCurrentInput);
  const novelties = Object.fromEntries(noveltyInputs.map(input => [input.dataset.novelty, integerValue(input)]));
  const unavailable = Object.values(novelties).reduce((total, value) => total + value, 0);
  const available = effectiveCurrent - unavailable;
  const total = available >= 0 ? available + unavailable : effectiveCurrent;
  const efficiency = total > 0 && available >= 0 ? (available / total) * 100 : 0;
  return { date: partDateInput.value, effectiveCurrent, novelties, unavailable, available, total, efficiency };
}

function formatEfficiency(value) {
  return `${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} %`;
}

function renderWeeklyPartPreview() {
  const part = calculateWeeklyPart();
  const invalid = part.available < 0;
  partValidationMessage.textContent = invalid
    ? 'La suma de no disponibles no puede superar el efectivo actual.'
    : 'Los datos son demostrativos y no corresponden a personal institucional.';
  partValidationMessage.classList.toggle('error', invalid);
  weeklyPartForm.querySelector('button[type="submit"]').disabled = invalid;
  return part;
}

function updateP1Indicators(part) {
  setText('metric-effective-current', part.effectiveCurrent);
  setText('metric-unavailable', part.unavailable);
  setText('metric-available', part.available);
  setText('metric-total', part.total);
  setText('metric-efficiency', formatEfficiency(part.efficiency));
  setText('availability-count', part.available);
  document.getElementById('availability-bar').style.width = `${Math.max(0, Math.min(100, part.efficiency))}%`;
  Object.entries(part.novelties).forEach(([category, quantity]) => {
    setText(`availability-count-${category}`, quantity);
    const categoryBar = document.getElementById(`availability-bar-${category}`);
    if (categoryBar) {
      const percentage = part.total > 0 ? (quantity / part.total) * 100 : 0;
      categoryBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    }
  });
  if (part.date) {
    const [year, month, day] = part.date.split('-').map(Number);
    document.getElementById('current-date').textContent = new Intl.DateTimeFormat('es-BO', { day:'2-digit', month:'long', year:'numeric' }).format(new Date(year, month - 1, day));
  }
}

function loadWeeklyPart(part) {
  if (!part || typeof part !== 'object') return;
  partDateInput.value = part.date || partDateInput.value;
  partEffectiveCurrentInput.value = Number.isFinite(part.effectiveCurrent) ? part.effectiveCurrent : 126;
  noveltyInputs.forEach(input => { input.value = Number.isFinite(part.novelties?.[input.dataset.novelty]) ? part.novelties[input.dataset.novelty] : 0; });
  const calculated = renderWeeklyPartPreview();
  updateP1Indicators(calculated);
}

partDateInput.value = new Date().toISOString().slice(0, 10);
weeklyPartForm.addEventListener('input', renderWeeklyPartPreview);
weeklyPartForm.addEventListener('submit', event => {
  event.preventDefault();
  const part = renderWeeklyPartPreview();
  if (part.available < 0) return;
  localStorage.setItem(weeklyPartStorageKey, JSON.stringify(part));
  updateP1Indicators(part);
  notify('Parte semanal guardado. Los indicadores P-1 fueron actualizados.');
});
document.querySelectorAll('[data-open-part]').forEach(button => button.addEventListener('click', () => {
  document.getElementById('weekly-part-module').scrollIntoView({ behavior: 'smooth', block: 'start' });
}));

try {
  const storedWeeklyPart = JSON.parse(localStorage.getItem(weeklyPartStorageKey));
  if (storedWeeklyPart) loadWeeklyPart(storedWeeklyPart);
  else updateP1Indicators(renderWeeklyPartPreview());
} catch {
  localStorage.removeItem(weeklyPartStorageKey);
  updateP1Indicators(renderWeeklyPartPreview());
}

const personnelProfiles = {
  '001': {
    name: 'Cap. Ana Rojas', initials: 'AR', unit: 'Compañía de Comando', annual: 20, collective: 5, used: 6, permits: 2, compensation: 1,
    period: '02 al 09 de septiembre', scheduleDays: '6 días hábiles', scheduleState: 'Aprobado',
    movements: [
      ['15-MAR', 'Permiso personal', '2', '-2 días', 'Autorizado'],
      ['03-JUN', 'Vacación', '6', '-6 días', 'Concluida'],
      ['18-JUL', 'Incorporación por servicio', '1', '+1 día', 'Compensado']
    ]
  },
  '002': {
    name: 'Sof. 1ro. Luis Flores', initials: 'LF', unit: 'Primera Compañía', annual: 25, collective: 5, used: 10, permits: 3, compensation: 0,
    period: '14 al 18 de octubre', scheduleDays: '5 días hábiles', scheduleState: 'Pendiente de aprobación',
    movements: [
      ['12-FEB', 'Permiso familiar', '3', '-3 días', 'Autorizado'],
      ['08-ABR', 'Vacación', '10', '-10 días', 'Concluida']
    ]
  },
  '003': {
    name: 'Sgto. 2do. Carla Méndez', initials: 'CM', unit: 'Compañía de Servicios', annual: 15, collective: 5, used: 0, permits: 1, compensation: 0,
    period: 'Sin periodo asignado', scheduleDays: '0 días', scheduleState: 'Por programar',
    movements: [
      ['22-MAY', 'Permiso personal', '1', '-1 día', 'Autorizado']
    ]
  }
};

function setText(id, value) { document.getElementById(id).textContent = value; }

function renderProfile(profileId) {
  const profile = personnelProfiles[profileId];
  const balance = profile.annual - profile.collective - profile.used - profile.permits + profile.compensation;
  setText('profile-initials', profile.initials); setText('profile-name', profile.name); setText('profile-unit', profile.unit);
  setText('annual-days', profile.annual); setText('collective-days', profile.collective); setText('used-days', profile.used); setText('permit-days', profile.permits); setText('balance-days', balance);
  setText('formula-annual', profile.annual); setText('formula-collective', profile.collective); setText('formula-used', profile.used); setText('formula-permits', profile.permits); setText('formula-compensation', profile.compensation); setText('formula-balance', balance);
  setText('schedule-period', profile.period); setText('schedule-days', profile.scheduleDays); setText('schedule-state', profile.scheduleState); setText('schedule-status', profile.scheduleState === 'Aprobado' ? 'Programado' : profile.scheduleState);
  document.getElementById('movement-rows').innerHTML = profile.movements.map(row => `<div class="movement-row" role="row">${row.map(cell => `<span>${cell}</span>`).join('')}</div>`).join('');
}

document.getElementById('profile-select').addEventListener('change', event => renderProfile(event.target.value));
renderProfile('001');

const g1Functions = {
  efectivos: {
    number: '01', title: 'Mantenimiento de efectivos', purpose: 'Concentrar y actualizar los partes del personal de la unidad.',
    areas: [
      { id: 'cuadros', title: 'Parte del personal de cuadros', description: 'Registro del efectivo, disponibilidad, novedades y demostración nominal del personal de cuadros.' },
      { id: 'tropa', title: 'Parte del personal de tropa', description: 'Registro del efectivo, disponibilidad y novedades del personal de tropa.' }
    ]
  },
  administracion: {
    number: '02', title: 'Administración del personal', purpose: 'Organizar los registros nominales y la documentación individual del personal.',
    areas: [
      ['Relaciones nominales del personal', 'Nóminas organizadas por categoría, grado, dependencia y situación administrativa.'],
      ['Filiaciones personales', 'Datos de identificación, antecedentes y documentación individual vinculada al legajo.']
    ]
  },
  disciplina: {
    number: '03', title: 'Mantenimiento de la disciplina, ley y orden', purpose: 'Conservar el registro documental de las sanciones administrativas del personal.',
    areas: [
      ['Memorándums de sanción', 'Archivo referencial de memorándums, con número, fecha, destinatario, motivo, estado y vinculación al legajo.']
    ]
  },
  moral: {
    number: '04', title: 'Incremento y mantenimiento de la moral', purpose: 'Registrar reconocimientos y controlar al personal considerado en los procesos de ascenso.',
    areas: [
      ['Felicitaciones', 'Archivo de memorándums y antecedentes de felicitación vinculados al legajo individual.'],
      ['Personal convocado a ascensos', 'Relación y seguimiento administrativo del personal convocado a procesos de ascenso.']
    ]
  },
  pc: {
    number: '05', title: 'Administración interna', purpose: 'Organizar la documentación de planeamiento y los informes elaborados por el P-1.',
    areas: [
      ['Planes de personal', 'Registro, consulta y archivo de planes administrativos correspondientes al área de personal.'],
      ['Informes', 'Registro, consulta y archivo de informes periódicos y especiales de personal.']
    ]
  },
  diversos: {
    number: '06', title: 'Diversos', purpose: 'Controlar la recepción y expedición de radiogramas relacionados con el área de personal.',
    areas: [
      ['Radiogramas recibidos', 'Registro de origen, número, fecha, asunto, prioridad, responsable y estado de atención.'],
      ['Radiogramas expedidos', 'Registro de destino, número, fecha, asunto, prioridad y constancia de expedición.']
    ]
  }
};

function renderG1Detail(key) {
  const item = g1Functions[key];
  document.querySelectorAll('.g1-card').forEach(card => card.classList.toggle('active', card.dataset.g1 === key));
  document.getElementById('g1-detail').innerHTML = `
    <div class="g1-detail-head"><span>${item.number}</span><div><p class="eyebrow">FUNCIÓN SELECCIONADA</p><h4>${item.title}</h4><p>${item.purpose}</p></div></div>
    <div class="g1-detail-grid g1-detail-single">
      <div><h5>Registros de la función</h5><div class="control-list">${item.areas.map(area => {
        const normalized = Array.isArray(area) ? { id: '', title: area[0], description: area[1] } : area;
        return `<article><strong>${normalized.title}</strong><p>${normalized.description}</p><button data-register="${normalized.id}" data-register-title="${normalized.title}">Abrir registro</button></article>`;
      }).join('')}</div></div>
    </div>`;
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.register === 'cuadros') {
      showView('cuadros');
      return;
    }
    notify(`${button.dataset.registerTitle}: registro preparado para la siguiente fase.`);
  }));
}

document.querySelectorAll('.g1-card').forEach(card => card.addEventListener('click', () => renderG1Detail(card.dataset.g1)));
renderG1Detail('efectivos');

const cuadrosCategoryInputs = [...document.querySelectorAll('[data-cuadros-category]')];
const cuadrosNoveltyInputs = [...document.querySelectorAll('[data-cuadros-novelty]')];
const cuadrosForm = document.getElementById('cuadros-form');
const cuadrosStorageKey = 'simu_demo_parte_cuadros_v2';
const cuadrosArchiveStorageKey = 'simu_demo_archivo_cuadros_v2';

function calculateCuadrosPart() {
  const effective = cuadrosCategoryInputs.reduce((sum, input) => sum + integerValue(input), 0);
  const unavailable = cuadrosNoveltyInputs.reduce((sum, input) => sum + integerValue(input), 0);
  const available = Math.max(0, effective - unavailable);
  const efficiency = effective > 0 ? (available / effective) * 100 : 0;
  return { effective, unavailable, available, efficiency };
}

function renderCuadrosTotals() {
  const part = calculateCuadrosPart();
  setText('cuadros-effective', part.effective);
  setText('cuadros-unavailable', part.unavailable);
  setText('cuadros-available', part.available);
  setText('cuadros-efficiency', formatEfficiency(part.efficiency));
  const invalid = part.unavailable > part.effective;
  const message = document.getElementById('cuadros-validation');
  message.textContent = invalid ? 'Las novedades no pueden superar el efectivo actual.' : 'Los cálculos se actualizarán al guardar el parte.';
  message.classList.toggle('error', invalid);
  cuadrosForm.querySelector('button[type="submit"]').disabled = invalid;
  return part;
}

function saveCuadrosPart() {
  const data = {
    date: document.getElementById('cuadros-date').value,
    reference: document.getElementById('cuadros-reference').value,
    categories: Object.fromEntries(cuadrosCategoryInputs.map(input => [input.dataset.cuadrosCategory, integerValue(input)])),
    novelties: Object.fromEntries(cuadrosNoveltyInputs.map(input => [input.dataset.cuadrosNovelty, integerValue(input)]))
  };
  localStorage.setItem(cuadrosStorageKey, JSON.stringify(data));
  return data;
}

function readCuadrosArchive() {
  try {
    const archive = JSON.parse(localStorage.getItem(cuadrosArchiveStorageKey) || '[]');
    return Array.isArray(archive) ? archive : [];
  } catch (error) {
    return [];
  }
}

function renderCuadrosArchive() {
  const archive = readCuadrosArchive();
  setText('cuadros-archive-count', `${archive.length} ${archive.length === 1 ? 'registro' : 'registros'}`);
  const container = document.getElementById('cuadros-archive-list');
  if (!archive.length) {
    container.innerHTML = '<p class="cuadros-empty">Todavía no existen partes archivados.</p>';
    return;
  }
  container.innerHTML = archive.map((item, index) => `
    <article class="cuadros-archive-row">
      <div><span>Fecha</span><strong>${item.date || 'Sin fecha'}</strong></div>
      <div><span>Referencia</span><strong>${item.reference || 'Sin referencia'}</strong></div>
      <div><span>Efectivo</span><strong>${item.totals.effective}</strong></div>
      <div><span>No disponibles</span><strong>${item.totals.unavailable}</strong></div>
      <div><span>Estado</span><strong>Archivado</strong></div>
      <button type="button" data-load-cuadros-archive="${index}">Consultar</button>
    </article>`).join('');
  container.querySelectorAll('[data-load-cuadros-archive]').forEach(button => button.addEventListener('click', () => {
    const item = archive[Number(button.dataset.loadCuadrosArchive)];
    document.getElementById('cuadros-date').value = item.date || '';
    document.getElementById('cuadros-reference').value = item.reference || '';
    cuadrosCategoryInputs.forEach(input => { input.value = item.categories?.[input.dataset.cuadrosCategory] ?? 0; });
    cuadrosNoveltyInputs.forEach(input => { input.value = item.novelties?.[input.dataset.cuadrosNovelty] ?? 0; });
    renderCuadrosTotals();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Parte archivado cargado en modo de consulta.');
  }));
}

function loadCuadrosPart() {
  const saved = localStorage.getItem(cuadrosStorageKey);
  if (!saved) return renderCuadrosTotals();
  try {
    const data = JSON.parse(saved);
    document.getElementById('cuadros-date').value = data.date || document.getElementById('cuadros-date').value;
    document.getElementById('cuadros-reference').value = data.reference || '';
    cuadrosCategoryInputs.forEach(input => { if (Number.isFinite(data.categories?.[input.dataset.cuadrosCategory])) input.value = data.categories[input.dataset.cuadrosCategory]; });
    cuadrosNoveltyInputs.forEach(input => { if (Number.isFinite(data.novelties?.[input.dataset.cuadrosNovelty])) input.value = data.novelties[input.dataset.cuadrosNovelty]; });
  } catch (error) {
    localStorage.removeItem(cuadrosStorageKey);
  }
  return renderCuadrosTotals();
}

document.querySelectorAll('[data-back-p1]').forEach(button => button.addEventListener('click', () => showView('p1')));
document.getElementById('cuadros-date').value = new Date().toISOString().slice(0, 10);
cuadrosForm.addEventListener('input', renderCuadrosTotals);
cuadrosForm.addEventListener('submit', event => {
  event.preventDefault();
  const totals = renderCuadrosTotals();
  if (totals.unavailable > totals.effective) return;
  saveCuadrosPart();
  notify('Parte de Cuadros guardado como borrador demostrativo.');
});
document.getElementById('cuadros-add-detail').addEventListener('click', () => notify('La incorporación de nuevas filas nominales se habilitará al conectar este registro con Supabase.'));
const officialCategoryLabels = [
  ['oo_gg', 'OO. GG.'], ['oo_sup', 'OO. SUP.'], ['oo_sub', 'OO. SUB.'],
  ['sofs', 'SOFS.'], ['sgtos', 'SGTOS.'], ['sof_bm', 'SOF. BM.'],
  ['sgtos_bm', 'SGTOS. BM.'], ['oo_serv', 'OO. SERV.'],
  ['sof_serv', 'SOF. SERV.'], ['sgtos_serv', 'SGTOS. SERV.'],
  ['profesionales', 'PROFESIONALES'], ['tecnicos', 'TÉCNICOS'],
  ['administrativo', 'ADMINISTRATIVO'], ['ap_adm', 'AP. ADM.']
];

const officialNoveltyLabels = [
  ['baja_medica', 'BAJA MÉDICA'], ['comisiones', 'COMISIONES'],
  ['puesto_militar_adelantado', 'PUESTO MILITAR ADELANTADO'],
  ['puesto_seguridad', 'PUESTO DE SEGURIDAD'], ['vacacion', 'VACACIÓN'],
  ['cuenta_vacacion', 'CUENTA VACACIÓN'], ['falta_lista', 'FALTA A LISTA'],
  ['sigue_faltando', 'SIGUE FALTANDO']
];

const officialDemoPersonnel = {
  baja_medica: ['Sgto. 1ro.', 'Personal demostrativo 01', '01-AGO-26', 'Alta médica', 'Registro ficticio'],
  comisiones: ['Tte.', 'Personal demostrativo 02', '02-AGO-26', 'Culminar comisión', 'Registro ficticio'],
  puesto_militar_adelantado: ['Sof. 2do.', 'Personal demostrativo 03', '03-AGO-26', 'Relevo', 'Registro ficticio'],
  puesto_seguridad: ['Sgto.', 'Personal demostrativo 04', '04-AGO-26', 'Relevo', 'Registro ficticio'],
  vacacion: ['Sof. 1ro.', 'Personal demostrativo 05', '11-AGO-26', '24-AGO-26', 'Registro ficticio'],
  cuenta_vacacion: ['Tte.', 'Personal demostrativo 06', '18-AGO-26', '21-AGO-26', 'Registro ficticio'],
  falta_lista: ['Sgto. 2do.', 'Personal demostrativo 07', '20-AGO-26', '—', 'Registro ficticio'],
  sigue_faltando: ['Sgto. 1ro.', 'Personal demostrativo 08', '20-AGO-26', '—', 'Registro ficticio']
};

function escapeOfficial(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function officialDateParts(value) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return {
    long: `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`,
    compact: `${String(date.getDate()).padStart(2, '0')}${months[date.getMonth()]}${String(date.getFullYear()).slice(-2)}`
  };
}

function officialCategoryCells(categories, total) {
  return `${officialCategoryLabels.map(([key]) => `<td>${categories[key] || 0}</td>`).join('')}<td>${total}</td>`;
}

function officialBlankCategoryCells(total) {
  return `${officialCategoryLabels.map(() => '<td>–</td>').join('')}<td>${total}</td>`;
}

function officialTableHeader() {
  return `<tr><th class="official-detail-col">DETALLE</th>${officialCategoryLabels.map(([, label]) => `<th class="official-vertical"><span>${label}</span></th>`).join('')}<th>TOTAL</th></tr>`;
}

function officialNominalSection(key, label, number, count) {
  const person = officialDemoPersonnel[key];
  const rows = count > 0
    ? `<tr><td>RIAE-18<br>“VICTORIA”</td><td>${person[0]}</td><td>${person[1]}</td><td>${person[2]}</td><td>${person[3]}</td><td>${person[4]}</td></tr>`
    : '<tr><td colspan="6">SIN NOVEDAD REGISTRADA</td></tr>';
  return `<section class="official-nominal-section">
    <h3><b>${number}.-</b> <u>${label}.</u> <small>(${count} REGISTRADOS)</small></h3>
    <table class="official-nominal-table"><thead><tr><th>UNIDAD</th><th>GRADO</th><th>NOMBRES Y APELLIDOS</th><th>DESDE</th><th>HASTA</th><th>OBS.</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}

function buildOfficialReport() {
  const data = saveCuadrosPart();
  const totals = calculateCuadrosPart();
  const date = officialDateParts(data.date);
  const reference = escapeOfficial(data.reference || 'S. I PERS. N.° 000/26');
  const situationRows = officialNoveltyLabels.map(([key, label]) => `<tr><td class="official-row-label">${label}</td>${officialBlankCategoryCells(data.novelties[key] || 0)}</tr>`).join('');
  const pageTwoSections = officialNoveltyLabels.slice(0, 4).map(([key, label], index) => officialNominalSection(key, label, index + 1, data.novelties[key] || 0)).join('');
  const pageThreeSections = officialNoveltyLabels.slice(4).map(([key, label], index) => officialNominalSection(key, label, index + 5, data.novelties[key] || 0)).join('');
  const container = document.getElementById('official-report-print');
  container.innerHTML = `
    <article class="official-page official-page-one">
      <header class="official-header"><div><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></div><div class="official-code">DIV7RIA18PERS${date.compact}</div></header>
      <h1>RADIOGRAMA EXPEDIDO</h1>
      <p class="official-place">TOLATA, ${date.long}.</p>
      <div class="official-routing"><b>AL</b><span>:</span><span>CMDO. DIV-7</span><span>COCHABAMBA.</span><b>DEL</b><span>:</span><span>CMDO. DEL RIAEROTRANS-18 “VICTORIA”</span><span>TOLATA.</span></div>
      <p class="official-reference">${reference}.-</p>
      <p class="official-intro">EN CUMPLIMIENTO A DISPOSICIONES VIGENTES, ELEVO EL PARTE SEMANAL DEL CUADRO DE EFECTIVOS DEL PERSONAL DE CUADROS Y EMPLEADOS CIVILES, DE ACUERDO AL SIGUIENTE DETALLE:</p>
      <h2>CUADRO DE EFECTIVOS DEL PERSONAL DE CUADROS DEL<br>RIAEROTRANS-18 “VICTORIA” DE FECHA ${date.long}.</h2>
      <table class="official-matrix"><thead>${officialTableHeader()}</thead><tbody><tr><td class="official-row-label">EFECTIVO ACTUAL</td>${officialCategoryCells(data.categories, totals.effective)}</tr><tr><td class="official-row-label">TOTAL GENERAL</td>${officialCategoryCells(data.categories, totals.effective)}</tr></tbody></table>
      <h2>CUADRO DE SITUACIÓN DEL PERSONAL DE CUADROS DEL<br>RIAEROTRANS-18 “VICTORIA”</h2>
      <table class="official-matrix official-situation"><thead>${officialTableHeader()}</thead><tbody><tr class="official-bold-row"><td class="official-row-label">EFECTIVO ACTUAL</td>${officialCategoryCells(data.categories, totals.effective)}</tr>${situationRows}<tr><td class="official-row-label">NO DISPONIBLES</td>${officialBlankCategoryCells(totals.unavailable)}</tr><tr><td class="official-row-label">DISPONIBLES</td>${officialBlankCategoryCells(totals.available)}</tr><tr class="official-bold-row"><td class="official-row-label">TOTAL</td>${officialCategoryCells(data.categories, totals.effective)}</tr></tbody></table>
      <p class="official-distribution-note">Nota del prototipo: los totales por novedad se vinculan al parte; la distribución por categoría se completará con el detalle nominal.</p>
      <footer>1 - 3</footer>
    </article>
    <article class="official-page official-page-two">
      <h2 class="official-demonstration"><u>DEMOSTRACIÓN</u></h2>
      <p class="official-demo-warning">DATOS FICTICIOS PARA DEMOSTRACIÓN DEL PROTOTIPO</p>
      ${pageTwoSections}
      <footer>2 - 3</footer>
    </article>
    <article class="official-page official-page-three">
      ${pageThreeSections}
      <div class="official-signature"><span>FIRMA DEMOSTRATIVA</span><strong>COMANDANTE DEL RIAEROTRANS-18 “VICTORIA”</strong></div>
      <p class="official-initials">P-1/JPM/aux.-</p>
      <p class="official-demo-warning official-bottom-warning">DOCUMENTO DEMOSTRATIVO · NO CONTIENE INFORMACIÓN INSTITUCIONAL REAL</p>
      <footer>3 - 3</footer>
    </article>`;
  return container;
}

document.getElementById('cuadros-print').addEventListener('click', () => {
  const totals = renderCuadrosTotals();
  if (totals.unavailable > totals.effective) return;
  buildOfficialReport();
  document.body.classList.add('printing-official-report');
  window.setTimeout(() => window.print(), 80);
});
window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-report'));
document.getElementById('cuadros-archive').addEventListener('click', () => {
  const totals = renderCuadrosTotals();
  if (totals.unavailable > totals.effective) return;
  const part = saveCuadrosPart();
  const archive = readCuadrosArchive();
  archive.unshift({ ...part, totals, archivedAt: new Date().toISOString() });
  localStorage.setItem(cuadrosArchiveStorageKey, JSON.stringify(archive));
  renderCuadrosArchive();
  notify('Parte cerrado y archivado en el historial demostrativo.');
});
loadCuadrosPart();
renderCuadrosArchive();
