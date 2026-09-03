const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item:not(.locked)');
const title = document.getElementById('page-title');
const toast = document.getElementById('toast');
const viewBackButton = document.getElementById('view-back-button');
let currentViewId = 'inicio';
const viewHistory = [];

function showView(id, options = {}) {
  if (![...views].some(view => view.id === id)) return;
  if (id !== currentViewId && !options.fromHistory) viewHistory.push(currentViewId);
  currentViewId = id;
  views.forEach(view => view.classList.toggle('active-view', view.id === id));
  const activeNavigation = id === 'informacion' && informationAccessMode === 'personal' ? 'portal' : ['vacaciones', 'cuadros', 'tropa', 'memorandums', 'p1-funcion', 'p1-registro'].includes(id) || (id === 'informacion' && informationAccessMode === 'p1') ? 'p1' : id;
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === activeNavigation));
  const pageTitles = {
    inicio: 'Inicio',
    jpm: 'Jefe de la Plana Mayor',
    p1: 'P-1 Personal — SIPE',
    portal: 'Portal del Personal',
    vacaciones: 'Reporte individual de vacaciones',
    informacion: 'Disposiciones generales',
    'p1-funcion': 'Funciones del P-1',
    'p1-registro': 'Registro del P-1',
    cuadros: 'Parte del personal de cuadros',
    tropa: 'Parte diario del personal de tropa',
    memorandums: 'Memorándums de sanción'
  };
  title.textContent = pageTitles[id] || pageTitles.inicio;
  viewBackButton.hidden = id === 'inicio' || viewHistory.length === 0;
}

