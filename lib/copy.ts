/**
 * COPY centralizado del portal.
 *
 * REGLA: TODO texto visible en JSX/UI pasa por acá. Cero hardcoded.
 * Voz: español neutro Perú, sin voceo. Nada de jerga sin explicar.
 *
 * NOMBRE DE MARCA: nunca hardcodearlo. Sale de `APP.brand` / `APP.legalName`
 * (lib/constants.ts). Renombrar el portal = una constante allá.
 *
 * Este archivo salió del monorepo de Don Gato quedándose SOLO con los namespaces
 * del portal: el copy del producto de tarjeta (landing, calculadora, KYC, blog,
 * gamificación) no viajó.
 */

import { APP } from "./constants";
import { PLAZO_SOLICITUD_MESES } from "./portales/constants";

const CAMPOS_PEDIDO_FINANCIAMIENTO = {
  monto: "¿Cuánto necesitas?",
  moneda: "Moneda",
  plazo: "Plazo (meses)",
  plazoHint: `Entre ${PLAZO_SOLICITUD_MESES.min} y ${PLAZO_SOLICITUD_MESES.max} meses.`,
} as const;

const CAMPOS_CLASIFICACION_STAFF = {
  sinRiesgo: "Sin clasificar",
  rating: "Rating (A–G)",
  sinRating: "Sin rating",
  notasInternas: "Notas internas (solo staff)",
  notasHint: "El inversionista nunca ve esto.",
} as const;

const pages = {
  error: {
    title: "Algo se rompió.",
    sub: "Ya estamos revisando. Intenta de nuevo o vuelve al inicio.",
    retry: "Reintentar",
    home: "Volver al inicio",
  },
} as const;

const app = {
  shared: {
    // SlaChip — chip del SLA de abono.
    sla: {
      estadoFinal: "Estado final",
      vencido: "SLA vencido",
      enRiesgo: "SLA en riesgo",
      estimado: "Tiempo estimado de abono",
      fechaEstimada: "Fecha estimada:",
    },
    // RiskBadge / FlagList — severidad antifraude.
    riesgo: (nivel: string) => `Riesgo ${nivel}`,
    severidad: {
      ok: "OK",
      warning: "Atención",
      alert: "Alerta",
    },
    // EvidenciaImg — estado de error al cargar un archivo.
    evidenciaError: "No se pudo cargar el archivo.",
    // Timeline — etiqueta accesible.
    timelineAria: "Estado de la operación",
    // BarChart — etiqueta accesible.
    barChartAria: "Gráfico de barras",
    // AppShell / NotificationBell.
    cerrarSesion: "Cerrar sesión",
    cerrar: "Cerrar",
    // Banner de cuenta desactivada (solo lectura).
    readOnly: {
      titulo: "Tu cuenta está en modo solo lectura",
      texto:
        "Puedes ver tu información e historial, pero por ahora no puedes hacer nuevas operaciones. Escríbenos si crees que es un error.",
    },
    // Estados de carga (loading.tsx + AppShell). Texto accesible para el
    // esqueleto/animación mientras el server component transmite.
    loading: {
      cargando: "Cargando…",
      preparando: "Preparando tu vista…",
      aria: "Cargando contenido",
    },
    // StepperShell — etiqueta accesible del stepper.
    pasosAria: "Pasos",
  },
} as const;

const correos = {
  portalAcceso: {
    subject: (marca: string) => `Tu acceso a ${marca}`,
    titulo: "Ya tienes acceso",
    cuerpo: (marca: string) =>
      `Creamos tu cuenta en ${marca}, el portal privado de inversión. Crea tu contraseña para entrar; el correo de esta invitación es tu usuario.`,
    boton: "Crear mi contraseña",
    nota: "Este enlace vence en una hora. Si vence, pídenos uno nuevo.",
    ignora: "Si no esperabas esta invitación, ignora este correo.",
  },
  portalReservaAsesor: {
    subject: (marca: string) => `Nueva reserva en ${marca}`,
    titulo: "Un inversionista reservó una oportunidad",
    cuerpo: (op: string) =>
      `Un inversionista acaba de reservar "${op}". Tienes 24 horas para contactarlo y continuar el proceso; si nadie avanza, la oportunidad vuelve al pool.`,
    boton: "Ver la reserva",
    nota: "Entra a tu cola de reservas para confirmarla o liberarla.",
    ignora: "Si no esperabas este aviso, puedes ignorarlo.",
  },
  portalReservaConfirmada: {
    subject: (marca: string) => `Tu reserva fue confirmada · ${marca}`,
    titulo: "Tu reserva fue confirmada",
    cuerpo: (op: string) =>
      `Confirmamos tu reserva de "${op}". Tu asesor continuará el proceso contigo. Puedes ver el detalle cuando quieras.`,
    boton: "Ver mi reserva",
    nota: "Recuerda: reservar y confirmar no implican ningún cargo dentro de la plataforma.",
    ignora: "Si no reservaste esta oportunidad, escríbenos de inmediato.",
  },
  portalSolicitudNueva: {
    subject: (marca: string) => `Nueva solicitud de financiamiento · ${marca}`,
    titulo: "Una empresa dejó una nueva solicitud",
    cuerpo: (empresa: string) =>
      `${empresa} registró una solicitud de financiamiento en el panel. Revísala en la sección de solicitudes para evaluarla.`,
    boton: "Ver las solicitudes",
    nota: "La solicitud incluye monto, plazo y los documentos que la empresa haya adjuntado.",
    ignora: "Si no esperabas este aviso, puedes ignorarlo.",
  },
  portalSolicitudResuelta: {
    subjectAprobada: (marca: string) => `Tu solicitud fue aprobada · ${marca}`,
    subjectRechazada: (marca: string) => `Novedad sobre tu solicitud · ${marca}`,
    tituloAprobada: "Tu solicitud fue aprobada",
    tituloRechazada: "Revisamos tu solicitud",
    cuerpoAprobada:
      "Aprobamos tu solicitud de financiamiento. Nuestro equipo continuará el proceso contigo desde el panel.",
    cuerpoRechazada: (motivo: string) =>
      `Por ahora no podemos avanzar con tu solicitud. Motivo: ${motivo}. Puedes ajustar los datos y volver a enviarla.`,
    boton: "Ver mis solicitudes",
    nota: "Puedes revisar el estado y los documentos de tus solicitudes en tu panel.",
    ignora: "Si no reconoces esta solicitud, escríbenos de inmediato.",
  },
  portalPie: (marca: string) => `${marca} · Operado por ${APP.legalName}`,
  portalNoResponder: "Por favor, no respondas a este correo.",
  footer: `${APP.legalName} · Por favor, no respondas a este correo.`,
  contactoFooter: (wa: string, correo: string) =>
    `¿Dudas? Escríbenos por WhatsApp ${wa} o a ${correo}.`,
} as const;

