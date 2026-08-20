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
    informacion: 'Disposiciones generales'
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
      ['Parte del personal de cuadros y administrativos', 'Registro y actualización del efectivo, disponibilidad y novedades del personal de cuadros y administrativos.'],
      ['Parte del personal de soldados', 'Registro y actualización del efectivo, disponibilidad y novedades del personal de soldados.']
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
      <div><h5>Registros de la función</h5><div class="control-list">${item.areas.map(area => `<article><strong>${area[0]}</strong><p>${area[1]}</p><button data-register="${area[0]}">Abrir registro</button></article>`).join('')}</div></div>
    </div>`;
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.register}: registro preparado para la siguiente fase.`)));
}

document.querySelectorAll('.g1-card').forEach(card => card.addEventListener('click', () => renderG1Detail(card.dataset.g1)));
renderG1Detail('efectivos');
