document.addEventListener('DOMContentLoaded', (event) => {
    // --- DOM Selectors ---
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');

    // Feature Selectors
    const priorityInput = document.getElementById('priority-input');
    const dueDateInput = document.getElementById('due-date-input');
    const taskNotesInput = document.getElementById('task-notes-input');
    const filterButtons = document.querySelectorAll('.filter-section button');
    const clearCompletedBtn = document.getElementById('clear-completed-btn');

    // Modal Selectors
    const editModal = document.getElementById('edit-modal');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const aboutModal = document.getElementById('about-modal');
    const aboutBtn = document.getElementById('about-btn');
    const closeAboutModalBtn = document.getElementById('close-about-modal-btn');

    const editTaskText = document.getElementById('edit-task-text');
    const editPriority = document.getElementById('edit-priority');
    const editDueDate = document.getElementById('edit-due-date');
    const editNotes = document.getElementById('edit-notes');

    let currentTaskId = null;
    let tasks = [];
    let currentFilter = 'all';

    // --- Notification & Sound Setup ---
    function requestNotificationPermission() {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }
    requestNotificationPermission();

    // Default Reward Sound Function (Web Audio API)
    function playRewardSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();

            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.error("Audio API failed to start:", e);
        }
    }

    // --- Modal Management Functions ---
    function openEditModal(task) {
        currentTaskId = task.id;
        editTaskText.value = task.text;
        editPriority.value = task.priority;
        editDueDate.value = task.dueDate || '';
        editNotes.value = task.notes || '';
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        currentTaskId = null;
    }

    function openAboutModal() {
        aboutModal.style.display = 'flex';
    }

    function closeAboutModal() {
        aboutModal.style.display = 'none';
    }

    // --- Event Listeners ---
    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // Modal Listeners
    saveEditBtn.addEventListener('click', handleSaveEdit);
    cancelEditBtn.addEventListener('click', closeEditModal);
    closeModalBtn.addEventListener('click', closeEditModal);
    aboutBtn.addEventListener('click', openAboutModal);
    closeAboutModalBtn.addEventListener('click', closeAboutModal);

    // Close modals by clicking backdrop
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeEditModal();
            }
        });
    }
    if (aboutModal) {
        aboutModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeAboutModal();
            }
        });
    }

    // Event Delegation for Clicks
    taskList.addEventListener('click', function (e) {
        const listItem = e.target.closest('.task-item');
        if (!listItem) return;

        const taskId = parseInt(listItem.getAttribute('data-id'));

        if (e.target.classList.contains('complete-checkbox')) {
            toggleComplete(taskId);
        } else if (e.target.classList.contains('delete-btn')) {
            deleteTask(taskId);
        } else if (e.target.classList.contains('edit-btn')) {
            const taskToEdit = tasks.find(t => t.id === taskId);
            if (taskToEdit) {
                openEditModal(taskToEdit);
            }
        } else if (e.target.classList.contains('view-notes-btn')) {
            const notesContent = listItem.querySelector('.task-notes-content');

            if (notesContent.style.display === 'none') {
                notesContent.style.display = 'block';
                e.target.textContent = 'Hide Notes';
            } else {
                notesContent.style.display = 'none';
                e.target.textContent = 'View Notes';
            }
        }
    });

    // Filter Listeners
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filterType = button.id.split('-').pop();
            filterTasks(filterType);
        });
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    // --- Data & Progress Functions ---
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function updateProgress() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;

        let percentage = 0;
        if (totalTasks > 0) {
            percentage = (completedTasks / totalTasks) * 100;
        }

        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `Progress: ${completedTasks} of ${totalTasks} tasks completed (${Math.round(percentage)}%)`;
    }

    // --- Date Normalization and Validation Helpers ---
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const MAX_TIMEOUT = 2147483647; // max delay allowed for setTimeout in many browsers

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function isValidLocalDate(y, mIndex, d) {
        const dt = new Date(y, mIndex, d);
        return dt && dt.getFullYear() === y && dt.getMonth() === mIndex && dt.getDate() === d;
    }

    function toISODateString(y, mIndex, d) {
        return `${y}-${pad(mIndex + 1)}-${pad(d)}`;
    }

    function normalizeDueDate(input) {
        if (!input && input !== 0) return '';

        input = String(input).trim();
        if (input === '') return '';

        // Case 1: ISO-like YYYY-MM-DD
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) {
            const [y, m, d] = input.split('-').map(Number);
            const mIndex = m - 1;
            if (isValidLocalDate(y, mIndex, d)) return toISODateString(y, mIndex, d);
            return '';
        }

        // Case 2: DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
            const [d, m, y] = input.split('/').map(Number);
            const mIndex = m - 1;
            if (isValidLocalDate(y, mIndex, d)) return toISODateString(y, mIndex, d);
            return '';
        }

        // Case 3: DD-MM-YYYY
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(input)) {
            const [d, m, y] = input.split('-').map(Number);
            const mIndex = m - 1;
            if (isValidLocalDate(y, mIndex, d)) return toISODateString(y, mIndex, d);
            return '';
        }

        // Case 4: single day number like '3' or '30' -> treat as day of current month/year
        if (/^\d{1,2}$/.test(input)) {
            const day = Number(input);
            const now = new Date();
            const year = now.getFullYear();
            const mIndex = now.getMonth();
            // clamp day between 1 and last day of month
            const lastDay = new Date(year, mIndex + 1, 0).getDate();
            const safeDay = Math.min(Math.max(1, day), lastDay);
            return toISODateString(year, mIndex, safeDay);
        }

        // Fallback: try Date parse and convert to local date parts
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const mIndex = parsed.getMonth();
            const d = parsed.getDate();
            if (isValidLocalDate(y, mIndex, d)) return toISODateString(y, mIndex, d);
        }

        return '';
    }

    // --- Reminder scheduling and watcher (robust) ---
    const scheduledTimeouts = new Map();
    let reminderWatcherId = null;

    function clearScheduledTimeout(taskId) {
        const id = scheduledTimeouts.get(taskId);
        if (id) {
            clearTimeout(id);
            scheduledTimeouts.delete(taskId);
        }
    }

    function sendDueSoonNotification(task) {
        try {
            if (Notification.permission === "granted") {
                new Notification("⏳ Task Due SOON!", {
                    body: `The task: "${task.text}" is due tomorrow! Priority: ${task.priority ? task.priority.toUpperCase() : 'N/A'}`,
                });
            }
        } catch (err) {
            console.error("Failed to send notification:", err);
        }

        // mark so we don't repeatedly notify
        task.dueReminderSent = true;
        saveTasks();
    }

    function scheduleReminderForTask(task) {
        // clear any existing
        clearScheduledTimeout(task.id);

        // guard clauses
        if (!task.dueDate || task.completed || task.dueReminderSent) return;

        // parse dueDate (we saved it normalized as YYYY-MM-DD)
        const parts = task.dueDate.split('-').map(Number);
        if (parts.length !== 3) return;
        const [year, month, day] = parts;
        const monthIndex = month - 1;

        if (!isValidLocalDate(year, monthIndex, day)) return;

        const dueMidnight = new Date(year, monthIndex, day);
        dueMidnight.setHours(0, 0, 0, 0);
        const reminderTime = dueMidnight.getTime() - ONE_DAY_MS;
        const now = Date.now();

        // If reminder time is in the past but it's not yet due and we haven't notified, notify immediately
        if (now >= reminderTime && now < dueMidnight.getTime()) {
            sendDueSoonNotification(task);
            return;
        }

        // If reminderTime is in future and within safe setTimeout range, schedule it
        const delay = reminderTime - now;
        if (delay > 0 && delay <= MAX_TIMEOUT) {
            const tid = setTimeout(() => {
                sendDueSoonNotification(task);
                scheduledTimeouts.delete(task.id);
            }, delay);
            scheduledTimeouts.set(task.id, tid);
            return;
        }

    
    }

    function scheduleAllReminders() {
        tasks.forEach(task => scheduleReminderForTask(task));
    }

    function startReminderWatcher() {
        if (reminderWatcherId !== null) return;
        // run every 60 seconds
        reminderWatcherId = setInterval(() => {
            scheduleAllReminders();
        }, 60 * 1000);
    }

    function stopReminderWatcher() {
        if (reminderWatcherId !== null) {
            clearInterval(reminderWatcherId);
            reminderWatcherId = null;
        }
    }

    // Public wrapper used in previous code: maintain for compatibility
    function setReminder(task) {
        // Ensure dueDate is normalized and saved on the task
        if (!task || !task.dueDate) return;
        // schedule one task
        scheduleReminderForTask(task);
    }

    // --- Task Rendering ---
    function renderTask(task) {
        const listItem = document.createElement('li');
        listItem.classList.add('task-item');

        if (task.completed) {
            listItem.classList.add('completed');
        }
        listItem.setAttribute('data-id', task.id);
        listItem.setAttribute('data-priority', task.priority);

        // Build display date safely from normalized ISO (YYYY-MM-DD)
        let displayDate = '';
        if (task.dueDate) {
            const p = task.dueDate.split('-').map(Number);
            if (p.length === 3) {
                const [y, m, d] = p;
                const dt = new Date(y, m - 1, d);
                displayDate = dt.toLocaleDateString('en-IN', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
            }
        }

        // Priority Icon Emojis
        let priorityIcon = '';
        if (task.priority === 'high') {
            priorityIcon = '🔥 ';
        } else if (task.priority === 'medium') {
            priorityIcon = '⚠️ ';
        } else if (task.priority === 'low') {
            priorityIcon = '🔵 ';
        }

        listItem.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.completed ? 'checked' : ''} class="complete-checkbox">
                <div style="margin-left: 30px;">
                    <span class="task-text">${priorityIcon}${task.text}</span>
                    ${displayDate ? `<span class="due-date-display">(Due: ${displayDate})</span>` : ''}
                    ${task.notes ? `<button class="view-notes-btn">View Notes</button>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
            ${task.notes ? `<div class="task-notes-content" style="display: none;">${task.notes}</div>` : ''}
        `;

        taskList.appendChild(listItem);
    }

    // --- CRUD Operations ---
    function addTask() {
        const taskText = taskInput.value.trim();

        if (taskText === '') {
            alert('Please enter a task!');
            return;
        }

        // Normalize the due date
        const rawDue = dueDateInput ? dueDateInput.value : '';
        const normalized = normalizeDueDate(rawDue);

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            priority: priorityInput ? priorityInput.value : 'medium',
            dueDate: normalized, // store normalized ISO string or ''
            notes: taskNotesInput ? taskNotesInput.value.trim() : '',
            dueReminderSent: false // track whether "due soon" notification already sent
        };

        tasks.push(newTask);

        // schedule reminder for this task
        setReminder(newTask);

        saveTasks();
        filterTasks(currentFilter);
        updateProgress();

        taskInput.value = '';
        if (dueDateInput) { dueDateInput.value = ''; }
        if (taskNotesInput) { taskNotesInput.value = ''; }
    }

    function deleteTask(taskId) {
        clearScheduledTimeout(taskId);

        const listItem = taskList.querySelector(`[data-id="${taskId}"]`);

        if (listItem) {
            listItem.classList.add('fade-out');
        }

        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== taskId);

            saveTasks();
            filterTasks(currentFilter);
            updateProgress();
        }, 500);
    }

    // Toggle Complete (Reward Logic)
    function toggleComplete(taskId) {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex > -1) {

            const taskWasIncomplete = !tasks[taskIndex].completed;

            tasks[taskIndex].completed = !tasks[taskIndex].completed;

            // If task now completed, clear any scheduled reminder
            if (tasks[taskIndex].completed) {
                clearScheduledTimeout(taskId);
            } else {
                // if marked back to active, allow re-scheduling (reset sent flag so user can get reminder again)
                tasks[taskIndex].dueReminderSent = false;
                setReminder(tasks[taskIndex]);
            }

            if (tasks[taskIndex].completed && taskWasIncomplete) {
                playRewardSound();

                if (Notification.permission === "granted") {
                    new Notification("🎉 TASK COMPLETED!", {
                        body: `Well done! You finished: "${tasks[taskIndex].text}"`,
                    });
                }
            }
        }

        saveTasks();
        filterTasks(currentFilter);
        updateProgress();
    }

    // Handle Edit Modal Submission
    function handleSaveEdit(e) {
        e.preventDefault();

        if (!currentTaskId) return;

        const taskIndex = tasks.findIndex(t => t.id === currentTaskId);

        if (taskIndex > -1) {
            // Update the task object with new values from the modal
            tasks[taskIndex].text = editTaskText.value.trim();
            tasks[taskIndex].priority = editPriority.value;

            // Normalize the edited due date
            const normalized = normalizeDueDate(editDueDate.value);
            tasks[taskIndex].dueDate = normalized;
            // Reset reminder sent flag if due date changed
            tasks[taskIndex].dueReminderSent = false;

            tasks[taskIndex].notes = editNotes.value.trim();

            // Clear existing timeout for this task then schedule
            clearScheduledTimeout(tasks[taskIndex].id);
            setReminder(tasks[taskIndex]);
            saveTasks();
            filterTasks(currentFilter);
            updateProgress();
        }

        closeEditModal();
    }

    // --- Filtering and Cleanup Functions ---
    function filterTasks(filter) {
        currentFilter = filter;

        filterButtons.forEach(button => {
            button.classList.remove('active');
            if (button.id.endsWith(filter)) {
                button.classList.add('active');
            }
        });

        const filteredTasks = tasks.filter(task => {
            if (filter === 'all') {
                return true;
            } else if (filter === 'active') {
                return !task.completed;
            } else if (filter === 'completed') {
                return task.completed;
            }
            return true;
        });

        taskList.innerHTML = '';
        filteredTasks.forEach(renderTask);
    }

    function clearCompleted() {
        // clear scheduled timeouts for removed tasks
        tasks.filter(t => t.completed).forEach(t => clearScheduledTimeout(t.id));

        tasks = tasks.filter(task => !task.completed);

        saveTasks();
        filterTasks(currentFilter);
        updateProgress();
    }

    // --- Initialization ---
    function loadTasks() {
        const savedTasks = localStorage.getItem('tasks');

        if (savedTasks) {
            try {
                const parsed = JSON.parse(savedTasks);
                if (Array.isArray(parsed)) {
                    // ensure each task has dueReminderSent flag (backwards compatibility)
                    tasks = parsed.map(t => {
                        if (typeof t.dueReminderSent === 'undefined') t.dueReminderSent = false;
                        return t;
                    });
                } else {
                    tasks = [];
                }
            } catch (err) {
                console.error("Failed to parse saved tasks, resetting to empty list.", err);
                tasks = [];
            }
        }

        // schedule reminders for existing tasks
        scheduleAllReminders();
        startReminderWatcher();

        filterTasks(currentFilter);
        updateProgress();
    }

    loadTasks();

    // Make sure to schedule after any change that affects reminders
    // (we already call setReminder when adding/editing, but this is safety)
    window.addEventListener('beforeunload', () => {
        // clear any runtime timeouts to avoid leaks (not strictly necessary)
        scheduledTimeouts.forEach((id) => clearTimeout(id));
        scheduledTimeouts.clear();
        stopReminderWatcher();
    });
});
