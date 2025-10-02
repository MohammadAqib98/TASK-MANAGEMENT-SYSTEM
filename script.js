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
    editModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeEditModal();
        }
    });
    aboutModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAboutModal();
        }
    });

    // Event Delegation for Clicks 
    taskList.addEventListener('click', function(e) {
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

    // Reminder Logic (24 hours before due date)
    // Function to set Reminder Logic (FINAL DEFINITIVE FIX for Date Parsing)
// Function to set Reminder Logic (FINAL DEFINITIVE FIX)
// Function to set Reminder Logic (FINAL DEFINITIVE FIX for DD-MM-YYYY Parsing)
function setReminder(task) {
    if (!task.dueDate || task.completed) return;

    // The date input field's VALUE is expected to be in YYYY-MM-DD.
    // However, if the system is misinterpreting this as DD/MM/YYYY, 
    // we must rely on the system's ability to parse the value directly.
    
    // We attempt to parse the date safely, assuming the browser gave us YYYY-MM-DD
    let dateParts = task.dueDate.split('-');
    
    // Check for potential Day/Month confusion (only if date is 2025-10-02 format)
    if (dateParts.length === 3) {
        // Safe parsing: Creates a localized Date object at 12:00 PM
        const year = Number(dateParts[0]);
        const month = Number(dateParts[1]) - 1; // JS month is 0-indexed
        const day = Number(dateParts[2]);

        const dueDateTime = new Date(year, month, day, 12); // Anchor at 12:00 PM Local Time
        
        const ONE_DAY_MS = 86400000;

        // 1. Safely find the midnight start of the Due Date
        dueDateTime.setHours(0, 0, 0, 0); 
        
        // 2. Calculate the Alert Time (24 hours BEFORE midnight)
        const reminderTime = dueDateTime.getTime() - ONE_DAY_MS; 
        
        const now = Date.now();
        const delay = reminderTime - now;

        if (delay > 0) {
            setTimeout(() => {
                if (Notification.permission === "granted" && 
                    tasks.find(t => t.id === task.id && !t.completed)) {
                    
                    new Notification("⏳ Task Due SOON!", {
                        body: `The task: "${task.text}" is due tomorrow! Priority: ${task.priority.toUpperCase()}`,
                    });
                }
            }, delay);
        }
    }
    // If dateParts length is not 3 (meaning input was completely invalid or empty), no reminder is set.
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
        
        const displayDate = task.dueDate 
    ? new Date(task.dueDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) 
    : '';
        
        // Priority Icon Emojis
        let priorityIcon = '';
        if (task.priority === 'high') {
            priorityIcon = '🔥 ';
        } else if (task.priority === 'medium') {
            priorityIcon = '⚠️ ';
        } else if (task.priority === 'low') {
            priorityIcon = '🔵 ';
        }

        // Final HTML structure for a single task item
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

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            priority: priorityInput.value,
            dueDate: dueDateInput ? dueDateInput.value : '', 
            notes: taskNotesInput ? taskNotesInput.value.trim() : '' 
        };

        tasks.push(newTask);
        
        setReminder(newTask); 

        saveTasks();
        filterTasks(currentFilter);
        updateProgress();

        taskInput.value = '';
        if (dueDateInput) { dueDateInput.value = ''; }
        if (taskNotesInput) { taskNotesInput.value = ''; }
    }

    function deleteTask(taskId) {
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
            tasks[taskIndex].dueDate = editDueDate.value;
            tasks[taskIndex].notes = editNotes.value.trim();
            
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
        tasks = tasks.filter(task => !task.completed);
        
        saveTasks();
        filterTasks(currentFilter); 
        updateProgress();
    }

    // --- Initialization ---

    function loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
        
        tasks.forEach(task => {
            setReminder(task);
        });

        filterTasks(currentFilter); 
        updateProgress();
    }

    loadTasks();
});