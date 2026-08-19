const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item:not(.locked)');
const title = document.getElementById('page-title');
const toast = document.getElementById('toast');

function showView(id) {
  views.forEach(view => view.classList.toggle('active-view', view.id === id));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === id));
  const pageTitles = {
    inicio: 'Situación general de la unidad',
    jpm: 'Jefe de la Plana Mayor',
    p1: 'P-1 Personal — SIPE',
    portal: 'Portal del Personal'
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
document.querySelectorAll('.locked, .chief-card:not(.operative)').forEach(item => item.addEventListener('click', () => notify(`${item.dataset.field}: módulo previsto para desarrollo futuro.`)));
document.querySelectorAll('[data-demo]').forEach(item => item.addEventListener('click', () => notify('Esta función se habilitará en la siguiente etapa del SIPE.')));

document.getElementById('current-date').textContent = new Intl.DateTimeFormat('es-BO', { day:'2-digit', month:'long', year:'numeric' }).format(new Date());

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
    number: '01', title: 'Mantenimiento del efectivo de la unidad', purpose: 'Mantener informado al Comandante y al Jefe de la Plana Mayor sobre la situación actual y proyectada del personal.',
    areas: [
      ['Efectivos y bajas', 'Efectivo autorizado, asignado, presente, disponible, no disponible; altas, bajas, causas y proyección.'],
      ['Registros e informes', 'Legajo individual, filiación, novedades, parte diario, cuadros de efectivos e informes periódicos.'],
      ['Vacantes y cobertura', 'Necesidades presentes y futuras, vacantes previstas, perfiles requeridos y propuestas administrativas de asignación.']
    ], outputs: ['Parte diario de personal', 'Cuadro comparativo de efectivos', 'Alerta de déficit o baja', 'Previsión de vacantes']
  },
  administracion: {
    number: '02', title: 'Administración y manejo del personal', purpose: 'Controlar el ciclo administrativo del personal militar y civil desde su incorporación hasta su retiro o disponibilidad.',
    areas: [
      ['Procedimientos de personal', 'Obtención, clasificación, asignación, ascenso, destino, reclasificación, reasignación, retiro, disponibilidad y rotación.'],
      ['Legajos y documentación', 'Actualización de filiación, antecedentes, documentación personal, vencimientos y respaldo del historial administrativo.'],
      ['Personal civil', 'Fuentes, obtención, empleo, administración, documentación y control.']
    ], outputs: ['Ficha y legajo individual', 'Historial de destinos y ascensos', 'Control de rotación', 'Nómina de personal civil']
  },
  disciplina: {
    number: '03', title: 'Mantenimiento de la disciplina, ley y orden', purpose: 'Consolidar hechos y medidas administrativas que afecten la conducta, la disciplina y el cumplimiento de la normativa.',
    areas: [
      ['Disciplina y orden', 'Conducta y partes de la tropa, control de extraviados, instalaciones disciplinarias, fallos de la justicia militar y relaciones con civiles.']
    ], outputs: ['Registro de partes y novedades', 'Seguimiento de medidas', 'Alertas de reincidencia', 'Informe de disciplina']
  },
  moral: {
    number: '04', title: 'Incremento y mantenimiento de la moral', purpose: 'Administrar los servicios y reconocimientos que sostienen el bienestar, la motivación y la cohesión del personal.',
    areas: [
      ['Servicios de personal', 'Permisos, licencias, descanso, recreación, servicio postal, actividades religiosas, servicios especiales, bazares, caja, asesoría legal y bienestar.'],
      ['Condecoraciones y recompensas', 'Postulaciones, antecedentes, trámite y control por actuaciones sobresalientes.'],
      ['Entierros y sepulturas', 'Registro administrativo de fallecidos, efectos personales, ceremonias y sepulturas.']
    ], outputs: ['Rol de vacaciones y permisos', 'Control de bienestar', 'Registro de reconocimientos', 'Registro administrativo de fallecidos']
  },
  pc: {
    number: '05', title: 'Administración interna en tiempo de paz', purpose: 'Organizar el funcionamiento administrativo de la jefatura y sus dependencias, sin registrar información operacional.',
    areas: [
      ['Funcionamiento interno', 'Personal asignado, turnos, responsabilidades, distribución funcional y requerimientos administrativos de las oficinas.']
    ], outputs: ['Nómina funcional', 'Rol de turnos', 'Lista de responsabilidades', 'Novedades administrativas']
  },
  diversos: {
    number: '06', title: 'Asuntos diversos', purpose: 'Controlar los asuntos de personal no asignados específicamente a otra sección del Estado Mayor.',
    areas: [
      ['Educación', 'Desarrollo de la educación general y actividades educativas para familiares.'],
      ['Situación familiar', 'Trámites y antecedentes administrativos relacionados con matrimonios con personal extranjero.'],
      ['Visitas', 'Registro, coordinación y recepción administrativa de visitantes.'],
      ['Planeamiento', 'Aspectos de personal en exámenes de situación, planes y órdenes.'],
      ['Informes', 'Informes periódicos, especiales y asuntos administrativos no asignados.'],
      ['Coordinación interna', 'Recomendaciones para mejorar la distribución de funciones y la continuidad del trabajo administrativo.'],
      ['Otros asuntos', 'Bandeja de casos para clasificación, asignación de responsable y seguimiento.']
    ], outputs: ['Plan de educación', 'Agenda de visitas', 'Anexo de personal', 'Bandeja de asuntos pendientes']
  }
};

function renderG1Detail(key) {
  const item = g1Functions[key];
  document.querySelectorAll('.g1-card').forEach(card => card.classList.toggle('active', card.dataset.g1 === key));
  document.getElementById('g1-detail').innerHTML = `
    <div class="g1-detail-head"><span>${item.number}</span><div><p class="eyebrow">FUNCIÓN SELECCIONADA</p><h4>${item.title}</h4><p>${item.purpose}</p></div></div>
    <div class="g1-detail-grid">
      <div><h5>Información a administrar</h5><div class="control-list">${item.areas.map(area => `<article><strong>${area[0]}</strong><p>${area[1]}</p><button data-register="${area[0]}">Abrir registro</button></article>`).join('')}</div></div>
      <div class="output-panel"><h5>Productos para el mando</h5><ul>${item.outputs.map(output => `<li>${output}</li>`).join('')}</ul><button class="primary-button" data-report="${item.title}">Generar reporte demostrativo</button></div>
    </div>`;
  document.querySelectorAll('[data-register]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.register}: registro preparado para la siguiente fase.`)));
  document.querySelectorAll('[data-report]').forEach(button => button.addEventListener('click', () => notify(`${button.dataset.report}: reporte demostrativo solicitado.`)));
}

document.querySelectorAll('.g1-card').forEach(card => card.addEventListener('click', () => renderG1Detail(card.dataset.g1)));
renderG1Detail('efectivos');