const portales = {
  login: {
    subtitulo: "Portal de inversión privado",
    emailLabel: "Correo",
    emailPlaceholder: "tucorreo@ejemplo.com",
    passwordLabel: "Contraseña",
    cta: "Entrar",
    entrando: "Entrando…",
    faltaCredenciales: "Ingresa tu correo y contraseña.",
    errorCredenciales: "Correo o contraseña incorrectos.",
    sinAcceso: "No tienes acceso a este portal.",
    /** El problema NO es la contraseña: no mandes al usuario a reescribirla. */
    errorServicio: "No pudimos conectarnos. No es tu contraseña: vuelve a intentar en un momento.",
    errorGenerico: "No pudimos iniciar sesión. Intenta de nuevo.",
    nota: "Este es un portal privado. Si te invitamos, entra con el correo que te dimos.",
    // El tope de sesión (1 hora) también rige en los portales: si no se dice, la
    // vuelta al login se siente como un error del sistema.
    sesionExpirada: "Tu sesión venció por seguridad. Vuelve a entrar.",
  },
  // Pie legal de los portales: la marca del portal es aparte, pero la SAC madre
  // figura en el pie. Nombre legal desde APP (fuente única), no hardcodeado.
  pieLegal: `Operado por ${APP.legalName}`,
  /**
   * Aviso cuando hay montos en más de una moneda: el total va en la dominante y
   * quedan montos afuera. ÚNICO lugar del texto — lo leen el inversionista (su
   * cartera), el asesor (la de un cliente) y el admin (el portal). Estaba escrito
   * dos veces con voces distintas, y la del asesor decía "tienes operaciones"
   * cuando en realidad mira la cartera de OTRO. Redacción neutra: sirve a los tres.
   */
  multiMonedaNota: (moneda: string) =>
    `El total va en ${moneda}. Hay operaciones en otra moneda que no se suman a este número.`,
  // 404 PROPIO del portal. El global (app/not-found.tsx) atrapa lo no ruteado; el
  // verde de Efectivo y su WhatsApp: mostrárselo a un inversionista dentro de su
  // portal es una fuga de marca hacia el otro negocio. Sobrio y sin mascota.
  noEncontrado: {
    titulo: "No encontramos esa página.",
    sub: "El link puede haber cambiado o esa sección ya no está disponible.",
    cta: "Volver al inicio",
  },
  // Disclaimer de capital en riesgo — SSOT. Se muestra en la ficha del cliente y
  // al pie del catálogo. Único lugar del texto: si cambia la redacción legal, se
  // cambia acá y se propaga.
  disclaimerCapital:
    "Toda inversión implica riesgo de pérdida de capital. La rentabilidad no está garantizada. Esto no es asesoría de inversión.",
  disclaimerTitulo: "Antes de invertir",
  /**
   * CÓMO FUNCIONA EL DINERO — SSOT del modelo de intermediación, contado a las dos
   * partes. Es la MISMA verdad con dos lecturas: el inversionista necesita saber con
   * quién firma y a quién transfiere; la empresa necesita saber que el desembolso se
   * parte en dos y que la comisión la asume ella.
   *
   * ASIMETRÍA DELIBERADA (decisión del negocio, no un descuido): al inversionista se
   * le explica el MODELO pero NUNCA el monto ni el % de la comisión —no sale de su
   * retorno, así que para su decisión es ruido, y el detalle lo ve en los documentos
   * al firmar—. A la empresa se le muestra todo: es su costo.
   *
   * Redacción: nada de marketing, solo mecánica. Si el modelo cambia, cambia acá.
   */
  flujoDinero: {
    inversionista: {
      titulo: "Cómo funciona el dinero",
      sub: "Quién es quién en esta operación.",
      pasos: [
        {
          titulo: "Firmas con la empresa",
          detalle:
            "El contrato de la inversión es entre tú y la empresa que recibe el financiamiento. Es un acuerdo privado entre ambas partes, con sus condiciones, plazos y garantías.",
        },
        {
          titulo: "Transfieres directo a la empresa",
          detalle:
            "El dinero de tu inversión va a la cuenta de la empresa. No pasa por ninguna cuenta nuestra: no lo recibimos, no lo retenemos y no lo administramos.",
        },
        {
          titulo: `Qué hace ${APP.brand}`,
          detalle: `${APP.legalName} evalúa y publica la operación, te acompaña con un asesor y hace el seguimiento del repago. Cobra una comisión de intermediación a la empresa, no a ti: no sale de tu retorno. No es parte del contrato que firmas ni recibe tu dinero.`,
        },
      ],
      nota: "Las condiciones completas de la operación, incluida la comisión que paga la empresa, quedan por escrito en los documentos que se firman.",
    },
    empresario: {
      titulo: "Cómo llega el dinero",
      sub: "El desembolso son dos transferencias, no una.",
      pasos: [
        {
          titulo: "A tu cuenta: el neto",
          detalle:
            "El inversionista transfiere a la cuenta de tu empresa el monto menos la comisión. Ese es el número que ves como “Recibes”.",
        },
        {
          titulo: `A ${APP.brand}: la comisión`,
          detalle: `La comisión de intermediación la asume tu empresa y se descuenta del desembolso. Es el pago a ${APP.legalName} por evaluar la operación, publicarla y acompañar el proceso.`,
        },
        {
          titulo: "Lo que devuelves no cambia",
          detalle:
            "Devuelves el capital completo más el interés pactado con el inversionista. La comisión no se suma a lo que debes: ya la pagaste recibiendo menos al inicio.",
        },
      ],
      nota: `El monto de la operación nunca pasa por una cuenta de ${APP.legalName}: el contrato del financiamiento es entre tu empresa y el inversionista.`,
    },
  },
  /**
   * TÉRMINOS DEL PORTAL — ⚠️ BORRADOR. Debe revisarlo el abogado de la Fase 0 legal
   * ANTES de operar con dinero real. No es una opinión legal ni fue redactado por uno.
   *
   * REGLA DE REDACCIÓN (producto YMYL): acá van SOLO afirmaciones factuales sobre
   * cómo funciona el producto y que ya son verdad en el código —portal por
   * invitación, contrato bilateral, transferencias directas, comisión a cargo de la
   * empresa—. Nada de cláusulas inventadas: sin jurisdicción, sin arbitraje, sin
   * renuncias de responsabilidad, sin plazos y sin ninguna afirmación de estar
   * autorizados, registrados o supervisados. Si algo no se puede sostener con el
   * código o con un papel, no se escribe.
   *
   * El riesgo de capital NO se redacta acá: se reusa `disclaimerCapital` y las
   * advertencias de `cliente.recuperación` (SSOT). Duplicarlo sería tener dos
   * versiones del mismo aviso legal envejeciendo por separado.
   */
  terminos: {
    titulo: "Términos del portal",
    sub: (marca: string) => `Cómo funciona ${marca} y qué papel cumple cada parte.`,
    secciones: (marca: string) =>
      [
        {
          titulo: "Un portal privado y por invitación",
          cuerpo: `${marca} es un portal privado operado por ${APP.legalName}. El acceso es por invitación: las cuentas las crea nuestro equipo y no hay registro abierto. Sirve para gestionar y hacer seguimiento de operaciones que se conversan de forma presencial con un asesor. La información publicada acá no constituye una oferta pública de inversión ni una invitación a invertir dirigida al público en general.`,
        },
        {
          titulo: "El contrato es entre el inversionista y la empresa",
          cuerpo: `Cada operación termina en un contrato privado entre el inversionista y la empresa que recibe el financiamiento, con sus propias condiciones, plazos y garantías. ${APP.legalName} no es parte de ese contrato: no presta, no recibe el financiamiento, no garantiza el repago y no asume la obligación de pago de ninguna de las partes.`,
        },
        {
          titulo: "No custodiamos ni administramos dinero",
          cuerpo: `Las transferencias son directas entre el inversionista y la empresa. ${APP.legalName} no recibe, no retiene, no custodia ni administra los fondos de las operaciones publicadas. El portal no procesa pagos ni mantiene saldos a nombre de los usuarios: reservar una oportunidad aparta la operación mientras un asesor te contacta, no compromete dinero y no genera ningún cargo.`,
        },
        {
          titulo: "Comisión de intermediación",
          cuerpo: `${APP.legalName} cobra una comisión de intermediación por evaluar la operación, publicarla y acompañar el proceso. Esa comisión la paga la empresa que recibe el financiamiento y se descuenta de lo que recibe al desembolso. El inversionista no paga comisión al portal, y la comisión no se descuenta de su retorno.`,
        },
        {
          titulo: "Qué es la información del portal",
          cuerpo: `El equipo evalúa cada operación y publica la información con la que cuenta al momento de publicarla; los montos, tasas, plazos y garantías pueden variar hasta la firma. Nada de lo publicado acá constituye asesoría de inversión, financiera, legal ni tributaria: la decisión de invertir es libre, informada y de exclusiva responsabilidad del inversionista.`,
        },
        {
          titulo: "No somos una entidad supervisada",
          cuerpo: `${APP.legalName} no es una entidad del sistema financiero ni del mercado de valores: no capta depósitos del público, no otorga créditos por cuenta propia y no administra fondos de terceros. No se encuentra bajo la supervisión de la Superintendencia de Banca, Seguros y AFP (SBS) ni de la Superintendencia del Mercado de Valores (SMV). Los montos de las operaciones no son depósitos y no están cubiertos por el Fondo de Seguro de Depósitos ni por ningún fondo de garantía estatal.`,
        },
      ] as const,
    /** El riesgo se reusa de `disclaimerCapital` + `cliente.recuperación.advertencias`. */
    riesgoTitulo: "Riesgo de la inversión",
    dudas: "Si algo de esto no te queda claro, pregúntale a tu asesor antes de avanzar.",
  },
  nav: {
    catalogo: "Oportunidades",
    oportunidades: "Oportunidades",
    usuarios: "Usuarios",
    /** Bitácora del portal: solo aparece en el menú del administrador. */
    auditoria: "Bitácora",
    tablero: "Tablero",
    panel: "Panel",
    misClientes: "Mis clientes",
    reservas: "Reservas",
    solicitudes: "Solicitudes",
    cartera: "Mi cartera",
    historial: "Historial",
    configuracion: "Configuración",
    canal: "Canal de WhatsApp",
    /** Letra chica del pie del PortalShell, no un ítem del nav. */
    terminos: "Términos del portal",
    salir: "Salir",
    inicio: "Inicio",
    abrirMenu: "Abrir menú",
    cerrarMenu: "Cerrar menú",
  },
  roles: {
    admin: "Administrador",
    asesor: "Asesor",
    cliente: "Inversionista",
    empresario: "Empresa",
  },
  estados: {
    activo: "Activo",
    inactivo: "Inactivo",
  },
  comun: {
    guardar: "Guardar",
    guardando: "Guardando…",
    cancelar: "Cancelar",
    cargando: "Cargando…",
    error: "Algo salió mal. Intenta de nuevo.",
    volver: "← Volver",
    moneda: "Moneda",
    opcional: "Opcional",
    /** Pie de una lista acotada: nunca truncar en silencio (los paneles de
     *  pendientes muestran las primeras filas, no todas). */
    masFilas: (n: number) => (n === 1 ? "Hay 1 más sin mostrar." : `Hay ${n} más sin mostrar.`),
  },
  card: {
    verDetalle: "Ver detalle",
    meInteresa: "Me interesa",
    fotos: (n: number) => (n === 1 ? "1 foto" : `${n} fotos`),
    sinFoto: "Sin foto",
    /** Posición de la operación del prestatario (estilo inversiones.io). */
    operacionOrdinal: (n: number) => `${n}.ª operación`,
    /** Track record público del prestatario: total de operaciones y cuántas cerró.
     *  "Cerradas" es factual (estado de la operación); NO afirma "pagó a tiempo". */
    trackRecord: (total: number, cerradas: number) =>
      `${total === 1 ? "1 operación" : `${total} operaciones`} · ${cerradas} ${cerradas === 1 ? "cerrada" : "cerradas"}`,
  },
  reserva: {
    reservar: "Reservar",
    confirmarTitulo: "¿Confirmas la reserva?",
    confirmarTexto:
      "Reservar es un compromiso. La apartamos para ti por 24 horas y tu asesor te contacta para continuar. Sin cargo alguno.",
    confirmarCta: "Sí, reservar",
    reservadaOk: "Reservada. Tu asesor te contactará muy pronto.",
    noDisponible: "Otra persona la reservó primero.",
    errorSinAcceso: "No puedes reservar esta oportunidad.",
    error: "No pudimos completar la acción. Intenta de nuevo.",
    reservadaPorTi: "Reservada por ti",
    reservadaPorOtro: "Reservada",
    vencePrefijo: "Vence en",
    vence: (h: number, m: number) => `${h} h ${m} min`,
    venceHoras: (h: number) => `${h} h`,
    venceMinutos: (m: number) => `${m} min`,
    vencida: "Vencida",
    cancelar: "Cancelar reserva",
    canceladaOk: "Reserva cancelada. La oportunidad vuelve al catálogo.",
    escribirAsesor: "Escribir a mi asesor por WhatsApp",
    waMensaje: (titulo: string) =>
      `Hola, reservé la oportunidad "${titulo}" en el portal de inversión y quiero continuar.`,
  },
  historial: {
    titulo: "Mi historial",
    sub: "Todas tus reservas: activas, confirmadas y las que ya no siguen.",
    vacio: "Todavía no reservaste ninguna oportunidad.",
    explorar: "Explorar oportunidades",
    colOportunidad: "Oportunidad",
    colEstado: "Estado",
    colReservada: "Reservada",
    colVence: "Vence / resuelta",
    verDetalle: "Ver",
    estados: {
      activa: "Activa",
      confirmada: "Confirmada",
      expirada: "Expirada",
      cancelada: "Cancelada",
    },
  },
  config: {
    titulo: "Configuración",
    sub: "Tu seguridad: contraseña y verificación en dos pasos.",
  },
  /**
   * Seguridad de la cuenta del portal (contraseña + 2FA). Vive en el namespace de
   * PORTALES, no en el de Efectivo: la MECÁNICA es la misma (mismo Supabase Auth,
   * mismos endpoints) pero el texto le habla a otro público y de otra marca, y
   * apoyarse en COPY.app.seguridad hacía que cualquier ajuste de copy de Efectivo
   * se propagara sin querer al portal.
   */
  seguridad: {
    dosFactores: "Verificación en dos pasos",
    desc: "Además de tu contraseña, al entrar pediremos un código de tu app autenticadora (Google Authenticator, Authy, etc.).",
    estadoActivo: "Activada",
    estadoInactivo: "Desactivada",
    activar: "Activar",
    desactivar: "Desactivar",
    sesionInfo: "Por seguridad, tu sesión se cierra sola después de 1 hora.",
    paso1: "1. Escanea este código con tu app autenticadora:",
    paso2: "2. ¿No puedes escanear? Escribe esta clave en la app:",
    paso3: "3. Ingresa el código de 6 dígitos que muestra la app:",
    codigo: "Código de 6 dígitos",
    confirmar: "Confirmar y activar",
    cancelar: "Cancelar",
    activada: "Verificación en dos pasos activada. Te pediremos el código al entrar.",
    desactivada: "Verificación en dos pasos desactivada.",
    errorCodigo: "Código incorrecto. Revisa e intenta de nuevo.",
    errorGenerico: "No se pudo completar. Intenta de nuevo.",
    claveActual: "Tu contraseña actual",
    claveIncorrecta: "Tu contraseña no es correcta.",
    desactivarConfirmTitulo: "¿Desactivar la verificación en dos pasos?",
    desactivarConfirmTexto:
      "Tu cuenta quedará protegida solo por la contraseña. Confirma con tu contraseña actual y te enviaremos un aviso por correo.",
    password: {
      title: "Cambiar contraseña",
      desc: "Actualiza tu contraseña cuando quieras. Por seguridad, primero confirma la actual.",
      actual: "Contraseña actual",
      nueva: "Nueva contraseña",
      confirmar: "Repite la nueva contraseña",
      hint: "Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.",
      guardar: "Cambiar contraseña",
      okSesionesCerradas:
        "Listo. Cerramos tu sesión en todos los dispositivos: vuelve a entrar con tu nueva contraseña.",
      debil: "La contraseña no cumple los requisitos mínimos.",
      noCoincide: "Las contraseñas no coinciden.",
      actualIncorrecta: "Tu contraseña actual no es correcta.",
      error: "No se pudo cambiar la contraseña. Intenta de nuevo.",
    },
  },
  /**
   * Establecer la contraseña desde el enlace de la invitación. Pantalla PROPIA del
   * portal: mandar al inversionista a la de Don Gato Efectivo lo dejaba en un
   * login donde su cuenta no existe, o sea nunca llegaba a su portal.
   */
  nuevaClave: {
    titulo: "Crea tu contraseña",
    sub: "Elige la contraseña con la que vas a entrar al portal.",
    validando: "Validando tu enlace…",
    passwordLabel: "Contraseña",
    passwordHint: "Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.",
    password2Label: "Repite la contraseña",
    cta: "Guardar y entrar",
    guardando: "Guardando…",
    success: "Listo. Ingresa con tu correo y tu contraseña nueva.",
    passwordDebil:
      "La contraseña no cumple los requisitos: mínimo 8 caracteres, una mayúscula, una minúscula y un número.",
    passwordNoCoincide: "Las contraseñas no coinciden.",
    errorLink: "Este enlace venció o no es válido. Pídenos uno nuevo.",
    errorGenerico: "No pudimos guardar la contraseña. Intenta de nuevo.",
    irAlLogin: "Ir a iniciar sesión",
  },
  // ── EMPRESARIO (el contratista/prestatario con su propia cuenta) ──
  // Panel de solo-ver: sus operaciones agrupadas + un botón para enviarnos una
  // oferta por WhatsApp. NUNCA ve el lado inversionista, ni scoring, ni notas.
  empresario: {
    inicioSaludo: (nombre: string) => `Hola, ${nombre}`,
    inicioSub: "Este es el panel de tu empresa. Aquí ves tus operaciones con nosotros.",
    empresaLabel: "Tu empresa",
    rucLabel: "RUC",
    kpiVigentes: "Vigentes",
    kpiCerradas: "Cerradas",
    kpiEvaluacion: "En evaluación",
    seccionVigentes: "Operaciones vigentes",
    seccionVigentesSub: "Publicadas o con financiamiento en proceso.",
    seccionCerradas: "Operaciones cerradas",
    seccionCerradasSub: "Financiamientos ya concretados.",
    seccionEvaluacion: "En evaluación",
    seccionEvaluacionSub: "Las estamos revisando; todavía no se publican.",
    vacio:
      "Todavía no tienes operaciones registradas. Cuando quieras financiar un contrato o una factura, envíanos tu oferta.",
    enviarOferta: "Enviar oferta por WhatsApp",
    solicitarFinanciamiento: "Solicitar financiamiento",
    ofertaNota:
      "¿Tienes un contrato o una factura para financiar? Déjanos una solicitud en el panel o escríbenos por WhatsApp.",
    waMensaje: (nombre: string) => `Hola, soy ${nombre}. Quiero enviar una oferta para evaluación.`,
    // ── Vista de COSTO del prestatario (reemplaza el framing de rentabilidad del
    //    inversionista). El empresario ve SU número: cuánto recibe, cuánto paga por
    //    mes, cuánto le cuesta en total. NUNCA la TEA (rentabilidad del inversionista).
    card: {
      solicitas: "Solicitas",
      recibes: "Recibes",
      costoTotal: "Costo total",
      // Sin marca de vertical: el nombre del portal vive en lib/portales/config.ts y
      // hardcodearlo acá rompía ese single source (decía "Valoriza" incluso si el
      // portal se renombra, y en el portal hipotecario habría estado mal siempre).
      // Misma etiqueta que usa el simulador: una sola forma de nombrar el cobro.
      comision: "Comisión de intermediación",
      comisionDetalle: (pct: string, monto: string) => `${pct} (−${monto})`,
      // Quién la paga y por qué el "Recibes" es menor al "Solicitas".
      comisionNota: "La paga tu empresa: se descuenta del desembolso.",
      devuelvesTitulo: "Devuelves",
      cuotasInteres: (n: number, cuota: string) =>
        `${n === 1 ? "1 cuota" : `${n} cuotas`} de ${cuota} de interés`,
      capitalAlFinal: (monto: string) => `+ ${monto} de capital al final`,
      interesMensual: "Interés mensual",
      plazo: "Plazo",
      sinDatos: "Por definir",
      // (Se quitó `modeloNota`: copy muerto que contaba a medias el flujo del dinero.
      //  Esa explicación vive ahora completa y en un solo lugar: `flujoDinero`.)
    },
    // ── Cronograma tentativo (simulación) ──
    cronograma: {
      ver: "Ver cronograma tentativo",
      ocultar: "Ocultar cronograma",
      titulo: "Cronograma tentativo",
      simulacion: "Simulación — el cronograma real se define al desembolso.",
      colCuota: "Cuota",
      colFecha: "Fecha aprox.",
      colInteres: "Interés",
      colCapital: "Capital",
      colTotal: "Total",
      capitalChip: "Capital",
      // El costo se calcula con el plazo MÁS LARGO del rango: en este esquema más
      // meses = más interés, así el número que se muestra es el techo, no el piso.
      rangoNota: "Calculado con el plazo más largo del rango: es el costo máximo.",
      sinDatos: "Faltan datos (monto, interés o plazo) para simular el cronograma.",
      totalInteres: "Total interés",
      totalDevolver: "Total a devolver (interés + capital)",
    },
    // ── Pre-calificación: simular el costo ANTES de enviar la solicitud ──
    //    Regla de honestidad: lo que todavía no está definido se dice "Por definir".
    //    Nunca se asume 0 (mostraría que recibe el 100 % y que no cuesta nada) ni se
    //    promete aprobación: es una estimación referencial, no una oferta.
    simulador: {
      titulo: "Simula antes de pedir",
      sub: "Ingresa cuánto necesitas y en cuántos meses. Te mostramos cuánto recibirías, cuánto devolverías y cuánto te costaría.",
      ...CAMPOS_PEDIDO_FINANCIAMIENTO,
      recibes: "Recibes",
      recibesSub: "Al desembolso, ya descontada la comisión.",
      devuelves: "Devuelves",
      devuelvesSub: "Interés de todo el período + el capital completo.",
      costoTotal: "Costo total",
      costoTotalSub: "Comisión + interés. No incluye el capital que devuelves.",
      sinDatos: "Por definir",
      faltaMonto: "Ingresa un monto y un plazo para simular.",
      detalleTitulo: "Cómo se arma ese número",
      comisionLabel: "Comisión de intermediación",
      interesLabel: "Interés mensual",
      cuotaLabel: "Cuota mensual (solo interés)",
      capitalLabel: "Capital que devuelves al final",
      porDefinirTitulo: "Faltan condiciones por definir",
      porDefinirTexto:
        "El interés y la comisión los fija el equipo al evaluar tu caso. Mientras tanto preferimos dejar esos números en blanco antes que mostrarte uno que no es el tuyo.",
      referencia: (n: number) =>
        `Interés y comisión de referencia: los de tus condiciones más recientes con nosotros (${
          n === 1 ? "1 operación" : `${n} operaciones`
        }). Pueden cambiar en esta solicitud.`,
      disclaimer:
        "Es una estimación referencial, no una oferta ni una aprobación. Las condiciones finales se definen con la evaluación de tu solicitud.",
      usarDatos: "Solicitar con estos datos",
    },
    // ── Solicitudes de financiamiento (el empresario crea; el staff evalúa) ──
    solicitudes: {
      titulo: "Mis solicitudes",
      sub: "Pide financiamiento para un contrato o una factura y súbenos el respaldo.",
      nueva: "Solicitar financiamiento",
      vacio:
        "Todavía no enviaste ninguna solicitud. Cuando quieras financiar un contrato o una factura, empieza acá.",
      montoLabel: "Monto solicitado",
      plazoLabel: "Plazo",
      creadaLabel: "Enviada",
      motivoLabel: "Motivo",
      verOperacion: "Ver la operación publicada",
      estado: {
        en_evaluacion: "En evaluación",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
        convertida: "Publicada",
        retirada: "Retirada",
      },
      estadoAyuda: {
        en_evaluacion: "La estamos revisando; te avisamos apenas haya novedad.",
        aprobada: "Aprobada. Continuamos el proceso contigo.",
        rechazada: "No pudimos avanzar por ahora. Mira el motivo abajo.",
        convertida: "Ya es una operación publicada.",
        retirada: "La retiraste. Si la necesitas de nuevo, envía una solicitud nueva.",
      },
      form: {
        titulo: "Nueva solicitud de financiamiento",
        tituloEditar: "Editar solicitud",
        ...CAMPOS_PEDIDO_FINANCIAMIENTO,
        descripcion: "Cuéntanos del contrato o la factura",
        descripcionHint:
          "Entidad, monto del contrato, avance de obra, garantías que puedes ofrecer…",
        enviar: "Enviar solicitud",
        enviando: "Enviando…",
        guardar: "Guardar cambios",
        guardando: "Guardando…",
        faltaMonto: "Ingresa un monto válido.",
        faltaPlazo: `Ingresa un plazo entre ${PLAZO_SOLICITUD_MESES.min} y ${PLAZO_SOLICITUD_MESES.max} meses.`,
        creada: "Solicitud enviada. La revisaremos pronto.",
        editada: "Solicitud actualizada.",
        error: "No pudimos enviar la solicitud. Intenta de nuevo.",
        errorEditar:
          "No pudimos guardar los cambios. Puede que ya la estemos revisando; recarga la página.",
      },
      // ── Editar / retirar (solo mientras está en evaluación) ──
      editar: "Editar",
      retirar: "Retirar solicitud",
      soloEnEvaluacionAcciones:
        "Puedes editar o retirar tu solicitud solo mientras está en evaluación.",
      retiro: {
        titulo: "¿Retirar esta solicitud?",
        texto:
          "Dejaremos de evaluarla y no seguiremos con este pedido. Tus documentos quedan guardados. Si la necesitas de nuevo, puedes enviar una solicitud nueva.",
        confirmar: "Sí, retirar",
        ok: "Solicitud retirada.",
        error:
          "No pudimos retirarla. Puede que ya la hayamos resuelto; recarga la página para ver su estado.",
      },
      docs: {
        titulo: "Documentos de respaldo",
        sub: "Adjunta contrato, valorización, carta fianza, etc. Ayuda a evaluar más rápido.",
        subir: "Subir documento",
        subiendo: "Subiendo…",
        tipo: "Tipo de documento",
        sinDocs: "Aún no adjuntaste documentos.",
        quitar: "Quitar documento",
        error: "No pudimos subir el documento. Intenta de nuevo.",
        soloEnEvaluacion:
          "Solo puedes cambiar los documentos mientras la solicitud está en evaluación.",
      },
      waAviso: "Avisar por WhatsApp",
      waMensaje: (empresa: string) =>
        `Hola, soy ${empresa}. Dejé una solicitud de financiamiento en el panel para que la revisen.`,
      waNota:
        "Avisar por WhatsApp acelera la revisión, pero es opcional: el validador ya la ve en el panel.",
    },
    // ── Timeline del empresario por operación (deriva del estado, no se guarda) ──
    timeline: {
      titulo: "Estado de la operación",
      // Orden: evaluación → aprobada → publicada → con inversionista → financiada → repago.
      pasos: [
        "En evaluación",
        "Aprobada",
        "Publicada",
        "Con inversionista",
        "Financiada",
        "En repago",
      ],
      actual: (label: string) => `Ahora: ${label}`,
    },
    // ── "Tu historial con Don Gato" (reputación amable; nunca el scoring interno) ──
    reputacion: {
      titulo: "Tu historial con nosotros",
      sub: "Tu track record como buen pagador se construye operación a operación.",
      totalOps: "Operaciones",
      completadas: "Completadas",
      completadasSub: "Financiadas o cerradas con nosotros.",
      vacio: "Aún no tienes operaciones registradas.",
      buenPagador: "Cumplir a tiempo mejora tus condiciones en las próximas operaciones.",
    },
  },
  cliente: {
    // ── Inicio (dashboard del inversionista) ──
    inicioSaludo: (nombre: string) => `Hola, ${nombre}`,
    inicioSub: "Este es tu panel de inversión.",
    inicioSinReservasTitulo: "Aún no reservaste ninguna oportunidad",
    inicioSinReservasTexto:
      "Explora las oportunidades disponibles y aparta la que más te convenza. La reserva es gratis y sin compromiso de pago.",
    inicioExplorar: "Ver oportunidades",
    inicioReservasTitulo: "Tus reservas activas",
    inicioVerHistorial: "Ver todo mi historial",
    kpiReservasActivas: "Reservas activas",
    kpiConfirmadas: "Confirmadas",
    kpiDisponibles: "Disponibles",
    // ── Catálogo ──
    guiaTitulo: "Cómo funciona",
    guiaPasos: ["Reservas (24 h)", "Tu asesor te contacta", "Firma", "Transferencia"],
    buscarPlaceholder: "Buscar por título o distrito…",
    filtroRiesgo: "Riesgo",
    filtroTodosRiesgos: "Todos los riesgos",
    sinResultados: "No hay oportunidades que coincidan con tu búsqueda.",
    tabTodas: "Todas",
    tabDisponibles: "Disponibles",
    tabReservadas: "Reservadas",
    catalogoTitulo: "Oportunidades disponibles",
    catalogoSub: "Inversiones con respaldo real, revisadas por nuestro equipo.",
    vacio: "Todavía no hay oportunidades publicadas. Vuelve pronto.",
    detalleTitulo: "Detalle de la oportunidad",
    financierosTitulo: "Condiciones financieras",
    ubicacionTitulo: "Ubicación",
    fichaTitulo: "Ficha",
    garantiasTitulo: "Garantías que respaldan",
    sinGarantias: "Esta oportunidad aún no tiene garantías cargadas.",
    fotosTitulo: "Galería",
    riesgoTitulo: "Nivel de riesgo",
    ratingLabel: "Rating interno",
    meInteresa: "Me interesa",
    interesTitulo: "¡Gracias por tu interés!",
    interesTexto:
      "Registramos tu interés. Un asesor te contactará para explicarte los siguientes pasos.",
    interesCerrar: "Entendido",
    nota: "Revisa las garantías y el nivel de riesgo antes de decidir. Con calma.",
    labels: {
      valorMercado: "Valor de mercado",
      oferta: "Oferta desde",
      montoSolicitado: "Monto solicitado",
      rentabilidad: "Rentabilidad estimada",
      tir: "TIR estimada",
      tasa: "Tasa",
      plazo: "Plazo",
      plazoMeses: "meses",
      valorGarantia: "Valor estimado",
      tna: "Tasa nominal anual (TNA)",
      tea: "Tasa efectiva anual (TEA)",
      gananciaMensual: "Ganancia mensual",
      // ── Ganancia AL PLAZO (lidera las condiciones; evita creer que se gana la TEA en pocos meses) ──
      gananciaAlPlazo: "Ganancia estimada al plazo",
      gananciaAlPlazoSobre: (monto: string, plazo: string) => `Sobre ${monto} en ${plazo}`,
      equivalenteAnual: "Equivalente anual",
      equivalenteAnualNota:
        "TNA y TEA son referencias ANUALES para comparar. En este plazo ganas la estimación de arriba, no el equivalente anual completo.",
      // ── Cobertura de garantía ──
      coberturaCubre: "La garantía cubre",
      coberturaVeces: (v: string) => `${v} tu inversión`,
      coberturaTotal: (total: string) => `${total} en garantías`,
      ltv: "LTV (préstamo / valor)",
      ltvSub: "Cuánto se presta frente al valor de la propiedad. Más bajo, más colchón.",
      // Explicación de siglas en español llano (regla del repo).
      tasasNota:
        "TNA es la tasa nominal anual (la mensual multiplicada por 12). TEA es la tasa efectiva anual: refleja la ganancia real al reinvertir mes a mes, por eso es un poco mayor.",
      sinTasa: "Por definir",
    },
    // ── Simulador de inversión (client) ──
    simulador: {
      titulo: "Simula tu inversión",
      sub: "Mueve el monto y mira cuánto ganarías al plazo.",
      montoLabel: "¿Cuánto invertirías?",
      gananciaLabel: "Ganancia estimada",
      totalLabel: "Total a recibir",
      cobroLabel: "Cobro aproximado",
      plazoNota: (plazo: string) => `Estimado para un plazo de ${plazo}.`,
      rangoNota: "Con rango de plazo, mostramos el escenario del plazo más corto.",
      sinTasa: "Esta oportunidad aún no tiene tasa definida para simular.",
    },
    // ── Salvaguardas (garantías como centro de confianza) ──
    salvaguardas: {
      titulo: "Salvaguardas",
      sub: "Todo lo que respalda tu inversión",
      conteo: (n: number) => (n === 1 ? "1 salvaguarda" : `${n} salvaguardas`),
      coberturaTitular: (veces: string) => `La garantía cubre ${veces} tu inversión`,
      coberturaDetalle: (garantías: string, monto: string) =>
        `${garantías} en garantías frente a ${monto} solicitados`,
      sinCobertura: "Respaldos de esta operación",
      valorLabel: "Valor estimado",
      sinGarantias: "Esta oportunidad aún no tiene salvaguardas cargadas.",
    },
    // ── Riesgos y mitigación ──
    riesgos: {
      titulo: "Riesgos y cómo los mitigamos",
      sub: "Ser transparentes con el riesgo es parte de cuidarte.",
      comoMitigamos: "Cómo lo mitigamos",
    },
    // ── Constancia de reserva (PDF descargable) ──
    // Texto que el inversionista LEE en un documento que se lleva: mismo estándar
    // que el JSX, vive acá. `avisos` es lo que evita que un PDF con membrete se
    // confunda con un contrato o un comprobante de pago: la reserva NO mueve
    // dinero, y el documento tiene que decirlo con todas las letras.
    constancia: {
      boton: "Descargar constancia",
      descargando: "Generando…",
      error: "No pudimos generar la constancia. Intenta de nuevo.",
      titulo: "Constancia de reserva",
      faceta: "Inversionista",
      pieNota: "Documento informativo · no es contrato ni comprobante de pago",
      resumen: {
        estado: "Estado de la reserva",
        reservadaEl: "Reservada el",
        venceEl: "Reserva vigente hasta",
        resueltaEl: "Resuelta el",
        codigo: "Código de reserva",
      },
      seccionOperacion: "Detalle de la operación",
      seccionGarantias: "Salvaguardas declaradas",
      colDato: "Dato",
      colValor: "Valor",
      colGarantia: "Salvaguarda",
      colDescripcion: "Descripción",
      colValorEstimado: "Valor estimado",
      sinGarantias: "Esta operación no tiene salvaguardas cargadas.",
      operacionLabels: {
        titulo: "Operación",
        portal: "Portal",
        ubicacion: "Ubicación",
        moneda: "Moneda",
        nivelRiesgo: "Nivel de riesgo",
        rating: "Rating interno",
      },
      avisosTitulo: "Alcance de esta constancia",
      avisos: [
        "Esta constancia acredita únicamente que reservaste la oportunidad descrita en la fecha indicada. No es un contrato, no es un comprobante de pago y no es un título valor.",
        "La reserva no compromete dinero: aparta la oportunidad mientras tu asesor te contacta. La inversión existe recién cuando se firma el acuerdo y se transfiere el monto.",
        "Los montos, tasas y plazos son los publicados por la operación al momento de generar este documento y pueden variar hasta la firma. La ganancia estimada es un cálculo referencial al plazo, no un rendimiento asegurado.",
        "Los valores de las salvaguardas son estimaciones de tasación, no precios de venta asegurados. Ante un incumplimiento, ejecutarlas toma tiempo, tiene costos y su resultado depende de procesos que no controlamos.",
      ],
    },
    // ── Recuperación ante impago ("¿qué pasa si el deudor no paga?") ──
    // Es LA pregunta que se hace un inversionista antes de comprometer dinero, y
    // hasta ahora la ficha no la respondía. Acá va SOLO el chrome y las
    // advertencias que valen para toda vertical; las etapas del proceso y los
    // límites propios de cada portal son datos de catálogo (lib/portales/config.ts),
    // porque ejecutar una hipoteca no se parece a cobrar una factura del Estado.
    // Regla de redacción (producto de dinero): nunca "recuperación garantizada",
    // nunca un plazo que no controlamos, y lo que depende de un juez se dice.
    recuperacion: {
      titulo: "¿Qué pasa si el deudor no paga?",
      sub: "El proceso de recuperación, paso a paso y sin promesas.",
      ver: "Ver el proceso",
      ocultar: "Ocultar el proceso",
      etapasTitulo: "Cómo avanza la cobranza",
      queSeEjecutaTitulo: "Qué se ejecuta en esta operación",
      limitesTitulo: "Lo que este proceso NO asegura",
      // Advertencias universales: aplican a toda vertical y cierran el bloque.
      // Son el contrapeso honesto del titular de cobertura de Salvaguardas.
      advertenciaTitulo: "Lo más importante",
      advertencias: [
        "Recuperar no es automático ni instantáneo. Toda ejecución de garantía tiene costos y tiempos que dependen de terceros: juzgados, peritos y compradores.",
        "La cobertura de la garantía indica cuánto respaldo hay frente al monto prestado. No es una promesa de cuánto se recuperará ni de cuándo: el valor de realización puede ser menor al tasado.",
        "Puedes perder parte o la totalidad del capital invertido. Ninguna operación de este portal tiene la recuperación garantizada.",
      ],
    },
    // ── Metodología: nivel de riesgo y rating explicados ──
    metodologia: {
      riesgoTitulo: "¿Qué significa este nivel de riesgo?",
      ratingTitulo: "¿Cómo leer el rating?",
      queMiramos: "Qué miramos",
      queMiramosTexto:
        "Para clasificar cada operación revisamos la relación entre la garantía y el monto (cobertura y LTV), la calidad y liquidez de los respaldos, el historial del prestatario y la estructura legal de la operación.",
    },
    // ── Documentos de respaldo (data room) ──
    docs: {
      titulo: "Documentos de respaldo",
      sub: "La documentación que sustenta esta operación.",
      vacio: "Aún no se cargaron documentos para esta oportunidad.",
      ver: "Ver",
      descargar: "Descargar",
    },
    // ── Timeline post-reserva ──
    timeline: {
      titulo: "El proceso de tu inversión",
      pasos: [
        {
          clave: "reservar",
          label: "Reservada",
          detalle: "La apartamos 24 h para ti, sin dinero.",
        },
        {
          clave: "asesor",
          label: "Tu asesor te contacta",
          detalle: "Resuelve tus dudas y coordina los siguientes pasos.",
        },
        { clave: "firma", label: "Firma", detalle: "Se formaliza el acuerdo de inversión." },
        {
          clave: "transferencia",
          label: "Transferencia",
          detalle: "Envías el monto y la operación queda en marcha.",
        },
      ],
      estadoReservada: "Reservada · tu asesor te contactará",
      estadoConfirmada: "Confirmada · en proceso",
      estadoFinanciada: "Financiada · operación en marcha",
    },
    // ── Mi cartera (KPIs del inversionista en soles) ──
    // Los KPIs de abajo dicen hoy lo mismo que los de `asesor.ficha`, y NO se
    // unifican a propósito: acá le hablamos al inversionista de SU dinero y allá
    // al staff del dinero de un tercero. Compartir el texto ataría dos redacciones
    // que deben poder separarse sin pedir permiso.
    cartera: {
      titulo: "Mi cartera",
      sub: "Tu dinero comprometido y lo que esperas ganar.",
      kpiComprometido: "Comprometido",
      kpiComprometidoSub: "En reservas activas y confirmadas",
      kpiGananciaEsperada: "Ganancia esperada",
      kpiGananciaEsperadaSub: "Estimada al plazo de cada operación",
      kpiOperaciones: "Operaciones",
      calendarioTitulo: "Calendario de cobros",
      calendarioSub: "Fecha aproximada = reserva + plazo estimado.",
      colOperacion: "Operación",
      colMonto: "Invertido",
      colGanancia: "Ganancia est.",
      colCobro: "Cobro aprox.",
      vacio: "Todavía no tienes inversiones comprometidas.",
      explorar: "Explorar oportunidades",
      notaEstimado:
        "Las ganancias y fechas son estimaciones al plazo; no son un compromiso de pago.",
    },
  },
  asesor: {
    titulo: "Mi cartera",
    sub: "Tus clientes asignados y el estado del portal.",
    kpiClientes: "Mis clientes",
    kpiProspectos: "Sin cuenta",
    kpiProspectosSub: "Registrados por ti, todavía sin acceso al portal",
    kpiDisponibles: "Disponibles",
    kpiReservadas: "Reservadas",
    kpiReservasPendientes: "Reservas pendientes",
    kpiTotal: "Oportunidades",
    // ── KPIs de DINERO de la cartera (estimados; intel interna del staff) ──
    kpiComprometido: "Comprometido",
    kpiComprometidoSub: "En reservas activas y confirmadas de tu cartera",
    kpiComision: "Comisión estimada",
    kpiComisionSub: "Sobre tus operaciones. Intel interna, no la ve el inversionista.",
    kpiCerradas: "Financiadas",
    kpiCerradasSub: "Operaciones de tu cartera ya desembolsadas",
    kpiDineroTitulo: "Tu cartera en números",
    kpiDineroNota: "Montos estimados; no son un compromiso de pago.",
    clientesTitulo: "Clientes asignados",
    clientesPageTitulo: "Mis clientes",
    clientesPageSub: "Los inversionistas que tienes asignados.",
    verReservas: "Ver reservas pendientes",
    verClientes: "Ver mis clientes",
    sinClientes: "Todavía no tienes clientes asignados.",
    colNombre: "Nombre",
    colTelefono: "Teléfono",
    colDesde: "Desde",
    colContacto: "Contacto",
    colOperaciones: "Operaciones",
    colComprometido: "Comprometido",
    colUltimaActividad: "Última actividad",
    sinActividad: "Sin actividad",
    sinTelefono: "—",
    // ── Contacto directo del cliente (WhatsApp / llamar), reusado en lista + ficha ──
    contacto: {
      whatsapp: "WhatsApp",
      llamar: "Llamar",
      sinTelefono: "Sin teléfono",
      waMensaje: (nombre: string) =>
        `Hola ${nombre}, te escribo de parte de tu asesor en el portal de inversión. ¿Cómo estás?`,
    },
    nota: "Acompaña a tus clientes: son inversiones grandes y valoran la cercanía.",
    // ── Panel de pendientes / alertas de la cartera (lo urgente, arriba del tablero) ──
    alertas: {
      titulo: "Pendientes de tu cartera",
      todoAlDia:
        "Todo al día. No tienes reservas por vencer, cobros próximos ni recordatorios abiertos.",
      // ── Solicitudes de financiamiento sin revisar (pendiente del equipo) ──
      solicitudesTitulo: "Solicitudes sin revisar",
      solicitudesSub: "Empresas que pidieron financiamiento y siguen en evaluación.",
      solicitudesConteo: (n: number) =>
        n === 1 ? "1 solicitud esperando respuesta" : `${n} solicitudes esperando respuesta`,
      solicitudesRevisar: "Revisar solicitudes",
      solicitudesSoloAdmin: "Las resuelve un administrador del portal.",
      // ── Recordatorios propios de la libreta (notas con próxima acción vencida) ──
      recordatoriosTitulo: "Tus recordatorios",
      recordatoriosSub: "Notas tuyas con una próxima acción que ya toca.",
      sinRecordatorios: "Sin recordatorios pendientes.",
      recordatorioPara: (fecha: string) => `Para el ${fecha}`,
      verCliente: "Ver cliente",
      porVencerTitulo: "Reservas por vencer",
      porVencerSub: "El hold dura 24 h. Si no actúas, la oportunidad vuelve al pool.",
      cobrosTitulo: "Próximos cobros",
      cobrosSub: "Operaciones financiadas de tus clientes que se acercan al repago.",
      revisar: "Revisar",
      urge: "Urge",
      colCobro: "Cobro aprox.",
      colMonto: "Monto estimado",
      sinPorVencer: "Sin reservas por vencer.",
      sinCobros: "Sin cobros próximos.",
      notaCobros:
        "Fecha y monto son estimados (financiamiento + plazo); no son un compromiso de pago.",
    },
    // ── BLOQUEAR una operación a nombre de alguien (el acto central del asesor) ──
    // El negocio es presencial: el asesor cierra por teléfono y bloquea él. El
    // titular puede ser un cliente con cuenta o alguien que todavía no la tiene.
    bloqueo: {
      cta: "Bloquear para un cliente",
      titulo: "¿A nombre de quién?",
      sub: "La apartas 24 horas. No mueve dinero: es el mismo hold que ya conoces.",
      tabExistente: "De mi cartera",
      tabNuevo: "Registrar nuevo",
      seleccionaLabel: "Titular",
      seleccionaPlaceholder: "Elige a quién",
      sinCuentaBadge: "Sin cuenta",
      sinTitulares: "Todavía no tienes a nadie en tu cartera. Registra al titular acá al lado.",
      nombreLabel: "Nombre completo",
      nombrePlaceholder: "Como figura en su documento",
      telefonoLabel: "Teléfono",
      telefonoPlaceholder: "Con el que cerraron por teléfono",
      tipoDocumentoLabel: "Tipo de documento",
      documentoLabel: "Número de documento",
      documentoHint:
        "Puedes completarlo después; ayuda a no registrar dos veces a la misma persona.",
      holdBadge: "24 h",
      nota: "Queda en tu cartera y en la cola de reservas, igual que si la hubiera apartado el cliente.",
      confirmar: "Bloquear 24 horas",
      faltaTitular: "Elige a nombre de quién la bloqueas.",
      faltaNombre: "Escribe el nombre del titular.",
      faltaTelefono: "Escribe un teléfono válido (6 a 15 dígitos).",
      ok: "Bloqueada por 24 horas.",
      okConProspecto: (nombre: string) => `Bloqueada por 24 horas a nombre de ${nombre}.`,
      noDisponible: "Esta operación ya no está disponible.",
      sinAcceso: "Solo puedes bloquear a nombre de alguien de tu cartera.",
      documentoDuplicado: "Ese documento ya está registrado en el portal.",
      error: "No pudimos bloquearla. Intenta de nuevo.",
      docTipos: {
        dni: "DNI",
        ce: "Carné de extranjería",
        pasaporte: "Pasaporte",
        ruc: "RUC",
      },
    },
    // ── Prospectos: quien todavía no tiene cuenta (se le crea cuando ya operó) ──
    prospectos: {
      titulo: "Sin cuenta todavía",
      sub: "Personas que registraste al bloquear. Se les crea la cuenta cuando ya operaron.",
      badge: "Sin cuenta",
      vacio: "Todavía no registraste a nadie sin cuenta.",
      colDocumento: "Documento",
      sinDocumento: "Sin documento",
      fichaVolver: "← Mis clientes",
      fichaDesde: (fecha: string) => `Registrado el ${fecha}`,
      convertido: "Ya tiene cuenta",
      convertidoNota:
        "A esta persona ya se le creó su cuenta en el portal. Su historial quedó ligado a ella.",
      comoSeCrea:
        "La cuenta la crea un administrador desde Usuarios, y ahí se enlaza este historial.",
    },
    // ── Ficha 360 del cliente (tracking de un inversionista de su cartera) ──
    // Espeja los KPIs de `cliente.cartera` sin compartirlos: mismo número, otra
    // audiencia (staff mirando a un tercero, no el dueño del dinero). Ver la nota
    // en cliente.cartera antes de "deduplicarlos".
    ficha: {
      volver: "← Mis clientes",
      desde: (fecha: string) => `Cliente desde ${fecha}`,
      contactoTitulo: "Contacto",
      telefonoLabel: "Teléfono",
      sinTelefono: "Sin teléfono registrado",
      kpiComprometido: "Comprometido",
      kpiComprometidoSub: "En reservas activas y confirmadas",
      kpiGanancia: "Ganancia esperada",
      kpiGananciaSub: "Estimada al plazo de cada operación",
      kpiOperaciones: "Operaciones",
      reservasTitulo: "Reservas de este cliente",
      sinReservas: "Este cliente todavía no reservó ninguna oportunidad.",
      colMonto: "Monto",
      colGanancia: "Ganancia est.",
      notaEstimado: "Las ganancias son estimaciones al plazo; no son un compromiso de pago.",
    },
    // ── Libreta del asesor: notas internas + próxima acción sobre un cliente ──
    notas: {
      titulo: "Mis notas de este cliente",
      sub: "Anota qué hablaron y cuándo volver a buscarlo. Es interno: el inversionista no lo ve.",
      privacidad: "Solo lo ve el equipo del portal.",
      nueva: "Agregar nota",
      textoLabel: "Nota",
      textoPlaceholder: "Qué se conversó, en qué quedaron, qué pidió.",
      recordarLabel: "Próxima acción (opcional)",
      recordarHint:
        "La fecha en que quieres volver a este cliente. Te aparecerá en tus pendientes.",
      guardar: "Guardar nota",
      guardando: "Guardando…",
      cancelar: "Cancelar",
      vacio: "Todavía no anotaste nada de este cliente.",
      faltaTexto: "Escribe la nota antes de guardar.",
      creada: "Nota guardada.",
      error: "No pudimos guardar la nota. Intenta de nuevo.",
      proximaAccion: (fecha: string) => `Próxima acción: ${fecha}`,
      vencida: "Toca ahora",
      hechaBadge: "Cerrada",
      marcarHecha: "Marcar como hecha",
      reabrir: "Reabrir",
      borrar: "Borrar nota",
      borrarTitulo: "Borrar esta nota",
      borrarTexto: "La nota se elimina de tu libreta y no se puede recuperar.",
      borrarConfirmar: "Borrar",
      borrada: "Nota borrada.",
      soloAutor: "Solo quien escribió la nota puede cerrarla o borrarla.",
    },
    reservas: {
      titulo: "Reservas",
      sub: "Oportunidades apartadas por tus clientes. Confírmalas al cerrar o libéralas si no avanzan.",
      vacio: "No hay reservas pendientes ahora mismo.",
      soloMias: "Solo mis clientes",
      colOportunidad: "Oportunidad",
      colCliente: "Cliente",
      colVence: "Vence en",
      colEstado: "Estado",
      colAcciones: "Acciones",
      confirmar: "Confirmar",
      liberar: "Liberar",
      confirmarOk: "Reserva confirmada.",
      liberarOk: "Reserva liberada. La oportunidad vuelve al pool.",
      noReservada: "Esa reserva ya no está activa.",
      sinAcceso: "No tienes permiso para esta acción.",
      error: "No pudimos completar la acción.",
      nota: "Confirma solo cuando el proceso esté cerrado; mientras tanto, acompaña al cliente.",
      // ── Cierre del ciclo: marcar FINANCIADA (paso extra tras confirmar) ──
      tabPendientes: "Pendientes",
      tabConfirmadas: "Confirmadas",
      vacioConfirmadas: "No hay operaciones confirmadas pendientes de financiar.",
      marcarFinanciada: "Marcar financiada",
      financiadaBadge: "Financiada",
      confirmadaBadge: "Confirmada",
      financiadaOk: "Operación marcada como financiada.",
      financiadaNoAplica: "Esta operación ya no se puede marcar como financiada.",
      notaFinanciada:
        "Marca “financiada” cuando el inversionista ya transfirió al prestatario. El inversionista lo verá en su proceso.",
    },
  },
  admin: {
    tablero: {
      titulo: "Tablero",
      sub: "Resumen del portal de un vistazo.",
      seccionOportunidades: "Oportunidades",
      seccionMonto: "Monto por estado",
      seccionEquipo: "Equipo y clientes",
      kpiTotal: "Total",
      kpiDisponibles: "Disponibles",
      kpiReservadas: "Reservadas",
      kpiCerradas: "Cerradas",
      kpiBorradores: "Borradores",
      kpiMontoDisponible: "En oportunidades disponibles",
      kpiMontoReservado: "En oportunidades reservadas",
      kpiMontoCerrado: "En oportunidades cerradas",
      kpiComisionEstimada: "Comisión estimada",
      kpiComisionEstimadaSub:
        "Estimada sobre reservadas + cerradas. Intel interna, no la ve el inversionista.",
      kpiInversionistas: "Inversionistas",
      kpiAsesores: "Asesores",
      kpiContratistas: "Contratistas",
      nota: "Publica oportunidades claras y con buenas garantías: es lo que da confianza al inversionista.",
      // ── Negocio: lo que YA ocurrió (desembolsado) vs. lo que está en curso ──
      seccionNegocio: "El negocio",
      seccionNegocioSub:
        "Lo que ya se desembolsó, no lo que podría pasar. Las reservas todavía se pueden caer.",
      kpiCapitalColocado: "Capital colocado",
      kpiCapitalColocadoSub: "Operaciones ya desembolsadas al prestatario",
      kpiComisionFinanciada: "Comisión ganada",
      kpiComisionFinanciadaSub: "Sobre operaciones ya desembolsadas. Intel interna.",
      kpiFinanciadas: "Operaciones financiadas",
      kpiTicket: "Ticket promedio",
      kpiTicketSub: "Promedio de las operaciones financiadas",
      kpiConversion: "Reservas que llegan a financiarse",
      kpiConversionSub: "De cada reserva registrada, cuántas terminaron en desembolso",
      kpiReservasExpiradas: "Reservas expiradas",
      kpiReservasExpiradasSub: "El hold de 24 h venció sin cerrar",
      /** Cuando no hay muestra todavía: se dice, no se muestra un 0 que parece resultado. */
      sinDatoAun: "—",
      sinDatoAunSub: "Todavía no hay operaciones financiadas para medirlo.",
      sinReservasAunSub: "Todavía no hay reservas registradas para medirlo.",
    },
    // ── Cola de trabajo del admin: lo que solo resuelve él, arriba del tablero ──
    pendientes: {
      titulo: "Lo que te toca resolver",
      todoAlDia:
        "Todo al día. No hay solicitudes sin responder, catálogo incompleto ni clientes sin asesor.",
      ver: "Revisar",
      // Solicitudes de financiamiento en evaluación
      solicitudesTitulo: "Solicitudes sin responder",
      solicitudesSub: "Empresas esperando una decisión. Solo un administrador puede darla.",
      solicitudesConteo: (n: number) =>
        n === 1 ? "1 solicitud en evaluación" : `${n} solicitudes en evaluación`,
      // Salud del catálogo
      catalogoTitulo: "Publicadas con datos faltantes",
      catalogoSub:
        "El inversionista ya las está viendo así. Sin comisión no hay ingreso; sin garantía la ficha promete algo que no muestra.",
      catalogoVacio: "Todas las operaciones publicadas están completas.",
      completar: "Completar",
      /** Etiqueta de cada dato que falta. Se pintan como chips en la fila. */
      falta: {
        comision: "Sin comisión",
        tasa: "Sin ganancia mensual",
        monto: "Sin monto",
        plazo: "Sin plazo",
        prestatario: "Sin empresa",
        garantia: "Sin garantía",
        riesgo: "Sin nivel de riesgo",
        documentos: "Sin documentos",
        fotos: "Sin fotos",
      },
      // Reservas activas de todo el portal
      reservasTitulo: "Reservas activas del portal",
      reservasSub: "El hold dura 24 h. Al vencer, la oportunidad vuelve al pool.",
      reservasVacio: "No hay reservas activas ahora mismo.",
      reservasSinAsesor: (n: number) =>
        n === 1 ? "1 sin asesor asignado" : `${n} sin asesor asignado`,
      // Borradores estáncados
      borradoresTitulo: "Borradores olvidados",
      borradoresSub: "Trabajo empezado que no se publicó ni se descartó.",
      borradoresVacio: "No hay borradores estáncados.",
      diasQuieto: (n: number) => (n === 1 ? "1 día quieto" : `${n} días quietos`),
      // Clientes sin asesor
      clientesTitulo: "Inversionistas sin asesor",
      clientesSub: "Nadie los está acompañando. Asígnales uno desde Usuarios.",
      clientesVacio: "Todos los inversionistas tienen asesor.",
      asignar: "Asignar asesor",
      desde: (fecha: string) => `Desde ${fecha}`,
    },
    // ── Cómo rinde cada asesor, para repartir la carga del equipo ──
    asesores: {
      titulo: "Cartera por asesor",
      sub: "Quién está cargado y quién tiene capacidad. Los montos son estimados, intel interna.",
      vacio: "Todavía no hay asesores en el portal.",
      colAsesor: "Asesor",
      colClientes: "Clientes",
      colProspectos: "Sin cuenta",
      colProspectosAyuda:
        "Titulares que el asesor registró y que todavía no tienen cuenta en el portal.",
      colSinActividad: "Sin actividad",
      colReservas: "Reservas activas",
      colComprometido: "Comprometido",
      colFinanciadas: "Financiadas",
      /** Se marca al asesor con más carga del equipo para que salte a la vista. */
      masCargado: "Más cargado",
      sinActividadAyuda: "Clientes suyos que todavía no reservaron nada.",
      multiMoneda: "+ otras monedas",
      nota: "Los montos comprometidos no suman monedas distintas: cada asesor va en la moneda que domina su cartera.",
    },
    // ── Solicitudes de financiamiento (el empresario crea; el staff evalúa) ──
    solicitudes: {
      titulo: "Solicitudes",
      sub: "Solicitudes de financiamiento que dejaron las empresas. Revísalas y decide.",
      vacio: "No hay solicitudes por ahora.",
      vacioFiltro: "No hay solicitudes en este estado.",
      tabs: {
        todas: "Todas",
        en_evaluacion: "En evaluación",
        aprobada: "Aprobadas",
        rechazada: "Rechazadas",
        convertida: "Publicadas",
        retirada: "Retiradas",
      },
      estado: {
        en_evaluacion: "En evaluación",
        aprobada: "Aprobada",
        rechazada: "Rechazada",
        convertida: "Publicada",
        retirada: "Retirada",
      },
      // Aviso al staff cuando la empresa se echó atrás: no hay nada que resolver.
      retiradaNota: "La empresa retiró esta solicitud. Ya no hay nada que resolver.",
      empresaLabel: "Empresa",
      montoLabel: "Monto solicitado",
      plazoLabel: "Plazo",
      fechaLabel: "Enviada",
      descripcionLabel: "Descripción",
      sinDescripcion: "Sin descripción.",
      docsLabel: "Documentos de respaldo",
      sinDocs: "La empresa no adjuntó documentos.",
      verDetalle: "Ver detalle",
      detalleTitulo: "Detalle de la solicitud",
      motivoLabel: "Motivo del rechazo",
      aprobar: "Aprobar",
      aprobando: "Aprobando…",
      rechazar: "Rechazar",
      rechazando: "Rechazando…",
      crearOportunidad: "Crear oportunidad desde esta solicitud",
      convirtiendo: "Creando…",
      aprobadaOk: "Solicitud aprobada.",
      rechazadaOk: "Solicitud rechazada.",
      convertidaOk: "Operación creada. Complétala con tasa, comisión y garantías.",
      error: "No pudimos completar la acción. Intenta de nuevo.",
      rechazoTitulo: "Rechazar solicitud",
      rechazoMotivo: "Motivo (lo verá la empresa)",
      rechazoMotivoHint: "Explica brevemente por qué. Sé claro y respetuoso.",
      rechazoConfirmar: "Rechazar solicitud",
      rechazoFaltaMotivo: "Escribe un motivo (mínimo 3 caracteres).",
      // Título por defecto de la oportunidad creada desde una solicitud (dato, editable).
      tituloAuto: (empresa: string) => `Financiamiento — ${empresa}`,
    },
    prestatarios: {
      titulo: "Contratistas",
      sub: "Registro de contratistas con su scoring de pagador e historial de operaciones.",
      crear: "Nuevo contratista",
      crearTitulo: "Nuevo contratista",
      editarTitulo: "Editar contratista",
      nombre: "Nombre / Razón social",
      ruc: "RUC",
      rucHint: "11 dígitos (opcional).",
      // El label del riesgo es PROPIO de la empresa (qué tan buen pagador es), no el
      // de la operación: por eso no sale del bloque compartido de abajo.
      nivelRiesgo: "Riesgo como pagador",
      scoringPago: "Scoring de pago (0–100)",
      scoringHint: "Qué tan buen pagador es, según tu evaluación.",
      ...CAMPOS_CLASIFICACION_STAFF,
      estado: "Estado",
      colNombre: "Contratista",
      colRuc: "RUC",
      colRiesgo: "Riesgo pagador",
      colScoring: "Scoring",
      colOperaciones: "Operaciones",
      colEstado: "Estado",
      colAcciones: "Acciones",
      editar: "Editar",
      guardar: "Guardar",
      guardando: "Guardando…",
      creado: "Contratista creado.",
      actualizado: "Cambios guardados.",
      errorGuardar: "No pudimos guardar el contratista.",
      faltaNombre: "Ponle un nombre.",
      rucInvalido: "El RUC debe tener 11 dígitos.",
      vacio: "Todavía no registraste ningún contratista.",
      operaciones: (n: number) => (n === 1 ? "1 operación" : `${n} operaciones`),
      sinScoring: "—",
      // ── Cuenta de acceso del empresario (login al panel de solo-ver) ──
      colAcceso: "Acceso",
      conAcceso: "Con acceso",
      sinCuenta: "Sin cuenta",
      cuentaSeccion: "Cuenta de acceso",
      cuentaSub:
        "Dale al contratista su propio acceso para ver sus operaciones (sin el lado inversionista ni datos internos).",
      cuentaToggle: "Crear cuenta de acceso",
      cuentaEmail: "Correo de acceso",
      cuentaTelefono: "Teléfono (WhatsApp)",
      cuentaTelefonoHint: "Opcional. 9 dígitos o formato +51.",
      cuentaYaTiene: "Este contratista ya tiene una cuenta de acceso.",
      cuentaFaltaEmail: "Ingresa el correo de acceso.",
      cuentaEmailInvalido: "El correo de acceso no es válido.",
      cuentaCreada: "Cuenta creada. Le enviamos un correo para que ponga su contraseña.",
      cuentaCreadaSinCorreo: "Cuenta creada, pero no pudimos enviar el correo de acceso.",
      cuentaVinculada: "Cuenta vinculada. Ese correo ya tenía acceso a Don Gato.",
      cuentaError: "No pudimos crear la cuenta de acceso.",
      cuentaYaExiste: "Ese correo ya es miembro de este portal.",
    },
    usuarios: {
      titulo: "Usuarios del portal",
      sub: "Da de alta inversionistas, asesores y administradores.",
      crear: "Nuevo usuario",
      crearTitulo: "Crear usuario",
      nombre: "Nombre completo",
      correo: "Correo",
      telefono: "Teléfono",
      rol: "Rol",
      asesorAsignado: "Asesor asignado",
      sinAsesor: "Sin asesor",
      // ── Conversión: la cuenta es de alguien que un asesor ya trabajaba ──
      prospectoLabel: "¿Ya lo trabajaba un asesor?",
      prospectoHint:
        "Si eliges a alguien de la lista, sus operaciones y las notas de su asesor quedan ligadas a esta cuenta.",
      prospectoNinguno: "No, es alguien nuevo",
      prospectoNoLigado:
        "La cuenta se creó, pero no pudimos ligar su historial. Revisa la lista de personas sin cuenta.",
      crearCta: "Crear y enviar acceso",
      creando: "Creando…",
      creado: "Usuario creado. Le enviamos un correo para que ponga su contraseña.",
      creadoSinCorreo: "Usuario creado, pero no pudimos enviar el correo de acceso.",
      errorCrear: "No pudimos crear el usuario.",
      correoInvalido: "Correo inválido.",
      nombreCorto: "El nombre es muy corto.",
      yaExiste: "Ese correo ya es miembro de este portal.",
      colNombre: "Nombre",
      colRol: "Rol",
      colAsesor: "Asesor",
      colEstado: "Estado",
      colAcciones: "Acciones",
      activar: "Activar",
      desactivar: "Desactivar",
      reasignar: "Reasignar asesor",
      reasignarTitulo: "Reasignar asesor",
      guardar: "Guardar",
      guardando: "Guardando…",
      vacio: "Todavía no hay usuarios en este portal.",
      tuMismo: "Tú",
      errorAccion: "No se pudo aplicar el cambio.",
    },
    /**
     * BITÁCORA del portal (portal_eventos_auditoria, 0089). Solo la ve el
     * administrador de ESE portal: tiene la dirección de internet y el dispositivo de
     * personas reales.
     *
     * Regla de redacción de esta sección: NADA de jerga. Un administrador no tiene por
     * qué saber qué es un "hash-chain", una "IP" ni un "user-agent" — acá se llaman
     * sello, dirección de internet y dispositivo, y se explica la idea con la imagen de
     * una cadena de eslabones. Y la comprobación dice EXACTAMENTE qué alcanzó a
     * revisar: un "verificado" que no verificó nada es peor que no tener el botón.
     */
    auditoria: {
      titulo: "Bitácora",
      sub: "Quién hizo qué en este portal, y cuándo. El registro no se puede editar ni borrar: solo se agregan renglones.",
      // ── Comprobación de integridad ──
      integridadTitulo: "Revisión del registro",
      integridadOk: (n: number) =>
        n === 1 ? "Revisamos 1 enlace y calza." : `Revisamos ${n} enlaces y todos calzan.`,
      integridadRota: (n: number) =>
        n === 1
          ? "1 renglón no calza con el anterior."
          : `${n} renglones no calzan con el anterior.`,
      integridadNoVerificable: "No pudimos revisar el registro en este momento.",
      /** Sin ningún movimiento todavía: decirlo, en vez de "0 enlaces revisados". */
      integridadVacia: "El registro todavía no tiene movimientos.",
      integridadCompleta: "Se revisó el registro completo, desde el primer renglón.",
      integridadParcial: (revisados: number, total: number) =>
        `Se revisaron los ${revisados} renglones más recientes de ${total}.`,
      /** La imagen de la cadena, en criollo. Es lo único "técnico" que se explica. */
      integridadComoFunciona:
        "Cada renglón lleva un sello que incluye el sello del renglón anterior, como los eslabones de una cadena. Si alguien borrara, cambiara de orden o metiera un renglón en el medio, los eslabones dejarían de calzar y se vería acá.",
      /** Honestidad sobre el alcance: esta revisión NO recalcula el contenido. */
      integridadAlcance:
        "Esta revisión compara los eslabones entre sí. No vuelve a calcular el sello de cada renglón desde su contenido: eso se hace dentro de la base de datos y todavía no está disponible para este portal.",
      integridadRotaQueHacer:
        "Avisa al equipo técnico y no borres nada: el renglón que no calza es la evidencia.",
      revisar: "Revisar de nuevo",
      revisando: "Revisando…",
      // ── Filtros ──
      filtroAccion: "Toda acción",
      filtroAccionLabel: "Filtrar por acción",
      filtroEntidad: "Todo recurso",
      filtroEntidadLabel: "Filtrar por recurso",
      periodoLabel: "Periodo",
      periodo: {
        todo: "Desde el inicio",
        hoy: "Hoy",
        d7: "Últimos 7 días",
        d30: "Últimos 30 días",
        d90: "Últimos 90 días",
      },
      mostrando: (n: number, total: number) => `Mostrando ${n} de ${total} renglones`,
      cargando: "Cargando…",
      cargarMas: "Ver más",
      vacio: "No hay movimientos con estos filtros.",
      // ── Tabla ──
      colCuando: "Cuándo",
      colQuien: "Quién",
      colQue: "Qué hizo",
      colRecurso: "Sobre qué",
      verDetalle: "Ver detalle",
      /** El actor ya no está en el portal (cuenta borrada). El evento se conserva. */
      actorBorrado: "Cuenta eliminada",
      actorSistema: "Sistema",
      // ── Detalle ──
      detalle: {
        titulo: "Detalle del movimiento",
        cuando: "Cuándo",
        quien: "Quién",
        rol: "Rol",
        que: "Qué hizo",
        recurso: "Sobre qué",
        recursoId: "Identificador del recurso",
        origenTitulo: "Desde dónde",
        origenNota: "Dato personal de quien hizo el movimiento. No sale de esta pantalla.",
        ip: "Dirección de internet",
        dispositivo: "Dispositivo y navegador",
        datosTitulo: "Qué quedó registrado",
        selloTitulo: "Sello del renglón",
        posicion: "Posición en el registro",
        sello: "Sello de este renglón",
        selloAnterior: "Sello del renglón anterior",
        sinDato: "—",
        cerrar: "Cerrar",
      },
    },
    oportunidades: {
      titulo: "Oportunidades",
      sub: "Publica y gestiona lo que ven los inversionistas.",
      nueva: "Nueva oportunidad",
      vacio: "Todavía no publicaste ninguna oportunidad.",
      editar: "Editar",
      verDetalle: "Ver",
      filtroTodos: "Todas",
      /** Filtro transversal: publicadas a las que les falta un dato clave. */
      filtroIncompletas: "Incompletas",
      avisoIncompleta: "Publicada con datos faltantes",
      creada: "Oportunidad creada.",
      actualizada: "Cambios guardados.",
      errorGuardar: "No pudimos guardar la oportunidad.",
      form: {
        nuevaTitulo: "Nueva oportunidad",
        editarTitulo: "Editar oportunidad",
        seccionGeneral: "Datos generales",
        seccionFinanciero: "Condiciones financieras",
        seccionVertical: "Datos específicos",
        seccionGarantias: "Garantías",
        seccionRiesgo: "Scoring de riesgo",
        seccionFotos: "Fotos",
        titulo: "Título",
        descripcion: "Descripción",
        direccion: "Dirección",
        distrito: "Distrito",
        ciudad: "Ciudad",
        moneda: "Moneda",
        montoSolicitado: "Monto solicitado",
        plazoMin: "Plazo mínimo (meses)",
        plazoMax: "Plazo máximo (meses)",
        tasaMensual: "Ganancia mensual (%)",
        tasaMensualHint:
          "Solo la mensual. La TNA (×12) y la TEA (efectiva anual) se calculan solas.",
        tasasPreview: "Equivale a TNA {tna} y TEA {tea}.",
        comision: "Comisión de intermediación (%)",
        // Asimetría DELIBERADA de visibilidad: la empresa ve monto y % porque es su
        // costo; el inversionista no, porque no sale de su retorno.
        comisionHint:
          "La paga la empresa: se descuenta de lo que recibe al desembolso. La empresa la ve en su panel; el inversionista no.",
        seccionPrestatario: "Contratista",
        prestatario: "Contratista de esta operación",
        prestatarioSin: "Sin asignar",
        prestatarioNuevo: "+ Nuevo contratista",
        prestatarioCrearTitulo: "Nuevo contratista",
        prestatarioCreado: "Contratista creado.",
        prestatarioErrorCrear: "No pudimos crear el contratista.",
        // El label del riesgo es PROPIO de la operación (qué tan riesgosa es esta),
        // no el de la empresa: por eso no sale del bloque compartido.
        nivelRiesgo: "Nivel de riesgo",
        ...CAMPOS_CLASIFICACION_STAFF,
        estadoPublicacion: "Estado de publicación",
        agregarGarantia: "Agregar garantía",
        garantiaTipo: "Tipo",
        garantiaTipoOtro: "Otro (escribir)",
        garantiaTitulo: "Título",
        garantiaDescripcion: "Descripción",
        garantiaValor: "Valor estimado",
        quitarGarantia: "Quitar",
        sinGarantias: "Sin garantías. Agrega al menos una para dar respaldo.",
        subirFoto: "Subir foto",
        subiendo: "Subiendo…",
        arrastraFoto: "Arrastra una foto o haz clic",
        fotoHint: "JPG o PNG · máx 2 MB",
        quitarFoto: "Quitar",
        // ── Documentos de respaldo (data room) ──
        seccionDocs: "Documentos de respaldo",
        seccionDocsSub:
          "Contrato, tasación, título, carta fianza… El inversionista los ve y descarga.",
        docTipo: "Tipo de documento",
        docArchivo: "Archivo",
        subirDoc: "Subir documento",
        subiendoDoc: "Subiendo…",
        docHint: "PDF hasta 10 MB, o imagen (se optimiza a máx 2 MB).",
        docGuardarPrimero: "Guarda la oportunidad para poder cargar documentos.",
        quitarDoc: "Quitar",
        sinDocs: "Aún no cargaste documentos.",
        docError: "No pudimos subir el documento.",
        docTipoFalta: "Elige el tipo de documento.",
        guardar: "Guardar oportunidad",
        guardando: "Guardando…",
        cancelar: "Cancelar",
        faltaTitulo: "Ponle un título.",
        faltaCampoVertical: "Completa los campos obligatorios de la ficha.",
        /** Se intentó volver a publicar una operación que ya tiene contraparte.
         *  Una operación es de UN inversionista: republicar sin cerrar la reserva
         *  dejaría a dos personas sobre el mismo acuerdo. */
        reservaViva:
          "Esta operación ya tiene una reserva vigente. Ciérrala o cancélala antes de volver a publicarla: una operación es de un solo inversionista.",
      },
    },
  },
} as const;

