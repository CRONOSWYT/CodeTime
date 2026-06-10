document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabase.createClient(
    "https://ttmrvogucsmujegurmvi.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bXJ2b2d1Y3NtdWplZ3VybXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDE2OTIsImV4cCI6MjA5Mjk3NzY5Mn0.8NrHzYYIXrTYOpdLJafAemXnZ8bJ1DhVwSU7hQx_3pQ",
  );

  // =============================================
  // VARIABLES Y CONSTANTES
  // =============================================
  const ROLES = {
    USER: 1,
    ADMIN: 2,
    OWNER: 3,
  };

  let user = null;
  let currentProfile = null;
  let allCards = [];
  let allLanguages = [];
  let allUsers = [];
  let allRoles = [];
  let allReports = [];
  let allAuditLogs = [];
  let auditLogUserNames = new Map();
  let usersMap = new Map();
  let usersRoleMap = new Map();
  let languageMap = new Map();
  let rolesMap = new Map();
  let currentAdminItem = null;
  let currentAdminType = null;

  // =============================================
  // FUNCIONES DE AUDITORÍA
  // =============================================
  async function logAudit(
    actionType,
    entityType,
    entityId,
    description,
    oldValues = null,
    newValues = null,
  ) {
    if (!user) return;

    const { error } = await supabase.from("audit_logs").insert([
      {
        user_id: user.id,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId?.toString() || null,
        description,
        old_values: oldValues,
        new_values: newValues,
      },
    ]);

    if (error) console.warn("Error registrando auditoría:", error.message);
  }

  // =============================================
  // FUNCIONES DE PERMISOS
  // =============================================
  function isOwner() {
    return currentProfile && currentProfile.role_id === ROLES.OWNER;
  }

  // =============================================
  // UTILIDADES: escapar HTML fuera de bloques de código
  // =============================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeOutsideCodeBlocks(text) {
    if (!text) return "";
    // Split by fenced code blocks (```...```) and keep delimiters
    const parts = text.split(/(```[\s\S]*?```)/g);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("```")) {
        // fenced code block: leave as-is
        continue;
      }
      // handle inline code spans `...`
      const subparts = part.split(/(`[^`]*`)/g);
      for (let j = 0; j < subparts.length; j++) {
        const sp = subparts[j];
        if (sp.startsWith("`") && sp.endsWith("`")) {
          // inline code: keep as-is
          continue;
        }
        // escape the rest
        subparts[j] = escapeHtml(sp);
      }
      parts[i] = subparts.join("");
    }
    return parts.join("");
  }

  function isAdmin() {
    return currentProfile && currentProfile.role_id === ROLES.ADMIN;
  }

  function canManageReports() {
    return isOwner();
  }

  function canAssignOwnerRole() {
    return isOwner();
  }

  function canDeleteReports() {
    return isOwner();
  }

  function displayRole(roleId) {
    if (roleId === ROLES.OWNER && !isOwner()) {
      return "Administrador";
    }
    if (roleId === ROLES.OWNER) {
      return "Propietario";
    }
    return rolesMap.get(roleId) || "Usuario";
  }

  function displayUserName(userId) {
    const roleId = usersRoleMap.get(userId);
    if (roleId === ROLES.OWNER && !isOwner()) {
      return "Usuario";
    }
    return usersMap.get(userId) || userId || "Desconocido";
  }

  // =============================================
  // ELEMENTOS DEL DOM
  // =============================================
  const logoutBtn = document.getElementById("boton_cerrar_sesion");
  const tabCards = document.getElementById("pestania_tarjetas");
  const tabLanguages = document.getElementById("pestania_lenguajes");
  const tabUsers = document.getElementById("pestania_usuarios");
  const tabReports = document.getElementById("pestania_reportes");
  const tabLogs = document.getElementById("pestania_logs");
  const cardsTab = document.getElementById("contenido_pestania_tarjetas");
  const languagesTab = document.getElementById("contenido_pestania_lenguajes");
  const usersTab = document.getElementById("contenido_pestania_usuarios");
  const reportsTab = document.getElementById("contenido_pestania_reportes");
  const logsTab = document.getElementById("contenido_pestania_logs");

  const searchCards = document.getElementById("busqueda_tarjetas_admin");
  const clearSearchCards = document.getElementById(
    "boton_limpiar_busqueda_tarjetas_admin",
  );
  const deleteSelectedCards = document.getElementById(
    "boton_eliminar_tarjetas_admin",
  );
  const cardsList = document.getElementById("lista_tarjetas_admin");

  const searchLanguages = document.getElementById("busqueda_lenguajes_admin");
  const clearSearchLanguages = document.getElementById(
    "boton_limpiar_busqueda_lenguajes_admin",
  );
  const deleteSelectedLanguages = document.getElementById(
    "boton_eliminar_lenguajes_admin",
  );
  const languagesList = document.getElementById("lista_lenguajes_admin");

  const searchUsers = document.getElementById("busqueda_usuarios_admin");
  const clearSearchUsers = document.getElementById(
    "boton_limpiar_busqueda_usuarios_admin",
  );
  const deleteSelectedUsers = document.getElementById(
    "boton_eliminar_usuarios_admin",
  );
  const usersList = document.getElementById("lista_usuarios_admin");

  const searchReports = document.getElementById("busqueda_reportes_admin");
  const clearSearchReports = document.getElementById(
    "boton_limpiar_busqueda_reportes_admin",
  );
  const deleteSelectedReports = document.getElementById(
    "boton_eliminar_reportes_admin",
  );
  const reportsList = document.getElementById("lista_reportes_admin");
  const searchLogs = document.getElementById("busqueda_logs_admin");
  const clearSearchLogs = document.getElementById(
    "boton_limpiar_busqueda_logs_admin",
  );
  const logsList = document.getElementById("lista_logs_admin");
  const fechaInicioLogs = document.getElementById("fecha_inicio_logs");
  const fechaFinLogs = document.getElementById("fecha_fin_logs");
  const botonAplicarFiltroFechas = document.getElementById(
    "boton_aplicar_filtro_fechas",
  );
  const botonLimpiarFiltroFechas = document.getElementById(
    "boton_limpiar_filtro_fechas",
  );

  const adminModal = document.getElementById("modal_admin");
  const closeAdminModal = document.getElementById("cerrar_modal_admin");
  const saveAdminModalBtn = document.getElementById(
    "boton_guardar_modal_admin",
  );
  const cancelAdminModalBtn = document.getElementById(
    "boton_cancelar_modal_admin",
  );
  const adminModalTitle = document.getElementById("titulo_modal_admin");
  const adminModalBody = document.getElementById("cuerpo_modal_admin");

  const modalDetallesLog = document.getElementById("modal_detalles_log");
  const cerrarModalDetallesLog = document.getElementById(
    "cerrar_modal_detalles_log",
  );
  const botonCerrarDetallesLog = document.getElementById(
    "boton_cerrar_detalles_log",
  );
  const cuerpoModalDetallesLog = document.getElementById(
    "cuerpo_modal_detalles_log",
  );

  // =============================================
  // MANEJADORES DE EVENTOS
  // =============================================
  logoutBtn.onclick = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("user");
    localStorage.removeItem("session");
    window.location.href = "login.html";
  };

  // Cerrar modal de detalles de log
  cerrarModalDetallesLog.onclick = () => {
    modalDetallesLog.style.display = "none";
  };

  botonCerrarDetallesLog.onclick = () => {
    modalDetallesLog.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modalDetallesLog) {
      modalDetallesLog.style.display = "none";
    }
  };

  // =============================================
  // GESTIÓN DE SESIÓN
  // =============================================
  async function getUser() {
    const storedUser = localStorage.getItem("user");
    const storedSession = localStorage.getItem("session");

    if (storedUser && storedSession) {
      user = JSON.parse(storedUser);
    } else {
      const { data } = await supabase.auth.getSession();
      user = data?.session?.user || null;
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("session", JSON.stringify(data.session));
      }
    }

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Intentar usar perfil desde localStorage para evitar llamada extra
    const storedPerfil = localStorage.getItem("perfil");
    let perfil = null;
    if (storedPerfil) {
      try {
        perfil = JSON.parse(storedPerfil);
      } catch (e) {
        perfil = null;
      }
    }

    // Obtener perfil desde DB si no está en localStorage o falta role_id
    if (!perfil || !perfil.role_id) {
      const { data: perfilDb } = await supabase
        .from("perfiles")
        .select("role_id, username")
        .eq("id", user.id)
        .maybeSingle();
      perfil = perfilDb || perfil;
      if (perfilDb) {
        try {
          localStorage.setItem("perfil", JSON.stringify(perfilDb));
        } catch (e) {}
      }
    }

    currentProfile = perfil;

    // Exigir username: si falta, redirigir a index para completarlo
    if (!perfil || !perfil.username || !perfil.username.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Perfil incompleto",
        text: "Debes completar tu nombre de usuario antes de acceder al panel administrativo. Serás redirigido para completar tu perfil.",
        confirmButtonText: "Ir a completar",
      });
      try {
        localStorage.setItem("user", JSON.stringify(user));
      } catch (e) {}
      window.location.href = "index.html";
      return;
    }

    // Verificar acceso: Solo Admin y Owner pueden acceder
    if (
      !perfil ||
      (perfil.role_id !== ROLES.ADMIN && perfil.role_id !== ROLES.OWNER)
    ) {
      Swal.fire({
        icon: "error",
        title: "Acceso denegado",
        text: "Solo administradores y propietarios pueden acceder",
      });
      window.location.href = "CodeTime.html";
      return;
    }

    // Si es administrador (no Owner), ocultar la pestaña de logs
    if (!isOwner()) {
      tabLogs.style.display = "none";
      logsTab.style.display = "none";
      deleteSelectedReports.style.display = "none";
    }

    loadData();
  }

  // =============================================
  // CARGAR DATOS
  // =============================================
  async function loadData() {
    await loadRoles();
    await loadLanguages();
    await loadCards();
    await loadUsers();
    await loadReports();
    await loadAuditLogs();
  }

  async function loadCards() {
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    allCards = data || [];
    const userIds = [
      ...new Set(allCards.map((c) => c.user_id).filter(Boolean)),
    ];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("perfiles")
        .select("id, username")
        .in("id", userIds);
      usersMap = new Map((profiles || []).map((p) => [p.id, p.username]));
    }

    renderCards(allCards);
  }

  async function loadLanguages() {
    const { data } = await supabase.from("languages").select("*").order("name");

    allLanguages = data || [];
    languageMap = new Map(allLanguages.map((lang) => [lang.id, lang.name]));
    renderLanguages(allLanguages);
  }

  async function loadRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("id");

    allRoles = data || [];
    rolesMap = new Map(allRoles.map((role) => [role.id, role.name]));
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from("perfiles")
      .select("id, username, role_id")
      .order("username");

    if (error) {
      console.error("Error cargando usuarios:", error);
      allUsers = [];
    } else {
      allUsers = data || [];
    }
    usersMap = new Map(
      allUsers.map((userItem) => [userItem.id, userItem.username]),
    );
    usersRoleMap = new Map(
      allUsers.map((userItem) => [userItem.id, userItem.role_id]),
    );
    renderUsers(allUsers);
  }

  async function loadReports() {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando reportes:", error);
      allReports = [];
    } else {
      allReports = data || [];
    }
    renderReports(allReports);
  }

  async function loadAuditLogs() {
    let query = supabase.from("audit_logs").select("*");

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error cargando logs:", error);
      return;
    }

    allAuditLogs = data || [];
    const userIds = [
      ...new Set(allAuditLogs.map((log) => log.user_id).filter(Boolean)),
    ];
    auditLogUserNames = new Map();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("perfiles")
        .select("id, username")
        .in("id", userIds);
      auditLogUserNames = new Map(
        (profiles || []).map((p) => [p.id, p.username]),
      );
    }

    // Inicializar filtros de fecha
    inicializarFiltrosFechas(allAuditLogs);
    renderLogs(allAuditLogs);
  }

  function inicializarFiltrosFechas(logs) {
    if (logs.length === 0) return;

    // Obtener la fecha más antigua y más reciente
    const dates = logs
      .map((log) => new Date(log.created_at))
      .sort((a, b) => a - b);
    const fechaMasAntigua = dates[0];
    const fechaMasReciente = dates[dates.length - 1];

    // Convertir a formato YYYY-MM-DD para input date
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    fechaInicioLogs.min = formatDate(fechaMasAntigua);
    fechaInicioLogs.max = formatDate(fechaMasReciente);
    fechaFinLogs.min = formatDate(fechaMasAntigua);
    fechaFinLogs.max = formatDate(fechaMasReciente);

    fechaInicioLogs.value = formatDate(fechaMasAntigua);
    fechaFinLogs.value = formatDate(fechaMasReciente);
  }

  function renderLogs(logs, userNames = auditLogUserNames) {
    logsList.innerHTML = "";

    if (logs.length === 0) {
      logsList.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text_apa); padding: 2rem;">
            No hay registros de auditoría
          </td>
        </tr>
      `;
      return;
    }

    logs.forEach((logItem) => {
      const el = document.createElement("tr");
      const userName = displayUserName(logItem.user_id);
      const actionType = logItem.action_type || "DESCONOCIDA";
      const entityType = logItem.entity_type || "DESCONOCIDA";
      const description = logItem.description || "Sin detalles";
      const timestamp = new Date(logItem.created_at).toLocaleString("es-ES");

      // Colorear según el tipo de acción
      let actionColor = "#00d4ff"; // azul por defecto
      if (actionType === "DELETE") actionColor = "#ff6b6b";
      else if (actionType === "UPDATE") actionColor = "#ffa500";
      else if (actionType === "INSERT") actionColor = "#4ecdc4";

      // Traducir tipo de entidad
      const entityTypeTranslated =
        {
          cards: "Tarjeta",
          languages: "Lenguaje",
          perfiles: "Perfil de Usuario",
          reports: "Reporte",
          users: "Usuario",
          audit_logs: "Auditoría",
        }[entityType.toLowerCase()] || entityType;

      // Traducir acción
      const actionTranslated =
        {
          INSERT: "Creado",
          UPDATE: "Actualizado",
          DELETE: "Eliminado",
          SELECT: "Consultado",
        }[actionType] || actionType;

      el.dataset.logId = logItem.id;
      el.classList.add("fila_log_clickable");
      el.innerHTML = `
        <td style="font-weight: 500; color: var(--text_uno);">${userName}</td>
        <td>
          <span style="
            background: ${actionColor}20;
            color: ${actionColor};
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            border: 1px solid ${actionColor}40;
          ">
            ${actionTranslated}
          </span>
        </td>
        <td style="color: var(--az_electri); font-weight: 500;">${entityTypeTranslated}</td>
        <td style="color: var(--text_dos);">${description}</td>
        <td style="color: var(--text_apa); font-size: 0.85rem;">${timestamp}</td>

      `;
      el.addEventListener("click", () => {
        mostrarDetallesLog(logItem);
      });
      logsList.appendChild(el);
    });
  }

  function mostrarDetallesLog(logItem) {
    const userName = displayUserName(logItem.user_id);
    const actionTranslated =
      {
        INSERT: "Creado",
        UPDATE: "Actualizado",
        DELETE: "Eliminado",
        SELECT: "Consultado",
      }[logItem.action_type] || logItem.action_type;

    const entityTypeTranslated =
      {
        cards: "Tarjeta",
        languages: "Lenguaje",
        perfiles: "Perfil de Usuario",
        reports: "Reporte",
        users: "Usuario",
        audit_logs: "Auditoría",
      }[logItem.entity_type?.toLowerCase()] || logItem.entity_type;

    const timestamp = new Date(logItem.created_at).toLocaleString("es-ES");

    let detallesHTML = `
      <div class="detalles_log_contenedor">
        <div class="detalles_log_info">
          <div class="detalles_fila">
            <span class="detalles_label">Usuario:</span>
            <span class="detalles_valor">${userName}</span>
          </div>
          <div class="detalles_fila">
            <span class="detalles_label">Acción:</span>
            <span class="detalles_valor" style="color: #4ecdc4; font-weight: 600;">${actionTranslated}</span>
          </div>
          <div class="detalles_fila">
            <span class="detalles_label">Entidad:</span>
            <span class="detalles_valor">${entityTypeTranslated}</span>
          </div>
          <div class="detalles_fila">
            <span class="detalles_label">Fecha y Hora:</span>
            <span class="detalles_valor">${timestamp}</span>
          </div>
          <div class="detalles_fila">
            <span class="detalles_label">ID de Entidad:</span>
            <span class="detalles_valor detalles_id">${logItem.entity_id || "N/A"}</span>
          </div>
          <div class="detalles_fila">
            <span class="detalles_label">Descripción:</span>
            <span class="detalles_valor">${logItem.description || "Sin descripción"}</span>
          </div>
        </div>
    `;

    // Mostrar valores antiguos y nuevos si existen
    if (logItem.old_values || logItem.new_values) {
      detallesHTML += `<div class="detalles_cambios">`;

      if (logItem.old_values) {
        detallesHTML += `
          <div class="cambio_seccion">
            <h4 style="color: #ff6b6b; margin-bottom: 1rem;">
              <i class="fas fa-undo"></i> Valores Anteriores
            </h4>
            ${formatearValores(logItem.old_values)}
          </div>
        `;
      }

      if (logItem.new_values) {
        detallesHTML += `
          <div class="cambio_seccion">
            <h4 style="color: #4ecdc4; margin-bottom: 1rem;">
              <i class="fas fa-redo"></i> Valores Nuevos
            </h4>
            ${formatearValores(logItem.new_values)}
          </div>
        `;
      }

      detallesHTML += `</div>`;
    }

    detallesHTML += `</div>`;

    cuerpoModalDetallesLog.innerHTML = detallesHTML;
    modalDetallesLog.style.display = "block";
  }

  function formatearValores(values) {
    if (typeof values === "string") {
      try {
        values = JSON.parse(values);
      } catch (e) {
        return `<p style="color: var(--text_dos);">${values}</p>`;
      }
    }

    if (typeof values !== "object" || values === null) {
      return `<p style="color: var(--text_dos);">${JSON.stringify(values)}</p>`;
    }

    let html = `<div class="valores_tabla">`;
    for (const [key, value] of Object.entries(values)) {
      let displayValue = value;
      if (typeof value === "object") {
        displayValue = JSON.stringify(value, null, 2);
      }

      // Truncar valores muy largos
      if (typeof displayValue === "string" && displayValue.length > 200) {
        displayValue = displayValue.substring(0, 200) + "...";
      }

      const keyTranslated =
        {
          titulo: "Título",
          descripcion: "Descripción",
          contenido: "Contenido",
          language_id: "Lenguaje",
          name: "Nombre",
          icon: "Icono",
          username: "Nombre de Usuario",
          role_id: "Rol",
          status: "Estado",
          entity_type: "Tipo de Entidad",
          target_id: "ID del Objetivo",
          reporter_id: "ID del Reportero",
        }[key] || key;

      html += `
        <div class="valor_item">
          <span class="valor_key">${keyTranslated}:</span>
          <span class="valor_value">${escapeHtml(displayValue)}</span>
        </div>
      `;
    }
    html += `</div>`;
    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================
  // RENDERIZAR CONTENIDO
  // =============================================
  function renderCards(cards) {
    cardsList.innerHTML = "";
    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "item_tarjeta";
      el.innerHTML = `
        <input type="checkbox" class="check_tarjeta" data-id="${card.id}">
        <div class="contenido_tarjeta">
          <h3>${card.titulo}</h3>
          <p><strong>Lenguaje:</strong> ${card.language || languageMap.get(card.language_id) || "N/A"}</p>
          <p><strong>Usuario:</strong> ${usersMap.get(card.user_id) || "N/A"}</p>
          <p><strong>Descripción:</strong> ${card.descripcion || ""}</p>
          <p><strong>Creado:</strong> ${new Date(card.created_at).toLocaleDateString()}</p>
          <button class="btn boton_secundario boton_editar_tarjeta" data-id="${card.id}">Editar</button>
        </div>
      `;
      cardsList.appendChild(el);
    });
  }

  function renderLanguages(languages) {
    languagesList.innerHTML = "";
    languages.forEach((lang) => {
      const descriptionHtml = lang.description
        ? marked.parse(escapeOutsideCodeBlocks(lang.description))
        : "";

      const el = document.createElement("div");
      el.className = "item_lenguaje";
      el.innerHTML = `
        <input type="checkbox" class="check_lenguaje" data-id="${lang.id}">
        <div class="contenido_lenguaje">
          <h3>${lang.name}</h3>
          <div class="description-markdown">${descriptionHtml}</div>
          <button class="btn boton_secundario boton_editar_lenguaje" data-id="${lang.id}">Editar</button>
        </div>
      `;
      languagesList.appendChild(el);
    });
  }

  function renderUsers(users) {
    usersList.innerHTML = "";
    users.forEach((userItem) => {
      if (!isOwner() && userItem.role_id === ROLES.OWNER) {
        return;
      }
      const el = document.createElement("div");
      el.className = "item_lenguaje";
      el.innerHTML = `
        <input type="checkbox" class="check_usuario" data-id="${userItem.id}">
        <div class="contenido_lenguaje">
          <h3>${userItem.username}</h3>
          <p><strong>Rol:</strong> ${displayRole(userItem.role_id)}</p>
          <p><strong>ID:</strong> ${userItem.id}</p>
          <button class="btn boton_secundario boton_editar_usuario" data-id="${userItem.id}">Editar</button>
        </div>
      `;
      usersList.appendChild(el);
    });
  }

  function renderReports(reports) {
    reportsList.innerHTML = "";
    reports.forEach((report) => {
      const el = document.createElement("div");
      el.className = "item_lenguaje";
      el.innerHTML = `
        <input type="checkbox" class="check_reporte" data-id="${report.id}">
        <div class="contenido_lenguaje">
          <h3>${report.entity_type.toUpperCase()} - ${report.target_name || report.target_id}</h3>
          <p><strong>Estado:</strong> ${report.status}</p>
          <p><strong>Reportado por:</strong> ${displayUserName(report.reporter_id)}</p>
          <p><strong>Fecha:</strong> ${new Date(report.created_at).toLocaleString()}</p>
          <p>${report.description || ""}</p>
          <button class="btn boton_secundario boton_ver_reporte" data-id="${report.id}">${canManageReports() ? "Ver / Actualizar" : "Ver"}</button>
        </div>
      `;
      reportsList.appendChild(el);
    });
  }

  // =============================================
  // GESTIÓN DE PESTAÑAS
  // =============================================
  function hideAllAdminTabs() {
    cardsTab.style.display = "none";
    languagesTab.style.display = "none";
    usersTab.style.display = "none";
    reportsTab.style.display = "none";
    logsTab.style.display = "none";
    tabCards.classList.remove("active");
    tabLanguages.classList.remove("active");
    tabUsers.classList.remove("active");
    tabReports.classList.remove("active");
    tabLogs.classList.remove("active");
  }

  tabCards.onclick = () => {
    hideAllAdminTabs();
    tabCards.classList.add("active");
    cardsTab.style.display = "block";
  };

  tabLanguages.onclick = () => {
    hideAllAdminTabs();
    tabLanguages.classList.add("active");
    languagesTab.style.display = "block";
  };

  tabUsers.onclick = () => {
    hideAllAdminTabs();
    tabUsers.classList.add("active");
    usersTab.style.display = "block";
  };

  tabReports.onclick = () => {
    hideAllAdminTabs();
    tabReports.classList.add("active");
    reportsTab.style.display = "block";
  };

  tabLogs.onclick = () => {
    hideAllAdminTabs();
    tabLogs.classList.add("active");
    logsTab.style.display = "block";
    loadAuditLogs();
  };

  // =============================================
  // BÚSQUEDA
  // =============================================
  searchCards.oninput = () => {
    const query = searchCards.value.toLowerCase();
    const filtered = allCards.filter(
      (card) =>
        (card.titulo || "").toLowerCase().includes(query) ||
        (card.descripcion || "").toLowerCase().includes(query) ||
        (usersMap.get(card.user_id) || "").toLowerCase().includes(query),
    );
    renderCards(filtered);
  };

  clearSearchCards.onclick = () => {
    searchCards.value = "";
    renderCards(allCards);
  };

  searchLanguages.oninput = () => {
    const query = searchLanguages.value.toLowerCase();
    const filtered = allLanguages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.description?.toLowerCase().includes(query),
    );
    renderLanguages(filtered);
  };

  clearSearchLanguages.onclick = () => {
    searchLanguages.value = "";
    renderLanguages(allLanguages);
  };

  searchUsers.oninput = () => {
    const query = searchUsers.value.toLowerCase();
    const filtered = allUsers.filter(
      (userItem) =>
        (userItem.username || "").toLowerCase().includes(query) ||
        displayRole(userItem.role_id).toLowerCase().includes(query),
    );
    renderUsers(filtered);
  };

  clearSearchUsers.onclick = () => {
    searchUsers.value = "";
    renderUsers(allUsers);
  };

  searchReports.oninput = () => {
    const query = searchReports.value.toLowerCase();
    const filtered = allReports.filter(
      (report) =>
        (report.entity_type || "").toLowerCase().includes(query) ||
        (report.target_name || "").toLowerCase().includes(query) ||
        (report.status || "").toLowerCase().includes(query) ||
        (usersMap.get(report.reporter_id) || "").toLowerCase().includes(query),
    );
    renderReports(filtered);
  };

  clearSearchReports.onclick = () => {
    searchReports.value = "";
    renderReports(allReports);
  };

  searchLogs.oninput = () => {
    const query = searchLogs.value.toLowerCase();
    const filtered = allAuditLogs.filter(
      (logItem) =>
        String(logItem.action_type || "")
          .toLowerCase()
          .includes(query) ||
        String(logItem.entity_type || "")
          .toLowerCase()
          .includes(query) ||
        String(logItem.entity_id || "")
          .toLowerCase()
          .includes(query) ||
        String(logItem.description || "")
          .toLowerCase()
          .includes(query) ||
        displayUserName(logItem.user_id).toLowerCase().includes(query),
    );
    renderLogs(filtered);
  };

  // Filtro por fecha de logs
  botonAplicarFiltroFechas.onclick = () => {
    const fechaInicio = fechaInicioLogs.value;
    const fechaFin = fechaFinLogs.value;

    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: "warning",
        title: "Error",
        text: "Selecciona ambas fechas",
      });
      return;
    }

    const inicioDate = new Date(fechaInicio);
    const finDate = new Date(fechaFin);

    if (finDate < inicioDate) {
      Swal.fire({
        icon: "warning",
        title: "Error",
        text: "La fecha final debe ser igual o posterior a la inicial",
      });
      return;
    }

    const inicioDay = new Date(
      inicioDate.getFullYear(),
      inicioDate.getMonth(),
      inicioDate.getDate(),
    );
    const finDay = new Date(
      finDate.getFullYear(),
      finDate.getMonth(),
      finDate.getDate(),
    );

    const filtered = allAuditLogs.filter((logItem) => {
      const logDate = new Date(logItem.created_at);
      const logDay = new Date(
        logDate.getFullYear(),
        logDate.getMonth(),
        logDate.getDate(),
      );
      return logDay >= inicioDay && logDay <= finDay;
    });

    renderLogs(filtered);
  };

  botonLimpiarFiltroFechas.onclick = () => {
    fechaInicioLogs.value = "";
    fechaFinLogs.value = "";
    searchLogs.value = "";
    renderLogs(allAuditLogs);
  };

  clearSearchLogs.onclick = () => {
    searchLogs.value = "";
    renderLogs(allAuditLogs);
  };

  // =============================================
  // EDITAR ELEMENTOS
  // =============================================
  document.body.addEventListener("click", async (event) => {
    const editCardBtn = event.target.closest(".boton_editar_tarjeta");
    const editLanguageBtn = event.target.closest(".boton_editar_lenguaje");
    const editUserBtn = event.target.closest(".boton_editar_usuario");
    const editReportBtn = event.target.closest(".boton_ver_reporte");

    if (editCardBtn) {
      const cardId = editCardBtn.dataset.id;
      const card = allCards.find((item) => item.id === cardId);
      if (!card) return;
      openAdminModal("card", card);
    }

    if (editLanguageBtn) {
      const languageId = editLanguageBtn.dataset.id;
      const lang = allLanguages.find(
        (item) => item.id.toString() === languageId.toString(),
      );
      if (!lang) return;
      openAdminModal("language", lang);
    }

    if (editUserBtn) {
      const userId = editUserBtn.dataset.id;
      const userItem = allUsers.find((item) => item.id === userId);
      if (!userItem) return;
      openAdminModal("user", userItem);
    }

    if (editReportBtn) {
      const reportId = editReportBtn.dataset.id;
      const reportItem = allReports.find((item) => item.id === reportId);
      if (!reportItem) return;
      openAdminModal("report", reportItem);
    }
  });

  // =============================================
  // ELIMINAR ELEMENTOS
  // =============================================
  deleteSelectedCards.onclick = async () => {
    const selected = Array.from(
      document.querySelectorAll(".check_tarjeta:checked"),
    ).map((cb) => cb.dataset.id);

    if (selected.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selección requerida",
        text: "Selecciona al menos una tarjeta",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar tarjetas",
      text: `¿Eliminar ${selected.length} tarjeta(s)?`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("cards").delete().in("id", selected);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } else {
      await logAudit(
        "DELETE",
        "cards",
        selected.join(","),
        `${selected.length} tarjeta(s) eliminadas`,
      );
      loadCards();
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Tarjetas eliminadas",
      });
    }
  };

  deleteSelectedLanguages.onclick = async () => {
    const selected = Array.from(
      document.querySelectorAll(".check_lenguaje:checked"),
    ).map((cb) => cb.dataset.id);

    if (selected.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selección requerida",
        text: "Selecciona al menos un lenguaje",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar lenguajes",
      text: `¿Eliminar ${selected.length} lenguaje(s)?`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("languages")
      .delete()
      .in("id", selected);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } else {
      await logAudit(
        "DELETE",
        "languages",
        selected.join(","),
        `${selected.length} lenguaje(s) eliminados`,
      );
      loadLanguages();
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Lenguajes eliminados",
      });
    }
  };

  deleteSelectedUsers.onclick = async () => {
    const selected = Array.from(
      document.querySelectorAll(".check_usuario:checked"),
    ).map((cb) => cb.dataset.id);

    if (selected.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selección requerida",
        text: "Selecciona al menos un usuario",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar usuarios",
      text: `¿Eliminar ${selected.length} usuario(s)?`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("perfiles")
      .delete()
      .in("id", selected);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } else {
      await logAudit(
        "DELETE",
        "perfiles",
        selected.join(","),
        `${selected.length} usuario(s) eliminados`,
      );
      loadUsers();
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Usuarios eliminados",
      });
    }
  };

  deleteSelectedReports.onclick = async () => {
    if (!canDeleteReports()) {
      Swal.fire({
        icon: "error",
        title: "Acceso denegado",
        text: "Solo propietarios pueden eliminar reportes",
      });
      return;
    }

    const selected = Array.from(
      document.querySelectorAll(".check_reporte:checked"),
    ).map((cb) => cb.dataset.id);

    if (selected.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Selección requerida",
        text: "Selecciona al menos un reporte",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Eliminar reportes",
      text: `¿Eliminar ${selected.length} reporte(s)?`,
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("reports")
      .delete()
      .in("id", selected);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
      });
    } else {
      await logAudit(
        "DELETE",
        "reports",
        selected.join(","),
        `${selected.length} reporte(s) eliminados`,
      );
      loadReports();
      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Reportes eliminados",
      });
    }
  };

  // =============================================
  // MODAL DE EDICIÓN
  // =============================================
  closeAdminModal.onclick = closeAdminModalFn;
  cancelAdminModalBtn.onclick = closeAdminModalFn;
  saveAdminModalBtn.onclick = saveAdminModal;

  function closeAdminModalFn() {
    adminModal.style.display = "none";
    currentAdminType = null;
    currentAdminItem = null;
    adminModalBody.innerHTML = "";
  }

  function openAdminModal(type, item) {
    currentAdminType = type;
    currentAdminItem = item;
    adminModalTitle.textContent =
      type === "card"
        ? "Editar tarjeta"
        : type === "language"
          ? "Editar lenguaje"
          : type === "user"
            ? "Editar usuario"
            : "Ver reporte";

    switch (type) {
      case "card":
        adminModalBody.innerHTML = `
          <div class="formulario_editor">
            <div class="grupo_formulario">
              <label for="campo_titulo_admin">Título</label>
              <input type="text" id="campo_titulo_admin" value="${item.titulo || ""}" />
            </div>

            <div class="grupo_formulario">
              <label for="campo_descripcion_admin">Descripción</label>
              <textarea id="campo_descripcion_admin">${item.descripcion || ""}</textarea>
            </div>

            <div class="grupo_formulario">
              <label for="campo_contenido_admin">Contenido (Formato Markdown):</label>
              <div class="barra_herramientas_editor">
                <button type="button" class="boton_formato" data-format="bold" title="Negrita: **texto**">
                  <i class="fas fa-bold"></i>
                </button>
                <button type="button" class="boton_formato" data-format="italic" title="Itálica: *texto*">
                  <i class="fas fa-italic"></i>
                </button>
                <button type="button" class="boton_formato" data-format="code" title="Código: &#96;&#96;&#96;código&#96;&#96;&#96;">
                  <i class="fas fa-code"></i>
                </button>
                <button type="button" class="boton_formato" data-format="link" title="Enlace: [texto](url)">
                  <i class="fas fa-link"></i>
                </button>
                <div class="separador"></div>
                <button type="button" class="boton_formato" data-format="heading" title="Encabezado: # Texto">
                  <i class="fas fa-heading"></i>
                </button>
                <button type="button" class="boton_formato" data-format="list" title="Lista: - item">
                  <i class="fas fa-list"></i>
                </button>
                <button type="button" class="boton_formato" data-format="quote" title="Cita: > texto">
                  <i class="fas fa-quote-left"></i>
                </button>
                <div class="separador"></div>
                <button type="button" class="boton_formato" data-format="clear" title="Limpiar todo">
                  <i class="fas fa-eraser"></i>
                </button>
              </div>
              <textarea id="campo_contenido_admin" placeholder="Puedes usar formato Markdown&#10;**negrita** | *itálica* | &#96;&#96;&#96;código&#96;&#96;&#96; | # Título" rows="10">${item.contenido || ""}</textarea>
            </div>

            <div class="editor_division">
              <div class="previsualizacion_editor">
                <h3>Preview:</h3>
                <div id="preview_contenido_admin" class="previsualizacion_contenido"></div>
              </div>
            </div>

            <div class="grupo_formulario">
              <label for="campo_id_lenguaje_admin">Lenguaje</label>
              <select id="campo_id_lenguaje_admin">
                ${allLanguages.map((lang) => `<option value="${lang.id}" ${lang.id.toString() === (item.language_id || "").toString() ? "selected" : ""}>${lang.name}</option>`).join("")}
              </select>
            </div>
          </div>
        `;
        break;

      case "language":
        adminModalBody.innerHTML = `
          <div class="grupo_formulario">
            <label>Nombre</label>
            <input type="text" id="campo_nombre_admin" value="${item.name || ""}" />
          </div>
          <div class="grupo_formulario">
            <label>Icono</label>
            <input type="text" id="campo_icono_admin" value="${item.icon || ""}" />
          </div>
          <div class="grupo_formulario">
            <label>Descripción</label>
            <textarea id="campo_descripcion_admin2">${item.description || ""}</textarea>
          </div>
        `;
        break;

      case "user":
        adminModalBody.innerHTML = `
          <div class="grupo_formulario">
            <label>Nombre de usuario</label>
            <input type="text" id="campo_usuario_admin" value="${item.username || ""}" />
          </div>
          <div class="grupo_formulario">
            <label>Rol</label>
            <select id="campo_id_rol_admin">
              ${allRoles
                .map((role) => {
                  // Si el rol es "owner" y el usuario actual no es owner, ocultarlo
                  if (role.id === ROLES.OWNER && !canAssignOwnerRole()) {
                    return "";
                  }
                  return `<option value="${role.id}" ${role.id.toString() === (item.role_id || "").toString() ? "selected" : ""}>${role.name}</option>`;
                })
                .join("")}
            </select>
          </div>
        `;
        break;

      case "report":
        adminModalBody.innerHTML = `
          <div class="grupo_formulario">
            <label>Tipo</label>
            <input type="text" readonly value="${item.entity_type}" />
          </div>
          <div class="grupo_formulario">
            <label>Objetivo</label>
            <input type="text" readonly value="${item.target_name || item.target_id}" />
          </div>
          <div class="grupo_formulario">
            <label>Reportado por</label>
            <input type="text" readonly value="${usersMap.get(item.reporter_id) || item.reporter_id}" />
          </div>
          <div class="grupo_formulario">
            <label>Descripción</label>
            <textarea readonly>${item.description || ""}</textarea>
          </div>
          ${
            isOwner()
              ? `
            <div class="grupo_formulario">
              <label>Estado</label>
              <select id="campo_estado_reporte_admin">
                <option value="pendiente" ${item.status === "pendiente" ? "selected" : ""}>Pendiente</option>
                <option value="resuelto" ${item.status === "resuelto" ? "selected" : ""}>Resuelto</option>
                <option value="rechazado" ${item.status === "rechazado" ? "selected" : ""}>Rechazado</option>
              </select>
            </div>
          `
              : `
            <div class="grupo_formulario">
              <label>Estado</label>
              <input type="text" readonly value="${item.status || "pendiente"}" />
            </div>
          `
          }
        `;
        break;
    }

    adminModal.style.display = "block";
    saveAdminModalBtn.style.display =
      currentAdminType === "report" && !isOwner() ? "none" : "inline-block";
    connectAdminEditor();
  }

  function connectAdminEditor() {
    const contentTextarea = adminModalBody.querySelector(
      "#campo_contenido_admin",
    );
    const descriptionTextarea = adminModalBody.querySelector(
      "#campo_descripcion_admin2",
    );

    const toolbarButtons = adminModalBody.querySelectorAll(".boton_formato");
    toolbarButtons.forEach((button) => {
      button.onclick = (e) => {
        e.preventDefault();
        const format = button.dataset.format;
        const activeTextarea = [contentTextarea, descriptionTextarea].find(
          (textarea) => textarea && textarea === document.activeElement,
        );
        const targetTextarea =
          activeTextarea || contentTextarea || descriptionTextarea;
        if (!targetTextarea) return;

        insertAdminFormat(targetTextarea, format);
        updateAdminPreview();
      };
    });

    if (contentTextarea) {
      contentTextarea.oninput = updateAdminPreview;
      updateAdminPreview();
    }
    if (descriptionTextarea) {
      descriptionTextarea.oninput = updateAdminPreview;
      updateAdminPreview();
    }
  }

  function insertAdminFormat(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || "texto";
    let insertion = "";

    switch (format) {
      case "bold":
        insertion = `**${selected}**`;
        break;
      case "italic":
        insertion = `*${selected}*`;
        break;
      case "code":
        insertion = `\`\`\`\n${selected}\n\`\`\``;
        break;
      case "link":
        insertion = `[${selected}](https://ejemplo.com)`;
        break;
      case "heading":
        insertion = `# ${selected}`;
        break;
      case "list":
        insertion = `- ${selected}`;
        break;
      case "quote":
        insertion = `> ${selected}`;
        break;
      case "clear":
        if (confirm("¿Limpiar todo el contenido?")) {
          textarea.value = "";
        }
        return;
    }

    textarea.value =
      textarea.value.substring(0, start) +
      insertion +
      textarea.value.substring(end);
    textarea.focus();
  }

  function updateAdminPreview() {
    const outputContent = adminModalBody.querySelector(
      "#preview_contenido_admin",
    );
    const outputDescription = adminModalBody.querySelector(
      "#preview_descripcion_admin",
    );

    if (outputContent) {
      outputContent.innerHTML = marked.parse(
        escapeOutsideCodeBlocks(
          adminModalBody.querySelector("#campo_contenido_admin").value || "",
        ),
      );
    }

    if (outputDescription) {
      outputDescription.innerHTML = marked.parse(
        escapeOutsideCodeBlocks(
          adminModalBody.querySelector("#campo_descripcion_admin2").value || "",
        ),
      );
    }
  }

  async function saveAdminModal() {
    if (!currentAdminType || !currentAdminItem) return;

    if (currentAdminType === "report" && !isOwner()) {
      closeAdminModalFn();
      return;
    }

    if (currentAdminType === "card") {
      const titulo = document.getElementById("campo_titulo_admin").value.trim();
      const descripcion = document
        .getElementById("campo_descripcion_admin")
        .value.trim();
      const contenido = document
        .getElementById("campo_contenido_admin")
        .value.trim();
      const language_id = document.getElementById(
        "campo_id_lenguaje_admin",
      ).value;

      if (!titulo || !descripcion) {
        Swal.fire({
          icon: "warning",
          title: "Error",
          text: "Todos los campos son obligatorios",
        });
        return;
      }

      const oldValues = {
        titulo: currentAdminItem.titulo,
        descripcion: currentAdminItem.descripcion,
        contenido: currentAdminItem.contenido,
        language_id: currentAdminItem.language_id,
      };

      const newValues = {
        titulo,
        descripcion,
        contenido,
        language_id,
      };

      const { error } = await supabase
        .from("cards")
        .update({
          titulo,
          descripcion,
          contenido,
          language_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentAdminItem.id);

      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message,
        });
      }
      await logAudit(
        "UPDATE",
        "cards",
        currentAdminItem.id,
        `Tarjeta actualizada: ${titulo}`,
        oldValues,
        newValues,
      );
      loadCards();
    }

    if (currentAdminType === "language") {
      const name = document.getElementById("campo_nombre_admin").value.trim();
      const icon = document.getElementById("campo_icono_admin").value.trim();
      const description = document
        .getElementById("campo_descripcion_admin2")
        .value.trim();

      if (!name) {
        Swal.fire({
          icon: "warning",
          title: "Error",
          text: "El nombre es obligatorio",
        });
        return;
      }

      const oldValues = {
        name: currentAdminItem.name,
        icon: currentAdminItem.icon,
        description: currentAdminItem.description,
      };

      const newValues = {
        name,
        icon,
        description,
      };

      const { error } = await supabase
        .from("languages")
        .update({
          name,
          icon,
          description,
        })
        .eq("id", currentAdminItem.id);

      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message,
        });
      }
      await logAudit(
        "UPDATE",
        "languages",
        currentAdminItem.id,
        `Lenguaje actualizado: ${name}`,
        oldValues,
        newValues,
      );
      loadLanguages();
    }

    if (currentAdminType === "user") {
      const username = document
        .getElementById("campo_usuario_admin")
        .value.trim();
      const role_id = parseInt(
        document.getElementById("campo_id_rol_admin").value,
        10,
      );

      if (!username) {
        Swal.fire({
          icon: "warning",
          title: "Error",
          text: "El nombre de usuario es obligatorio",
        });
        return;
      }

      // Validar que solo Owner pueda asignar rol Owner
      if (role_id === ROLES.OWNER && !canAssignOwnerRole()) {
        Swal.fire({
          icon: "error",
          title: "Acceso denegado",
          text: "Solo propietarios pueden asignar el rol Propietario",
        });
        return;
      }

      const oldValues = {
        username: currentAdminItem.username,
        role_id: currentAdminItem.role_id,
      };

      const newValues = {
        username,
        role_id,
      };

      const { error } = await supabase
        .from("perfiles")
        .update({
          username,
          role_id,
        })
        .eq("id", currentAdminItem.id);

      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message,
        });
      }
      await logAudit(
        "UPDATE",
        "perfiles",
        currentAdminItem.id,
        `Usuario actualizado: ${username}, Rol: ${role_id}`,
        oldValues,
        newValues,
      );
      loadUsers();
    }

    if (currentAdminType === "report") {
      const status = document.getElementById(
        "campo_estado_reporte_admin",
      ).value;

      const oldValues = {
        status: currentAdminItem.status,
      };

      const newValues = {
        status,
      };

      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", currentAdminItem.id);

      if (error) {
        return Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message,
        });
      }
      await logAudit(
        "UPDATE",
        "reports",
        currentAdminItem.id,
        `Estado del reporte actualizado a: ${status}`,
        oldValues,
        newValues,
      );
      loadReports();
    }

    closeAdminModalFn();
    Swal.fire({ icon: "success", title: "Éxito", text: "Cambios guardados" });
  }

  // Iniciar aplicación
  getUser();
  // Funcionalidad para ocultar/mostrar header al hacer scroll
  let lastScrollTop = 0;
  const header = document.querySelector(".header");

  window.addEventListener("scroll", function () {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down - hide header
      header.style.transform = "translateY(-100%)";
      header.style.transition = "transform 0.3s ease-in-out";
    } else {
      // Scrolling up - show header
      header.style.transform = "translateY(0)";
      header.style.transition = "transform 0.3s ease-in-out";
    }

    lastScrollTop = scrollTop;
  });
});
