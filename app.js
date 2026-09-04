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
  const activeNavigation = id === 'informacion' && informationAccessMode === 'personal' ? 'portal' : ['vacaciones', 'relaciones', 'filiaciones', 'hoja-vida', 'felicitaciones', 'radiogramas', 'cuadros', 'tropa', 'memorandums', 'p1-funcion', 'p1-registro'].includes(id) || (id === 'informacion' && informationAccessMode === 'p1') ? 'p1' : id;
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === activeNavigation));
  const pageTitles = {
    inicio: 'Inicio',
    comandante: 'Comandante de la Unidad',
    jpm: 'Jefe de la Plana Mayor',
    p1: 'P-1 Personal — SIPE',
    portal: 'Portal del Personal',
    vacaciones: 'Reporte individual de vacaciones',
    relaciones: 'Relaciones nominales',
    filiaciones: 'Filiaciones personales',
    'hoja-vida': 'Hoja de vida del personal',
    felicitaciones: 'Memorándums de felicitación',
    radiogramas: 'Radiogramas',
    coordinacion: 'Sala de Coordinación',
    informacion: 'Disposiciones generales',
    'p1-funcion': 'Funciones del P-1',
    'p1-registro': 'Registro del P-1',
    cuadros: 'Parte del personal de cuadros',
    tropa: 'Parte diario del personal de tropa',
    memorandums: 'Memorándums de sanción'
  };
  title.textContent = pageTitles[id] || pageTitles.inicio;
  viewBackButton.hidden = id === 'inicio' || viewHistory.length === 0;
  if (typeof renderInternalAlerts === 'function') renderInternalAlerts();
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
document.querySelectorAll('[data-open-commander]').forEach(item => item.addEventListener('click', () => showView('comandante')));
function sessionRoleText() { return (document.getElementById('session-user-role')?.textContent || '').toLowerCase(); }
function hasCoordinationAccess() { return /(comandante|jefe de la plana mayor|jpm|administrador|p-[1-5]|g-[1-5])/.test(sessionRoleText()); }
function canConveneMeeting() { return ['Comandante', 'Jefe de la Plana Mayor'].includes(currentCoordinationOrigin); }
const coordinationParticipants = ['Comandante', 'Jefe de la Plana Mayor', 'P-1 Personal', 'P-2 Inteligencia', 'P-3 Operaciones', 'P-4 Logística', 'P-5 Asuntos Civiles'];
const coordinationAllStaff = 'Toda la Plana Mayor';
let currentCoordinationOrigin = 'P-1 Personal';
let currentCoordinationDestination = '';
function openCoordinationRoom(origin) {
  currentCoordinationOrigin = coordinationParticipants.includes(origin) ? origin : 'P-1 Personal';
  const originSelect = document.getElementById('coord-origin');
  const destinationSelect = document.getElementById('coord-destination');
  originSelect.innerHTML = `<option>${currentCoordinationOrigin}</option>`;
  destinationSelect.innerHTML = '';
  currentCoordinationDestination = '';
  renderCoordinationDirectory();
  document.getElementById('coordination-directory').hidden = false;
  document.getElementById('coordination-channel').hidden = true;
  showView('coordinacion');
}
document.querySelectorAll('[data-open-coordination]').forEach(item => item.addEventListener('click', () => openCoordinationRoom(item.dataset.coordinationOrigin)));
document.getElementById('coordination-return').addEventListener('click', () => goBackView(currentCoordinationOrigin === 'Comandante' ? 'comandante' : currentCoordinationOrigin === 'Jefe de la Plana Mayor' ? 'jpm' : currentCoordinationOrigin === 'P-1 Personal' ? 'p1' : 'inicio'));
document.getElementById('coordination-directory-return').addEventListener('click', () => { currentCoordinationDestination = ''; document.getElementById('coordination-directory').hidden = false; document.getElementById('coordination-channel').hidden = true; renderCoordinationDirectory(); });
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
    { type: 'Radiograma', subject: 'Disposición administrativa semanal', reference: 'RAD. DEMO. N.º 01/26', date: '2026-08-19', content: 'Información demostrativa para conocimiento del personal.', fileName: 'Documento demostrativo.pdf' },
    { type: 'Comunicado', subject: 'Actividad general de la Unidad', reference: 'COM. DEMO. N.º 02/26', date: '2026-08-18', content: 'Comunicado demostrativo publicado sin archivo obligatorio.', fileName: '' }
  ];
}

