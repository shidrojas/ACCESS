"use client";
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import "./TPD.css";

// ────────────────────────────────────────────────
// Initial data
// ────────────────────────────────────────────────
const teacherInitialTasks = {
  todo: [
    { 
      id: "1", 
      content: "Sample task 1", 
      description: "Describe the task", 
      assigned: ["John Doe"], 
      due: "2025-10-10", 
      status: "To Do", 
      attachments: [], 
      comments: [] 
    },
    { 
      id: "2", 
      content: "Sample task 2", 
      description: "Describe the task", 
      assigned: ["Jane Smith", "Michael Reyes"], 
      due: "2025-10-15", 
      status: "To Do", 
      attachments: [], 
      comments: [] 
    }
  ],
  inprogress: [],
  review: [],
  done: []
};

const teacherColumns = [
  { key: "todo", label: "To Do", color: "#20c5e0" },
  { key: "inprogress", label: "In Progress", color: "#fd8d32" },
  { key: "review", label: "For Review", color: "#e15050" },
  { key: "done", label: "Done", color: "#69d186" }
];

const archivedTasksData = [
  { id: "a1", content: "Create grading rubric", description: "Design the grading rubric for midterm", assigned: ["Jane Smith"], due: "2025-08-10", status: "Done", archivedDate: "2025-08-15", attachments: [{ name: "rubric_final.pdf" }], comments: [] },
  { id: "a2", content: "Prepare syllabus", description: "Finalize the course syllabus for fall semester", assigned: ["John Doe"], due: "2025-07-20", status: "Done", archivedDate: "2025-07-25", attachments: [], comments: [{ user: "John Doe", text: "Syllabus approved by dept head", time: "11:00 AM" }] },
  { id: "a3", content: "Team onboarding docs", description: "Write the onboarding documentation for new members", assigned: ["Michael Reyes"], due: "2025-06-30", status: "Done", archivedDate: "2025-07-05", attachments: [{ name: "onboarding_guide.docx" }], comments: [] },
  { id: "a4", content: "Setup classroom tools", description: "Configure all classroom software tools", assigned: ["Jane Smith", "Michael Reyes"], due: "2025-06-15", status: "Done", archivedDate: "2025-06-20", attachments: [], comments: [] },
  { id: "a5", content: "Initial project planning", description: "Define project scope and initial timeline", assigned: ["John Doe", "Jane Smith"], due: "2025-05-30", status: "Done", archivedDate: "2025-06-01", attachments: [{ name: "project_plan.xlsx" }], comments: [{ user: "Jane Smith", text: "Timeline looks good", time: "3:15 PM" }] }
];

const teamMembers = [
  { name: "John Doe", email: "johndoe@gmail.com", avatar: "JD" },
  { name: "Jane Smith", email: "janesmith@gmail.com", avatar: "JS" },
  { name: "Michael Reyes", email: "michaelreyes@gmail.com", avatar: "MR" }
];

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const isOverdue = (dueDate) => {
  if (!dueDate || dueDate === "TBD") return false;
  return new Date(dueDate) < new Date();
};

const getAssignedDisplay = (assigned) => {
  if (Array.isArray(assigned)) return assigned.length > 0 ? assigned.join(", ") : "\u2014";
  return assigned || "\u2014";
};