/**
 * Landing pública — la ÚNICA superficie del portal visible sin sesión.
 *
 * 🔴 LÍNEA ROJA (docs-internal/ENCUADRE_LEGAL.md): "registro abierto de
 * inversionistas o landing pública ofreciendo rentabilidades" es OFERTA PÚBLICA
 * y cambia el régimen regulatorio (SMV). Por eso esta landing:
 *   · NO publica tasas, rentabilidades, plazos ni oportunidades
 *   · NO tiene registro: el acceso es por invitación y el CTA va al login
 *   · NO promete recuperación ni retorno
 * Es institucional: explica el modelo y quién opera. Nada más.
 */
const landing = {
  meta: {
    titulo: "Financiamiento para contratistas del Estado",
    descripcion:
      "Plataforma privada que documenta operaciones de financiamiento entre contratistas del Estado e inversionistas. Acceso por invitación.",
  },
  nav: { acceder: "Ingresar" },
  hero: {
    eyebrow: "Plataforma privada · por invitación",
    titulo: "Financiamiento para contratistas del Estado, documentado de punta a punta",
    sub: "Un contratista con una valorización aprobada necesita capital antes del pago. Un inversionista lo financia. Nosotros organizamos el expediente y registramos el acuerdo.",
    cta: "Ingresar al portal",
    nota: "El acceso es por invitación. Si todavía no tienes cuenta, escríbenos.",
  },
  modelo: {
    titulo: "Cómo funciona",
    sub: "Tres partes, un contrato entre ellas, y una plataforma que lo registra.",
    pasos: [
      {
        n: "01",
        titulo: "El contratista presenta su operación",
        texto:
          "Tiene una valorización aprobada por la entidad del Estado y necesita el capital antes de que le paguen. Su asesor arma el expediente con la documentación que la respalda.",
      },
      {
        n: "02",
        titulo: "El inversionista evalúa y decide",
        texto:
          "Revisa el expediente completo, las garantías y la metodología de riesgo. Si decide participar, el acuerdo se cierra directamente entre las partes.",
      },
      {
        n: "03",
        titulo: "La plataforma documenta y da seguimiento",
        texto:
          "Registramos el acuerdo y emitimos la constancia. Cada movimiento queda en una bitácora encadenada, para que quede rastro de quién hizo qué y cuándo.",
      },
    ],
  },
  encuadre: {
    titulo: "Qué somos y qué no",
    sub: "La transparencia sobre el rol de cada quien es parte del producto.",
    si: {
      titulo: "Lo que sí hacemos",
      items: [
        "Organizamos el expediente y registramos el acuerdo entre las partes.",
        "Publicamos la documentación que respalda cada operación, para que la revises antes de decidir.",
        "Dejamos rastro de cada movimiento en una bitácora encadenada.",
        "Explicamos la metodología con la que se evalúa cada operación.",
      ],
    },
    no: {
      titulo: "Lo que no hacemos",
      items: [
        "No recibimos, custodiamos ni transferimos dinero. El acuerdo es entre las partes.",
        "No ofrecemos inversiones al público ni captamos fondos.",
        "No garantizamos el repago ni prometemos rendimiento alguno.",
        "No damos asesoría de inversión: la decisión es del inversionista.",
      ],
    },
  },
  riesgo: {
    titulo: "Sobre el riesgo",
    texto:
      "Toda operación de financiamiento tiene riesgo de impago. Puedes perder parte o la totalidad del capital. Ninguna operación de este portal tiene la recuperación garantizada, y el resultado de una gestión de cobranza depende de terceros, incluidas instancias judiciales.",
  },
  contacto: {
    titulo: "¿Te invitaron, o quieres conocer el modelo?",
    texto: "Escríbenos y te explicamos cómo funciona antes de que decidas nada.",
    cta: "Escribir por WhatsApp",
  },
  pie: {
    operadoPor: "Operado por",
    verificar: "Verifica nuestro RUC en SUNAT",
    derechos: "Todos los derechos reservados.",
    links: {
      terminos: "Términos",
      privacidad: "Privacidad",
      cookies: "Cookies",
      libro: "Libro de Reclamaciones",
    },
    aviso:
      "Este portal no es una entidad del sistema financiero ni del mercado de valores: no capta depósitos del público, no otorga créditos por cuenta propia y no administra fondos de terceros. No está supervisado por la SBS ni por la SMV. Los montos de una operación no constituyen depósitos ni están cubiertos por ningún fondo de garantía estatal.",
  },
} as const;