function renderInformationPublications() {
  const publications = readInformationPublications();
  const container = document.getElementById('information-rows');
  container.innerHTML = publications.length ? publications.map((item, index) => `<article class="information-row"><div><span>${escapeOfficial(item.type)}</span><strong>${escapeOfficial(item.subject)}</strong><small>${escapeOfficial(item.reference)} · ${escapeOfficial(item.date)} · ${escapeOfficial(item.fileName || 'Sin archivo')}</small></div><div class="information-row-actions"><button type="button" data-consult-information="${index}">Consultar</button>${informationAccessMode === 'p1' ? `<button type="button" data-edit-information="${index}">Editar</button><button class="information-delete" type="button" data-delete-information="${index}">Retirar</button>` : ''}</div></article>`).join('') : '<p class="information-empty">No existen disposiciones publicadas.</p>';
  container.querySelectorAll('[data-consult-information]').forEach(button => button.addEventListener('click', () => {
    const item = publications[Number(button.dataset.consultInformation)];
    notify(`${item.type}: ${item.subject}. ${item.content || 'Sin contenido adicional.'} Adjunto: ${item.fileName || 'sin archivo'}.`);
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
    document.getElementById('information-requirement').value = item.requirement || 'knowledge';
    document.getElementById('information-subject').value = item.subject;
    document.getElementById('information-reference').value = item.reference;
    document.getElementById('information-date').value = item.date;
    document.getElementById('information-content').value = item.content || '';
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
  const previous = editingInformationIndex === null ? null : publications[editingInformationIndex];
  const publication = {
    type: document.getElementById('information-type').value,
    requirement: document.getElementById('information-requirement').value,
    subject: document.getElementById('information-subject').value.trim(),
    reference: document.getElementById('information-reference').value.trim(),
    date: document.getElementById('information-date').value,
    content: document.getElementById('information-content').value.trim(),
    fileName: file?.name || previous?.fileName || ''
  };
  if (editingInformationIndex === null) publications.unshift(publication);
  else publications[editingInformationIndex] = publication;
  localStorage.setItem(informationStorageKey, JSON.stringify(publications));
  const wasEditing = editingInformationIndex !== null;
  if (!wasEditing) createInternalAlert({ source: 'P-1 Personal', audience: 'Todo el personal', type: publication.type, subject: publication.subject, priority: 'Informativa', requirement: publication.requirement, reference: publication.reference });
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
const vacationProfilesKey = 'simu_demo_vacaciones_personal_v2';
try {
  const savedProfiles = JSON.parse(localStorage.getItem(vacationProfilesKey) || 'null');
  if (savedProfiles && typeof savedProfiles === 'object') Object.entries(savedProfiles).forEach(([id, profile]) => { if (personnelProfiles[id]) Object.assign(personnelProfiles[id], profile); });
} catch { localStorage.removeItem(vacationProfilesKey); }
function saveVacationProfiles() { localStorage.setItem(vacationProfilesKey, JSON.stringify(personnelProfiles)); }

function setText(id, value) { document.getElementById(id).textContent = value; }

function renderProfile(profileId) {
  const profile = personnelProfiles[profileId];
  const balance = profile.annual - profile.collective - profile.used - profile.permits + profile.compensation;
  setText('profile-initials', profile.initials); setText('profile-name', profile.name); setText('profile-unit', profile.unit);
  setText('profile-current-status', profile.currentStatus || 'Disponible');
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
  setText('vacation-eyebrow', isP1 ? 'ADMINISTRACIÓN DEL PERSONAL' : 'CONSULTA INDIVIDUAL');
  setText('vacation-heading', isP1 ? 'Vacaciones y permisos' : 'Reporte individual de vacaciones');
  setText('vacation-description', isP1 ? 'Registro de movimientos y generación de reportes individual y consolidado.' : 'Consulta personal del rol, saldo disponible y movimientos de vacaciones.');
  returnButton.textContent = isP1 ? 'Volver al P-1' : 'Volver al portal';
  returnButton.onclick = () => showView(isP1 ? 'p1' : 'portal');
  document.getElementById('vacation-report-type-wrap').hidden = !isP1;
  document.getElementById('vacation-admin-form').hidden = !isP1;
  document.getElementById('vacation-report-type').value = isP1 ? 'consolidated' : 'individual';
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
  const useConsolidated = vacationAccessMode === 'p1' && document.getElementById('vacation-report-type').value === 'consolidated';
  const content = useConsolidated
    ? `<h2>REPORTE CONSOLIDADO DE VACACIONES Y PERMISOS</h2><p class="vacation-report-scope">Administración del P-1</p><table><thead><tr><th>N.º</th><th>Personal</th><th>Dependencia</th><th>Derecho</th><th>Utilizado</th><th>Permisos</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>${consolidated}</tbody></table>`
    : `<h2>REPORTE INDIVIDUAL DE VACACIONES</h2><p class="vacation-report-scope">Consulta autorizada del titular</p><div class="vacation-report-person"><p><b>Personal:</b> ${escapeOfficial(profile.name)}</p><p><b>Dependencia:</b> ${escapeOfficial(profile.unit)}</p><p><b>Periodo programado:</b> ${escapeOfficial(profile.period)}</p><p><b>Estado:</b> ${escapeOfficial(profile.scheduleState)}</p></div><table><thead><tr><th>Derecho anual</th><th>Reserva colectiva</th><th>Utilizado</th><th>Permisos</th><th>Compensación</th><th>Saldo</th></tr></thead><tbody><tr><td>${profile.annual}</td><td>${profile.collective}</td><td>${profile.used}</td><td>${profile.permits}</td><td>${profile.compensation}</td><td>${vacationBalance(profile)}</td></tr></tbody></table><h3>HISTORIAL DE MOVIMIENTOS</h3><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Días</th><th>Efecto</th><th>Estado</th></tr></thead><tbody>${movements}</tbody></table>`;
  container.innerHTML = `<article class="vacation-official-page"><header><div class="vacation-letterhead"><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><strong>SECCIÓN I - PERSONAL</strong><u>BOLIVIA</u></div><div class="vacation-report-date"><span>Fecha: ${vacationReportDate()}</span></div></header>${content}<div class="vacation-report-signatures"><div>RESPONSABLE P-1</div><div>INTERESADO</div></div><p class="vacation-report-warning">DOCUMENTO DEMOSTRATIVO - NO CONTIENE DATOS INSTITUCIONALES REALES</p></article>`;
}

document.getElementById('vacation-print').addEventListener('click', () => {
  buildVacationReport();
  document.body.classList.add('printing-official-vacation-report');
  window.setTimeout(() => window.print(), 80);
});
document.getElementById('vacation-report-type').addEventListener('change', event => { document.getElementById('vacation-print').textContent = event.target.value === 'consolidated' ? 'Imprimir reporte consolidado' : 'Imprimir reporte individual'; });
document.getElementById('vacation-start').value = new Date().toISOString().slice(0, 10);
document.getElementById('vacation-end').value = new Date().toISOString().slice(0, 10);
document.getElementById('vacation-admin-form').addEventListener('submit', event => {
  event.preventDefault();
  const profileId = document.getElementById('profile-select').value;
  const profile = personnelProfiles[profileId];
  const type = document.getElementById('vacation-movement-type').value;
  const days = Number(document.getElementById('vacation-days').value);
  const state = document.getElementById('vacation-state').value;
  if (!profile || !Number.isFinite(days) || days < 1) return notify('Revise el personal y la cantidad de días.');
  const available = Number(document.getElementById('availability-count')?.textContent || 0);
  const total = Number(document.getElementById('metric-effective-current')?.textContent || 0);
  const projected = total ? ((available - (type === 'Compensación' ? 0 : 1)) / total) * 100 : 100;
  if (state !== 'Anulado' && projected < 75 && !window.confirm(`La disponibilidad proyectada es ${projected.toFixed(1)} %, inferior al mínimo de 75 %. ¿Desea registrar el movimiento demostrativo?`)) return;
  if (state !== 'Anulado') {
    if (type === 'Vacación') profile.used += days;
    else if (type === 'Permiso') profile.permits += days;
    else profile.compensation += days;
  }
  const start = document.getElementById('vacation-start').value;
  const end = document.getElementById('vacation-end').value;
  profile.period = `${start} al ${end}`;
  profile.scheduleDays = `${days} ${days === 1 ? 'día' : 'días'} hábiles`;
  profile.scheduleState = state;
  profile.currentStatus = state === 'Autorizado' && type !== 'Compensación' ? type : 'Disponible';
  const effect = state === 'Anulado' ? 'Sin efecto' : type === 'Compensación' ? `+${days} días` : `-${days} días`;
  profile.movements.unshift([start, type, String(days), effect, state]);
  saveVacationProfiles(); renderProfile(profileId);
  event.currentTarget.reset();
  document.getElementById('vacation-start').value = new Date().toISOString().slice(0, 10); document.getElementById('vacation-end').value = new Date().toISOString().slice(0, 10); document.getElementById('vacation-days').value = '1';
  notify('Movimiento registrado. Los reportes individual y consolidado fueron actualizados.');
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
      { id: 'filiaciones', title: 'Filiaciones personales', description: 'Datos de identificación y documentación individual vinculada al legajo.' },
      { id: 'hoja-vida', title: 'Hoja de vida del personal', description: 'Registro editable de sanciones, felicitaciones, permisos, licencias y otros antecedentes.' }
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
    number: '06', title: 'Publicación de disposiciones', purpose: 'Publicar disposiciones y documentos autorizados para conocimiento del personal.',
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
  document.getElementById('p1-function-detail').innerHTML = `<div class="g1-detail-head"><span>${item.number}</span><div><p class="eyebrow">FUNCIÓN SELECCIONADA</p><h4>${item.title}</h4><p>${item.purpose}</p></div></div><div class="g1-detail-grid g1-detail-single"><div><h5>Registros de la función</h5><div class="control-list p1-register-grid">${item.areas.map((area, index) => `<button class="p1-register-card" type="button" data-register="${area.id}" data-register-title="${area.title}" data-register-description="${area.description}"><span class="p1-register-number">${String(index + 1).padStart(2, '0')}</span><span class="p1-register-copy"><strong>${area.title}</strong><small>${area.description}</small></span><b>Abrir registro →</b></button>`).join('')}</div></div></div>`;
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
    if (button.dataset.register === 'relaciones') {
      showView('relaciones');
      return;
    }
    if (button.dataset.register === 'filiaciones') {
      showView('filiaciones');
      return;
    }
    if (button.dataset.register === 'hoja-vida') {
      showView('hoja-vida');
      return;
    }
    if (button.dataset.register === 'felicitaciones') {
      showView('felicitaciones');
      return;
    }
    if (button.dataset.register === 'radiogramas') {
      showView('radiogramas');
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
document.querySelectorAll('[data-back-moral]').forEach(button => button.addEventListener('click', () => renderG1Detail('moral')));
document.querySelectorAll('[data-back-internal]').forEach(button => button.addEventListener('click', () => renderG1Detail('pc')));

const nominalSections = [
  { id: 'infanteria', numeral: 'I', title: 'Infantería', abbreviation: 'Al. 2do. AM. INF.' },
  { id: 'caballeria', numeral: 'II', title: 'Caballería', abbreviation: 'Al. 2do. AM. CAB.' },
  { id: 'artilleria', numeral: 'III', title: 'Artillería', abbreviation: 'Al. 2do. AM. ART.' },
  { id: 'ingenieria', numeral: 'IV', title: 'Ingeniería', abbreviation: 'Al. 2do. AM. ING.' },
  { id: 'comunicaciones', numeral: 'V', title: 'Comunicaciones', abbreviation: 'Al. 2do. AM. COM.' },
  { id: 'material_belico', numeral: 'VI', title: 'Material Bélico', abbreviation: 'Al. 2do. AM. MAT. BEL.' },
  { id: 'motores', numeral: 'VII', title: 'Motores', abbreviation: 'Al. 2do. AM. MOT.' },
  { id: 'intendencia', numeral: 'VIII', title: 'Intendencia', abbreviation: 'Al. 2do. AM. INT.' },
  { id: 'sanidad', numeral: 'IX', title: 'Sanidad', abbreviation: 'Al. 2do. AM. SAN.' }
];
const nominalStorageKey = 'simu_demo_relacion_nominal_v1';
let activeNominalSection = nominalSections[0].id;
let nominalRecords = [
  { section: 'infanteria', rank: 'Cap. Inf.', name: 'Álvarez Rojas Ana', identity: '0000001', extension: 'CB', seniority: 1, echelon: 'Oficiales', unit: 'Compañía de Comando', observation: 'Sin novedad' },
  { section: 'caballeria', rank: 'Tte. Cab.', name: 'Cáceres Flores Bruno', identity: '0000002', extension: 'LP', seniority: 2, echelon: 'Oficiales', unit: 'Compañía A', observation: 'Sin novedad' },
  { section: 'artilleria', rank: 'Sof. 1ro. Art.', name: 'Fernández Lima Carla', identity: '0000003', extension: 'SC', seniority: 3, echelon: 'Suboficiales y Sargentos', unit: 'Compañía B', observation: 'Sin novedad' },
  { section: 'ingenieria', rank: 'Sgto. 1ro. Ing.', name: 'Gutiérrez Paz Diego', identity: '0000004', extension: 'OR', seniority: 4, echelon: 'Suboficiales y Sargentos', unit: 'Compañía de Servicios', observation: 'Sin novedad' },
  { section: 'comunicaciones', rank: 'Sgto. 2do. Com.', name: 'López Vargas Elena', identity: '0000005', extension: 'TJ', seniority: 5, echelon: 'Suboficiales y Sargentos', unit: 'Compañía de Comando', observation: 'Sin novedad' },
  { section: 'material_belico', rank: 'Cbo. Mat. Bel.', name: 'Mendoza Arias Fabio', identity: '0000006', extension: 'CH', seniority: 6, echelon: 'Tropa', unit: 'Compañía de Servicios', observation: 'Sin novedad' },
  { section: 'motores', rank: 'Sldo. Mot.', name: 'Quispe Céspedes Gabriela', identity: '0000007', extension: 'PT', seniority: 7, echelon: 'Tropa', unit: 'Compañía A', observation: 'Sin novedad' },
  { section: 'intendencia', rank: 'Sldo. Int.', name: 'Rojas Molina Hugo', identity: '0000008', extension: 'BN', seniority: 8, echelon: 'Tropa', unit: 'Compañía B', observation: 'Sin novedad' },
  { section: 'sanidad', rank: 'Lic. San.', name: 'Suárez Pinto Isabel', identity: '0000009', extension: 'CB', seniority: 9, echelon: 'Empleados Civiles', unit: 'Sanidad', observation: 'Sin novedad' }
];

function nominalSection(id = activeNominalSection) { return nominalSections.find(section => section.id === id) || nominalSections[0]; }
function saveNominalRecords() { localStorage.setItem(nominalStorageKey, JSON.stringify(nominalRecords)); }
function renderNominalModuleLegacy() {
  const section = nominalSection();
  setText('nominal-section-title', `${section.numeral}.- ${section.title}`);
  setText('nominal-total', `${nominalRecords.length} ${nominalRecords.length === 1 ? 'registro' : 'registros'}`);
  document.querySelector('#nominal-rank')?.setAttribute('placeholder', section.abbreviation);
  document.getElementById('nominal-tabs').innerHTML = nominalSections.map(item => {
    const count = nominalRecords.filter(record => record.section === item.id).length;
    return `<button type="button" class="${item.id === activeNominalSection ? 'active' : ''}" data-nominal-section="${item.id}"><b>${item.numeral}</b><span>${escapeOfficial(item.title)}</span><i>${count}</i></button>`;
  }).join('');
  document.querySelectorAll('[data-nominal-section]').forEach(button => button.addEventListener('click', () => { activeNominalSection = button.dataset.nominalSection; renderNominalModule(); }));
  const records = nominalRecords.filter(record => record.section === activeNominalSection);
  const tbody = document.getElementById('nominal-records');
  tbody.innerHTML = records.length ? records.map((record, index) => {
    const recordIndex = nominalRecords.indexOf(record);
    return `<tr data-nominal-row="${recordIndex}"><td>${index + 1}</td><td><input data-field="rank" value="${escapeOfficial(record.rank)}" aria-label="Grado" /></td><td><input data-field="name" value="${escapeOfficial(record.name)}" aria-label="Apellidos y nombres" /></td><td><input data-field="observation" value="${escapeOfficial(record.observation || '')}" aria-label="Observaciones" /></td><td><div class="nominal-row-actions"><button type="button" data-save-nominal="${recordIndex}">Guardar</button><button class="nominal-delete" type="button" data-remove-nominal="${recordIndex}" aria-label="Eliminar">×</button></div></td></tr>`;
  }).join('') : '<tr class="nominal-empty-row"><td colspan="5">NO SE REGISTRÓ PERSONAL EN ESTA ESPECIALIDAD</td></tr>';
  tbody.querySelectorAll('[data-save-nominal]').forEach(button => button.addEventListener('click', () => {
    const recordIndex = Number(button.dataset.saveNominal);
    const row = button.closest('[data-nominal-row]');
    const value = field => row.querySelector(`[data-field="${field}"]`).value.trim();
    if (!value('rank') || !value('name')) return notify('Complete el grado y los apellidos y nombres.');
    nominalRecords[recordIndex] = { ...nominalRecords[recordIndex], rank: value('rank'), name: value('name'), observation: value('observation') };
    saveNominalRecords();
    renderNominalModule();
    notify('Registro nominal actualizado.');
  }));
  tbody.querySelectorAll('[data-remove-nominal]').forEach(button => button.addEventListener('click', () => {
    nominalRecords.splice(Number(button.dataset.removeNominal), 1);
    saveNominalRecords();
    renderNominalModule();
    notify('Registro nominal eliminado.');
  }));
}

let nominalViewMode = 'alphabetical';
let currentNominalViewRecords = [];
function nominalRecordSection(record) { return nominalSections.find(section => section.id === record.section)?.title || 'Sin especialidad'; }
function normalizeNominalRecords() { nominalRecords = nominalRecords.map((record, index) => ({ identity: record.identity || `000000${index + 1}`, extension: record.extension || 'CB', seniority: record.seniority || index + 1, echelon: record.echelon || (record.rank?.startsWith('Al.') ? 'Oficiales' : 'Tropa'), unit: record.unit || 'Compañía de Comando', ...record })); }
function nominalGroupsForMode(mode) {
  if (mode === 'section') return [...new Set(nominalRecords.map(nominalRecordSection))].sort();
  if (mode === 'echelon') return ['Oficiales', 'Suboficiales y Sargentos', 'Tropa', 'Empleados Civiles'];
  if (mode === 'unit') return [...new Set(nominalRecords.map(record => record.unit))].sort();
  return [];
}
function renderNominalModule() {
  normalizeNominalRecords();
  setText('nominal-section-title', nominalViewMode === 'alphabetical' ? 'Relación por apellidos y nombres' : nominalViewMode === 'rank' ? 'Relación ordenada por grado' : nominalViewMode === 'seniority' ? 'Relación por antigüedad' : nominalViewMode === 'section' ? 'Relación por armas y especialidades' : nominalViewMode === 'echelon' ? 'Relación por escalafón' : 'Relación por dependencia');
  setText('nominal-total', `${nominalRecords.length} ${nominalRecords.length === 1 ? 'registro' : 'registros'}`);
  const groupSelect = document.getElementById('nominal-group-filter');
  const previousGroup = groupSelect.value;
  const groups = nominalGroupsForMode(nominalViewMode);
  groupSelect.disabled = !groups.length;
  groupSelect.innerHTML = '<option value="all">Todos</option>' + groups.map(group => `<option value="${escapeOfficial(group)}">${escapeOfficial(group)}</option>`).join('');
  if ([...groupSelect.options].some(option => option.value === previousGroup)) groupSelect.value = previousGroup;
  const search = document.getElementById('nominal-search').value.trim().toLocaleLowerCase('es');
  let records = nominalRecords.filter(record => !search || `${record.rank} ${record.name} ${record.identity} ${record.extension}`.toLocaleLowerCase('es').includes(search));
  if (groupSelect.value !== 'all') records = records.filter(record => nominalViewMode === 'section' ? nominalRecordSection(record) === groupSelect.value : nominalViewMode === 'echelon' ? record.echelon === groupSelect.value : record.unit === groupSelect.value);
  const direction = document.getElementById('nominal-direction').value === 'desc' ? -1 : 1;
  records.sort((a, b) => direction * (nominalViewMode === 'rank' ? a.rank.localeCompare(b.rank, 'es') || a.name.localeCompare(b.name, 'es') : nominalViewMode === 'seniority' ? Number(a.seniority) - Number(b.seniority) : nominalViewMode === 'section' ? nominalRecordSection(a).localeCompare(nominalRecordSection(b), 'es') || a.name.localeCompare(b.name, 'es') : nominalViewMode === 'echelon' ? a.echelon.localeCompare(b.echelon, 'es') || Number(a.seniority) - Number(b.seniority) : nominalViewMode === 'unit' ? a.unit.localeCompare(b.unit, 'es') || a.name.localeCompare(b.name, 'es') : a.name.localeCompare(b.name, 'es')));
  currentNominalViewRecords = records;
  const tbody = document.getElementById('nominal-records');
  tbody.innerHTML = records.length ? records.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeOfficial(record.rank)}</td><td>${escapeOfficial(record.name)}</td><td>${escapeOfficial(record.identity)}</td><td>${escapeOfficial(record.extension)}</td><td>${escapeOfficial(record.seniority)}</td><td>${escapeOfficial(nominalRecordSection(record))}</td><td>${escapeOfficial(record.echelon)}</td><td>${escapeOfficial(record.unit)}</td><td>${escapeOfficial(record.observation || 'Sin novedad')}</td></tr>`).join('') : '<tr class="nominal-empty-row"><td colspan="10">NO EXISTEN REGISTROS PARA ESTA VISTA</td></tr>';
}
document.getElementById('nominal-view-mode').addEventListener('change', event => { nominalViewMode = event.target.value; document.getElementById('nominal-group-filter').value = 'all'; renderNominalModule(); });
document.getElementById('nominal-group-filter').addEventListener('change', renderNominalModule);
document.getElementById('nominal-search').addEventListener('input', renderNominalModule);
document.getElementById('nominal-direction').addEventListener('change', renderNominalModule);

document.getElementById('nominal-reset').addEventListener('click', () => { nominalViewMode = 'alphabetical'; document.getElementById('nominal-view-mode').value = 'alphabetical'; document.getElementById('nominal-group-filter').value = 'all'; document.getElementById('nominal-search').value = ''; document.getElementById('nominal-direction').value = 'asc'; renderNominalModule(); notify('Se restableció el orden alfabético.'); });
document.querySelectorAll('[data-back-administration]').forEach(button => button.addEventListener('click', () => renderG1Detail('administracion')));

function buildOfficialNominalReportLegacy() {
  const groups = [[0, 1], [2, 3], [4, 5], [6, 7], [8]];
  const pages = groups.map((indices, pageIndex) => `<article class="nominal-official-page">
    <header><div><b>SÉPTIMA DIVISIÓN DEL EJÉRCITO</b><b>RIAEROTRANS-18 “VICTORIA”</b><u>BOLIVIA</u></div><strong>SECRETO</strong></header>
    ${pageIndex === 0 ? '<h1>RELACIÓN NOMINAL DEL PERSONAL POR ARMAS Y ESPECIALIDADES</h1>' : ''}
    ${indices.map(sectionIndex => { const section = nominalSections[sectionIndex]; const records = nominalRecords.filter(record => record.section === section.id); return `<section><h2>${section.numeral}.- <u>${escapeOfficial(section.title.toUpperCase())}.</u></h2><table><thead><tr><th>N.º</th><th>GRADO</th><th>APELLIDOS Y NOMBRES</th><th>OBS.</th></tr></thead><tbody>${records.length ? records.map((record, index) => `<tr><td>${index + 1}.-</td><td>${escapeOfficial(record.rank)}</td><td>${escapeOfficial(record.name)}</td><td>${escapeOfficial(record.observation || '')}</td></tr>`).join('') : '<tr><td colspan="4">NO SE REGISTRÓ PERSONAL</td></tr>'}</tbody></table></section>`; }).join('')}
    ${pageIndex === groups.length - 1 ? '<div class="nominal-official-signature"><b>EL COMANDANTE DE LA UNIDAD</b></div><div class="nominal-official-footer-block"><div><u>Autenticación:</u><span>J. PL. MY. ............</span><span>P-1 ............</span></div><div><u>Distribución:</u><span>Original y copias según distribución.</span></div></div>' : ''}
    <p class="nominal-official-warning">DOCUMENTO DEMOSTRATIVO · IDENTIDADES FICTICIAS</p><footer><b>SECRETO</b><span>${pageIndex + 1} - ${groups.length}</span></footer>
  </article>`).join('');
  document.getElementById('official-nominal-report-print').innerHTML = pages;
}
function buildOfficialNominalReport() {
  const records = currentNominalViewRecords;
  const title = document.getElementById('nominal-section-title').textContent.toUpperCase();
  const rowsPerPage = 18;
  const chunks = records.length ? Array.from({ length: Math.ceil(records.length / rowsPerPage) }, (_, index) => records.slice(index * rowsPerPage, (index + 1) * rowsPerPage)) : [[]];
  document.getElementById('official-nominal-report-print').innerHTML = chunks.map((chunk, pageIndex) => `<article class="nominal-official-page"><header><div><b>SÉPTIMA DIVISIÓN DEL EJÉRCITO</b><b>RIAEROTRANS-18 “VICTORIA”</b><u>BOLIVIA</u></div><strong>SECRETO</strong></header><h1>${escapeOfficial(title)}</h1><section><table><thead><tr><th>N.º</th><th>GRADO</th><th>APELLIDOS Y NOMBRES</th><th>C.I.</th><th>EXT.</th><th>ARMA/ESP.</th><th>ESCALAFÓN</th><th>DEPENDENCIA</th></tr></thead><tbody>${chunk.length ? chunk.map((record, index) => `<tr><td>${pageIndex * rowsPerPage + index + 1}</td><td>${escapeOfficial(record.rank)}</td><td>${escapeOfficial(record.name)}</td><td>${escapeOfficial(record.identity)}</td><td>${escapeOfficial(record.extension)}</td><td>${escapeOfficial(nominalRecordSection(record))}</td><td>${escapeOfficial(record.echelon)}</td><td>${escapeOfficial(record.unit)}</td></tr>`).join('') : '<tr><td colspan="8">NO EXISTEN REGISTROS PARA ESTA VISTA</td></tr>'}</tbody></table></section><p class="nominal-official-warning">DOCUMENTO DEMOSTRATIVO · IDENTIDADES FICTICIAS</p><footer><b>SECRETO</b><span>${pageIndex + 1} - ${chunks.length}</span></footer></article>`).join('');
}
document.getElementById('nominal-print').addEventListener('click', () => { buildOfficialNominalReport(); document.body.classList.add('printing-official-nominal-report'); window.setTimeout(() => window.print(), 80); });
window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-nominal-report'));
try { const storedNominal = JSON.parse(localStorage.getItem(nominalStorageKey) || 'null'); if (Array.isArray(storedNominal)) nominalRecords = storedNominal; } catch { localStorage.removeItem(nominalStorageKey); }
renderNominalModule();

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
      <div class="official-signature"><span class="official-signature-space">FIRMA</span><span class="official-signature-line"></span><strong>NOMBRE DEL COMANDANTE</strong><span>GRADO</span><b>COMANDANTE DEL RIAEROTRANS-18 “VICTORIA”</b></div>
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
const memorandumStorageKey = 'simu_demo_memorandum_v2';
const memorandumArchiveKey = 'simu_demo_memorandum_archivo_v2';
const memorandumResetKey = 'simu_demo_memorandums_limpieza_20260903';
if (!localStorage.getItem(memorandumResetKey)) {
  ['simu_demo_memorandum_v1', 'simu_demo_memorandum_archivo_v1', memorandumStorageKey, memorandumArchiveKey].forEach(key => localStorage.removeItem(key));
  localStorage.setItem(memorandumResetKey, 'completada');
}
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
    <header><div><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></div><h1>MEMORÁNDUM</h1></header>
    <section class="memo-official-routing"><div class="memo-official-date"><span>${escapeOfficial(data.place)}, ${memorandumLongDate(data.date)}</span><u>Presente.-</u></div><div class="memo-official-recipient"><b>${escapeOfficial(data.section)} N.º ${escapeOfficial(data.number)}/${escapeOfficial(data.year)}</b><span>Al Sr. ${escapeOfficial(data.rank)}</span><span>${escapeOfficial(data.name)}</span><strong>${escapeOfficial(data.position)}</strong></div></section>
    <p>${escapeOfficial(data.treatment)}:</p>
    <p class="memo-official-body">${escapeOfficial(data.facts)} ${escapeOfficial(data.legalBasis)}, ${escapeOfficial(sanctionClause)}, insto a Usted a encaminar su conducta dentro de los principios de disciplina, responsabilidad y honestidad, en estricto cumplimiento a las disposiciones y normas militares.</p>
    <p class="memo-official-claim">Ante algún presunto agravio deberá presentar su reclamación en forma escrita mediante solicitud, conforme al Formato-040 del CJ-RGA-223.</p>
    <p class="memo-official-copy">Copia del presente Memorándum será elevada al Departamento I para ser tomada en cuenta en su legajo personal.</p>
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

// Hoja de vida del personal
const lifeStorageKey = 'simu_demo_hoja_vida_v1';
const lifeHistoryKey = 'simu_demo_hoja_vida_historial_v1';
let lifeRows = [{ type: 'Diversos', day: '', month: '', year: '', detail: 'Registro demostrativo editable', authority: 'P-1' }];
let lifePhotoData = '';
const lifeFieldIds = ['life-rank', 'life-lastname', 'life-name', 'life-id'];

function renderLifeRows() {
  const body = document.getElementById('life-record-rows');
  body.innerHTML = lifeRows.map((row, index) => `<tr data-life-row="${index}"><td><select data-life-field="type"><option${row.type === 'Sanción' ? ' selected' : ''}>Sanción</option><option${row.type === 'Felicitación' ? ' selected' : ''}>Felicitación</option><option${row.type === 'Diversos' ? ' selected' : ''}>Diversos</option></select></td><td><input data-life-field="day" value="${escapeOfficial(row.day)}"></td><td><input data-life-field="month" value="${escapeOfficial(row.month)}"></td><td><input data-life-field="year" value="${escapeOfficial(row.year)}"></td><td><input data-life-field="detail" value="${escapeOfficial(row.detail)}"></td><td><input data-life-field="authority" value="${escapeOfficial(row.authority)}"></td><td><button type="button" data-life-delete="${index}" aria-label="Eliminar antecedente">×</button></td></tr>`).join('');
  body.querySelectorAll('[data-life-field]').forEach(input => input.addEventListener('input', () => { const row = Number(input.closest('tr').dataset.lifeRow); lifeRows[row][input.dataset.lifeField] = input.value; }));
  body.querySelectorAll('[data-life-delete]').forEach(button => button.addEventListener('click', () => { lifeRows.splice(Number(button.dataset.lifeDelete), 1); renderLifeRows(); }));
}

function collectLifeRecord() {
  return { fields: Object.fromEntries(lifeFieldIds.map(id => [id, document.getElementById(id).value.trim()])), rows: lifeRows.map(row => ({ ...row })), photo: lifePhotoData, savedAt: new Date().toISOString() };
}
function applyLifeRecord(data) { if (!data) return; lifeFieldIds.forEach(id => { if (data.fields?.[id] !== undefined) document.getElementById(id).value = data.fields[id]; }); lifeRows = Array.isArray(data.rows) ? data.rows.map(row => ({ ...row })) : []; lifePhotoData = data.photo || ''; renderLifeRows(); }
function readLifeHistory() { try { const value = JSON.parse(localStorage.getItem(lifeHistoryKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function renderLifeHistory() { const history = readLifeHistory(); setText('life-history-count', `${history.length} registros`); document.getElementById('life-history').innerHTML = history.length ? history.map((item, index) => `<article class="history-card"><div><strong>${escapeOfficial(item.fields?.['life-rank'] || '')} ${escapeOfficial(item.fields?.['life-lastname'] || '')}</strong><small>${item.rows?.length || 0} antecedentes</small></div><button type="button" data-life-load="${index}">Editar</button></article>`).join('') : '<p>No existen hojas guardadas.</p>'; document.querySelectorAll('[data-life-load]').forEach(button => button.addEventListener('click', () => applyLifeRecord(history[Number(button.dataset.lifeLoad)]))); }
function clearOfficialRecordPrints() { document.querySelectorAll('.official-record-print').forEach(item => { item.innerHTML = ''; }); }
function buildLifePrint() { clearOfficialRecordPrints(); const data = collectLifeRecord(); document.getElementById('official-life-report-print').innerHTML = `<article class="print-document life-print"><header><div><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></div>${data.photo ? `<img class="life-photo-print" src="${data.photo}" alt="Fotografía del titular">` : '<div class="photo-placeholder">FOTOGRAFÍA</div>'}</header><h1>HOJA DE VIDA</h1><table><tr><th>GRADO-ARMA</th><th>APELLIDOS</th><th>NOMBRES</th><th>C.I.</th></tr><tr><td>${escapeOfficial(data.fields['life-rank'])}</td><td>${escapeOfficial(data.fields['life-lastname'])}</td><td>${escapeOfficial(data.fields['life-name'])}</td><td>${escapeOfficial(data.fields['life-id'])}</td></tr></table>${['Sanción','Felicitación','Diversos'].map(type => `<h2>${type === 'Diversos' ? 'DIVERSOS (PERMISOS, LICENCIAS U OTROS)' : `MEMORÁNDUMS DE ${type.toUpperCase()}`}</h2><table><tr><th>DÍA</th><th>MES</th><th>AÑO</th><th>MOTIVO / DETALLE</th><th>IMPUESTO POR</th></tr>${data.rows.filter(row => row.type === type).map(row => `<tr><td>${escapeOfficial(row.day)}</td><td>${escapeOfficial(row.month)}</td><td>${escapeOfficial(row.year)}</td><td>${escapeOfficial(row.detail)}</td><td>${escapeOfficial(row.authority)}</td></tr>`).join('') || '<tr><td colspan="5">SIN REGISTROS</td></tr>'}</table>`).join('')}<footer>DOCUMENTO DEMOSTRATIVO · DATOS FICTICIOS</footer></article>`; }
document.getElementById('life-photo').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { lifePhotoData = String(reader.result || ''); notify('Fotografía cargada en la hoja de vida.'); }; reader.readAsDataURL(file); });
document.getElementById('life-add-row').addEventListener('click', () => { lifeRows.push({ type: 'Diversos', day: '', month: '', year: '', detail: '', authority: '' }); renderLifeRows(); });
document.getElementById('life-record-form').addEventListener('submit', event => { event.preventDefault(); localStorage.setItem(lifeStorageKey, JSON.stringify(collectLifeRecord())); setText('life-status', 'Borrador guardado'); notify('Hoja de vida guardada como borrador.'); });
document.getElementById('life-archive').addEventListener('click', () => { const history = readLifeHistory(); history.unshift(collectLifeRecord()); localStorage.setItem(lifeHistoryKey, JSON.stringify(history)); renderLifeHistory(); notify('Hoja de vida incorporada al historial demostrativo.'); });
document.getElementById('life-print').addEventListener('click', () => { buildLifePrint(); document.getElementById('life-preview-content').innerHTML = document.getElementById('official-life-report-print').innerHTML; document.getElementById('life-preview-panel').hidden = false; document.getElementById('life-preview-panel').scrollIntoView({ behavior:'smooth', block:'start' }); });
document.getElementById('life-preview-close').addEventListener('click', () => { document.getElementById('life-preview-panel').hidden = true; });
document.getElementById('life-confirm-print').addEventListener('click', () => { buildLifePrint(); document.body.classList.add('printing-official-record'); window.setTimeout(() => window.print(), 80); });
try { applyLifeRecord(JSON.parse(localStorage.getItem(lifeStorageKey) || 'null')); } catch {}
renderLifeRows(); renderLifeHistory();

// Filiaciones personales: selección nominal, vista previa e impresión
const filiationProfiles = {
  '001': { rank:'Capitán', specialty:'Infantería', name:'Ana Rojas (demostrativo)', birth:'15 de abril de 1992', birthplace:'Cochabamba', department:'Cochabamba', province:'Cercado', locality:'Cercado', incorporation:'31 de diciembre de 2013', identity:'0000001 DEMO', military:'CM-001-DEMO', cossmil:'COS-001-DEMO', blood:'O Rh (+)', institute:'Instituto militar demostrativo', allergies:'Ninguna registrada', civil:'Soltera', address:'Domicilio demostrativo', children:'Sin información demostrativa', spouse:'No corresponde', parents:'Familiares demostrativos', parentsAddress:'Domicilio demostrativo', phone:'70000001', alternate:'4000001', reference:'70000002', email:'persona001@ejemplo.mil', emergency:'Contacto demostrativo' },
  '002': { rank:'Suboficial Primero', specialty:'Servicios', name:'Luis Flores (demostrativo)', birth:'20 de junio de 1985', birthplace:'Oruro', department:'Oruro', province:'Cercado', locality:'Oruro', incorporation:'15 de enero de 2007', identity:'0000002 DEMO', military:'CM-002-DEMO', cossmil:'COS-002-DEMO', blood:'A Rh (+)', institute:'Instituto militar demostrativo', allergies:'Ninguna registrada', civil:'Casado', address:'Domicilio demostrativo', children:'Registro familiar demostrativo', spouse:'Familiar demostrativo', parents:'Familiares demostrativos', parentsAddress:'Domicilio demostrativo', phone:'70000003', alternate:'4000002', reference:'70000004', email:'persona002@ejemplo.mil', emergency:'Contacto demostrativo' },
  '003': { rank:'Sargento Segundo', specialty:'Logística', name:'Carla Méndez (demostrativo)', birth:'10 de octubre de 1994', birthplace:'La Paz', department:'La Paz', province:'Murillo', locality:'La Paz', incorporation:'10 de febrero de 2015', identity:'0000003 DEMO', military:'CM-003-DEMO', cossmil:'COS-003-DEMO', blood:'B Rh (+)', institute:'Instituto militar demostrativo', allergies:'Ninguna registrada', civil:'Soltera', address:'Domicilio demostrativo', children:'Sin información demostrativa', spouse:'No corresponde', parents:'Familiares demostrativos', parentsAddress:'Domicilio demostrativo', phone:'70000005', alternate:'4000003', reference:'70000006', email:'persona003@ejemplo.mil', emergency:'Contacto demostrativo' }
};
function filiationMarkup(profile, printable = false) {
  const fields = [
    ['GRADO', profile.rank], ['ARMA O ESPECIALIDAD', profile.specialty], ['NOMBRES Y APELLIDOS', profile.name],
    ['FECHA DE NACIMIENTO', profile.birth], ['LUGAR DE NACIMIENTO', profile.birthplace],
    ['DEPARTAMENTO', profile.department, 'PROVINCIA', profile.province, 'LOCALIDAD', profile.locality],
    ['FECHA DE EGRESO O INCORPORACIÓN', profile.incorporation],
    ['N.º CÉDULA DE IDENTIDAD', profile.identity, 'N.º CARNET MILITAR', profile.military],
    ['N.º CARNET DE COSSMIL', profile.cossmil, 'GRUPO SANGUÍNEO', profile.blood],
    ['INSTITUTO DE EGRESO', profile.institute], ['ALERGIAS', profile.allergies, 'ESTADO CIVIL', profile.civil],
    ['DOMICILIO ACTUAL', profile.address], ['NÚMERO Y NOMBRE DE LOS HIJOS', profile.children],
    ['NOMBRE DE LA ESPOSA(O)', profile.spouse], ['NOMBRE DE LOS PADRES', profile.parents],
    ['DOMICILIO DE LOS PADRES', profile.parentsAddress], ['NÚMEROS TELEFÓNICOS PARA ESTABLECER CONTACTO', ''],
    ['CELULAR', profile.phone, 'ALTERNO O FIJO', profile.alternate, 'OTRO DE REF.', profile.reference],
    ['CORREO ELECTRÓNICO', profile.email], ['EN CASO DE EMERGENCIA LLAMAR A', profile.emergency]
  ];
  const fieldMarkup = fields.map(parts => `<p>${parts.map((part, index) => index % 2 === 0 ? `<b>${escapeOfficial(part)}:</b>` : `<span>${escapeOfficial(part)}</span>`).join(' ')}</p>`).join('');
  const initials = profile.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return `<article class="${printable ? 'print-document filiation-print' : 'filiation-document'}"><div class="filiation-page-frame"><header><div><strong>FACULTAD DE CIENCIAS Y ARTES MILITARES TERRESTRES</strong><strong>ESCUELA DE COMANDO Y ESTADO MAYOR DEL EJÉRCITO</strong><strong>“MCAL. ANDRÉS DE SANTA CRUZ”</strong><strong>BOLIVIA</strong></div></header><h1>FILIACIÓN DE DATOS PERSONALES</h1><div class="filiation-photo" aria-label="Fotografía demostrativa"><span>${escapeOfficial(initials)}</span><small>FOTOGRAFÍA</small></div><div class="filiation-lines">${fieldMarkup}</div><p class="filiation-place-date">Cochabamba, 13 de mayo de 2026</p><div class="filiation-signature"><span></span><strong>FIRMA</strong></div><footer>DOCUMENTO DEMOSTRATIVO · DATOS FICTICIOS</footer></div></article>`;
}
function renderFiliationPreview() { const profile = filiationProfiles[document.getElementById('filiation-profile').value] || filiationProfiles['001']; document.getElementById('filiation-preview').innerHTML = filiationMarkup(profile); }
document.getElementById('filiation-profile').innerHTML = Object.entries(filiationProfiles).map(([id, profile]) => `<option value="${id}">${escapeOfficial(profile.name)}</option>`).join('');
document.getElementById('filiation-profile').addEventListener('change', renderFiliationPreview);
document.getElementById('filiation-print').addEventListener('click', () => { clearOfficialRecordPrints(); const profile = filiationProfiles[document.getElementById('filiation-profile').value]; document.getElementById('official-filiation-print').innerHTML = filiationMarkup(profile, true); document.body.classList.add('printing-official-record'); window.setTimeout(() => window.print(), 80); });
renderFiliationPreview();

// Memorándums de felicitación
const congratsStorageKey = 'simu_demo_felicitacion_v1';
const congratsHistoryKey = 'simu_demo_felicitacion_historial_v1';
const congratsIds = ['congrats-number','congrats-place','congrats-date','congrats-rank','congrats-name','congrats-position','congrats-reason','congrats-signer','congrats-signer-rank','congrats-initials'];
document.getElementById('congrats-date').value = new Date().toISOString().slice(0, 10);
function collectCongrats() { return Object.fromEntries(congratsIds.map(id => [id, document.getElementById(id).value.trim()])); }
function applyCongrats(data) { if (!data) return; congratsIds.forEach(id => { if (data[id] !== undefined) document.getElementById(id).value = data[id]; }); }
function readCongratsHistory() { try { const value = JSON.parse(localStorage.getItem(congratsHistoryKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function renderCongratsHistory() { const history = readCongratsHistory(); setText('congrats-history-count', `${history.length} registros`); document.getElementById('congrats-history').innerHTML = history.length ? history.map((item, index) => `<article class="history-card"><div><strong>${escapeOfficial(item['congrats-number'])}</strong><small>${escapeOfficial(item['congrats-rank'])} ${escapeOfficial(item['congrats-name'])}</small></div><button type="button" data-congrats-load="${index}">Editar</button></article>`).join('') : '<p>No existen memorándums archivados.</p>'; document.querySelectorAll('[data-congrats-load]').forEach(button => button.addEventListener('click', () => applyCongrats(history[Number(button.dataset.congratsLoad)]))); }
function buildCongratsPrint() { clearOfficialRecordPrints(); const data = collectCongrats(); document.getElementById('official-congratulations-print').innerHTML = `<article class="print-document memo-print"><header><div><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></div><h1>MEMORÁNDUM</h1></header><section class="memo-print-routing"><div class="print-date">${escapeOfficial(data['congrats-place'])}, ${memorandumLongDate(data['congrats-date'])} <u>Presente.-</u></div><div class="print-recipient"><strong>${escapeOfficial(data['congrats-number'])}</strong><span>Al Sr. ${escapeOfficial(data['congrats-rank'])}</span><span>${escapeOfficial(data['congrats-name'])}</span><b>${escapeOfficial(data['congrats-position'])}</b></div></section><p>Señor(a):</p><p class="justified">${escapeOfficial(data['congrats-reason'])} Tengo a bien hacer llegar a Usted mis más sinceras FELICITACIONES, exhortándole a continuar con el mismo profesionalismo y dedicación para bien de nuestra Institución.</p><p class="justified">Copia del presente memorándum será incorporada a su legajo personal.</p><p class="center">Con este motivo saludo a Usted atentamente.</p><div class="print-signature"><strong>${escapeOfficial(data['congrats-signer'])}</strong><b>${escapeOfficial(data['congrats-signer-rank'])}</b></div><small>${escapeOfficial(data['congrats-initials'])}</small></article>`; }
document.getElementById('congratulations-form').addEventListener('submit', event => { event.preventDefault(); localStorage.setItem(congratsStorageKey, JSON.stringify(collectCongrats())); notify('Memorándum de felicitación guardado como borrador.'); });
document.getElementById('congrats-archive').addEventListener('click', () => { const history = readCongratsHistory(); history.unshift(collectCongrats()); localStorage.setItem(congratsHistoryKey, JSON.stringify(history)); renderCongratsHistory(); notify('Memorándum de felicitación archivado.'); });
document.getElementById('congrats-print').addEventListener('click', () => { buildCongratsPrint(); document.body.classList.add('printing-official-record'); window.setTimeout(() => window.print(), 80); });
try { applyCongrats(JSON.parse(localStorage.getItem(congratsStorageKey) || 'null')); } catch {}
renderCongratsHistory();

// Radiogramas recibidos y expedidos
const receivedRadiogramKey = 'simu_demo_radiogramas_recibidos_v1';
const sentRadiogramKey = 'simu_demo_radiograma_expedido_v1';
const sentRadiogramHistoryKey = 'simu_demo_radiogramas_expedidos_historial_v1';
const sentIds = ['sent-datetime','sent-to','sent-to-place','sent-from','sent-from-place','sent-number','sent-body','sent-signer','sent-signer-rank','sent-initials'];
document.querySelectorAll('[data-radiogram-tab]').forEach(button => button.addEventListener('click', () => { const received = button.dataset.radiogramTab === 'received'; document.getElementById('radiogram-received-panel').hidden = !received; document.getElementById('radiogram-sent-panel').hidden = received; document.querySelectorAll('[data-radiogram-tab]').forEach(item => item.classList.toggle('active', item === button)); }));
function readList(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function renderReceivedRadiograms() { const rows = readList(receivedRadiogramKey); document.getElementById('received-radiogram-history').innerHTML = rows.length ? rows.map((item, index) => `<article class="history-card"><div><strong>${escapeOfficial(item.number)} · ${escapeOfficial(item.subject)}</strong><small>${escapeOfficial(item.origin)} · ${escapeOfficial(item.fileName)}</small></div><button type="button" data-received-delete="${index}">Retirar</button></article>`).join('') : '<p>No existen radiogramas recibidos registrados.</p>'; document.querySelectorAll('[data-received-delete]').forEach(button => button.addEventListener('click', () => { const rows = readList(receivedRadiogramKey); rows.splice(Number(button.dataset.receivedDelete), 1); localStorage.setItem(receivedRadiogramKey, JSON.stringify(rows)); renderReceivedRadiograms(); })); }
document.getElementById('received-radiogram-form').addEventListener('submit', event => { event.preventDefault(); const file = document.getElementById('received-file').files[0]; const rows = readList(receivedRadiogramKey); rows.unshift({ number: document.getElementById('received-number').value, origin: document.getElementById('received-origin').value, datetime: document.getElementById('received-datetime').value, reference: document.getElementById('received-reference').value, subject: document.getElementById('received-subject').value, fileName: file?.name || 'Sin archivo' }); localStorage.setItem(receivedRadiogramKey, JSON.stringify(rows)); event.target.reset(); renderReceivedRadiograms(); notify('Radiograma recibido registrado.'); });
function collectSentRadiogram() { return Object.fromEntries(sentIds.map(id => [id, document.getElementById(id).value.trim()])); }
function applySentRadiogram(data) { if (!data) return; sentIds.forEach(id => { if (data[id] !== undefined) document.getElementById(id).value = data[id]; }); }
function renderSentRadiograms() { const rows = readList(sentRadiogramHistoryKey); document.getElementById('sent-radiogram-history').innerHTML = rows.length ? rows.map((item, index) => `<article class="history-card"><div><strong>${escapeOfficial(item['sent-number'])}</strong><small>${escapeOfficial(item['sent-to'])} · ${escapeOfficial(item['sent-datetime'])}</small></div><button type="button" data-sent-load="${index}">Editar</button></article>`).join('') : '<p>No existen radiogramas expedidos archivados.</p>'; document.querySelectorAll('[data-sent-load]').forEach(button => button.addEventListener('click', () => applySentRadiogram(rows[Number(button.dataset.sentLoad)]))); }
function buildRadiogramPrint() { clearOfficialRecordPrints(); const data = collectSentRadiogram(); document.getElementById('official-radiogram-print').innerHTML = `<article class="print-document radiogram-print"><header><strong>SÉPTIMA DIVISIÓN DEL EJÉRCITO</strong><strong>RIAEROTRANS-18 “VICTORIA”</strong><u>BOLIVIA</u></header><h1>RADIOGRAMA EXPEDIDO</h1><p class="radiogram-time">${escapeOfficial(data['sent-datetime'])}</p><div class="radiogram-routing"><b>AL</b><span>:</span><strong>${escapeOfficial(data['sent-to'])}</strong><span>${escapeOfficial(data['sent-to-place'])}</span><b>DEL</b><span>:</span><strong>${escapeOfficial(data['sent-from'])}</strong><span>${escapeOfficial(data['sent-from-place'])}</span></div><h2>${escapeOfficial(data['sent-number'])}</h2><p class="radiogram-body">${escapeOfficial(data['sent-body'])}</p><div class="print-signature"><strong>${escapeOfficial(data['sent-signer'])}</strong><b>${escapeOfficial(data['sent-signer-rank'])}</b></div><small>${escapeOfficial(data['sent-initials'])}</small></article>`; }
document.getElementById('sent-radiogram-form').addEventListener('submit', event => { event.preventDefault(); localStorage.setItem(sentRadiogramKey, JSON.stringify(collectSentRadiogram())); setText('sent-radiogram-status', 'Borrador guardado'); notify('Radiograma expedido guardado como borrador.'); });
document.getElementById('sent-radiogram-archive').addEventListener('click', () => { const rows = readList(sentRadiogramHistoryKey); rows.unshift(collectSentRadiogram()); localStorage.setItem(sentRadiogramHistoryKey, JSON.stringify(rows)); renderSentRadiograms(); notify('Radiograma expedido archivado.'); });
document.getElementById('sent-radiogram-print').addEventListener('click', () => { buildRadiogramPrint(); document.body.classList.add('printing-official-record'); window.setTimeout(() => window.print(), 80); });
try { applySentRadiogram(JSON.parse(localStorage.getItem(sentRadiogramKey) || 'null')); } catch {}
renderReceivedRadiograms(); renderSentRadiograms();

// Sala de Coordinación
const coordinationKey = 'simu_demo_sala_coordinacion_v1';
document.getElementById('coord-datetime').value = new Date().toISOString().slice(0, 16);
function coordinationShortName(participant) { return participant === coordinationAllStaff ? 'TODOS' : participant === 'Comandante' ? 'CMDTE.' : participant === 'Jefe de la Plana Mayor' ? 'JPM' : participant.split(' ')[0]; }
function coordinationRoleName(participant) { return participant === coordinationAllStaff ? 'Toda la Plana Mayor' : participant === 'Comandante' ? 'Comandante de la Unidad' : participant === 'Jefe de la Plana Mayor' ? 'Jefe de la Plana Mayor' : `Jefe de ${participant.replace(/^P-\d\s+/, '')}`; }
function coordinationPendingCount(participant) { return readInternalAlerts().filter(alert => alert.source === participant && alert.audience === currentCoordinationOrigin && !acknowledgementFor(alert)?.knowledgeAt).length; }
function renderCoordinationDirectory() {
  setText('coordination-origin-label', `Origen: ${currentCoordinationOrigin}`);
  const rows = readList(coordinationKey);
  const destinations = coordinationParticipants.filter(item => item !== currentCoordinationOrigin);
  if (currentCoordinationOrigin === 'Comandante') destinations.unshift(coordinationAllStaff);
  document.getElementById('coordination-destination-grid').innerHTML = destinations.map(participant => {
    const pending = coordinationPendingCount(participant);
    const last = rows.find(item => (item.origin === currentCoordinationOrigin && item.destination === participant) || (item.origin === participant && item.destination === currentCoordinationOrigin));
    return `<button class="coordination-destination-card${pending ? ' has-pending' : ''}" type="button" data-coordination-destination="${escapeOfficial(participant)}"><span class="coordination-destination-mark">${escapeOfficial(coordinationShortName(participant))}</span><div><small>ENLACE DIRECTO</small><strong>${escapeOfficial(coordinationRoleName(participant))}</strong><p>${last ? `Última coordinación: ${escapeOfficial(last.subject)}` : 'Sin coordinaciones registradas'}</p></div><b>${pending ? `${pending} alerta${pending === 1 ? '' : 's'}` : 'Ingresar →'}</b></button>`;
  }).join('');
  document.querySelectorAll('[data-coordination-destination]').forEach(button => button.addEventListener('click', () => openCoordinationChannel(button.dataset.coordinationDestination)));
}
function openCoordinationChannel(destination) {
  if ((!coordinationParticipants.includes(destination) && destination !== coordinationAllStaff) || destination === currentCoordinationOrigin) return;
  currentCoordinationDestination = destination;
  const destinations = coordinationParticipants.filter(item => item !== currentCoordinationOrigin);
  if (currentCoordinationOrigin === 'Comandante') destinations.unshift(coordinationAllStaff);
  document.getElementById('coord-destination').innerHTML = destinations.map(item => `<option${item === destination ? ' selected' : ''}>${escapeOfficial(item)}</option>`).join('');
  setText('coordination-channel-title', `${currentCoordinationOrigin} ↔ ${destination}`);
  document.getElementById('coordination-directory').hidden = true;
  document.getElementById('coordination-channel').hidden = false;
  renderCoordinationHistory();
}
function renderCoordinationHistory() {
  const allRows = readList(coordinationKey);
  const indexedRows = allRows.map((item, index) => ({ item, index })).filter(({ item }) => !currentCoordinationDestination || (currentCoordinationDestination === coordinationAllStaff ? item.origin === currentCoordinationOrigin : ((item.origin === currentCoordinationOrigin && item.destination === currentCoordinationDestination) || (item.origin === currentCoordinationDestination && item.destination === currentCoordinationOrigin))));
  setText('coordination-count', `${indexedRows.length} registros`);
  document.getElementById('coordination-history').innerHTML = indexedRows.length ? indexedRows.map(({ item, index }) => `<article class="coordination-thread"><div><span>${escapeOfficial(item.origin)} → ${escapeOfficial(item.destination)}</span><strong>${escapeOfficial(item.subject)}</strong><p>${escapeOfficial(item.message)}</p>${item.response ? `<p><b>Respuesta:</b> ${escapeOfficial(item.response)}</p>` : ''}<small>${escapeOfficial(item.datetime)} · ${escapeOfficial(item.priority)} · ${escapeOfficial(item.fileName || 'Sin adjunto')}</small></div><div class="coordination-controls"><label>Estado<select data-coord-status="${index}"${item.status === 'Cerrada' ? ' disabled' : ''}><option${item.status === 'Pendiente' ? ' selected' : ''}>Pendiente</option><option${item.status === 'Recibida' ? ' selected' : ''}>Recibida</option><option${item.status === 'Respondida' ? ' selected' : ''}>Respondida</option><option${item.status === 'Cerrada' ? ' selected' : ''}>Cerrada</option></select></label><label>Respuesta<textarea data-coord-response="${index}" rows="2"${item.status === 'Cerrada' ? ' disabled' : ''}>${escapeOfficial(item.response || '')}</textarea></label><button type="button" data-coord-save="${index}"${item.status === 'Cerrada' ? ' disabled' : ''}>Guardar respuesta</button></div></article>`).join('') : '<p>No existen coordinaciones registradas con este destinatario.</p>';
  document.querySelectorAll('[data-coord-status]').forEach(select => select.addEventListener('change', () => { const rows = readList(coordinationKey); rows[Number(select.dataset.coordStatus)].status = select.value; localStorage.setItem(coordinationKey, JSON.stringify(rows)); renderCoordinationHistory(); }));
  document.querySelectorAll('[data-coord-save]').forEach(button => button.addEventListener('click', () => { const rows = readList(coordinationKey); const index = Number(button.dataset.coordSave); rows[index].response = document.querySelector(`[data-coord-response="${index}"]`).value.trim(); if (rows[index].response) rows[index].status = 'Respondida'; localStorage.setItem(coordinationKey, JSON.stringify(rows)); renderCoordinationHistory(); notify('Respuesta registrada.'); }));
}
function renderCoordinationHistoryLegacy() { const rows = readList(coordinationKey); setText('coordination-count', `${rows.length} registros`); document.getElementById('coordination-history').innerHTML = rows.length ? rows.map((item, index) => `<article class="coordination-thread"><div><span>${escapeOfficial(item.origin)} → ${escapeOfficial(item.destination)}</span><strong>${escapeOfficial(item.subject)}</strong><p>${escapeOfficial(item.message)}</p>${item.response ? `<p><b>Respuesta:</b> ${escapeOfficial(item.response)}</p>` : ''}<small>${escapeOfficial(item.datetime)} · ${escapeOfficial(item.priority)} · ${escapeOfficial(item.fileName || 'Sin adjunto')}</small></div><div class="coordination-controls"><label>Estado<select data-coord-status="${index}"${item.status === 'Cerrada' ? ' disabled' : ''}><option${item.status === 'Pendiente' ? ' selected' : ''}>Pendiente</option><option${item.status === 'Recibida' ? ' selected' : ''}>Recibida</option><option${item.status === 'Respondida' ? ' selected' : ''}>Respondida</option><option${item.status === 'Cerrada' ? ' selected' : ''}>Cerrada</option></select></label><label>Respuesta<textarea data-coord-response="${index}" rows="2"${item.status === 'Cerrada' ? ' disabled' : ''}>${escapeOfficial(item.response || '')}</textarea></label><button type="button" data-coord-save="${index}"${item.status === 'Cerrada' ? ' disabled' : ''}>Guardar respuesta</button></div></article>`).join('') : '<p>No existen coordinaciones registradas.</p>'; document.querySelectorAll('[data-coord-status]').forEach(select => select.addEventListener('change', () => { const rows = readList(coordinationKey); rows[Number(select.dataset.coordStatus)].status = select.value; localStorage.setItem(coordinationKey, JSON.stringify(rows)); renderCoordinationHistory(); })); document.querySelectorAll('[data-coord-save]').forEach(button => button.addEventListener('click', () => { const rows = readList(coordinationKey); const index = Number(button.dataset.coordSave); rows[index].response = document.querySelector(`[data-coord-response="${index}"]`).value.trim(); if (rows[index].response) rows[index].status = 'Respondida'; localStorage.setItem(coordinationKey, JSON.stringify(rows)); renderCoordinationHistory(); notify('Respuesta registrada.'); })); }
document.getElementById('coord-destination').addEventListener('change', event => { currentCoordinationDestination = event.target.value; setText('coordination-channel-title', `${currentCoordinationOrigin} ↔ ${currentCoordinationDestination}`); renderCoordinationHistory(); });
document.getElementById('coordination-form').addEventListener('submit', event => { event.preventDefault(); const origin = document.getElementById('coord-origin').value; const destination = document.getElementById('coord-destination').value; if (origin === destination) return notify('Seleccione un destinatario diferente al origen.'); const file = document.getElementById('coord-file').files[0]; const priority = document.getElementById('coord-priority').value; const subject = document.getElementById('coord-subject').value; const requirement = document.getElementById('coord-requirement').value; const documentType = document.getElementById('coord-document-type').value; const datetime = document.getElementById('coord-datetime').value; const message = document.getElementById('coord-message').value; const targets = destination === coordinationAllStaff ? coordinationParticipants.filter(item => item !== origin) : [destination]; const rows = readList(coordinationKey); targets.slice().reverse().forEach(target => { rows.unshift({ origin, destination: target, priority, subject, requirement, documentType, datetime, message, fileName: file?.name || '', status: 'Pendiente' }); createInternalAlert({ source: origin, audience: target, type: documentType, subject, priority, requirement, reference: file?.name || 'Sin adjunto' }); }); localStorage.setItem(coordinationKey, JSON.stringify(rows)); event.target.reset(); document.getElementById('coord-datetime').value = new Date().toISOString().slice(0, 16); openCoordinationChannel(destination); notify(destination === coordinationAllStaff ? 'Coordinación registrada y alertas enviadas a toda la Plana Mayor.' : 'Coordinación registrada y alerta enviada al destinatario.'); });
document.getElementById('meeting-create').addEventListener('click', () => { if (!canConveneMeeting()) return notify('Solo el Comandante o el Jefe de la Plana Mayor puede convocar la reunión general.'); const subject = document.getElementById('meeting-subject').value.trim(); const link = document.getElementById('meeting-link').value.trim(); if (!subject || !/^https:\/\/meet\.google\.com\//i.test(link)) return notify('Ingrese el asunto y un enlace válido de Google Meet.'); coordinationParticipants.filter(item => item !== currentCoordinationOrigin).forEach(audience => createInternalAlert({ source: currentCoordinationOrigin, audience, type: 'Reunión general', subject, priority: 'Inmediata', requirement: 'knowledge', reference: link })); notify('Reunión general registrada y alertas enviadas a los participantes.'); window.open(link, '_blank', 'noopener'); });
renderCoordinationHistory();

// Alertas internas, constancia de conocimiento y conformidad
const alertsStorageKey = 'simu_demo_alertas_v1';
let activeAlertFilter = 'pending';
function readInternalAlerts() { try { const value = JSON.parse(localStorage.getItem(alertsStorageKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } }
function writeInternalAlerts(alerts) { localStorage.setItem(alertsStorageKey, JSON.stringify(alerts)); renderInternalAlerts(); }
function currentAlertIdentity() {
  if (currentViewId === 'coordinacion') return currentCoordinationOrigin;
  if (currentViewId === 'comandante') return 'Comandante';
  if (currentViewId === 'jpm') return 'Jefe de la Plana Mayor';
  if (['p1', 'p1-funcion', 'p1-registro', 'vacaciones', 'relaciones', 'filiaciones', 'hoja-vida', 'felicitaciones', 'radiogramas', 'cuadros', 'tropa', 'memorandums'].includes(currentViewId)) return 'P-1 Personal';
  if (currentViewId === 'portal') return 'Personal de la Unidad';
  const role = sessionRoleText();
  if (/comandante/.test(role)) return 'Comandante';
  if (/jefe de la plana mayor|jpm/.test(role)) return 'Jefe de la Plana Mayor';
  if (/p-?1|g-?1|administrador/.test(role)) return 'P-1 Personal';
  if (/p-?2|g-?2/.test(role)) return 'P-2 Inteligencia';
  if (/p-?3|g-?3/.test(role)) return 'P-3 Operaciones';
  if (/p-?4|g-?4/.test(role)) return 'P-4 Logística';
  if (/p-?5|g-?5/.test(role)) return 'P-5 Asuntos Civiles';
  return 'Personal de la Unidad';
}
function alertUserLabel() { const name = document.getElementById('session-user-name')?.textContent?.trim(); return name && name !== 'Usuario autorizado' ? `${name} · ${currentAlertIdentity()}` : currentAlertIdentity(); }
function createInternalAlert({ source, audience, type, subject, priority = 'Informativa', requirement = 'knowledge', reference = '' }) {
  const alerts = readInternalAlerts();
  alerts.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, source, audience, type, subject, priority, requirement, reference, createdAt: new Date().toISOString(), acknowledgements: [] });
  localStorage.setItem(alertsStorageKey, JSON.stringify(alerts));
  renderInternalAlerts();
}
function eligibleAlert(alert) { const identity = currentAlertIdentity(); return alert.audience === identity || (alert.audience === 'Todo el personal' && identity === 'Personal de la Unidad'); }
function acknowledgementFor(alert) { const user = alertUserLabel(); return (alert.acknowledgements || []).find(item => item.user === user); }
function acknowledgementForIdentity(alert, identity) {
  return (alert.acknowledgements || []).find(item => item.user === identity || item.user.endsWith(` · ${identity}`));
}
function renderModuleAlertIndicators(alerts) {
  document.querySelectorAll('.module-alert-indicator').forEach(indicator => indicator.remove());
  const moduleTargets = [
    { identity: 'Comandante', selectors: '#inicio [data-open-commander]' },
    { identity: 'Jefe de la Plana Mayor', selectors: '#inicio [data-open-jpm]' },
    { identity: 'P-1 Personal', selectors: '#inicio [data-open-p1]' },
    { identity: 'P-2 Inteligencia', selectors: '#inicio [data-open-coordination][data-coordination-origin="P-2 Inteligencia"]' },
    { identity: 'P-3 Operaciones', selectors: '#inicio [data-open-coordination][data-coordination-origin="P-3 Operaciones"]' },
    { identity: 'P-4 Logística', selectors: '#inicio [data-open-coordination][data-coordination-origin="P-4 Logística"]' },
    { identity: 'P-5 Asuntos Civiles', selectors: '#inicio [data-open-coordination][data-coordination-origin="P-5 Asuntos Civiles"]' },
    { identity: 'Personal de la Unidad', selectors: '#inicio [data-open-portal]', audience: 'Todo el personal' }
  ];
  moduleTargets.forEach(({ identity, selectors, audience = identity }) => {
    const pending = alerts.filter(alert => alert.audience === audience && !acknowledgementForIdentity(alert, identity)?.knowledgeAt).length;
    if (!pending) return;
    document.querySelectorAll(selectors).forEach(target => {
      const indicator = document.createElement('span');
      indicator.className = 'module-alert-indicator';
      indicator.setAttribute('aria-label', `${pending} alerta${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'}`);
      indicator.title = indicator.getAttribute('aria-label');
      indicator.innerHTML = `<i aria-hidden="true"></i><b>${pending}</b>`;
      target.appendChild(indicator);
      target.classList.add('has-module-alert');
    });
  });
  document.querySelectorAll('.has-module-alert').forEach(target => {
    if (!target.querySelector('.module-alert-indicator')) target.classList.remove('has-module-alert');
  });
}
function updateAlertAcknowledgement(id, updates) {
  const alerts = readInternalAlerts(); const alert = alerts.find(item => item.id === id); if (!alert) return;
  alert.acknowledgements ||= []; const user = alertUserLabel(); let ack = alert.acknowledgements.find(item => item.user === user);
  if (!ack) { ack = { user, receivedAt: new Date().toISOString() }; alert.acknowledgements.push(ack); }
  Object.assign(ack, updates); writeInternalAlerts(alerts);
}
function alertStatus(alert) { const ack = acknowledgementFor(alert); if (!ack) return 'Pendiente'; if (ack.observedAt) return 'Observado'; if (ack.conformityAt) return 'Conforme'; if (ack.knowledgeAt) return 'Conocimiento confirmado'; if (ack.viewedAt) return 'Visualizado'; return 'Recibido'; }
function renderAlertTracking(alerts) {
  const source = currentAlertIdentity(); const own = alerts.filter(item => item.source === source);
  return own.length ? own.map(alert => `<article class="alert-tracking-card"><div><span>${escapeOfficial(alert.type)} · ${escapeOfficial(alert.audience)}</span><strong>${escapeOfficial(alert.subject)}</strong></div><div class="alert-tracking-table"><span>Destinatario</span><span>Estado</span><span>Fecha y hora</span>${(alert.acknowledgements || []).map(ack => `<b>${escapeOfficial(ack.user)}</b><b>${ack.observedAt ? 'Observado' : ack.conformityAt ? 'Conforme' : ack.knowledgeAt ? 'Conocimiento confirmado' : ack.viewedAt ? 'Visualizado' : 'Recibido'}</b><b>${escapeOfficial(ack.observedAt || ack.conformityAt || ack.knowledgeAt || ack.viewedAt || ack.receivedAt || '')}</b>${ack.note ? `<small>Observación: ${escapeOfficial(ack.note)}</small>` : ''}`).join('') || `<b>${escapeOfficial(alert.audience)}</b><b>Pendiente</b><b>—</b>`}</div></article>`).join('') : '<p class="alerts-empty">No existen publicaciones emitidas para seguimiento desde este nivel.</p>';
}
function renderInternalAlerts() {
  const alerts = readInternalAlerts(); const eligible = alerts.filter(eligibleAlert); const pending = eligible.filter(alert => !acknowledgementFor(alert)?.knowledgeAt);
  setText('alerts-count', String(pending.length)); document.getElementById('alerts-button').classList.toggle('has-alerts', pending.length > 0);
  renderModuleAlertIndicators(alerts);
  const container = document.getElementById('alerts-list');
  if (activeAlertFilter === 'tracking') { container.innerHTML = renderAlertTracking(alerts); return; }
  const visible = activeAlertFilter === 'pending' ? pending : eligible;
  container.innerHTML = visible.length ? visible.map(alert => { const ack = acknowledgementFor(alert); const needsConformity = alert.requirement === 'conformity'; return `<article class="alert-card priority-${escapeOfficial(alert.priority.toLowerCase())}"><div class="alert-card-head"><span>${escapeOfficial(alert.priority)}</span><b>${escapeOfficial(alertStatus(alert))}</b></div><h3>${escapeOfficial(alert.subject)}</h3><p>${escapeOfficial(alert.type)} remitido por <strong>${escapeOfficial(alert.source)}</strong></p><small>${escapeOfficial(alert.createdAt)} · ${escapeOfficial(alert.reference || 'Sin adjunto')}</small><div class="alert-card-actions"><button type="button" data-alert-received="${alert.id}"${ack?.receivedAt ? ' disabled' : ''}>Confirmar recibido</button><button type="button" data-alert-view="${alert.id}">Visualizar</button><button type="button" data-alert-knowledge="${alert.id}"${ack?.knowledgeAt ? ' disabled' : ''}>Tomé conocimiento</button>${needsConformity ? `<button type="button" data-alert-conformity="${alert.id}"${ack?.conformityAt ? ' disabled' : ''}>Doy conformidad</button>` : ''}</div><div class="alert-observation"><input data-alert-note="${alert.id}" placeholder="Escriba una observación"><button type="button" data-alert-observe="${alert.id}">Observar</button></div></article>`; }).join('') : '<p class="alerts-empty">No existen alertas en esta bandeja.</p>';
  container.querySelectorAll('[data-alert-received]').forEach(button => button.addEventListener('click', () => { updateAlertAcknowledgement(button.dataset.alertReceived, { receivedAt: new Date().toISOString() }); notify('Recepción registrada y visible para el remitente.'); }));
  container.querySelectorAll('[data-alert-view]').forEach(button => button.addEventListener('click', () => { updateAlertAcknowledgement(button.dataset.alertView, { viewedAt: new Date().toISOString() }); notify('Información visualizada.'); }));
  container.querySelectorAll('[data-alert-knowledge]').forEach(button => button.addEventListener('click', () => { updateAlertAcknowledgement(button.dataset.alertKnowledge, { viewedAt: new Date().toISOString(), knowledgeAt: new Date().toISOString(), observedAt: null, note: '' }); notify('Constancia de conocimiento registrada.'); }));
  container.querySelectorAll('[data-alert-conformity]').forEach(button => button.addEventListener('click', () => { updateAlertAcknowledgement(button.dataset.alertConformity, { viewedAt: new Date().toISOString(), knowledgeAt: new Date().toISOString(), conformityAt: new Date().toISOString(), observedAt: null, note: '' }); notify('Conformidad registrada.'); }));
  container.querySelectorAll('[data-alert-observe]').forEach(button => button.addEventListener('click', () => { const note = container.querySelector(`[data-alert-note="${button.dataset.alertObserve}"]`).value.trim(); if (!note) return notify('Escriba el motivo de la observación.'); updateAlertAcknowledgement(button.dataset.alertObserve, { viewedAt: new Date().toISOString(), knowledgeAt: new Date().toISOString(), observedAt: new Date().toISOString(), conformityAt: null, note }); notify('Observación registrada.'); }));
  if (currentViewId === 'coordinacion' && !document.getElementById('coordination-directory').hidden) renderCoordinationDirectory();
}
document.getElementById('alerts-button').addEventListener('click', () => { const panel = document.getElementById('alerts-panel'); panel.hidden = !panel.hidden; document.getElementById('alerts-button').setAttribute('aria-expanded', String(!panel.hidden)); renderInternalAlerts(); });
document.getElementById('alerts-close').addEventListener('click', () => { document.getElementById('alerts-panel').hidden = true; document.getElementById('alerts-button').setAttribute('aria-expanded', 'false'); });
document.querySelectorAll('[data-alert-filter]').forEach(button => button.addEventListener('click', () => { activeAlertFilter = button.dataset.alertFilter; document.querySelectorAll('[data-alert-filter]').forEach(item => item.classList.toggle('active', item === button)); renderInternalAlerts(); }));
new MutationObserver(renderInternalAlerts).observe(document.getElementById('session-user-role'), { childList: true, subtree: true, characterData: true });
renderInternalAlerts();

window.addEventListener('afterprint', () => document.body.classList.remove('printing-official-record'));