function goBackView(fallback = 'inicio') {
  const previousView = viewHistory.pop() || fallback;
  showView(previousView, { fromHistory: true });
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
viewBackButton.addEventListener('click', () => goBackView());
document.querySelectorAll('[data-open-p1]').forEach(item => {
  item.addEventListener('click', () => showView('p1'));
  item.addEventListener('keydown', event => { if (event.key === 'Enter') showView('p1'); });
});
document.querySelectorAll('[data-open-jpm]').forEach(item => item.addEventListener('click', () => showView('jpm')));
document.querySelectorAll('[data-open-portal]').forEach(item => item.addEventListener('click', () => showView('portal')));
document.querySelectorAll('[data-open-vacations]').forEach(item => item.addEventListener('click', () => openVacationReport('personal')));
document.querySelectorAll('[data-open-info]').forEach(item => item.addEventListener('click', () => openInformation('personal')));
document.querySelectorAll('.locked, .chief-card:not(.operative)').forEach(item => item.addEventListener('click', () => notify(`${item.dataset.field}: módulo previsto para desarrollo futuro.`)));
document.querySelectorAll('[data-demo]').forEach(item => item.addEventListener('click', () => notify('Esta función se habilitará en la siguiente etapa del SIPE.')));

const informationStorageKey = 'simu_demo_disposiciones_v1';
let informationAccessMode = 'personal';
let editingInformationIndex = null;
const generalInformationForm = document.getElementById('general-information-form');
const informationCancelEdit = document.getElementById('information-cancel-edit');
const informationSubmit = document.getElementById('information-submit');
document.getElementById('information-date').value = new Date().toISOString().slice(0, 10);

function resetInformationForm() {
  editingInformationIndex = null;
  generalInformationForm.reset();
  document.getElementById('information-date').value = new Date().toISOString().slice(0, 10);
  informationCancelEdit.hidden = true;
  informationSubmit.textContent = 'Publicar para el personal';
}

function readInformationPublications() {
  try {
    const stored = JSON.parse(localStorage.getItem(informationStorageKey) || 'null');
    if (Array.isArray(stored)) return stored;
  } catch {}
  return [
    { type: 'Radiograma', subject: 'Disposición administrativa semanal', reference: 'RAD. DEMO. N.º 01/26', date: '2026-08-19', fileName: 'Documento demostrativo.pdf' },
    { type: 'Comunicado', subject: 'Actividad general de la Unidad', reference: 'COM. DEMO. N.º 02/26', date: '2026-08-18', fileName: 'Documento demostrativo.pdf' }
  ];
}

function renderInformationPublications() {
  const publications = readInformationPublications();
  const container = document.getElementById('information-rows');
  container.innerHTML = publications.length ? publications.map((item, index) => `<article class="information-row"><div><span>${escapeOfficial(item.type)}</span><strong>${escapeOfficial(item.subject)}</strong><small>${escapeOfficial(item.reference)} · ${escapeOfficial(item.date)} · ${escapeOfficial(item.fileName || 'Sin archivo')}</small></div><div class="information-row-actions"><button type="button" data-consult-information="${index}">Consultar</button>${informationAccessMode === 'p1' ? `<button type="button" data-edit-information="${index}">Editar</button><button class="information-delete" type="button" data-delete-information="${index}">Retirar</button>` : ''}</div></article>`).join('') : '<p class="information-empty">No existen disposiciones publicadas.</p>';
  container.querySelectorAll('[data-consult-information]').forEach(button => button.addEventListener('click', () => {
    const item = publications[Number(button.dataset.consultInformation)];
    notify(`${item.type}: ${item.subject}. Archivo registrado: ${item.fileName || 'sin archivo'}.`);
  }));
  container.querySelectorAll('[data-delete-information]').forEach(button => button.addEventListener('click', () => {
    publications.splice(Number(button.dataset.deleteInformation), 1);
    localStorage.setItem(informationStorageKey, JSON.stringify(publications));
    renderInformationPublications();
    notify('La disposición fue retirada del Portal del Personal.');
  }));
  container.querySelectorAll('[data-edit-information]').forEach(button => button.addEventListener('click', () => {
    editingInformationIndex = Number(button.dataset.editInformation);
    const item = publications[editingInformationIndex];
    document.getElementById('information-type').value = item.type;
    document.getElementById('information-subject').value = item.subject;
    document.getElementById('information-reference').value = item.reference;
    document.getElementById('information-date').value = item.date;
    document.getElementById('information-file').value = '';
    informationCancelEdit.hidden = false;
    informationSubmit.textContent = 'Guardar cambios';
    document.getElementById('information-admin-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

function openInformation(mode = 'personal') {
  informationAccessMode = mode;
  const isP1 = mode === 'p1';
  resetInformationForm();
  document.getElementById('information-admin-panel').hidden = !isP1;
  document.getElementById('information-return').textContent = isP1 ? 'Volver a Varios' : 'Volver al portal';
  document.getElementById('information-return').onclick = () => isP1 ? renderG1Detail('varios') : showView('portal');
  setText('information-eyebrow', isP1 ? 'VARIOS · ADMINISTRACIÓN P-1' : 'DIFUSIÓN INTERNA');
  setText('information-heading', isP1 ? 'Publicación de disposiciones' : 'Disposiciones generales');
  setText('information-description', isP1 ? 'Cargue y administre la información autorizada para conocimiento del personal.' : 'Consulte las disposiciones publicadas por el P-1.');
  setText('information-access-badge', isP1 ? 'Acceso P-1' : 'Consulta general');
  renderInformationPublications();
  showView('informacion');
}

generalInformationForm.addEventListener('submit', event => {
  event.preventDefault();
  const file = document.getElementById('information-file').files[0];
  const publications = readInformationPublications();
  if (editingInformationIndex === null && !file) return notify('Seleccione el archivo que será publicado para el personal.');
  const previous = editingInformationIndex === null ? null : publications[editingInformationIndex];
  const publication = {
    type: document.getElementById('information-type').value,
    subject: document.getElementById('information-subject').value.trim(),
    reference: document.getElementById('information-reference').value.trim(),
    date: document.getElementById('information-date').value,
    fileName: file?.name || previous?.fileName || 'Sin archivo'
  };
  if (editingInformationIndex === null) publications.unshift(publication);
  else publications[editingInformationIndex] = publication;
  localStorage.setItem(informationStorageKey, JSON.stringify(publications));
  const wasEditing = editingInformationIndex !== null;
  resetInformationForm();
  renderInformationPublications();
  notify(wasEditing ? 'La disposición fue actualizada.' : 'Disposición publicada en el Portal del Personal.');
});
informationCancelEdit.addEventListener('click', resetInformationForm);
document.getElementById('information-return').onclick = () => showView('portal');
renderInformationPublications();

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

let vacationAccessMode = 'personal';

function openVacationReport(mode = 'personal') {
  vacationAccessMode = mode;
  const isP1 = mode === 'p1';
  const returnButton = document.getElementById('vacation-return');
  returnButton.textContent = isP1 ? 'Volver al P-1' : 'Volver al portal';
  returnButton.onclick = () => showView(isP1 ? 'p1' : 'portal');
  document.getElementById('vacation-print').textContent = isP1 ? 'Imprimir reporte consolidado' : 'Imprimir reporte individual';
  showView('vacaciones');
}

function vacationBalance(profile) {
  return profile.annual - profile.collective - profile.used - profile.permits + profile.compensation;
}

function vacationReportDate() {
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

function buildVacationReport() {
  const container = document.getElementById('official-vacation-report-print');
  const profile = personnelProfiles[document.getElementById('profile-select').value];
  const movements = profile.movements.map(row => `<tr>${row.map(cell => `<td>${escapeOfficial(cell)}</td>`).join('')}</tr>`).join('');
  const consolidated = Object.values(personnelProfiles).map((item, index) => `<tr><td>${index + 1}</td><td>${escapeOfficial(item.name)}</td><td>${escapeOfficial(item.unit)}</td><td>${item.annual}</td><td>${item.used}</td><td>${item.permits}</td><td>${vacationBalance(item)}</td><td>${escapeOfficial(item.scheduleState)}</td></tr>`).join('');
  const content = vacationAccessMode === 'p1'
    ? `<h2>REPORTE CONSOLIDADO DE VACACIONES Y PERMISOS</h2><p class="vacation-report-scope">Administración del P-1</p><table><thead><tr><th>N.º</th><th>Personal</th><th>Dependencia</th><th>Derecho</th><th>Utilizado</th><th>Permisos</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>${consolidated}</tbody></table>`
    : `<h2>REPORTE INDIVIDUAL DE VACACIONES</h2><p class="vacation-report-scope">Consulta autorizada del titular</p><div class="vacation-report-person"><p><b>Personal:</b> ${escapeOfficial(profile.name)}</p><p><b>Dependencia:</b> ${escapeOfficial(profile.unit)}</p><p><b>Periodo programado:</b> ${escapeOfficial(profile.period)}</p><p><b>Estado:</b> ${escapeOfficial(profile.scheduleState)}</p></div><table><thead><tr><th>Derecho anual</th><th>Reserva colectiva</th><th>Utilizado</th><th>Permisos</th><th>Compensación</th><th>Saldo</th></tr></thead><tbody><tr><td>${profile.annual}</td><td>${profile.collective}</td><td>${profile.used}</td><td>${profile.permits}</td><td>${profile.compensation}</td><td>${vacationBalance(profile)}</td></tr></tbody></table><h3>HISTORIAL DE MOVIMIENTOS</h3><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Días</th><th>Efecto</th><th>Estado</th></tr></thead><tbody>${movements}</tbody></table>`;
  container.innerHTML = `<article class="vacation-official-page"><header><div class="vacation-letterhead"><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><strong>SECCIÓN I - PERSONAL</strong><u>BOLIVIA</u></div><div class="vacation-report-date"><span>Fecha: ${vacationReportDate()}</span></div></header>${content}<div class="vacation-report-signatures"><div>RESPONSABLE P-1</div><div>INTERESADO</div></div><p class="vacation-report-warning">DOCUMENTO DEMOSTRATIVO - NO CONTIENE DATOS INSTITUCIONALES REALES</p></article>`;
}

document.getElementById('vacation-print').addEventListener('click', () => {
  buildVacationReport();
  document.body.classList.add('printing-official-vacation-report');
  window.setTimeout(() => window.print(), 80);
});
window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-vacation-report'));
document.getElementById('vacation-return').onclick = () => showView('portal');

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
      { id: 'vacaciones', title: 'Vacaciones y permisos', description: 'Consulta administrativa, control de saldos y generación del reporte consolidado del personal.' },
      { id: 'relaciones', title: 'Relaciones nominales del personal', description: 'Nóminas organizadas por categoría, grado, dependencia y situación administrativa.' },
      { id: 'filiaciones', title: 'Filiaciones personales', description: 'Datos de identificación, antecedentes y documentación individual vinculada al legajo.' }
    ]
  },
  disciplina: {
    number: '03', title: 'Mantenimiento de la disciplina, ley y orden', purpose: 'Conservar el registro documental de las sanciones administrativas del personal.',
    areas: [
      { id: 'memorandums', title: 'Memorándums de sanción', description: 'Elaboración, revisión, impresión y archivo de memorándums vinculados al legajo.' }
    ]
  },
  moral: {
    number: '04', title: 'Incremento y mantenimiento de la moral', purpose: 'Registrar reconocimientos y controlar al personal considerado en los procesos de ascenso.',
    areas: [
      { id: 'felicitaciones', title: 'Memorándums de felicitación', description: 'Elaboración y archivo de reconocimientos vinculados al legajo individual.' },
      { id: 'ascensos', title: 'Personal convocado a ascensos', description: 'Relación y seguimiento administrativo del personal convocado a procesos de ascenso.' }
    ]
  },
  pc: {
    number: '05', title: 'Administración interna', purpose: 'Organizar la documentación de planeamiento y los informes elaborados por el P-1.',
    areas: [
      { id: 'planes', title: 'Planes de personal', description: 'Registro, consulta y archivo de planes administrativos correspondientes al área de personal.' },
      { id: 'informes', title: 'Informes', description: 'Registro, consulta y archivo de informes periódicos y especiales de personal.' },
      { id: 'radiogramas', title: 'Radiogramas', description: 'Control de radiogramas recibidos y expedidos relacionados con personal.' },
      { id: 'oficios', title: 'Oficios', description: 'Elaboración, registro y seguimiento de oficios de la Sección I - Personal.' }
    ]
  },
  varios: {
    number: '06', title: 'Varios', purpose: 'Publicar disposiciones y documentos autorizados para conocimiento del personal.',
    areas: [
      { id: 'disposiciones', title: 'Publicación de disposiciones generales', description: 'Carga y administración de documentos visibles desde el Portal del Personal.' }
    ]
  }
};

let activeP1Function = 'efectivos';

function renderG1Detail(key) {
  const item = g1Functions[key];
  activeP1Function = key;
  document.querySelectorAll('.g1-card').forEach(card => card.classList.toggle('active', card.dataset.g1 === key));
  setText('p1-function-title', item.title);
  setText('p1-function-purpose', item.purpose);
  document.getElementById('p1-function-detail').innerHTML = `<div class="g1-detail-head"><span>${item.number}</span><div><p class="eyebrow">FUNCIÓN SELECCIONADA</p><h4>${item.title}</h4><p>${item.purpose}</p></div></div><div class="g1-detail-grid g1-detail-single"><div><h5>Registros de la función</h5><div class="control-list">${item.areas.map(area => `<button class="p1-register-card" type="button" data-register="${area.id}" data-register-title="${area.title}" data-register-description="${area.description}"><span><strong>${area.title}</strong><small>${area.description}</small></span><b>Abrir registro →</b></button>`).join('')}</div></div></div>`;
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.register === 'cuadros') {
      showView('cuadros');
      return;
    }
    if (button.dataset.register === 'tropa') {
      showView('tropa');
      return;
    }
    if (button.dataset.register === 'memorandums') {
      showView('memorandums');
      return;
    }
    if (button.dataset.register === 'vacaciones') {
      openVacationReport('p1');
      return;
    }
    if (button.dataset.register === 'disposiciones') {
      openInformation('p1');
      return;
    }
    openP1Record(button.dataset.registerTitle, button.dataset.registerDescription);
  }));
  showView('p1-funcion');
}

