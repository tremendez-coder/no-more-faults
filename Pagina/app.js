// Control de Faltas - Lógica principal
// Persistencia local usando localStorage

(function () {
    const STORAGE_KEY = 'escuela:faltas:v1';

    /** @typedef {{ id: string, name: string, absences: number }} Student */

    /** @returns {Student[]} */
    function loadStudents() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(Boolean)
                .map((s) => ({ id: String(s.id), name: String(s.name), absences: Number(s.absences) || 0 }));
        } catch {
            return [];
        }
    }

    /** @param {Student[]} students */
    function saveStudents(students) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    }

    /** @param {string} name */
    function isNameTaken(name) {
        return state.students.some((s) => s.name.toLowerCase() === name.toLowerCase());
    }

    function render() {
        const list = document.getElementById('students-list');
        const empty = document.getElementById('empty-state');
        if (!list || !empty) return;
        list.innerHTML = '';

        const term = state.filter.trim().toLowerCase();
        const visible = state.students.filter((s) => s.name.toLowerCase().includes(term));

        empty.style.display = visible.length ? 'none' : 'block';

        for (const student of visible) {
            list.appendChild(renderStudentItem(student));
        }
    }

    /** @param {Student} student */
    function renderStudentItem(student) {
        const li = document.createElement('li');
        li.className = 'student';

        const name = document.createElement('div');
        name.className = 'student-name';
        name.textContent = student.name;

        const label = document.createElement('div');
        label.textContent = 'Faltas:';

        const counter = document.createElement('div');
        counter.className = 'counter';

        const btnDec = document.createElement('button');
        btnDec.type = 'button';
        btnDec.textContent = '−';
        btnDec.title = 'Quitar 1 falta';
        btnDec.addEventListener('click', () => updateAbsences(student.id, student.absences - 1));

        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.01';
        input.value = String(student.absences);
        input.addEventListener('change', () => {
            const value = parseDecimal(input.value);
            updateAbsences(student.id, value);
        });

        const btnInc = document.createElement('button');
        btnInc.type = 'button';
        btnInc.textContent = '+';
        btnInc.title = 'Agregar 1 falta';
        btnInc.addEventListener('click', () => updateAbsences(student.id, student.absences + 1));

        counter.appendChild(btnDec);
        counter.appendChild(input);
        counter.appendChild(btnInc);

        const actions = document.createElement('div');
        actions.className = 'actions';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.textContent = 'Reiniciar';
        resetBtn.title = 'Poner faltas en 0';
        resetBtn.addEventListener('click', () => updateAbsences(student.id, 0));

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete';
        delBtn.textContent = 'Eliminar';
        delBtn.title = 'Eliminar alumno';
        delBtn.addEventListener('click', () => deleteStudent(student.id));

        actions.appendChild(resetBtn);
        actions.appendChild(delBtn);

        li.appendChild(name);
        li.appendChild(label);
        li.appendChild(counter);
        li.appendChild(document.createElement('div')); // spacer
        li.appendChild(actions);

        // Estado de libre por superar el umbral de faltas
        if (Number(student.absences) >= 20) {
            const status = document.createElement('div');
            status.className = 'status-free';
            status.textContent = 'QUEDASTE LIBRE';
            li.appendChild(status);
        }

        return li;
    }

    /** @param {string} id */
    function deleteStudent(id) {
        const student = state.students.find((s) => s.id === id);
        if (!student) return;
        const ok = confirm(`¿Eliminar a "${student.name}"? Esta acción no se puede deshacer.`);
        if (!ok) return;
        state.students = state.students.filter((s) => s.id !== id);
        saveStudents(state.students);
        render();
    }

    /** Convierte entrada con coma o punto a número decimal */
    function parseDecimal(value) {
        if (typeof value === 'number') return value;
        if (value == null) return 0;
        const normalizedStr = String(value).replace(',', '.');
        const n = Number(normalizedStr);
        return Number.isFinite(n) ? n : 0;
    }

    /** @param {string} id @param {number|string} num */
    function updateAbsences(id, num) {
        const n = parseDecimal(num);
        const normalized = Math.max(0, n);
        const idx = state.students.findIndex((s) => s.id === id);
        if (idx === -1) return;
        state.students[idx] = { ...state.students[idx], absences: normalized };
        saveStudents(state.students);
        render();
    }

    function addStudentFlow(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            alert('Por favor, ingresa un nombre.');
            return;
        }
        if (isNameTaken(trimmed)) {
            alert('Ya existe un alumno con ese nombre.');
            return;
        }
        let id = prompt('Ingresa el ID del alumno (único):');
        if (id == null) return; // cancelado
        id = String(id).trim();
        if (!id) {
            alert('El ID no puede estar vacío.');
            return;
        }
        if (state.students.some((s) => s.id === id)) {
            alert('Ese ID ya está en uso.');
            return;
        }
        const student = { id, name: trimmed, absences: 0 };
        state.students.push(student);
        saveStudents(state.students);
        render();
    }

    const state = {
        students: loadStudents(),
        filter: ''
    };

    // Eventos UI
    window.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('register-form');
        const nameInput = document.getElementById('student-name');
        const filterInput = document.getElementById('filter');
        const clearAllBtn = document.getElementById('clear-all');

        render();

        if (form && nameInput) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                addStudentFlow(/** @type {HTMLInputElement} */(nameInput).value);
                /** @type {HTMLInputElement} */(nameInput).value = '';
                /** @type {HTMLInputElement} */(nameInput).focus();
            });
        }

        if (filterInput) {
            filterInput.addEventListener('input', () => {
                state.filter = /** @type {HTMLInputElement} */(filterInput).value;
                render();
            });
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (!state.students.length) return;
                const sure = confirm('¿Borrar todos los alumnos y faltas? No se puede deshacer.');
                if (!sure) return;
                state.students = [];
                saveStudents(state.students);
                render();
            });
        }
    });
})();


