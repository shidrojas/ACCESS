import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./project-dashboard.css";

const initialTasks = {
  todo: [
    { id: "1", content: "Sample task 1" },
    { id: "2", content: "Sample task 2" }
  ],
  inprogress: [],
  review: [],
  done: []
};

const columns = [
  { key: "todo", label: "To Do", color: "#20c5e0" },
  { key: "inprogress", label: "In Progress", color: "#fd8d32" },
  { key: "review", label: "For Review", color: "#e15050" },
  { key: "done", label: "Done", color: "#69d186" }
];

export default function ProjectDashboard() {
  const [page, setPage] = useState("overview");
  const [tasks, setTasks] = useState(initialTasks);
  const [showInput, setShowInput] = useState(false);
  const [newTask, setNewTask] = useState("");

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId !== destination.droppableId || source.index !== destination.index) {
      const sourceTasks = Array.from(tasks[source.droppableId]);
      const task = sourceTasks[source.index];
      sourceTasks.splice(source.index, 1);

      const destTasks = Array.from(tasks[destination.droppableId]);
      destTasks.splice(destination.index, 0, task);

      setTasks({
        ...tasks,
        [source.droppableId]: sourceTasks,
        [destination.droppableId]: destTasks
      });
    }
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      setTasks({
        ...tasks,
        todo: [...tasks.todo, { id: Date.now().toString(), content: newTask }]
      });
      setNewTask("");
      setShowInput(false);
    }
  };

  return (
    <div className="pd-bg">
      {/* HEADER */}
      <header className="pd-header">
        <div className="pd-title">Project Title</div>

        <nav className="pd-nav">
          <button className={page === "overview" ? "pd-nav-link active" : "pd-nav-link"} onClick={() => setPage("overview")}>Project Overview</button>
          <button className={page === "kanban" ? "pd-nav-link active" : "pd-nav-link"} onClick={() => setPage("kanban")}>Kanban</button>
          <button className={page === "archives" ? "pd-nav-link active" : "pd-nav-link"} onClick={() => setPage("archives")}>Archives</button>
          <button className={page === "settings" ? "pd-nav-link active" : "pd-nav-link"} onClick={() => setPage("settings")}>Settings</button>
        </nav>

        {/* ADD TASK BUTTON */}
        {page === "kanban" && (
          <div className="pd-addtask-wrapper">
            <button className="pd-addtask-btn" onClick={() => setShowInput(true)}>Add Task</button>
          </div>
        )}
      </header>

      {/* PAGE TITLE */}
      <h2 className="pd-page-title">{page.charAt(0).toUpperCase() + page.slice(1)}</h2>

      {/* INPUT FIELD */}
      {showInput && page === "kanban" && (
        <div className="pd-input-box">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="New task subject"
          />
          <button onClick={handleAddTask}>Create</button>
          <button onClick={() => setShowInput(false)}>Cancel</button>
        </div>
      )}

      {/* PAGE CONTENT */}
      {page === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-container">
            {columns.map((col) => (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided) => (
                  <div
                    className="kanban-column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <div className="kanban-column-title" style={{ color: col.color }}>
                      {col.label}
                    </div>

                    {tasks[col.key].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className="kanban-task"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              background: snapshot.isDragging ? "#555" : "#333",
                              boxShadow: snapshot.isDragging ? "0 4px 8px rgba(0,0,0,0.3)" : "none"
                            }}
                          >
                            {task.content}
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="pd-placeholder">This is the {page} page.</div>
      )}
    </div>
  );
}