document.querySelectorAll('.g1-card').forEach(card => card.addEventListener('click', () => renderG1Detail(card.dataset.g1)));

function openP1Record(recordTitle, description) {
  setText('p1-register-title', recordTitle);
  setText('p1-register-panel-title', recordTitle);
  setText('p1-register-description', description);
  showView('p1-registro');
}

document.getElementById('p1-register-return').addEventListener('click', () => renderG1Detail(activeP1Function));

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

document.querySelectorAll('[data-back-p1]').forEach(button => button.addEventListener('click', () => goBackView('p1')));
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

const troopSections = [
  { id: 'fallecido', letter: 'A', title: 'Personal fallecido', detail: 'Causa del fallecimiento' },
  { id: 'detenido', letter: 'B', title: 'Personal detenido y liberado', detail: 'Causa y centro de detención' },
  { id: 'falta_lista', letter: 'C', title: 'Personal que falta a lista', detail: 'Formación o parte al que faltó' },
  { id: 'hospitalizado', letter: 'D', title: 'Personal hospitalizado', detail: 'Diagnóstico y nosocomio' },
  { id: 'sanidad', letter: 'E', title: 'Personal internado en sanidad', detail: 'Diagnóstico o causa' },
  { id: 'permiso', letter: 'F', title: 'Permiso de comando y/o cumpleaños', detail: 'Causa o motivo del permiso' },
  { id: 'bajas', letter: 'G', title: 'Bajas', detail: 'Documento y motivo de la baja' },
  { id: 'comision', letter: 'H', title: 'Comisión PP.MM.AA., PP.MM.SS. y otros', detail: 'Motivo y escalón de la comisión' }
];
const troopForm = document.getElementById('troop-form');
const troopStorageKey = 'simu_demo_parte_tropa_v1';
const troopArchiveKey = 'simu_demo_archivo_tropa_v1';
let activeTroopSection = troopSections[0].id;
let troopRecords = [
  { section: 'falta_lista', rank: 'SLDO.', name: 'Personal demostrativo 01', unit: 'Unidad demostrativa', from: '2026-08-20', to: '', detail: 'Lista de diana', observation: 'En verificación' },
  { section: 'permiso', rank: 'CABO', name: 'Personal demostrativo 02', unit: 'Unidad demostrativa', from: '2026-08-20', to: '2026-08-20', detail: 'Permiso demostrativo', observation: 'Concluido' }
];