/**
 * ⚠️ BORRADOR LEGAL — igual que los términos, este texto DEBE revisarlo el
 * abogado de la Fase 0. Describe en español llano lo que el producto hace hoy
 * según el código, y cita las normas que aplican. No inventa cláusulas ni
 * plazos que no estén en la norma, y no afirma autorización ni supervisión de
 * ninguna entidad.
 */
const legal = {
  privacidad: {
    titulo: "Política de Privacidad",
    intro:
      "Esta política explica qué datos personales tratamos, para qué, y qué derechos tienes sobre ellos. Se rige por la Ley N.º 29733, Ley de Protección de Datos Personales, y su reglamento.",
    secciones: [
      {
        h: "Quién trata tus datos",
        p: "El responsable del tratamiento es Don Gato Servicios SAC, que opera este portal. Puedes verificar nuestra inscripción en la consulta pública de RUC de SUNAT.",
      },
      {
        h: "Qué datos tratamos",
        p: "Datos de identificación y contacto (nombre, documento, correo, teléfono), los datos de las operaciones en las que participas, y la documentación que tú o tu asesor cargan al expediente. También registramos la actividad dentro del portal en una bitácora de auditoría.",
      },
      {
        h: "Para qué los usamos",
        p: "Para darte acceso al portal, documentar y dar seguimiento a las operaciones, verificar la identidad de las partes, cumplir obligaciones legales y tributarias, y comunicarnos contigo sobre tus operaciones.",
      },
      {
        h: "Con quién los compartimos",
        p: "Con las contrapartes de una operación en la que participas, con proveedores que nos prestan servicios de infraestructura y correo bajo obligación de confidencialidad, y con las autoridades competentes cuando la ley lo exige. No vendemos datos personales ni los cedemos con fines publicitarios.",
      },
      {
        h: "Consentimiento",
        p: "El tratamiento se basa en tu consentimiento libre, previo, informado y expreso, y en el cumplimiento de obligaciones legales. Puedes revocar tu consentimiento en cualquier momento, sin efecto retroactivo y sin perjuicio de la conservación que la ley nos exige.",
      },
      {
        h: "Tus derechos",
        p: "Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiéndonos por los canales de contacto del portal. Te responderemos en los plazos que fija la Ley N.º 29733 y su reglamento.",
      },
      {
        h: "Cuánto conservamos tus datos",
        p: "Conservamos la documentación de las operaciones y la evidencia asociada por el plazo que exigen las normas tributarias y de prevención de lavado de activos. Por eso, cerrar tu cuenta no elimina el historial de operaciones ya registradas.",
      },
      {
        h: "Seguridad",
        p: "Aplicamos control de acceso por rol, cifrado en tránsito, y una bitácora de auditoría con sello encadenado que permite detectar alteraciones. Ningún sistema es infalible: si detectamos un incidente que afecte tus datos, te lo comunicaremos.",
      },
      {
        h: "Cambios",
        p: "Si cambiamos esta política, publicaremos la versión actualizada en esta misma página.",
      },
    ],
  },
  cookies: {
    titulo: "Política de Cookies",
    intro:
      "Este portal usa la cantidad mínima de cookies necesaria para funcionar. No usamos cookies publicitarias ni de seguimiento de terceros.",
    secciones: [
      {
        h: "Cookies necesarias",
        p: "Guardan tu sesión iniciada y protegen los formularios. Sin ellas el portal no puede saber que eres tú, así que no se pueden desactivar. Se eliminan al cerrar sesión o al vencer.",
      },
      {
        h: "Qué NO usamos",
        p: "No usamos cookies de publicidad, ni de redes sociales, ni píxeles de terceros para seguirte fuera de este portal.",
      },
      {
        h: "Cómo controlarlas",
        p: "Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las necesarias, no vas a poder iniciar sesión.",
      },
    ],
  },
  libro: {
    titulo: "Libro de Reclamaciones",
    intro:
      "Conforme al Código de Protección y Defensa del Consumidor, Ley N.º 29571, ponemos a tu disposición nuestro Libro de Reclamaciones.",
    secciones: [
      {
        h: "Qué puedes registrar",
        p: "Un reclamo, cuando no estás conforme con el servicio recibido. O una queja, cuando quieres expresar tu malestar por la atención, sin que haya de por medio un problema con el servicio.",
      },
      {
        h: "Cómo registrarlo",
        p: "Escríbenos por los canales de contacto del portal indicando tu nombre completo, documento de identidad, teléfono, correo, el detalle de lo ocurrido y lo que pides. Vamos a registrarlo y te confirmaremos la recepción con el número que le corresponde.",
      },
      {
        h: "Plazo de respuesta",
        p: "Responderemos dentro del plazo que fija la normativa de protección al consumidor, contado desde que registramos tu reclamo. Si necesitamos más tiempo por la complejidad del caso, te lo comunicaremos.",
      },
      {
        h: "Si no quedas conforme",
        p: "Puedes acudir a INDECOPI presentando tu caso en cualquiera de sus oficinas o por su plataforma virtual. Registrar un reclamo acá no limita tu derecho a hacerlo.",
      },
    ],
    nota: "El registro por formulario en línea, con número de reclamo automático, está pendiente de implementación.",
  },
} as const;

export const COPY = {
  landing,
  legal,
  pages,
  app,
  correos,
  portales,
} as const;

export type Copy = typeof COPY;
