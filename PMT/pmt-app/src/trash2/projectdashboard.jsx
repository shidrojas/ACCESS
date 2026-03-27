import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// StrictMode compatible Droppable workaround
function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
}

// Initial tasks
const initialTasks = {
  todo: [
    { id: "1", content: "Sample task 1" },
    { id: "2", content: "Sample task 2" }
  ],
  inprogress: [],
  review: [],
  done: []
};

// Kanban columns
const columns = [
  { key: "todo", label: "To Do", color: "#20c5e0" },
  { key: "inprogress", label: "In Progress", color: "#fd8d32" },
  { key: "review", label: "For Review", color: "#e15050" },
  { key: "done", label: "Done", color: "#69d186" }
];

// Modal Component
function TaskModal({
  show,
  onClose,
  onSave,
  subject,
  description,
  assignedTo,
  setSubject,
  setDescription,
  setAssignedTo
}) {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <div className="modal-header">CREATE USER STORY</div>

        <div className="modal-row">
          <div>
            <label className="modal-label">Project Name</label>
            <div className="modal-static">SAMPLE PROJECT 1</div>
          </div>

          <div>
            <label className="modal-label">Assign to</label>
            <select
              className="modal-input"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Select user</option>
              <option value="John Doe">John Doe</option>
              <option value="Jane Smith">Jane Smith</option>
              <option value="Michael Reyes">Michael Reyes</option>
            </select>
          </div>
        </div>

        <div className="modal-row">
          <div style={{ flex: 1, marginRight: 8 }}>
            <label className="modal-label">Subject</label>
            <input
              className="modal-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter the subject of the task"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="modal-label">Task Description</label>
          <textarea
            className="modal-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task"
          />
        </div>

        <div className="modal-btns">
          <button className="btn cancel-btn" onClick={onClose}>CANCEL</button>
          <button className="btn save-btn" onClick={onSave}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDashboard() {
  const [tasks, setTasks] = useState(initialTasks);
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [activePage, setActivePage] = useState("overview");

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId) {
      const updatedTasks = Array.from(tasks[source.droppableId]);
      const [moved] = updatedTasks.splice(source.index, 1);
      updatedTasks.splice(destination.index, 0, moved);
      setTasks({
        ...tasks,
        [source.droppableId]: updatedTasks
      });
      return;
    }

    const sourceTasks = Array.from(tasks[source.droppableId]);
    const destTasks = Array.from(tasks[destination.droppableId]);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTask);

    setTasks({
      ...tasks,
      [source.droppableId]: sourceTasks,
      [destination.droppableId]: destTasks
    });
  };

  const handleAddTask = () => setShowModal(true);

  const handleModalSave = () => {
    if (!newSubject.trim()) return;

    setTasks({
      ...tasks,
      todo: [
        ...tasks.todo,
        {
          id: Date.now().toString(),
          content: newSubject,
          description: newDesc,
          assigned: assignedTo
        }
      ]
    });

    setNewSubject("");
    setNewDesc("");
    setAssignedTo("");
    setShowModal(false);
  };

  return (
    <div className="pd-bg">

      {/* HEADER */}
      <header className="pd-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="pd-title">Project Title</div>
          <nav className="pd-nav">
            {["overview", "kanban", "archives", "settings"].map((page) => (
              <a
                key={page}
                href="#"
                className={`pd-nav-link ${activePage === page ? "active" : ""}`}
                onClick={() => setActivePage(page)}
              >
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </a>
            ))}
          </nav>
        </div>

        {activePage === "kanban" && (
          <button className="btn add-task-btn" onClick={handleAddTask}>Add Task</button>
        )}
      </header>

      {/* PAGE TITLE */}
      <h2 className="pd-page-title">{activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h2>

      {/* MODAL */}
      <TaskModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleModalSave}
        subject={newSubject}
        description={newDesc}
        assignedTo={assignedTo}
        setSubject={setNewSubject}
        setDescription={setNewDesc}
        setAssignedTo={setAssignedTo}
      />

      {/* KANBAN BOARD */}
      {activePage === "kanban" && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container">
            {columns.map((col) => (
              <StrictModeDroppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="kanban-column"
                    style={{
                      background: snapshot.isDraggingOver ? "#2a2a2a" : "#23242b"
                    }}
                  >
                    <div style={{ color: col.color, fontWeight: 600, marginBottom: 12 }}>
                      {col.label}
                    </div>

                    {tasks[col.key].map((task, idx) => (
                      <Draggable key={task.id} draggableId={task.id} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`kanban-task ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            <div>{task.content}</div>
                            <small style={{ opacity: 0.7 }}>
                              {task.assigned ? `Assigned: ${task.assigned}` : ""}
                            </small>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </StrictModeDroppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* OTHER PAGES */}
      {activePage !== "kanban" && (
        <div className="pd-placeholder">
          <p>This is the {activePage} page.</p>
        </div>
      )}
    </div>
  );
}

export default ProjectDashboard;