const getInitials = (name) => name.split(" ").map(n => n[0]).join("").toUpperCase();

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "TBD") return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ────────────────────────────────────────────────
// Add Task Modal
// ────────────────────────────────────────────────
function AddTaskModal({ show, onClose, onSave, projectName }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [due, setDue] = useState("");
  const [status, setStatus] = useState("To Do");
  const [attachments, setAttachments] = useState([]);

  if (!show) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const updated = [...prev];
      if (updated[index]?.previewUrl) URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleAssignedChange = (e) => {
    const selected = Array.from(e.target.options).filter(o => o.selected).map(o => o.value);
    setAssigned(selected);
  };

  const handleSave = () => {
    if (!subject.trim()) return;
    const newTask = { id: Date.now().toString(), content: subject, description, assigned, due: due || "TBD", status, attachments: attachments.map(a => ({ name: a.name })), comments: [] };
    onSave(newTask);
    attachments.forEach(att => att.previewUrl && URL.revokeObjectURL(att.previewUrl));
    setSubject(""); setDescription(""); setAssigned([]); setDue(""); setStatus("To Do"); setAttachments([]);
    onClose();
  };

  return (
    <div className="teacher-modal-backdrop">
      <div className="teacher-modal-window teacher-task-popup" style={{ width: '1100px', maxHeight: '85vh' }}>
        <div className="teacher-modal-header">CREATE USER STORY</div>
        <div className="teacher-task-grid">
          <div className="teacher-task-main">
            <label className="teacher-modal-label">Project Name</label>
            <div className="teacher-modal-input" style={{ background: '#f5f5f5', padding: '10px 14px' }}>{projectName || "SAMPLE PROJECT 1"}</div>
            <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
              <div style={{ flex: 1 }}>
                <label className="teacher-modal-label">Assign to</label>
                <select multiple className="teacher-modal-input" value={assigned} onChange={handleAssignedChange} style={{ height: '140px' }}>
                  {teamMembers.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="teacher-modal-label">Due Date</label>
                <input type="date" className="teacher-modal-input" value={due} onChange={e => setDue(e.target.value)} />
              </div>
            </div>
            <label className="teacher-modal-label">Subject</label>
            <input className="teacher-modal-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="enter the subject of the task" autoFocus />
            <label className="teacher-modal-label">Status</label>
            <select className="teacher-modal-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option>To Do</option><option>In Progress</option><option>For Review</option><option>Done</option>
            </select>
            <label className="teacher-modal-label">Task Description</label>
            <textarea className="teacher-modal-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the task" rows={4} />
            <label className="teacher-modal-label">Attachments</label>
            <div className="teacher-task-attachments" style={{ border: '2px dashed #999', borderRadius: '8px', padding: '20px', textAlign: 'center', minHeight: '140px' }}>
              <p>Drop files or <label style={{ color: '#20c5e0', cursor: 'pointer' }}>Browse<input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} /></label></p>
              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {att.previewUrl ? <img src={att.previewUrl} alt={att.name} style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '6px' }} /> : <div style={{ width: '100px', height: '70px', background: '#eee', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>File</div>}
                      <button onClick={() => removeAttachment(idx)} style={{ position: 'absolute', top: -6, right: -6, background: '#e74c3c', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px' }}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="teacher-modal-btns">
          <button className="teacher-btn teacher-cancel-btn" onClick={onClose}>CANCEL</button>
          <button className="teacher-btn teacher-save-btn" onClick={handleSave}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Task Detail Modal
// ────────────────────────────────────────────────
function TeacherTaskDetailModal({ show, onClose, task, setTask, onSave }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");

  if (!show || !task) return null;

  const handleChange = (field, value) => setTask(prev => ({ ...prev, [field]: value }));

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setTask(prev => ({ ...prev, comments: [...(prev.comments || []), { user: "You", text: newComment, time: new Date().toLocaleTimeString() }] }));
    setNewComment("");
  };

  const handleAttachmentUpload = (e) => {
    const files = Array.from(e.target.files || []);
    setTask(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...files.map(f => ({ name: f.name }))] }));
    e.target.value = null;
  };

  const handleRemoveAttachment = (index) => {
    setTask(prev => { const updated = [...(prev.attachments || [])]; updated.splice(index, 1); return { ...prev, attachments: updated }; });
  };

  return (
    <div className="teacher-modal-backdrop">
      <div className="teacher-modal-window teacher-task-popup" style={{ width: '1100px', height: '85vh', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
        <div className="teacher-overview-header">USER STORY OVERVIEW</div>
        <div className="teacher-overview-top">
          <div className="teacher-overview-card">
            <p><strong>Project Name</strong></p>
            <p style={{ marginBottom: "20px" }}>{task.projectName || "SAMPLE PROJECT 1"}</p>
            <div style={{ marginTop: "20px" }}><p><strong>Subject</strong></p><p style={{ fontWeight: 500 }}>{task.content}</p></div>
            <div style={{ marginTop: "20px" }}><p><strong>Due Date</strong></p><p style={{ fontWeight: 500 }}>{task.due || "\u2014"}</p></div>
          </div>
          <div className="teacher-overview-status">
            <label>Status</label>
            <select value={task.status} onChange={e => handleChange("status", e.target.value)} style={{ background: '#1e1e1e', color: 'white', border: '1px solid #444', padding: '10px 12px', fontSize: '14px', width: '100%', appearance: 'none' }}>
              <option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="For Review">For Review</option><option value="Done">Done</option>
            </select>
          </div>
          <div className="teacher-overview-assigned">
            <h4>Assigned to</h4>
            <div className="teacher-assigned-user">
              <div className="teacher-avatar" />
              <div>
                <p>{getAssignedDisplay(task.assigned)}</p>
                <small>{Array.isArray(task.assigned) ? task.assigned.map(n => n.toLowerCase().replace(/\s+/g, '') + "@gmail.com").join(", ") : (task.assigned?.toLowerCase().replace(/\s+/g, '') + "@gmail.com" || "")}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="teacher-tabs">
          {["overview", "materials", "history", "comments"].map(tab => (
            <span key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {tab === "overview" ? "TASK OVERVIEW" : tab.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="teacher-tab-content">
          {activeTab === "overview" && (<div><label className="teacher-modal-label">Task Description</label><textarea className="teacher-modal-textarea" value={task.description || ""} onChange={e => handleChange("description", e.target.value)} placeholder="Describe the task" rows={5} /></div>)}
          {activeTab === "materials" && (<div><label className="teacher-modal-label">Attachments</label><div className="teacher-attachment-box"><p>Drop files or <label className="browse-link">Browse<input type="file" multiple hidden onChange={handleAttachmentUpload} /></label></p></div>{(task.attachments || []).map((att, idx) => (<div key={idx} className="teacher-attachment-item">{att.name}<button onClick={() => handleRemoveAttachment(idx)}>&times;</button></div>))}</div>)}
          {activeTab === "history" && (<p style={{ color: '#777', textAlign: 'center', padding: '40px 0' }}>History / Activity log (coming soon)</p>)}
          {activeTab === "comments" && (<div><div className="teacher-comments-box">{(task.comments || []).map((c, idx) => (<div key={idx} className="teacher-comment-item"><b>{c.user}</b> <span>{c.time}</span><p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>{c.text}</p></div>))}</div><textarea className="teacher-modal-textarea" placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ marginTop: '16px' }} /><button className="teacher-btn teacher-save-btn" onClick={handleAddComment} style={{ marginTop: '12px' }}>Add Comment</button></div>)}
        </div>
        <div style={{ position: "absolute", bottom: "20px", right: "20px", display: "flex", gap: "12px", background: "white", padding: "10px" }}>
          <button className="teacher-btn teacher-cancel-btn" onClick={onClose}>CANCEL</button>
          <button className="teacher-btn teacher-save-btn" onClick={onSave}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Overview Page Component - Team Members removed, All Tasks Overview moved
// ────────────────────────────────────────────────
function OverviewPage({ project, teacherTasks, totalTasks, completed, inReview, overdue, inProgress, onAddTask }) {
  const allTasks = Object.values(teacherTasks).flat();
  const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  return (
    <div className="tpd-overview">
      {/* Welcome Banner */}
      <div className="tpd-welcome-banner">
        <div className="tpd-welcome-left">
          <span className="tpd-welcome-badge">Project Dashboard</span>
          <h2 className="tpd-welcome-title">Welcome back, {project?.teacherName || "Teacher"}</h2>
          <p className="tpd-welcome-subtitle">Here is what is happening with your project today.</p>
        </div>
        <div className="tpd-welcome-actions">
          <button className="tpd-btn-primary" onClick={onAddTask}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="tpd-stats-row">
        <div className="tpd-stat-card tpd-stat-total">
          <div className="tpd-stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Total Tasks</span>
            <span className="tpd-stat-number">{totalTasks}</span>
          </div>
          <div className="tpd-stat-badge neutral">{totalTasks} total</div>
        </div>

        <div className="tpd-stat-card tpd-stat-progress">
          <div className="tpd-stat-icon progress">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">In Progress</span>
            <span className="tpd-stat-number">{inProgress}</span>
          </div>
          <div className="tpd-stat-badge orange">{inProgress} active</div>
        </div>

        <div className="tpd-stat-card tpd-stat-done">
          <div className="tpd-stat-icon done">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Completed</span>
            <span className="tpd-stat-number">{completed}</span>
          </div>
          <div className="tpd-stat-badge green">{progressPercent}%</div>
        </div>

        <div className="tpd-stat-card tpd-stat-overdue">
          <div className="tpd-stat-icon overdue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Overdue</span>
            <span className="tpd-stat-number">{overdue}</span>
          </div>
          <div className="tpd-stat-badge red">{overdue > 0 ? "Needs attention" : "All clear"}</div>
        </div>
      </div>

      {/* Progress + All Tasks Overview (replacing Team Members) */}
      <div className="tpd-overview-grid">
        <div className="tpd-progress-card">
          <h3 className="tpd-card-title">Project Progress</h3>
          <div className="tpd-progress-ring-wrapper">
            <div className="tpd-progress-ring">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="#20c5e0" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${progressPercent * 3.14} ${314 - progressPercent * 3.14}`}
                  transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
              </svg>
              <span className="tpd-ring-text">{progressPercent}%</span>
            </div>
            <div className="tpd-progress-breakdown">
              {teacherColumns.map(col => {
                const count = teacherTasks[col.key]?.length || 0;
                return (
                  <div className="tpd-breakdown-row" key={col.key}>
                    <span className="tpd-breakdown-dot" style={{ background: col.color }} />
                    <span className="tpd-breakdown-label">{col.label}</span>
                    <span className="tpd-breakdown-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* All Tasks Overview Card - moved to the right column where Team Members used to be */}
        <div className="tpd-team-card" style={{ overflow: 'hidden' }}>
          <h3 className="tpd-card-title">All Tasks Overview</h3>
          <div className="tpd-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table className="tpd-table">
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <tr>
                  <th>Task</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map(task => (
                  <tr key={task.id} className={isOverdue(task.due) ? "tpd-row-overdue" : ""}>
                    <td className="tpd-task-name">{task.content}</td>
                    <td>
                      <div className="tpd-avatar-stack">
                        {(Array.isArray(task.assigned) ? task.assigned : [task.assigned]).filter(Boolean).map(name => (
                          <span className="tpd-mini-avatar" key={name} title={name}>{getInitials(name)}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`tpd-status-pill ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className={isOverdue(task.due) ? "tpd-overdue-text" : ""}>{formatDate(task.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Tasks Table - completely removed */}
    </div>
  );
}

// ────────────────────────────────────────────────
// Settings Page Component
// ────────────────────────────────────────────────
function SettingsPage({ project, settings, setSettings }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Team Member");

  const instructors = [
    { name: "Dr. Sarah Chen", email: "sarah.chen@edu.com", avatar: "SC" },
  ];

  return (
    <div className="tpd-settings">
      <div className="tpd-settings-layout">
        {/* Settings Sidebar */}
        <div className="tpd-settings-sidebar">
          <h3 className="tpd-settings-sidebar-title">Settings</h3>
          {[
            { key: "general", label: "General", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg> },
            { key: "members", label: "Members", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { key: "danger", label: "Danger Zone", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }
          ].map(item => (
            <button key={item.key} className={`tpd-settings-nav-item ${activeSettingsTab === item.key ? "active" : ""}`} onClick={() => setActiveSettingsTab(item.key)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="tpd-settings-content">
          {activeSettingsTab === "general" && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title">General Settings</h3>
              <p className="tpd-settings-desc">Manage your project details and preferences.</p>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Name</label>
                <input className="tpd-form-input" value={settings.projectName} onChange={e => setSettings(s => ({ ...s, projectName: e.target.value }))} />
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Code</label>
                <div className="tpd-code-field">
                  <input className="tpd-form-input tpd-code-input" value={settings.projectCode} onChange={e => setSettings(s => ({ ...s, projectCode: e.target.value }))} placeholder="e.g. PRJ-2025-001" />
                  <button className="tpd-copy-btn" onClick={() => { navigator.clipboard.writeText(settings.projectCode); }} title="Copy project code">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>
                  </button>
                </div>
                <span className="tpd-form-hint">Share this code with team members to join the project.</span>
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Description</label>
                <textarea className="tpd-form-textarea" rows={3} value={settings.projectDescription} onChange={e => setSettings(s => ({ ...s, projectDescription: e.target.value }))} placeholder="Describe your project..." />
              </div>

              <button className="tpd-btn-primary" style={{ marginTop: 8 }}>Save Changes</button>
            </div>
          )}

          {activeSettingsTab === "members" && (
            <div className="tpd-settings-section">
              <div className="tpd-members-header">
                <div>
                  <h3 className="tpd-settings-title">Members</h3>
                  <p className="tpd-settings-desc">Manage instructors and team members in this project.</p>
                </div>
                <button className="tpd-btn-primary" onClick={() => setShowInviteModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Invite
                </button>
              </div>

              {/* Instructors Section */}
              <div className="tpd-members-group">
                <h4 className="tpd-members-group-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Instructors
                  <span className="tpd-members-count">{instructors.length}</span>
                </h4>
                <div className="tpd-members-list">
                  {instructors.map(member => (
                    <div className="tpd-member-row" key={member.name}>
                      <div className="tpd-member-row-left">
                        <div className="tpd-member-avatar-lg instructor">{member.avatar}</div>
                        <div>
                          <span className="tpd-member-name-lg">{member.name}</span>
                          <span className="tpd-member-email">{member.email}</span>
                        </div>
                      </div>
                      <div className="tpd-member-row-right">
                        <span className="tpd-role-badge instructor">Instructor</span>
                        <button className="tpd-btn-ghost">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Members Section */}
              <div className="tpd-members-group">
                <h4 className="tpd-members-group-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
                  Team Members
                  <span className="tpd-members-count">{teamMembers.length}</span>
                </h4>
                <div className="tpd-members-list">
                  {teamMembers.map(member => (
                    <div className="tpd-member-row" key={member.name}>
                      <div className="tpd-member-row-left">
                        <div className="tpd-member-avatar-lg">{member.avatar}</div>
                        <div>
                          <span className="tpd-member-name-lg">{member.name}</span>
                          <span className="tpd-member-email">{member.email}</span>
                        </div>
                      </div>
                      <div className="tpd-member-row-right">
                        <span className="tpd-role-badge team-member">Member</span>
                        <button className="tpd-btn-ghost">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSettingsTab === "danger" && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title" style={{ color: '#e15050' }}>Danger Zone</h3>
              <p className="tpd-settings-desc">Irreversible and destructive actions. Proceed with caution.</p>

              <div className="tpd-danger-card">
                <div>
                  <h4 className="tpd-danger-title">Archive This Project</h4>
                  <p className="tpd-danger-desc">Mark the project as archived. It will be read-only and hidden from your dashboard.</p>
                </div>
                <button className="tpd-btn-outline-danger">Archive Project</button>
              </div>

              <div className="tpd-danger-card critical">
                <div>
                  <h4 className="tpd-danger-title">Delete This Project</h4>
                  <p className="tpd-danger-desc">Permanently delete the project and all associated data. This cannot be undone.</p>
                </div>
                <button className="tpd-btn-danger">Delete Project</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="teacher-modal-backdrop" onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("Team Member"); }}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()}>
            <div className="tpd-invite-modal-header">
              <h3>Invite Member</h3>
              <button className="tpd-close-btn" onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("Team Member"); }}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div className="tpd-form-group">
                <label className="tpd-form-label">Email Address</label>
                <input
                  className="tpd-form-input"
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="tpd-form-group">
                <label className="tpd-form-label">Role</label>
                <div className="tpd-role-select">
                  <button
                    className={`tpd-role-option ${inviteRole === "Instructor" ? "active instructor" : ""}`}
                    onClick={() => setInviteRole("Instructor")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Instructor</span>
                  </button>
                  <button
                    className={`tpd-role-option ${inviteRole === "Team Member" ? "active member" : ""}`}
                    onClick={() => setInviteRole("Team Member")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <span>Team Member</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="tpd-invite-modal-footer">
              <button className="tpd-btn-outline" onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("Team Member"); }}>Cancel</button>
              <button className="tpd-btn-primary" onClick={() => { setShowInviteModal(false); setInviteEmail(""); setInviteRole("Team Member"); }}>Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Archives Page Component
// ────────────────────────────────────────────────
function ArchivesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArchive, setSelectedArchive] = useState(null);

  const filtered = archivedTasksData.filter(t =>
    t.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getAssignedDisplay(t.assigned).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="tpd-archives">
      {/* Archive Header */}
      <div className="tpd-archive-header">
        <div>
          <h3 className="tpd-archive-title">Archived Tasks</h3>
          <p className="tpd-archive-subtitle">{archivedTasksData.length} completed tasks have been archived.</p>
        </div>
        <div className="tpd-archive-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="tpd-search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input className="tpd-search-input" placeholder="Search archived tasks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Archive Cards */}
      <div className="tpd-archive-grid">
        {filtered.map(task => (
          <div className="tpd-archive-card" key={task.id} onClick={() => setSelectedArchive(task)}>
            <div className="tpd-archive-card-top">
              <span className="tpd-archive-badge">Archived</span>
              <span className="tpd-archive-date">{formatDate(task.archivedDate)}</span>
            </div>
            <h4 className="tpd-archive-card-title">{task.content}</h4>
            <p className="tpd-archive-card-desc">{task.description}</p>
            <div className="tpd-archive-card-footer">
              <div className="tpd-avatar-stack">
                {(Array.isArray(task.assigned) ? task.assigned : [task.assigned]).filter(Boolean).map(name => (
                  <span className="tpd-mini-avatar" key={name} title={name}>{getInitials(name)}</span>
                ))}
              </div>
              <div className="tpd-archive-meta">
                {task.attachments?.length > 0 && (
                  <span className="tpd-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {task.attachments.length}
                  </span>
                )}
                {task.comments?.length > 0 && (
                  <span className="tpd-meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {task.comments.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="tpd-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M21 8v13H3V8" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M23 3H1v5h22V3z" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="10" y1="12" x2="14" y2="12" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <p>No archived tasks found.</p>
        </div>
      )}

      {/* Archive Detail Modal */}
      {selectedArchive && (
        <div className="teacher-modal-backdrop" onClick={() => setSelectedArchive(null)}>
          <div className="tpd-archive-detail" onClick={e => e.stopPropagation()}>
            <div className="tpd-archive-detail-header">
              <div>
                <span className="tpd-archive-badge">Archived</span>
                <h3>{selectedArchive.content}</h3>
              </div>
              <button className="tpd-close-btn" onClick={() => setSelectedArchive(null)}>&times;</button>
            </div>
            <div className="tpd-archive-detail-body">
              <div className="tpd-detail-row">
                <span className="tpd-detail-label">Description</span>
                <p>{selectedArchive.description}</p>
              </div>
              <div className="tpd-detail-row">
                <span className="tpd-detail-label">Assigned To</span>
                <div className="tpd-avatar-stack">
                  {(Array.isArray(selectedArchive.assigned) ? selectedArchive.assigned : []).map(name => (
                    <span className="tpd-mini-avatar" key={name}>{getInitials(name)}</span>
                  ))}
                  <span style={{ marginLeft: 8, color: '#555' }}>{getAssignedDisplay(selectedArchive.assigned)}</span>
                </div>
              </div>
              <div className="tpd-detail-grid">
                <div className="tpd-detail-row"><span className="tpd-detail-label">Due Date</span><p>{formatDate(selectedArchive.due)}</p></div>
                <div className="tpd-detail-row"><span className="tpd-detail-label">Archived On</span><p>{formatDate(selectedArchive.archivedDate)}</p></div>
              </div>
              {selectedArchive.attachments?.length > 0 && (
                <div className="tpd-detail-row">
                  <span className="tpd-detail-label">Attachments</span>
                  {selectedArchive.attachments.map((att, i) => (
                    <div key={i} className="tpd-detail-attachment">{att.name}</div>
                  ))}
                </div>
              )}
              {selectedArchive.comments?.length > 0 && (
                <div className="tpd-detail-row">
                  <span className="tpd-detail-label">Comments</span>
                  {selectedArchive.comments.map((c, i) => (
                    <div key={i} className="tpd-detail-comment"><b>{c.user}</b> <span>{c.time}</span><p>{c.text}</p></div>
                  ))}
                </div>
              )}
            </div>
            <div className="tpd-archive-detail-footer">
              <button className="tpd-btn-outline" onClick={() => setSelectedArchive(null)}>Close</button>
              <button className="tpd-btn-primary">Restore Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Main Dashboard
// ────────────────────────────────────────────────
function TeacherProjectDashboard({ project }) {
  const [teacherTasks, setTeacherTasks] = useState(teacherInitialTasks);
  const [teacherShowModal, setTeacherShowModal] = useState(false);
  const [addShowModal, setAddShowModal] = useState(false);
  const [teacherActivePage, setTeacherActivePage] = useState("overview");
  const [selectedTask, setSelectedTask] = useState(null);
  const [settings, setSettings] = useState({
    projectName: project?.ProjectName || "Sample Project 1",
    projectDescription: "A collaborative project management dashboard for educational teams.",
    projectCode: project?.ProjectCode || "PRJ-2025-001"
  });

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) {
      const updated = Array.from(teacherTasks[source.droppableId]);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      setTeacherTasks({ ...teacherTasks, [source.droppableId]: updated });
      return;
    }
    const sourceTasks = Array.from(teacherTasks[source.droppableId]);
    const destTasks = Array.from(teacherTasks[destination.droppableId]);
    const [movedTask] = sourceTasks.splice(source.index, 1);
    destTasks.splice(destination.index, 0, movedTask);
    setTeacherTasks({ ...teacherTasks, [source.droppableId]: sourceTasks, [destination.droppableId]: destTasks });
  };

  const handleTaskClick = (task) => { setSelectedTask({ ...task, projectName: project?.ProjectName || "SAMPLE PROJECT 1" }); setTeacherShowModal(true); };
  const handleEditSave = () => { setTeacherTasks(prev => { const updated = { ...prev }; Object.keys(updated).forEach(col => { updated[col] = updated[col].map(t => (t.id === selectedTask.id ? selectedTask : t)); }); return updated; }); setTeacherShowModal(false); };
  const handleAddSave = (newTask) => { const columnKey = newTask.status.toLowerCase().replace(/\s+/g, ''); setTeacherTasks(prev => ({ ...prev, [columnKey]: [...(prev[columnKey] || []), newTask] })); };

  const totalTasks = Object.values(teacherTasks).flat().length;
  const completed = teacherTasks.done?.length || 0;
  const inProgress = teacherTasks.inprogress?.length || 0;
  const inReview = teacherTasks.review?.length || 0;
  const overdue = Object.values(teacherTasks).flat().filter(t => isOverdue(t.due)).length;

  return (
    <div className="teacher-pd-bg">
      <header className="teacher-pd-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="teacher-pd-title">{project?.ProjectName || "Project Title"}</div>
          <nav className="teacher-pd-nav">
            {["overview", "kanban", "archives", "settings"].map(page => (
              <a
                key={page}
                href="#"
                className={`teacher-pd-nav-link ${teacherActivePage === page ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherActivePage(page);
                }}
              >
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </a>
            ))}
          </nav>
        </div>

        {teacherActivePage === "kanban" && (
          <button
            className="teacher-btn teacher-add-task-btn"
            onClick={() => setAddShowModal(true)}
          >
            Add Task
          </button>
        )}
      </header>

      <h2 className="teacher-pd-page-title">
        {teacherActivePage.charAt(0).toUpperCase() + teacherActivePage.slice(1)}
      </h2>

      <main className="tpd-main-content">
        {teacherActivePage === "overview" && (
          <OverviewPage
            project={project}
            teacherTasks={teacherTasks}
            totalTasks={totalTasks}
            completed={completed}
            inReview={inReview}
            inProgress={inProgress}
            overdue={overdue}
            onAddTask={() => setAddShowModal(true)}
          />
        )}

        {teacherActivePage === "kanban" && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="teacher-kanban-container">
              {teacherColumns.map(col => (
                <Droppable droppableId={col.key} key={col.key}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="teacher-kanban-column" style={{ background: snapshot.isDraggingOver ? "#2a2a2a" : "#23242b" }}>
                      <div style={{ color: col.color, fontWeight: 600, marginBottom: 12 }}>{col.label} <span style={{ opacity: 0.5, fontWeight: 400 }}>({teacherTasks[col.key].length})</span></div>
                      {teacherTasks[col.key].map((task, idx) => {
                        const taskOverdue = isOverdue(task.due);
                        return (
                          <Draggable key={task.id} draggableId={task.id} index={idx}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`teacher-kanban-task ${snapshot.isDragging ? "dragging" : ""} ${taskOverdue ? "overdue-task" : ""}`} onClick={() => handleTaskClick(task)}>
                                <div>{task.content}</div>
                                <small style={{ opacity: 0.7 }}>Assigned: {getAssignedDisplay(task.assigned)}</small>
                                {taskOverdue && <span className="overdue-badge">Overdue!</span>}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}

        {teacherActivePage === "archives" && <ArchivesPage />}
        {teacherActivePage === "settings" && <SettingsPage project={project} settings={settings} setSettings={setSettings} />}
      </main>

      {teacherShowModal && <TeacherTaskDetailModal show={teacherShowModal} task={selectedTask} setTask={setSelectedTask} onClose={() => setTeacherShowModal(false)} onSave={handleEditSave} />}
      {addShowModal && <AddTaskModal show={addShowModal} onClose={() => setAddShowModal(false)} onSave={handleAddSave} projectName={settings.projectName} />}
    </div>
  );
}

export default TeacherProjectDashboard;