function troopSection(id = activeTroopSection) { return troopSections.find(section => section.id === id) || troopSections[0]; }
function troopDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(year, month - 1, day)).replace('.', '').toUpperCase();
}
function troopData() {
  return {
    date: document.getElementById('troop-date').value,
    time: document.getElementById('troop-time').value,
    place: document.getElementById('troop-place').value.trim(),
    code: document.getElementById('troop-code').value.trim(),
    reference: document.getElementById('troop-reference').value.trim(),
    records: troopRecords.map(record => ({ ...record }))
  };
}
function renderTroopTabs() {
  document.getElementById('troop-tabs').innerHTML = troopSections.map(section => {
    const count = troopRecords.filter(record => record.section === section.id).length;
    return `<button type="button" role="tab" aria-selected="${section.id === activeTroopSection}" class="${section.id === activeTroopSection ? 'active' : ''}" data-troop-section="${section.id}"><b>${section.letter}</b><span>${section.title}</span><i>${count}</i></button>`;
  }).join('');
  document.querySelectorAll('[data-troop-section]').forEach(button => button.addEventListener('click', () => { activeTroopSection = button.dataset.troopSection; renderTroopModule(); }));
}
function renderTroopSummary() {
  document.getElementById('troop-summary').innerHTML = troopSections.map(section => {
    const count = troopRecords.filter(record => record.section === section.id).length;
    return `<article><span>${section.letter}</span><div><small>${escapeOfficial(section.title)}</small><strong>${count}</strong></div></article>`;
  }).join('');
  setText('troop-total', `${troopRecords.length} ${troopRecords.length === 1 ? 'persona' : 'personas'}`);
}
function renderTroopRecords() {
  const records = troopRecords.filter(record => record.section === activeTroopSection);
  const tbody = document.getElementById('troop-records');
  const rankOptions = selected => ['DGTE.', 'CABO', 'SLDO.', 'PREMIL.', 'OTRO'].map(rank => `<option value="${rank}"${rank === selected ? ' selected' : ''}>${rank}</option>`).join('');
  tbody.innerHTML = records.length ? records.map((record, index) => {
    const recordIndex = troopRecords.indexOf(record);
    return `<tr data-troop-row="${recordIndex}"><td>${index + 1}</td><td><select data-field="rank" aria-label="Grado">${rankOptions(record.rank)}</select></td><td><input data-field="name" value="${escapeOfficial(record.name)}" aria-label="Nombres" /></td><td><input data-field="unit" value="${escapeOfficial(record.unit)}" aria-label="Unidad" /></td><td><input data-field="from" type="date" value="${escapeOfficial(record.from)}" aria-label="Fecha desde" /></td><td><input data-field="to" type="date" value="${escapeOfficial(record.to)}" aria-label="Fecha hasta" /></td><td><input data-field="detail" value="${escapeOfficial(record.detail || '')}" aria-label="Detalle" /></td><td><input data-field="observation" value="${escapeOfficial(record.observation || '')}" aria-label="Situación actual" /></td><td><div class="troop-row-actions"><button class="troop-save-button" type="button" data-save-troop="${recordIndex}">Guardar</button><button class="troop-delete-button" type="button" data-remove-troop="${recordIndex}" aria-label="Eliminar registro">×</button></div></td></tr>`;
  }).join('') : '<tr class="troop-no-records"><td colspan="9">NO SE REGISTRÓ PERSONAL EN ESTA NOVEDAD</td></tr>';
  tbody.querySelectorAll('[data-save-troop]').forEach(button => button.addEventListener('click', () => {
    const recordIndex = Number(button.dataset.saveTroop);
    const row = button.closest('[data-troop-row]');
    const value = field => row.querySelector(`[data-field="${field}"]`).value.trim();
    const updated = { ...troopRecords[recordIndex], rank: value('rank'), name: value('name'), unit: value('unit'), from: value('from'), to: value('to'), detail: value('detail'), observation: value('observation') };
    if (!updated.rank || !updated.name || !updated.unit) return notify('Complete grado, nombres y unidad antes de guardar.');
    if (updated.to && updated.from && updated.to < updated.from) return notify('La fecha hasta no puede ser anterior a la fecha desde.');
    troopRecords[recordIndex] = updated;
    localStorage.setItem(troopStorageKey, JSON.stringify(troopData()));
    renderTroopModule();
    notify('Los datos del registro fueron actualizados.');
  }));
  tbody.querySelectorAll('[data-remove-troop]').forEach(button => button.addEventListener('click', () => { troopRecords.splice(Number(button.dataset.removeTroop), 1); renderTroopModule(); notify('Registro demostrativo eliminado.'); }));
}
function renderTroopModule() {
  const section = troopSection();
  setText('troop-section-title', `${section.letter}. ${section.title}`);
  document.getElementById('troop-detail-label').childNodes[0].nodeValue = `${section.detail}`;
  renderTroopTabs();
  renderTroopSummary();
  renderTroopRecords();
}
function clearTroopEntry() {
  ['troop-name', 'troop-from', 'troop-to', 'troop-detail', 'troop-observation'].forEach(id => { document.getElementById(id).value = ''; });
}
document.getElementById('troop-add-record').addEventListener('click', () => {
  const record = {
    section: activeTroopSection,
    rank: document.getElementById('troop-rank').value,
    name: document.getElementById('troop-name').value.trim(),
    unit: document.getElementById('troop-subunit').value.trim(),
    from: document.getElementById('troop-from').value,
    to: document.getElementById('troop-to').value,
    detail: document.getElementById('troop-detail').value.trim(),
    observation: document.getElementById('troop-observation').value.trim()
  };
  if (!record.rank || !record.name || !record.unit) return notify('Complete grado, nombres y unidad antes de agregar.');
  if (record.to && record.from && record.to < record.from) return notify('La fecha hasta no puede ser anterior a la fecha desde.');
  troopRecords.push(record);
  clearTroopEntry();
  renderTroopModule();
  notify('Personal agregado a la novedad seleccionada.');
});
function saveTroopDraft() {
  const data = troopData();
  localStorage.setItem(troopStorageKey, JSON.stringify(data));
  setText('troop-status', 'Borrador guardado');
  return data;
}
function applyTroopData(data) {
  if (!data) return;
  document.getElementById('troop-date').value = data.date || '';
  document.getElementById('troop-time').value = data.time || '08:00';
  document.getElementById('troop-place').value = data.place || 'Tolata';
  document.getElementById('troop-code').value = data.code || '';
  document.getElementById('troop-reference').value = data.reference || '';
  troopRecords = Array.isArray(data.records) ? data.records.map(record => ({ ...record })) : [];
  renderTroopModule();
}
function readTroopArchive() {
  try { const data = JSON.parse(localStorage.getItem(troopArchiveKey) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}
function renderTroopArchive() {
  const archive = readTroopArchive();
  setText('troop-archive-count', `${archive.length} ${archive.length === 1 ? 'registro' : 'registros'}`);
  const container = document.getElementById('troop-archive-list');
  container.innerHTML = archive.length ? archive.map((item, index) => `<article class="troop-history-row"><div><span>Fecha</span><strong>${escapeOfficial(item.date || 'Sin fecha')}</strong></div><div><span>Radiograma</span><strong>${escapeOfficial(item.code || '—')}</strong></div><div><span>Novedades nominales</span><strong>${item.records?.length || 0}</strong></div><div><span>Estado</span><strong>Archivado</strong></div><button type="button" data-load-troop="${index}">Consultar</button></article>`).join('') : '<p class="troop-empty">Todavía no existen partes de tropa archivados.</p>';
  container.querySelectorAll('[data-load-troop]').forEach(button => button.addEventListener('click', () => { applyTroopData(archive[Number(button.dataset.loadTroop)]); setText('troop-status', 'Consulta de archivo'); window.scrollTo({ top: 0, behavior: 'smooth' }); notify('Parte archivado cargado en modo de consulta.'); }));
}
function troopOfficialSection(section, records) {
  const rows = records.length ? records.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeOfficial(record.rank)}</td><td>${escapeOfficial(record.name)}</td><td>${escapeOfficial(record.unit)}</td><td>${troopDate(record.from)}</td><td>${troopDate(record.to)}</td><td>${escapeOfficial(record.detail || '—')}</td><td>${escapeOfficial(record.observation || '—')}</td></tr>`).join('') : '<tr><td colspan="8"><b>NO SE REGISTRÓ</b></td></tr>';
  return `<section class="troop-official-section"><h3>${section.letter}. ${escapeOfficial(section.title.toUpperCase())}</h3><table><thead><tr><th>N.º</th><th>GRADO</th><th>NOMBRES Y APELLIDOS</th><th>UNIDAD</th><th>DESDE</th><th>HASTA</th><th>${escapeOfficial(section.detail.toUpperCase())}</th><th>SITUACIÓN / OBSERVACIÓN</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}
function buildOfficialTroopReport() {
  const data = troopData();
  const groups = [[0, 1, 2], [3, 4, 5], [6, 7]];
  document.getElementById('official-troop-report-print').innerHTML = groups.map((indices, pageIndex) => `<article class="troop-official-page">
    <header><div><b>SÉPTIMA DIVISIÓN DEL EJÉRCITO</b><b>RIAEROTRANS-18 “VICTORIA”</b><b>BOLIVIA</b></div><div class="troop-official-code"><b>RADIOGRAMA EXPEDIDO</b><span>N.º ${escapeOfficial(data.code)}</span></div></header>
    <p class="troop-official-place">${escapeOfficial(data.place)}, ${troopDate(data.date)} · ${escapeOfficial(data.time)} Hrs.</p>
    ${pageIndex === 0 ? `<div class="troop-official-routing"><b>AL:</b><span>COMANDO DIV-7</span><b>DEL:</b><span>RIAEROTRANS-18 “VICTORIA”</span></div><p class="troop-official-reference">REF.: ${escapeOfficial(data.reference)}</p><h1>PARTE DIARIO DE NOVEDADES DEL PERSONAL DE TROPA</h1>` : '<h1>CONTINUACIÓN DEL PARTE DIARIO DE NOVEDADES</h1>'}
    ${indices.map(index => { const section = troopSections[index]; return troopOfficialSection(section, data.records.filter(record => record.section === section.id)); }).join('')}
    ${pageIndex === 2 ? '<div class="troop-official-signatures"><div><span>FIRMA DEMOSTRATIVA</span><b>JEFE DE PERSONAL</b></div><div><span>FIRMA DEMOSTRATIVA</span><b>AUXILIAR DE PERSONAL</b></div></div><p class="troop-official-warning">DOCUMENTO DEMOSTRATIVO · NO CONTIENE INFORMACIÓN INSTITUCIONAL REAL</p>' : ''}
    <footer>${pageIndex + 1} - ${groups.length}</footer>
  </article>`).join('');
}
troopForm.addEventListener('submit', event => { event.preventDefault(); saveTroopDraft(); notify('Parte diario de tropa guardado como borrador demostrativo.'); });
document.getElementById('troop-archive').addEventListener('click', () => { const data = saveTroopDraft(); const archive = readTroopArchive(); archive.unshift({ ...data, archivedAt: new Date().toISOString() }); localStorage.setItem(troopArchiveKey, JSON.stringify(archive)); setText('troop-status', 'Archivado'); renderTroopArchive(); notify('Parte diario cerrado y archivado.'); });
document.getElementById('troop-print').addEventListener('click', () => { buildOfficialTroopReport(); document.body.classList.add('printing-official-troop-report'); window.setTimeout(() => window.print(), 80); });
window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-troop-report'));
document.getElementById('troop-date').value = new Date().toISOString().slice(0, 10);
try { const savedTroop = JSON.parse(localStorage.getItem(troopStorageKey) || 'null'); if (savedTroop) applyTroopData(savedTroop); } catch { localStorage.removeItem(troopStorageKey); }
renderTroopModule();
renderTroopArchive();

const memorandumPositions = [
  'SEGUNDO CMTE. DEL GCAE-1','SEGUNDO CMTE. DEL ECAE-B','SUBOFICIAL DE COMANDO','AYUDANTÍA','DIRECTOR DE LA BANDA DE MÚSICA','OFICIAL DE PERSONAL','OFICIAL DE LA SEC. III OPS.','OFICIAL DE LOGÍSTICA','OFICIAL DE INTELIGENCIA','OFICIAL DE AC./OC.','OFICIAL DE RR. PP.','COMANDANTE DE PATRULLA','COMANDANTE DE SECCIÓN','PRIMERO DE SECCIÓN','CMTE. DE ESCUADRÓN','PRIMERO DE ESCUADRÓN','CMTE. DE ESCUADRÓN BASE','CMTE. DE EDRÓN. MANTENIMIENTO','CMTE. DE EDRÓN. OP. AÉREAS','CMTE. DE EDRÓN. ESTANDARIZACIÓN','CMTE. DE EDRÓN. SIMULACIÓN','CMTE. DE EDRÓN. SEG. DE VUELO','AUXILIAR DE LA PLANA MAYOR','AUX. DE LA SEC. PERSONAL','AUX. DE LA SEC. III OPS.','AUX. DE LA SEC. INTELIGENCIA','AUX. DE LA SEC. LOGÍSTICA','AUX. DE LA SEC. AC./OC.','AUX. DE LA SEC. RR. PP.','JEFE DE MANTENIMIENTO','JEFE DE CONTROL DE CALIDAD','JEFE DE LÍNEA DE VUELO','JEFE DE TRANSPORTES','JEFE DE RADIO','AUX. DEL EDRÓN. MANTTO.','AUX. DE LA SEC. RADIO','AUX. DEL JEFE DE TRANSPORTES','CAJERO HABILITADO','AUX. DE LA SEC. CAJA','TÉCNICO DE MANTENIMIENTO','TÉCNICO DEL SIMULADOR DE VUELO','ENCARGADO DE MAT. BÉLICO','MÉDICO OPERATIVO','MÉDICO DENTISTA','OTRO CARGO'
];

const graveFaultTexts = [
  'Omitir saludo a los símbolos patrios en formaciones y otros actos de reglamento.',
  'La falta de cumplimiento estricto a órdenes superiores o su modificación, siempre que no se hubieran representado oportunamente.',
  'Facilitar armamento o munición sin orden superior.',
  'Entregar sin orden superior material o instrumentos de naves o vehículos bajo su custodia o responsabilidad.',
  'La destrucción, deterioro o abandono por negligencia de objetos o prendas pertenecientes a la unidad.',
  'Vender prendas de su vestuario.',
  'Abandonar, perder, inutilizar o revelar documentos no clasificados, siempre que no constituya delito.',
  'Todo acto de agresión y malos tratos a los inferiores, exceptuando los casos para impedir faltas graves o delitos.',
  'Reprender públicamente y en términos indecorosos a sus subalternos, excediéndose en sus atribuciones.',
  'Fingir enfermedad para eludir actos del servicio.',
  'Sobrepasar el tiempo de su licencia sin causa justificada.',
  'No constituirse en su nuevo destino en el plazo correspondiente o solicitar licencia indefinida para no cumplir el destino señalado.',
  'Ser causante de desórdenes, escándalos y reyertas públicas o dentro de cuarteles, campamentos y otros.',
  'Embriagarse y causar escándalos hallándose de franco o vistiendo uniforme.',
  'Provocar, promover o suscitar discusiones que den lugar a antagonismo entre Fuerzas Armadas de la Nación.',
  'Realizar público reproche a los actos de gobierno y autoridades militares.',
  'Provocar o desafiar a un superior, o hacerlo a un inferior en actos del servicio.',
  'Causar desorden, alarma o confusión en la tropa, campamento, población y otros lugares, cuando no constituya delito.',
  'Concurrir a casas de tolerancia, cantinas u otros lugares de expendio de bebidas y relacionar a las Fuerzas Armadas con actos escandalosos.',
  'No conducirse con pulcritud y decoro en todo acto público, dando lugar a críticas contra la institución castrense.',
  'Estando de civil o de uniforme, cometer actos incorrectos que afecten la dignidad y el honor de la institución armada.',
  'Ingerir a bordo bebidas alcohólicas o adoptar actitudes reñidas con la moral.',
  'Ejecutar descuentos, suscripciones o contribuciones arbitrarias en unidades y reparticiones castrenses.',
  'Autorizar o permitir que los inferiores hostilicen a autoridades políticas, administrativas o personas civiles.',
  'Obtener préstamos u obsequios de los inferiores, mientras no constituya extorsión.',
  'Cometer o permitir que se cometan exacciones de poca cuantía.',
  'Obsequiar artículos de los parques, mientras no constituya delito.',
  'Contraer deudas habitualmente y por motivos indecorosos.',
  'Impedir con amenazas la presentación de solicitudes y reclamaciones.',
  'Prolongar o abreviar los castigos disciplinarios impuestos conforme al reglamento.',
  'Quebrantar el arresto impuesto o no cumplir la orden para acatarlo.',
  'Tolerar a los inferiores la más leve falta y no castigarla teniendo competencia ejecutiva.',
  'Abandonar momentáneamente, en tiempo de paz, el puesto permanente o transitorio confiado.',
  'Eludir responsabilidades teniendo posibilidad o competencia para asumirlas.',
  'Permitir la pérdida del principio de autoridad y el respeto de los subalternos a los superiores.',
  'Entregar o recibir la guardia sin orden superior o nombramiento respectivo.',
  'No acudir al llamado de sus superiores en caso de alarma.',
  'No dar parte y no auxiliar a miembros de las Fuerzas Armadas en cualquier accidente dentro o fuera del servicio.',
  'Difundir falsa alarma en la embarcación estando en navegación.',
  'Usar condecoraciones extranjeras sin autorización, así como insignias o emblemas no reglamentarios.',
  'Faltar a la palabra de honor empeñada ante el superior.',
  'Contraer matrimonio sin la correspondiente autorización superior.',
  'Negarse sin causa justificada a desempeñar cargos para los que hubiese sido designado.',
  'Pertenecer o formar logias secretas o clandestinas en el seno de las Fuerzas Armadas de la Nación.',
  'No cumplir por negligencia una captura a la que está obligado.',
  'Desconocer la autoridad de los superiores y faltar al respeto debido dentro o fuera del servicio.',
  'Permitir ofensas, insultos o mala propaganda contra las Fuerzas Armadas sin reaccionar.',
  'Lesionar la moral no conservando la dignidad y el decoro personales dentro y fuera del servicio.',
  'Criticar ridiculizando a los superiores en actos del servicio o fuera de él y en presencia de subalternos.',
  'Hacer circular anónimos, pasquines u otras publicaciones lesivas a la dignidad de las Fuerzas Armadas o sus miembros.',
  'Usar palabras o ademanes indebidos con los superiores.',
  'Descuidar la instrucción de sus subalternos o el mantenimiento y conservación del material, instrumental y municiones.',
  'Desatender el cuidado y alimentación del ganado.',
  'Visitar otra unidad y no presentarse al comandante para explicar el motivo de la visita.',
  'Fraccionar fojas de concepto injustas o apasionadas, faltando a la ética profesional.',
  'Permitir el ingreso a bordo de una nave en puerto a personas o materiales sin autorización.',
  'Realizar sin orden ni motivo justificado viajes, maniobras o acrobacias peligrosas con máquinas, vehículos o armas.',
  'Conducir una nave o vehículo en forma riesgosa o en estado de ebriedad.',
  'Permitir la salida arbitraria de arrestados o del personal que debe permanecer en el recinto militar.'
];

const lightFaultTexts = [
  'El desaseo personal.','No llevar el corte reglamentario del cabello, barba y patillas.','Negligencia en la conservación y uso del vestuario, cuarteles y lugares de alojamiento.','Incumplimiento de los deberes impuestos por el régimen interno de cuarteles, guarniciones, acantonamientos y campamentos.','No cumplir las normas relativas a la verificación, mantenimiento y uso de material, máquinas e instrumentos.','No observar las normas del ceremonial marítimo con otra embarcación.','Omisión o incorrección en el saludo reglamentario.','No acudir de inmediato al llamado de sus superiores dentro o fuera del servicio.','Usar prendas de uniforme contrarias al reglamento.','Responder incorrectamente al superior.','No prestar ayuda a personal civil o militar cuando sea requerido.','No dar respuesta oportuna a la correspondencia oficial de rutina encomendada.','Presentarse al superior en forma incorrecta, dirigirse sin la venia correspondiente u omitir el conducto regular.','Presentar solicitudes sin la venia correspondiente u omitiendo el conducto regular.','Formular reclamaciones unificadas al superior.','Retener o no dar curso a las solicitudes formuladas por los inferiores.','Presentarse en actos del servicio en traje de civil, salvo imposibilidad comprobada.','Mantener relaciones de familiaridad con los subalternos en actos del servicio.','Faltar o atrasarse sin permiso, mientras no constituya falta grave o delito.','Abrir la puerta de un local, nave u otro ambiente cuyo ingreso no está autorizado.','No pedir autorización para retirarse de la embarcación o del puesto de trabajo.','Hacer bromas que ocasionen perjuicio moral o material.'
];

const specialFaults = [
  { article: '12', numeral: '1', classification: 'Agravación', text: 'La falta leve se convierte en grave cuando es repetida.' },
  { article: '12', numeral: '2', classification: 'Agravación', text: 'La falta leve se convierte en grave cuando se comete en presencia de subalternos.' },
  { article: '12', numeral: '3', classification: 'Agravación', text: 'La falta leve se convierte en grave cuando se comete colectivamente.' },
  { article: '15', numeral: '', classification: 'Falta grave', text: 'Deserción por abandono absoluto del servicio durante cinco días continuos en tiempo de paz.' },
  { article: '16', numeral: '', classification: 'Falta grave', text: 'No retornar a la unidad luego de cinco días de concluida la licencia o misión.' },
  { article: '42', numeral: '', classification: 'Falta', text: 'No imponer castigo a faltas cometidas conforme al reglamento.' },
  { article: '43', numeral: '', classification: 'Falta del superior', text: 'Imponer castigos leves por faltas graves, o castigos graves por faltas leves.' },
  { article: '49', numeral: '', classification: 'Nueva falta', text: 'Plantear una reclamación maliciosamente o con argumentos falsos.' },
  { article: '50', numeral: '', classification: 'Falta', text: 'Formular una reclamación sin respetar el conducto regular establecido.' },
  { article: '51', numeral: '', classification: 'Falta grave', text: 'Ejercer presión sobre el subalterno para que retire su reclamación.' }
];

const memorandumFaultCatalog = {
  grave: graveFaultTexts.map((text, index) => ({ article: '10', numeral: String(index + 1), classification: 'Falta grave', text })),
  leve: lightFaultTexts.map((text, index) => ({ article: '11', numeral: String(index + 1), classification: 'Falta leve', text })),
  especial: specialFaults
};

const memorandumForm = document.getElementById('memorandum-form');
const memoPosition = document.getElementById('memo-position');
const memoFaultClass = document.getElementById('memo-fault-class');
const memoFaultSelect = document.getElementById('memo-fault-select');
const memorandumStorageKey = 'simu_demo_memorandum_v1';
const memorandumArchiveKey = 'simu_demo_memorandum_archivo_v1';
let selectedMemorandumFaults = [];

memoPosition.innerHTML = memorandumPositions.map(position => `<option>${position}</option>`).join('');
memoPosition.value = 'COMANDANTE DE SECCIÓN';
memoPosition.addEventListener('change', () => {
  document.getElementById('memo-other-position-wrap').hidden = memoPosition.value !== 'OTRO CARGO';
});

function renderMemorandumFaultOptions() {
  memoFaultSelect.innerHTML = memorandumFaultCatalog[memoFaultClass.value].map((fault, index) => `<option value="${index}">Art. ${fault.article}${fault.numeral ? `, numeral ${fault.numeral}` : ''} — ${escapeOfficial(fault.text)}</option>`).join('');
}

function memorandumLegalText() {
  if (!selectedMemorandumFaults.length) return '';
  return selectedMemorandumFaults.map(fault => `Reglamento de Faltas Disciplinarias y sus Castigos N.º 23, ${fault.article === '10' || fault.article === '11' ? 'Capítulo I “LAS FALTAS”, ' : ''}Art. ${fault.article}${fault.numeral ? `, numeral ${fault.numeral}` : ''}, que establece como ${fault.classification.toLowerCase()}: “${fault.text}”`).join('; asimismo, ');
}

function renderSelectedMemorandumFaults() {
  const container = document.getElementById('memo-selected-faults');
  container.innerHTML = selectedMemorandumFaults.length ? selectedMemorandumFaults.map((fault, index) => `<article><div><strong>Art. ${fault.article}${fault.numeral ? ` · numeral ${fault.numeral}` : ''}</strong><span>${escapeOfficial(fault.text)}</span></div><button type="button" data-remove-memo-fault="${index}" aria-label="Quitar falta">×</button></article>`).join('') : '<p>No se seleccionaron faltas.</p>';
  document.getElementById('memo-legal-basis').value = memorandumLegalText();
  document.getElementById('memorandum-validation').textContent = selectedMemorandumFaults.length ? `${selectedMemorandumFaults.length} ${selectedMemorandumFaults.length === 1 ? 'falta seleccionada' : 'faltas seleccionadas'}. Revise el fundamento antes de emitir.` : 'Seleccione al menos una falta disciplinaria.';
  container.querySelectorAll('[data-remove-memo-fault]').forEach(button => button.addEventListener('click', () => {
    selectedMemorandumFaults.splice(Number(button.dataset.removeMemoFault), 1);
    renderSelectedMemorandumFaults();
  }));
}

memoFaultClass.addEventListener('change', renderMemorandumFaultOptions);
document.getElementById('memo-add-fault').addEventListener('click', () => {
  const fault = memorandumFaultCatalog[memoFaultClass.value][Number(memoFaultSelect.value)];
  if (!fault) return;
  if (!selectedMemorandumFaults.some(item => item.article === fault.article && item.numeral === fault.numeral)) selectedMemorandumFaults.push({ ...fault });
  renderSelectedMemorandumFaults();
});

function memorandumPositionValue() {
  return memoPosition.value === 'OTRO CARGO' ? document.getElementById('memo-other-position').value.trim() : memoPosition.value;
}

function collectMemorandumData() {
  return {
    section: document.getElementById('memo-section').value.trim(), number: document.getElementById('memo-number').value,
    year: document.getElementById('memo-year').value, date: document.getElementById('memo-date').value, place: document.getElementById('memo-place').value.trim(),
    rank: document.getElementById('memo-rank').value.trim(), name: document.getElementById('memo-name').value.trim(), position: memorandumPositionValue(), treatment: document.getElementById('memo-treatment').value.trim(),
    facts: document.getElementById('memo-facts').value.trim(), faults: selectedMemorandumFaults.map(fault => ({ ...fault })), legalBasis: memorandumLegalText(),
    sanctionType: document.getElementById('memo-sanction-type').value, sanctionDuration: document.getElementById('memo-sanction-duration').value.trim(), sanctionPlace: document.getElementById('memo-sanction-place').value.trim(),
    sanctionStart: document.getElementById('memo-sanction-start').value, sanctionEnd: document.getElementById('memo-sanction-end').value, withoutPrejudice: document.getElementById('memo-without-prejudice').checked,
    signerName: document.getElementById('memo-signer-name').value.trim(), signerRank: document.getElementById('memo-signer-rank').value.trim(), initials: document.getElementById('memo-initials').value.trim()
  };
}

function saveMemorandumDraft() {
  const data = collectMemorandumData();
  localStorage.setItem(memorandumStorageKey, JSON.stringify(data));
  return data;
}

function applyMemorandumData(data) {
  const fields = { 'memo-section': data.section, 'memo-number': data.number, 'memo-year': data.year, 'memo-date': data.date, 'memo-place': data.place, 'memo-rank': data.rank, 'memo-name': data.name, 'memo-treatment': data.treatment, 'memo-facts': data.facts, 'memo-sanction-type': data.sanctionType, 'memo-sanction-duration': data.sanctionDuration, 'memo-sanction-place': data.sanctionPlace, 'memo-sanction-start': data.sanctionStart, 'memo-sanction-end': data.sanctionEnd, 'memo-signer-name': data.signerName, 'memo-signer-rank': data.signerRank, 'memo-initials': data.initials };
  Object.entries(fields).forEach(([id, value]) => { if (value !== undefined && value !== null) document.getElementById(id).value = value; });
  if (memorandumPositions.includes(data.position)) memoPosition.value = data.position;
  else { memoPosition.value = 'OTRO CARGO'; document.getElementById('memo-other-position').value = data.position || ''; document.getElementById('memo-other-position-wrap').hidden = false; }
  document.getElementById('memo-without-prejudice').checked = data.withoutPrejudice !== false;
  selectedMemorandumFaults = Array.isArray(data.faults) ? data.faults.map(fault => ({ ...fault })) : [];
  renderSelectedMemorandumFaults();
}

function readMemorandumArchive() {
  try { const data = JSON.parse(localStorage.getItem(memorandumArchiveKey) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; }
}

function renderMemorandumArchive() {
  const archive = readMemorandumArchive();
  setText('memorandum-archive-count', `${archive.length} ${archive.length === 1 ? 'registro' : 'registros'}`);
  const container = document.getElementById('memorandum-archive-list');
  container.innerHTML = archive.length ? archive.map((item, index) => `<article class="memorandum-history-row"><div><span>Memorándum</span><strong>${escapeOfficial(item.section)} N.º ${escapeOfficial(item.number)}/${escapeOfficial(item.year)}</strong></div><div><span>Fecha</span><strong>${escapeOfficial(item.date || 'Sin fecha')}</strong></div><div><span>Destinatario</span><strong>${escapeOfficial(item.rank)} ${escapeOfficial(item.name)}</strong></div><div><span>Estado</span><strong>Archivado</strong></div><button type="button" data-load-memorandum="${index}">Consultar</button></article>`).join('') : '<p class="memorandum-empty">Todavía no existen memorándums archivados.</p>';
  container.querySelectorAll('[data-load-memorandum]').forEach(button => button.addEventListener('click', () => { applyMemorandumData(archive[Number(button.dataset.loadMemorandum)]); window.scrollTo({ top: 0, behavior: 'smooth' }); notify('Memorándum archivado cargado en modo de consulta.'); }));
}

function memorandumLongDate(value) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[date.getMonth()]} ${date.getDate()} de ${date.getFullYear()}`;
}

function buildOfficialMemorandum() {
  const data = saveMemorandumDraft();
  const sanctionClause = `al recibo del presente es usted sancionado con ${data.sanctionDuration.toUpperCase()} DE ${data.sanctionType.toUpperCase()}, a cumplir en ${data.sanctionPlace}${data.withoutPrejudice ? ', sin perjuicio de cumplir con sus obligaciones' : ''}`;
  const container = document.getElementById('official-memorandum-print');
  container.innerHTML = `<article class="memo-official-page">
    <header><div><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></div><h1>MEMORANDUM</h1></header>
    <section class="memo-official-routing"><div class="memo-official-date"><span>${escapeOfficial(data.place)}, ${memorandumLongDate(data.date)}</span><u>Presente.-</u></div><div class="memo-official-recipient"><b>${escapeOfficial(data.section)} N.º ${escapeOfficial(data.number)}/${escapeOfficial(data.year)}</b><span>Al Señor: ${escapeOfficial(data.rank)}</span><span>${escapeOfficial(data.name)}</span><strong>${escapeOfficial(data.position)}</strong></div></section>
    <p>${escapeOfficial(data.treatment)}:</p>
    <p class="memo-official-body">${escapeOfficial(data.facts)} ${escapeOfficial(data.legalBasis)}, ${escapeOfficial(sanctionClause)}, insto a Usted a encaminar su conducta dentro de los principios de disciplina, responsabilidad y honestidad, en estricto cumplimiento a las disposiciones y normas militares.</p>
    <p>Ante algún presunto agravio deberá realizar la presentación de reclamación en forma escrita mediante solicitud, conforme a Formato-040 del CJ-RGA-223.</p>
    <p class="memo-official-copy">Copia del presente será remitida al Dpto. I ADM. RR. HH., para ser insertada a su legajo.</p>
    <blockquote>“EL MAR NOS PERTENECE POR DERECHO,<br>RECUPERARLO ES UN DEBER”</blockquote>
    <div class="memo-official-signature"><strong>${escapeOfficial(data.signerName)}</strong><b>${escapeOfficial(data.signerRank)}</b></div>
    <p class="memo-official-initials">${escapeOfficial(data.initials)}</p>
  </article>`;
  return container;
}

memorandumForm.addEventListener('submit', event => { event.preventDefault(); if (!selectedMemorandumFaults.length) return notify('Seleccione al menos una falta disciplinaria.'); saveMemorandumDraft(); notify('Memorándum guardado como borrador demostrativo.'); });
document.getElementById('memorandum-preview').addEventListener('click', () => { if (!selectedMemorandumFaults.length) return notify('Seleccione al menos una falta disciplinaria.'); buildOfficialMemorandum(); document.body.classList.add('printing-official-memorandum'); window.setTimeout(() => window.print(), 80); });
document.getElementById('memorandum-print').addEventListener('click', () => { if (!selectedMemorandumFaults.length) return notify('Seleccione al menos una falta disciplinaria.'); buildOfficialMemorandum(); document.body.classList.add('printing-official-memorandum'); window.setTimeout(() => window.print(), 80); });
window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-memorandum'));
document.getElementById('memorandum-archive').addEventListener('click', () => { if (!selectedMemorandumFaults.length) return notify('Seleccione al menos una falta disciplinaria.'); const data = saveMemorandumDraft(); const archive = readMemorandumArchive(); archive.unshift({ ...data, archivedAt: new Date().toISOString() }); localStorage.setItem(memorandumArchiveKey, JSON.stringify(archive)); setText('memorandum-status', 'Archivado'); renderMemorandumArchive(); notify('Memorándum cerrado y archivado en el historial demostrativo.'); });

document.getElementById('memo-date').value = new Date().toISOString().slice(0, 10);
renderMemorandumFaultOptions();
renderSelectedMemorandumFaults();
try { const savedMemo = JSON.parse(localStorage.getItem(memorandumStorageKey) || 'null'); if (savedMemo) applyMemorandumData(savedMemo); } catch { localStorage.removeItem(memorandumStorageKey); }
renderMemorandumArchive();
