// TeacherProjectDashboard.jsx (updated with role-based permissions)

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import "../TeacherProjectForms/TPD.css";

// ────────────────────────────────────────────────
// Initial data (empty - will be populated from API)
// ────────────────────────────────────────────────
const teacherInitialTasks = {
  todo: [],
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

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const isOverdue = (dueDate) => {
  if (!dueDate || dueDate === "TBD") return false;
  return new Date(dueDate) < new Date();
};

const getAssignedDisplay = (assigned) => {
  if (Array.isArray(assigned)) {
    return assigned.length > 0 ? assigned.join(", ") : "—";
  }
  return assigned || "—";
};

const getInitials = (name) => {
  if (!name) return "";
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "TBD") return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Map API status to column keys
const statusToColumn = {
  "To Do": "todo",
  "In Progress": "inprogress",
  "For Review": "review",
  "Done": "done"
};

// Map column keys to API status
const columnToStatus = {
  "todo": "To Do",
  "inprogress": "In Progress",
  "review": "For Review",
  "done": "Done"
};

// Add Task Modal (with attachment support and close button)
function AddTaskModal({ show, onClose, onSave, projectId, projectName, projectMembers, isArchived, currentUserRole }) {
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] = useState("To Do");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");

  // Check if user can add tasks (Host or Co-Host only)
  const canAddTasks = currentUserRole === 'Host' || currentUserRole === 'Co-Host';
  
  if (!show || isArchived || !canAddTasks) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      name: file.name,
      file: file,
      size: file.size,
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploading: false,
      progress: 0
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
    setAssignedTo(selected);
  };

  const uploadAttachments = async (taskId) => {
    if (attachments.length === 0) return [];
    
    setUploading(true);
    const formData = new FormData();
    
    attachments.forEach(att => {
      formData.append('attachments[]', att.file);
    });
    
    formData.append('TaskID', taskId);
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    formData.append('UserID', userId);
    
    try {
      const response = await fetch("http://localhost/PMT/api/tasks/upload_attachment.php", {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      
      if (result.status === "success") {
        return result.uploaded_files || [];
      } else {
        console.error("Upload failed:", result.message);
        return [];
      }
    } catch (err) {
      console.error("Error uploading attachments:", err);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!taskName.trim()) {
      setWarning("Task name is required");
      return;
    }

    if (assignedTo.length === 0) {
      setWarning("Please assign the task to at least one member");
      return;
    }

    setLoading(true);
    setWarning("");

    try {
      const taskData = {
        ProjectID: projectId,
        TaskName: taskName,
        Description: description,
        AssignedTo: assignedTo.join(','),
        Status: status,
        StartDate: startDate || null,
        DueDate: dueDate || null
      };

      const response = await fetch("http://localhost/PMT/api/instructors/create_task.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();

      if (result.status === "success") {
        const newTask = result.task;
        
        // Upload attachments if any
        let uploadedFiles = [];
        if (attachments.length > 0) {
          uploadedFiles = await uploadAttachments(newTask.TaskID);
        }
        
        const formattedTask = {
          id: newTask.TaskID.toString(),
          content: newTask.TaskName,
          description: newTask.Description,
          assigned: newTask.AssignedToNames || [],
          assignedIds: newTask.AssignedToIds || [],
          due: newTask.DueDate || "TBD",
          status: newTask.Status,
          attachments: uploadedFiles.map(f => ({
            id: f.AttachmentID,
            name: f.FileName,
            url: f.FilePath,
            size: f.FileSize,
            uploadedBy: "You",
            uploadedAt: new Date().toISOString()
          })),
          comments: [],
          projectName: projectName,
          projectId: projectId
        };

        onSave(formattedTask);
        
        setTaskName("");
        setDescription("");
        setAssignedTo([]);
        setDueDate("");
        setStartDate("");
        setStatus("To Do");
        setAttachments([]);
        onClose();
      } else {
        setWarning(result.message || "Failed to create task");
      }
    } catch (err) {
      console.error("Error creating task:", err);
      setWarning("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="teacher-modal-backdrop" onClick={onClose}>
      <div className="teacher-modal-window teacher-task-popup" style={{ width: '1100px', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="teacher-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          CREATE USER STORY
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#666',
              lineHeight: 1,
              padding: '0 8px'
            }}
          >
            &times;
          </button>
        </div>

        {warning && <div className="teacher-input-warning">⚠ {warning}</div>}

        <div className="teacher-task-grid">
          <div className="teacher-task-main">
            <label className="teacher-modal-label">Project Name</label>
            <div className="teacher-modal-input" style={{ background: '#f5f5f5', padding: '10px 14px' }}>
              {projectName || "SAMPLE PROJECT 1"}
            </div>

            <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
              <div style={{ flex: 1 }}>
                <label className="teacher-modal-label">Assign to</label>
                <select
                  multiple
                  className="teacher-modal-input"
                  value={assignedTo}
                  onChange={handleAssignedChange}
                  style={{ height: '120px' }}
                >
                  {projectMembers && projectMembers.map(member => (
                    <option key={member.UserID} value={member.UserID}>
                      {member.FirstName} {member.LastName}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Hold Ctrl/Cmd to select multiple
                </small>
              </div>

              <div style={{ flex: 1 }}>
                <label className="teacher-modal-label">Due Date</label>
                <input
                  type="date"
                  className="teacher-modal-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="teacher-modal-label">Start Date (Optional)</label>
              <input
                type="date"
                className="teacher-modal-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <label className="teacher-modal-label">Subject</label>
            <input
              className="teacher-modal-input"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="Enter the subject of the task"
              autoFocus
            />

            <label className="teacher-modal-label">Status</label>
            <select className="teacher-modal-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option>To Do</option>
              <option>In Progress</option>
              <option>For Review</option>
              <option>Done</option>
            </select>

            <label className="teacher-modal-label">Task Description</label>
            <textarea
              className="teacher-modal-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the task"
              rows={4}
            />

            <label className="teacher-modal-label">Attachments</label>
            <div className="teacher-task-attachments" style={{ 
              border: '2px dashed #999', 
              borderRadius: '8px', 
              padding: '20px', 
              textAlign: 'center', 
              minHeight: '140px',
              backgroundColor: '#f9f9f9'
            }}>
              <p>Drop files or <label style={{ color: '#20c5e0', cursor: 'pointer' }}>Browse
                <input type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
              </label></p>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} style={{ 
                      position: 'relative', 
                      width: '100px', 
                      backgroundColor: '#f0f0f0', 
                      borderRadius: '6px', 
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      {att.previewUrl ? (
                        <img src={att.previewUrl} alt={att.name} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          background: '#ddd', 
                          borderRadius: '4px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#666'
                        }}>
                          {att.name.split('.').pop().toUpperCase()}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {att.name}
                      </div>
                      <div style={{ fontSize: '9px', color: '#888' }}>
                        {formatFileSize(att.size)}
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        style={{ 
                          position: 'absolute', 
                          top: -6, 
                          right: -6, 
                          background: '#e74c3c', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '50%', 
                          width: '20px', 
                          height: '20px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px'
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="teacher-modal-btns">
          <button className="teacher-btn teacher-cancel-btn" onClick={onClose} disabled={loading || uploading}>
            CANCEL
          </button>
          <button 
            className="teacher-btn teacher-save-btn" 
            onClick={handleSave}
            disabled={loading || uploading}
          >
            {loading ? "SAVING..." : uploading ? "UPLOADING..." : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Task Detail Modal (with comments, attachments, close button, and archive/restore)
function TeacherTaskDetailModal({ show, onClose, task, setTask, onSave, onArchiveTask, onRestoreTask, projectMembers, isArchived, currentUserRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [canUpdateStatus, setCanUpdateStatus] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionReason, setPermissionReason] = useState("");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [autoMoveCompleted, setAutoMoveCompleted] = useState(false);

  // Check if current user is host or co-host
  const canArchive = currentUserRole === 'Host' || currentUserRole === 'Co-Host';
  
  // Check if current user can edit task details (subject, due date, description, assignees)
  const canEdit = currentUserRole === 'Host' || currentUserRole === 'Co-Host';

  // Check if current user is assigned to this task
  const isAssigned = () => {
    if (!task || !task.assignedIds) return false;
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    return task.assignedIds.includes(userId);
  };

  // Check if task is in To Do status
  const isInToDo = task?.status === 'To Do';

  useEffect(() => {
    if (task) {
      if (task.assignedIds && Array.isArray(task.assignedIds)) {
        setSelectedAssignees(task.assignedIds);
      } else if (task.assigned && Array.isArray(task.assigned)) {
        const ids = [];
        task.assigned.forEach(name => {
          const member = projectMembers?.find(m => `${m.FirstName} ${m.LastName}` === name);
          if (member) ids.push(member.UserID);
        });
        setSelectedAssignees(ids);
      } else {
        setSelectedAssignees([]);
      }
      
      // Initialize attachments and comments from task prop
      setAttachments(task.attachments || []);
      setComments(task.comments || []);
    }
  }, [task, projectMembers]);

// In TeacherTaskDetailModal component, update the useEffect that handles auto-move
useEffect(() => {
  if (show && task) {
    fetchAttachments();
    fetchComments();
    checkUpdateStatusPermission();
    
    // Auto-move to In Progress if user is assigned and task is in To Do
    // Add a small delay to ensure everything is loaded
    const timer = setTimeout(() => {
      if (!isArchived && isAssigned() && isInToDo && !autoMoveCompleted) {
        console.log("Auto-moving task to In Progress...");
        handleAutoMoveToInProgress();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [show, task?.id]);

const handleAutoMoveToInProgress = async () => {
  // Prevent multiple auto-move attempts
  if (autoMoveCompleted) return;
  setAutoMoveCompleted(true);
  
  setLoading(true);
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    console.log("Auto-moving task:", { 
      taskId: task.id, 
      userId,
      currentStatus: task.status 
    });

    // Check if user has permission to update this task
    // Assigned users should be able to move from To Do to In Progress
    const response = await fetch("http://localhost/PMT/api/general/update_task.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: parseInt(task.id),
        ProjectID: task.projectId,
        Status: "In Progress",
        UserID: userId
      })
    });

    const responseText = await response.text();
    console.log("Auto-move raw response:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error in auto-move:", parseError);
      throw new Error("Server returned invalid JSON");
    }

    if (result.status === "success") {
      // Update local task
      setTask(prev => ({ ...prev, status: "In Progress" }));
      
      // Also update the task in the parent component
      if (onSave) {
        onSave();
      }
      
      console.log("Task auto-moved to In Progress successfully");
    } else {
      console.error("Failed to auto-move task:", result.message);
      setAutoMoveCompleted(false); // Allow retry on failure
      alert("Failed to auto-move task: " + (result.message || "Unknown error"));
    }
  } catch (err) {
    console.error("Error auto-moving task:", err);
    setAutoMoveCompleted(false); // Allow retry on failure
    alert(`Error auto-moving task: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
  const checkUpdateStatusPermission = async () => {
    if (!task?.id) return;
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    
    if (!userId) return;
    
    try {
      console.log("Checking permissions for task:", task.id, "user:", userId);
      
      const response = await fetch(
        `http://localhost/PMT/api/activities/get_task_permissions.php?TaskID=${task.id}&UserID=${userId}&ProjectID=${task.projectId}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Permission check result:", result);
      
      if (result.status === "success") {
        setCanUpdateStatus(result.can_update_status === true);
      }
    } catch (err) {
      console.error("Error checking permissions:", err);
    }
  };

  const fetchAttachments = async () => {
    if (!task?.id) return;
    
    setLoadingAttachments(true);
    try {
      const response = await fetch(
        `http://localhost/PMT/api/tasks/get_attachments.php?TaskID=${task.id}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        setAttachments(result.attachments);
      }
    } catch (err) {
      console.error("Error fetching attachments:", err);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const fetchComments = async () => {
    if (!task?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(
        `http://localhost/PMT/api/tasks/get_comments.php?TaskID=${task.id}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        setComments(result.comments);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

const handleRequestPermission = async () => {
  setRequestingPermission(true);
  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    console.log("Sending permission request to:", "http://localhost/PMT/api/activities/request_permission.php");
    console.log("Request body:", JSON.stringify({
      TaskID: parseInt(task.id),
      UserID: userId
    }));

    const response = await fetch("http://localhost/PMT/api/activities/request_permission.php", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: parseInt(task.id),
        UserID: userId
      })
    });

    console.log("Response status:", response.status);
    
    // Get the response text first
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    // Check if response is HTML (starts with <)
    if (responseText.trim().startsWith('<')) {
      console.error("Server returned HTML instead of JSON:", responseText.substring(0, 200));
      throw new Error(`Server returned HTML. This usually means a PHP error occurred. Check your server error logs.`);
    }

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
    }

    if (result.status === "success") {
      alert("Permission request sent successfully to project hosts!");
      setShowPermissionModal(false);
      
      // Log success
      console.log("Permission request sent successfully");
    } else {
      alert(result.message || "Failed to send request");
    }
  } catch (err) {
    console.error("Error requesting permission:", err);
    alert(`Error: ${err.message}`);
  } finally {
    setRequestingPermission(false);
  }
};

  if (!show || !task) return null;

  const handleChange = (field, value) => {
    if (isArchived || !canEdit) return;
    setTask(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
  };

  const handleAssigneeToggle = (memberId) => {
    if (isArchived || !canEdit) return;
    
    setSelectedAssignees(prev => {
      const newSelected = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      
      const assignedNames = newSelected.map(id => {
        const member = projectMembers.find(m => m.UserID === id);
        return member ? `${member.FirstName} ${member.LastName}` : '';
      }).filter(name => name);
      
      setTask(prevTask => ({
        ...prevTask,
        assigned: assignedNames,
        assignedIds: newSelected
      }));
      
      return newSelected;
    });
  };

  const handleAddComment = async () => {
    if (isArchived) {
      alert("Cannot add comments to archived projects");
      return;
    }
    if (!newComment.trim()) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("http://localhost/PMT/api/tasks/add_comment.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: parseInt(task.id),
          UserID: userId,
          Comment: newComment
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        setComments(prev => [...prev, result.comment]);
        setNewComment("");
      } else {
        alert(result.message || "Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleAttachmentUpload = async (e) => {
    if (isArchived) {
      alert("Cannot add attachments to archived projects");
      return;
    }

    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('attachments[]', file);
    });
    
    formData.append('TaskID', task.id);
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    formData.append('UserID', userId);

    try {
      const response = await fetch("http://localhost/PMT/api/tasks/upload_attachment.php", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.status === "success") {
        await fetchAttachments();
      } else {
        alert(result.message || "Failed to upload attachments");
      }
    } catch (err) {
      console.error("Error uploading attachments:", err);
      alert("Network error. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (isArchived) return;

    if (!window.confirm("Are you sure you want to remove this attachment?")) return;

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("http://localhost/PMT/api/tasks/delete_attachment.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AttachmentID: attachmentId,
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        setAttachments(prev => prev.filter(a => a.AttachmentID !== attachmentId));
      } else {
        alert(result.message || "Failed to delete attachment");
      }
    } catch (err) {
      console.error("Error deleting attachment:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleSave = async () => {
    if (isArchived) {
      alert("Cannot modify archived project");
      return;
    }
    if (!canEdit) {
      alert("Only hosts and co-hosts can edit task details");
      return;
    }
    setLoading(true);
    try {
      const assignedIds = selectedAssignees.length > 0 ? selectedAssignees.join(',') : '';

      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const updateData = {
        TaskID: parseInt(task.id),
        ProjectID: task.projectId,
        TaskName: task.content,
        Description: task.description,
        Status: task.status,
        DueDate: task.due !== "TBD" ? task.due : null,
        AssignedTo: assignedIds,
        UserID: userId
      };

      const response = await fetch("http://localhost/PMT/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (result.status === "success") {
        onSave();
      } else {
        alert(result.message || "Failed to update task");
      }
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAttachment = (filePath, fileName) => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="teacher-modal-backdrop" onClick={onClose}>
      <div 
        className="teacher-modal-window teacher-task-popup"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(1100px, 95vw)',
          height: 'min(95vh, 900px)',
          maxHeight: '95vh',
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: 'clamp(12px, 3vw, 24px)'
        }}
      >
        <div className="teacher-overview-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'clamp(12px, 2vh, 20px)'
        }}>
          <span style={{ fontSize: 'clamp(16px, 2vw, 20px)' }}>
            USER STORY OVERVIEW
            {!isArchived && !canEdit && (
              <span style={{ 
                marginLeft: '12px', 
                fontSize: '12px', 
                color: '#888',
                fontWeight: 'normal'
              }}>
                (View Only - Members cannot edit)
              </span>
            )}
          </span>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#666',
              lineHeight: 1,
              padding: '0 8px'
            }}
          >
            &times;
          </button>
        </div>

        {/* Auto-move in progress indicator */}
        {loading && isAssigned() && isInToDo && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            background: '#e8f8fb',
            border: '1px solid #20c5e0',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#0a5d7e',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="loading-indicator" style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(32,197,224,0.3)',
              borderTopColor: '#20c5e0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Moving task to In Progress...</span>
          </div>
        )}

        {/* Two Column Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 'clamp(12px, 2vw, 20px)',
          marginBottom: 'clamp(12px, 2vh, 20px)'
        }}>
          {/* Left Column - Project Details */}
          <div className="teacher-overview-card" style={{ 
            margin: 0, 
            padding: 'clamp(12px, 2vw, 16px)',
            height: 'fit-content'
          }}>
            <p><strong>Project Name</strong></p>
            <p style={{ marginBottom: "clamp(12px, 2vh, 20px)" }}>
              {task.projectName || "SAMPLE PROJECT 1"}
            </p>

            <div style={{ marginTop: "clamp(12px, 2vh, 20px)" }}>
              <p><strong>Subject</strong></p>
              <input
                type="text"
                className="teacher-modal-input"
                value={task.content || ""}
                onChange={e => handleChange("content", e.target.value)}
                placeholder="Enter task subject"
                style={{ 
                  width: '100%', 
                  marginTop: '5px',
                  backgroundColor: (isArchived || !canEdit) ? '#f5f5f5' : '#fff'
                }}
                disabled={isArchived || !canEdit}
                readOnly={isArchived || !canEdit}
              />
              {!canEdit && !isArchived && (
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  Only hosts and co-hosts can edit the subject
                </small>
              )}
            </div>

            <div style={{ marginTop: "clamp(12px, 2vh, 20px)" }}>
              <p><strong>Due Date</strong></p>
              <input
                type="date"
                className="teacher-modal-input"
                value={task.due !== "TBD" ? task.due : ""}
                onChange={e => handleChange("due", e.target.value)}
                style={{ 
                  width: '100%', 
                  marginTop: '5px',
                  backgroundColor: (isArchived || !canEdit) ? '#f5f5f5' : '#fff'
                }}
                disabled={isArchived || !canEdit}
                readOnly={isArchived || !canEdit}
              />
              {!canEdit && !isArchived && (
                <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                  Only hosts and co-hosts can edit the due date
                </small>
              )}
            </div>

            {/* // In TeacherTaskDetailModal component, find the Status section and update it: */}

            {/* Status */}
            <div style={{ marginTop: "clamp(12px, 2vh, 20px)" }}>
              <p><strong>Status</strong></p>
              <select
                value={task.status}
                onChange={e => handleChange("status", e.target.value)}
                style={{
                  background: '#1e1e1e',
                  color: 'white',
                  border: '1px solid #444',
                  padding: '10px 12px',
                  fontSize: '14px',
                  width: '100%',
                  appearance: 'none',
                  borderRadius: '8px',
                  marginTop: '5px'
                }}
                disabled={isArchived || (!canEdit && !canUpdateStatus)}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="For Review">For Review</option>
                <option value="Done">Done</option>
              </select>
              
              {/* Permission Request Button - Show ONLY when task is "In Progress" */}
              {!isArchived && !canEdit && !canUpdateStatus && task.status === 'In Progress' && (
                <button
                  onClick={() => setShowPermissionModal(true)}
                  style={{
                    marginTop: '12px',
                    background: '#f0f0f3',
                    color: '#666',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#e8e8e8'}
                  onMouseLeave={e => e.target.style.background = '#f0f0f3'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Request Permission to Update Status
                </button>
              )}
              
              {/* Show message for To Do and For Review tasks */}
              {!isArchived && !canEdit && !canUpdateStatus && (task.status === 'To Do' || task.status === 'For Review') && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#888',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  {task.status === 'To Do' ? (
                    <>Move the task to <strong>In Progress</strong> first to request permission</>
                  ) : (
                    <>Permission requests are only available for <strong>In Progress</strong> tasks</>
                  )}
                </div>
              )}
            </div>

            {/* Archive Button */}
            {!isArchived && canArchive && (
              <div style={{ marginTop: "clamp(12px, 2vh, 20px)" }}>
                {task.status !== 'Archived' ? (
                  <button 
                    className="tpd-btn-outline-danger"
                    onClick={() => onArchiveTask(task.id)}
                    style={{ 
                      fontSize: '12px', 
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 8v13H3V8" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M23 3H1v5h22V3z" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="10" y1="12" x2="14" y2="12" strokeLinecap="round"/>
                    </svg>
                    Archive Task
                  </button>
                ) : (
                  <button 
                    className="tpd-btn-primary"
                    onClick={() => onRestoreTask(task.id)}
                    style={{ 
                      fontSize: '12px', 
                      padding: '10px 16px',
                      backgroundColor: '#20c5e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 12h18M12 3v18" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Restore Task
                  </button>
                )}
              </div>
            )}
            
            {/* Message for non-hosts */}
            {!isArchived && !canArchive && task.status !== 'Archived' && (
              <div style={{
                marginTop: "clamp(12px, 2vh, 20px)",
                padding: '10px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#666',
                textAlign: 'center'
              }}>
                Only project hosts and co-hosts can archive tasks
              </div>
            )}
          </div>

          {/* Right Column - Assigned To */}
          <div className="teacher-overview-assigned" style={{ 
            margin: 0, 
            maxHeight: 'none', 
            height: 'fit-content',
            padding: 'clamp(12px, 2vw, 16px)'
          }}>
            <h4>
              Assigned to 
              {isArchived ? " (View Only)" : !canEdit ? " (View Only - Members cannot edit)" : " (select multiple)"}
            </h4>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '8px'
            }}>
              {projectMembers && projectMembers.map(member => {
                const isSelected = selectedAssignees.includes(member.UserID);
                return (
                  <div 
                    key={member.UserID} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#f0f7ff' : 'transparent',
                      cursor: (isArchived || !canEdit) ? 'default' : 'pointer',
                      marginBottom: '2px',
                      opacity: (isArchived || !canEdit) && !isSelected ? 0.7 : 1
                    }}
                    onClick={() => !isArchived && canEdit && handleAssigneeToggle(member.UserID)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => !isArchived && canEdit && handleAssigneeToggle(member.UserID)}
                      disabled={isArchived || !canEdit}
                      style={{ 
                        marginRight: '12px', 
                        cursor: (isArchived || !canEdit) ? 'default' : 'pointer' 
                      }}
                    />
                    <div>
                      <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                        {member.FirstName} {member.LastName}
                      </span>
                      {member.ProjectRole === 'Host' && (
                        <span style={{ 
                          marginLeft: '8px',
                          fontSize: '11px',
                          background: '#1a1a2e',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Host
                        </span>
                      )}
                      {member.ProjectRole === 'Co-Host' && (
                        <span style={{ 
                          marginLeft: '8px',
                          fontSize: '11px',
                          background: '#e8f8fb',
                          color: '#0ea5c7',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Co-Host
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Selected Summary */}
            {selectedAssignees && selectedAssignees.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '13px', color: '#555' }}>Selected ({selectedAssignees.length}):</strong>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px', 
                  marginTop: '8px',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {selectedAssignees.map(id => {
                    const member = projectMembers?.find(m => m.UserID === id);
                    return member ? (
                      <span 
                        key={id} 
                        style={{
                          background: '#e0e0e0',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {member.FirstName} {member.LastName}
                        {!isArchived && canEdit && (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssigneeToggle(member.UserID);
                            }}
                            style={{
                              marginLeft: '4px',
                              cursor: 'pointer',
                              color: '#666',
                              fontSize: '14px'
                            }}
                          >
                            ×
                          </span>
                        )}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            {!canEdit && !isArchived && (
              <div style={{
                marginTop: '16px',
                padding: '8px',
                background: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#888',
                textAlign: 'center'
              }}>
                Only hosts and co-hosts can modify assignees
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="teacher-tabs" style={{ 
          marginTop: 'clamp(8px, 1.5vh, 16px)',
          padding: '0',
          gap: 'clamp(10px, 2vw, 20px)',
          flexWrap: 'wrap'
        }}>
          <span 
            className={activeTab === "overview" ? "active" : ""} 
            onClick={() => setActiveTab("overview")}
            style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
          >
            TASK OVERVIEW
          </span>
          <span 
            className={activeTab === "materials" ? "active" : ""} 
            onClick={() => setActiveTab("materials")}
            style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
          >
            MATERIALS ({attachments.length})
          </span>
          <span 
            className={activeTab === "comments" ? "active" : ""} 
            onClick={() => setActiveTab("comments")}
            style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
          >
            COMMENTS ({comments.length})
          </span>
        </div>

        {/* Tab Content */}
        <div className="teacher-tab-content" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: 'clamp(8px, 1.5vh, 16px) 0',
          minHeight: '200px'
        }}>
          {activeTab === "overview" && (
            <div>
              <label className="teacher-modal-label">Task Description</label>
              <textarea
                className="teacher-modal-textarea"
                value={task.description || ""}
                onChange={e => handleChange("description", e.target.value)}
                placeholder="Describe the task"
                rows={4}
                style={{ 
                  resize: 'vertical',
                  minHeight: '80px',
                  width: '100%',
                  padding: '10px',
                  fontFamily: 'inherit',
                  marginBottom: '16px',
                  backgroundColor: (isArchived || !canEdit) ? '#f5f5f5' : '#fff'
                }}
                disabled={isArchived || !canEdit}
                readOnly={isArchived || !canEdit}
              />
              {!canEdit && !isArchived && (
                <small style={{ color: '#999', display: 'block', marginBottom: '16px' }}>
                  Only hosts and co-hosts can edit the task description
                </small>
              )}
              
              {/* Save and Cancel buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: '8px',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}
              >
                <button className="teacher-btn teacher-cancel-btn" onClick={onClose} disabled={loading}>
                  {isArchived ? "CLOSE" : "CANCEL"}
                </button>
                {!isArchived && canEdit && (
                  <button className="teacher-btn teacher-save-btn" onClick={handleSave} disabled={loading}>
                    {loading ? "SAVING..." : "SAVE"}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div>
              <label className="teacher-modal-label">Attachments</label>
              {!isArchived && (
                <div className="teacher-attachment-box" style={{
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '15px',
                  backgroundColor: '#fafafa'
                }}>
                  <p>
                    Drop files or{' '}
                    <label className="browse-link" style={{ color: '#20c5e0', cursor: 'pointer' }}>
                      Browse
                      <input 
                        type="file" 
                        multiple 
                        hidden 
                        onChange={handleAttachmentUpload} 
                        disabled={uploading}
                      />
                    </label>
                  </p>
                  {uploading && <p style={{ fontSize: '12px', color: '#888' }}>Uploading...</p>}
                </div>
              )}

              {loadingAttachments ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading attachments...</p>
              ) : attachments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {attachments.map((att) => (
                    <div key={att.AttachmentID} className="teacher-attachment-item" style={{
                      display: 'flex',
                      flexDirection: window.innerWidth < 600 ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: window.innerWidth < 600 ? 'flex-start' : 'center',
                      padding: '12px',
                      background: '#f5f5f5',
                      borderRadius: '6px',
                      border: '1px solid #eee',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: '#e0e0e0',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#555'
                        }}>
                          {att.FileName.split('.').pop().toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{att.FileName}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>
                            Uploaded by {att.UploadedBy} • {att.FormattedSize} • {att.TimeAgo}
                          </div>
                        </div>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        alignSelf: window.innerWidth < 600 ? 'flex-end' : 'center'
                      }}>
                        <button
                          onClick={() => downloadAttachment(att.FilePath, att.FileName)}
                          style={{
                            background: '#20c5e0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Download
                        </button>
                        {!isArchived && canEdit && (
                          <button
                            onClick={() => handleRemoveAttachment(att.AttachmentID)}
                            style={{
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No attachments</p>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div>
              <div className="teacher-comments-box" style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                {loadingComments ? (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c.CommentID} className="teacher-comment-item" style={{
                      borderBottom: '1px solid #eee',
                      padding: '12px 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <b>{c.UserName}</b>
                        <span style={{ color: '#999', fontSize: '11px' }}>{c.TimeAgo}</span>
                      </div>
                      <p style={{ 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        lineHeight: '1.5',
                        margin: '4px 0 0 0',
                        fontSize: '13px',
                        color: '#333'
                      }}>
                        {c.Comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No comments yet</p>
                )}
              </div>

              {!isArchived && (
                <>
                  <textarea
                    className="teacher-modal-textarea"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    style={{ 
                      marginTop: '16px', 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      width: '100%',
                      padding: '12px',
                      minHeight: '80px',
                      fontFamily: 'inherit',
                      borderRadius: '8px',
                      border: '1px solid #ccc',
                      resize: 'vertical'
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px",
                      padding: "10px 0"
                    }}
                  >
                    <button 
                      className="teacher-btn teacher-save-btn" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      style={{ 
                        marginTop: '8px',
                        opacity: !newComment.trim() ? 0.5 : 1,
                        cursor: !newComment.trim() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Add Comment
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Permission Request Modal */}
        {showPermissionModal && (
          <div className="teacher-modal-backdrop" onClick={() => setShowPermissionModal(false)}>
            <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
              <div className="tpd-invite-modal-header">
                <h3>Request Permission to Update Status</h3>
                <button className="tpd-close-btn" onClick={() => setShowPermissionModal(false)}>&times;</button>
              </div>
              <div className="tpd-invite-modal-body">
                <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  You are requesting permission to move this task from <strong>In Progress</strong> to <strong>For Review</strong>.
                </p>
                <p style={{ marginBottom: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  Once approved, you'll be able to update the task status yourself.
                </p>
                {requestingPermission && (
                  <p style={{ textAlign: 'center', color: '#888', fontSize: '13px' }}>Sending request...</p>
                )}
              </div>
              <div className="tpd-invite-modal-footer">
                <button 
                  className="tpd-btn-outline" 
                  onClick={() => setShowPermissionModal(false)}
                  disabled={requestingPermission}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-primary" 
                  onClick={handleRequestPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Overview Page Component
// ────────────────────────────────────────────────
function OverviewPage({ project, teacherTasks, totalTasks, completed, inReview, overdue, inProgress, onAddTask, setTeacherActivePage, isArchived }) {
  const allTasks = Object.values(teacherTasks).flat();
  const progressPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const [teacherName, setTeacherName] = useState("Teacher");

  // Fetch teacher name from API
  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      
      if (!storedUser) {
        return;
      }

      try {
        const userResponse = await fetch(
          "http://localhost/PMT/api/general/fetch_user.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: storedUser.user_id || storedUser.UserID || storedUser.id }),
          }
        );

        const userResult = await userResponse.json();

        if (userResult.status === "success") {
          setTeacherName(userResult.user.FullName || "JOHN JUAN DOE");
        } else {
          const fullName = storedUser.FirstName && storedUser.LastName 
            ? `${storedUser.FirstName} ${storedUser.LastName}`.toUpperCase()
            : storedUser.Name?.toUpperCase() || "JOHN JUAN DOE";
          
          setTeacherName(fullName);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          const fullName = storedUser.FirstName && storedUser.LastName 
            ? `${storedUser.FirstName} ${storedUser.LastName}`.toUpperCase()
            : storedUser.Name?.toUpperCase() || "JOHN JUAN DOE";
          setTeacherName(fullName);
        }
      }
    };

    fetchUserData();
  }, []);

  const todoCount = teacherTasks.todo?.length || 0;
  const inProgressCount = teacherTasks.inprogress?.length || 0;
  const reviewCount = teacherTasks.review?.length || 0;
  const doneCount = teacherTasks.done?.length || 0;
  const recentTasks = allTasks.slice(0, 4);

  const calculateStrokeDasharray = (count, total, offset) => {
    if (total === 0) return '0 314';
    const percentage = count / total;
    const dashLength = percentage * 314;
    return `${dashLength} ${314 - dashLength}`;
  };

  const inProgressOffset = (todoCount / totalTasks) * 314;
  const reviewOffset = ((todoCount + inProgressCount) / totalTasks) * 314;
  const doneOffset = ((todoCount + inProgressCount + reviewCount) / totalTasks) * 314;

  const handleViewAllTasks = () => {
    setTeacherActivePage("kanban");
  };

  return (
    <div className="tpd-overview">
      {/* Welcome Banner */}
      <div className="tpd-welcome-banner">
        <div className="tpd-welcome-left">
          <span className="tpd-welcome-badge">Project Dashboard {isArchived && "(Archived - Read Only)"}</span>
          <h2 className="tpd-welcome-title">Welcome back, {teacherName}</h2>
          <p className="tpd-welcome-subtitle">
            {isArchived 
              ? "This project is archived. You can view but not modify any content." 
              : "Here is what is happening with your project today."}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="tpd-stats-row">
        <div className="tpd-stat-card tpd-stat-total">
          <div className="tpd-stat-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Total Tasks</span>
            <span className="tpd-stat-number">{totalTasks}</span>
          </div>
          <div className="tpd-stat-badge neutral">{totalTasks} total</div>
        </div>

        <div className="tpd-stat-card tpd-stat-progress">
          <div className="tpd-stat-icon progress">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">In Progress</span>
            <span className="tpd-stat-number">{inProgress}</span>
          </div>
          <div className="tpd-stat-badge orange">{inProgress} active</div>
        </div>

        <div className="tpd-stat-card tpd-stat-done">
          <div className="tpd-stat-icon done">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Completed</span>
            <span className="tpd-stat-number">{completed}</span>
          </div>
          <div className="tpd-stat-badge green">{progressPercent}%</div>
        </div>

        <div className="tpd-stat-card tpd-stat-overdue">
          <div className="tpd-stat-icon overdue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="tpd-stat-info">
            <span className="tpd-stat-label">Overdue</span>
            <span className="tpd-stat-number">{overdue}</span>
          </div>
          <div className="tpd-stat-badge red">{overdue > 0 ? "Warning!" : "All clear"}</div>
        </div>
      </div>

      {/* Progress + All Tasks Overview */}
      <div className="tpd-overview-grid">
        <div className="tpd-progress-card">
          <h3 className="tpd-card-title">Project Progress</h3>
          <div className="tpd-progress-ring-wrapper">
            <div className="tpd-progress-ring">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#eee" strokeWidth="10" />
                
                {todoCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#20c5e0" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(todoCount, totalTasks, 0)}
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {inProgressCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#fd8d32" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(inProgressCount, totalTasks, 0)}
                    strokeDashoffset={-inProgressOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {reviewCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#e15050" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(reviewCount, totalTasks, 0)}
                    strokeDashoffset={-reviewOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
                
                {doneCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#69d186" 
                    strokeWidth="10" 
                    strokeLinecap="round"
                    strokeDasharray={calculateStrokeDasharray(doneCount, totalTasks, 0)}
                    strokeDashoffset={-doneOffset}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  />
                )}
              </svg>
              <span className="tpd-ring-text">{progressPercent}%</span>
            </div>
            <div className="tpd-progress-breakdown">
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#20c5e0" }} />
                <span className="tpd-breakdown-label">To Do</span>
                <span className="tpd-breakdown-count">{todoCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#fd8d32" }} />
                <span className="tpd-breakdown-label">In Progress</span>
                <span className="tpd-breakdown-count">{inProgressCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#e15050" }} />
                <span className="tpd-breakdown-label">For Review</span>
                <span className="tpd-breakdown-count">{reviewCount}</span>
              </div>
              <div className="tpd-breakdown-row">
                <span className="tpd-breakdown-dot" style={{ background: "#69d186" }} />
                <span className="tpd-breakdown-label">Done</span>
                <span className="tpd-breakdown-count">{doneCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* All Tasks Overview Card */}
        <div className="tpd-team-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="tpd-card-title" style={{ margin: 0 }}>All Tasks Overview</h3>
            {allTasks.length > 4 && (
              <button 
                className="modern-view-link" 
                onClick={handleViewAllTasks}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6a00',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                View All Tasks <span className="arrow" style={{ transition: 'transform 0.3s ease', display: 'inline-block' }}>→</span>
              </button>
            )}
          </div>
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
                {recentTasks.length > 0 ? (
                  recentTasks.map(task => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                      No tasks available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Settings Page Component (Updated for Archive Mode with Role-Based Danger Zone)
// ────────────────────────────────────────────────
function SettingsPage({ project, settings, setSettings, projectId, setTeacherActivePage, isArchived }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [activeMemberTab, setActiveMemberTab] = useState("leads");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Team Member");
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openRoleDropdown, setOpenRoleDropdown] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [unarchiveLoading, setUnarchiveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  
  const [memberSearchTerm, setMemberSearchTerm] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
      setCurrentUserId(userId);
    }
  }, []);

  useEffect(() => {
    if (project) {
      setSettings({
        projectName: project.ProjectName || "",
        projectDescription: project.FullDescription || project.Description || "",
        projectCode: project.Code || ""
      });
    }
  }, [project, setSettings]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId) return;
      
      setLoadingMembers(true);
      setLoadingRequests(true);
      
      try {
        const response = await fetch(
          `http://localhost/PMT/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success") {
          const approvedMembers = result.members.filter(m => m.ProjectRole !== 'Pending');
          const pendingRequests = result.members.filter(m => m.ProjectRole === 'Pending');
          
          setProjectMembers(approvedMembers);
          setJoinRequests(pendingRequests.map(request => ({
            id: `req-${request.UserID}`,
            name: `${request.FirstName} ${request.LastName}`,
            email: request.Email,
            requestedRole: "Team Member",
            reason: "Requested to join the project",
            requestedAt: request.JoinDate || new Date().toISOString(),
            status: "pending"
          })));
          
          // Set user role
          const currentUser = approvedMembers.find(m => m.UserID === currentUserId);
          if (currentUser) {
            setIsHost(currentUser.ProjectRole === 'Host');
            setIsCoHost(currentUser.ProjectRole === 'Co-Host');
            setIsMember(currentUser.ProjectRole === 'Member');
          }
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      } finally {
        setLoadingMembers(false);
        setLoadingRequests(false);
      }
    };

    fetchMembers();
  }, [projectId, currentUserId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings.projectCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveChanges = async () => {
    if (isArchived) {
      alert("Cannot modify archived project");
      return;
    }
    if (!isHost) {
      alert("Only project hosts can modify project settings");
      return;
    }
    if (!projectId) {
      setSaveError("Project ID is missing");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      setSaveError("User not logged in");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      setSaveError("User ID not found");
      return;
    }

    setIsLoading(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const updateData = {
        ProjectID: projectId,
        UserID: userId
      };

      if (settings.projectName !== (project.ProjectName || "")) {
        updateData.ProjectName = settings.projectName;
      }

      if (settings.projectDescription !== (project.FullDescription || project.Description || "")) {
        updateData.Description = settings.projectDescription;
      }

      if (Object.keys(updateData).length <= 2) {
        setSaveError("No changes to save");
        setIsLoading(false);
        return;
      }

      const response = await fetch("http://localhost/PMT/api/instructors/update_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.status === "success") {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.message || "Failed to update project");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      setSaveError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    if (isArchived) {
      alert("Cannot modify roles in archived project");
      return;
    }
    if (!isHost) {
      alert("Only project hosts can change member roles");
      return;
    }

    setUpdatingRole(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("http://localhost/PMT/api/instructors/update_member_role.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          TargetUserID: memberId,
          NewRole: newRole
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setProjectMembers(prev => 
          prev.map(member => 
            member.UserID === memberId 
              ? { ...member, ProjectRole: newRole }
              : member
          )
        );
        setOpenRoleDropdown(null);
      } else {
        alert(result.message || "Failed to update member role");
      }
    } catch (err) {
      console.error("Error updating member role:", err);
      alert("Network error. Please try again.");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (isArchived) {
      alert("Cannot remove members from archived project");
      return;
    }
    if (!isHost) {
      alert("Only project hosts can remove members");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this member from the project?")) {
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("http://localhost/PMT/api/instructors/remove_member.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          TargetUserID: memberId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setProjectMembers(prev => prev.filter(member => member.UserID !== memberId));
      } else {
        alert(result.message || "Failed to remove member");
      }
    } catch (err) {
      console.error("Error removing member:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleInviteMember = async () => {
    if (isArchived) {
      alert("Cannot invite members to archived project");
      return;
    }
    if (!isHost && !isCoHost) {
      alert("Only project hosts and co-hosts can invite members");
      return;
    }
    if (!inviteEmail.trim()) {
      alert("Please enter an email address");
      return;
    }

    if (!inviteRole) {
      alert("Please select a role");
      return;
    }

    setIsLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const userResponse = await fetch("http://localhost/PMT/api/general/get_user_by_email.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: inviteEmail
        }),
      });

      const userResult = await userResponse.json();

      if (userResult.status !== "success" || !userResult.user) {
        alert("User not found with this email address");
        setIsLoading(false);
        return;
      }

      const invitedUserId = userResult.user.UserID;

      const response = await fetch("http://localhost/PMT/api/instructors/invite_member.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId,
          InvitedUserID: invitedUserId,
          Role: inviteRole === "Project Co-Host" ? "Co-Host" : "Member"
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Member invited successfully!");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("Team Member");
        
        const membersResponse = await fetch(
          `http://localhost/PMT/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        const membersResult = await membersResponse.json();
        if (membersResult.status === "success") {
          const approvedMembers = membersResult.members.filter(m => m.ProjectRole !== 'Pending');
          const pendingRequests = membersResult.members.filter(m => m.ProjectRole === 'Pending');
          
          setProjectMembers(approvedMembers);
          setJoinRequests(pendingRequests.map(request => ({
            id: `req-${request.UserID}`,
            name: `${request.FirstName} ${request.LastName}`,
            email: request.Email,
            requestedRole: "Team Member",
            reason: "Requested to join the project",
            requestedAt: request.JoinDate || new Date().toISOString(),
            status: "pending"
          })));
        }
      } else {
        alert(result.message || "Failed to send invitation");
      }
    } catch (err) {
      console.error("Error inviting member:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, userId) => {
    if (isArchived) {
      alert("Cannot approve requests in archived project");
      return;
    }
    if (!isHost) {
      alert("Only project hosts can approve join requests");
      return;
    }
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const currentUserId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("http://localhost/PMT/api/instructors/update_member_role.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: currentUserId,
          TargetUserID: userId,
          NewRole: "Member"
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        const approvedRequest = joinRequests.find(req => req.id === requestId);
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        
        if (approvedRequest) {
          const newMember = {
            UserID: userId,
            FirstName: approvedRequest.name.split(' ')[0],
            LastName: approvedRequest.name.split(' ').slice(1).join(' '),
            Email: approvedRequest.email,
            ProjectRole: "Member"
          };
          setProjectMembers(prev => [...prev, newMember]);
        }
        
        alert(`Request approved! User has been added to the project.`);
      } else {
        alert(result.message || "Failed to approve request");
      }
    } catch (err) {
      console.error("Error approving request:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId, userId) => {
    if (isArchived) {
      alert("Cannot reject requests in archived project");
      return;
    }
    if (!isHost) {
      alert("Only project hosts can reject join requests");
      return;
    }
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      const currentUserId = storedUser.UserID || storedUser.user_id || storedUser.id;

      const response = await fetch("http://localhost/PMT/api/instructors/remove_member.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: currentUserId,
          TargetUserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        alert(`Request rejected.`);
      } else {
        alert(result.message || "Failed to reject request");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Network error. Please try again.");
    }
  };

  const handleUnarchiveProject = async () => {
    if (!isHost) {
      alert("Only project hosts can unarchive the project");
      return;
    }

    if (!projectId) {
      alert("Project ID is missing");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("User not logged in");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      alert("User ID not found");
      return;
    }

    setUnarchiveLoading(true);
    setArchiveError("");

    try {
      const response = await fetch("http://localhost/PMT/api/instructors/restore_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Project unarchived successfully!");
        setShowUnarchiveModal(false);
        // Refresh the page or update project status
        window.location.reload();
      } else {
        setArchiveError(result.message || "Failed to unarchive project");
      }
    } catch (err) {
      console.error("Error unarchiving project:", err);
      setArchiveError("Network error. Please try again.");
    } finally {
      setUnarchiveLoading(false);
    }
  };

  const handleArchiveProject = async () => {
    if (isArchived) return;
    if (!isHost) {
      alert("Only project hosts can archive the project");
      return;
    }

    if (!projectId) {
      alert("Project ID is missing");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("User not logged in");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      alert("User ID not found");
      return;
    }

    setArchiveLoading(true);
    setArchiveError("");

    try {
      const response = await fetch("http://localhost/PMT/api/instructors/archive_project.php", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Project archived successfully!");
        setShowArchiveModal(false);
        if (setTeacherActivePage) {
          setTeacherActivePage("projects");
        }
      } else {
        setArchiveError(result.message || "Failed to archive project");
      }
    } catch (err) {
      console.error("Error archiving project:", err);
      setArchiveError("Network error. Please try again.");
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (isArchived) return;
    if (!isHost) {
      alert("Only project hosts can delete the project");
      return;
    }

    if (!projectId) {
      alert("Project ID is missing");
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("User not logged in");
      return;
    }

    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
    if (!userId) {
      alert("User ID not found");
      return;
    }

    if (deleteConfirmInput !== settings.projectName) {
      setDeleteError("Project name does not match");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const response = await fetch("http://localhost/PMT/api/instructors/delete_project.php", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProjectID: projectId,
          UserID: userId
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Project deleted successfully!");
        setShowDeleteModal(false);
        if (setTeacherActivePage) {
          setTeacherActivePage("projects");
        }
      } else {
        setDeleteError(result.message || "Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filterMembers = (members) => {
    if (!memberSearchTerm.trim()) return members;
    const searchLower = memberSearchTerm.toLowerCase();
    return members.filter(member => 
      (member.FirstName?.toLowerCase() || '').includes(searchLower) ||
      (member.LastName?.toLowerCase() || '').includes(searchLower) ||
      (member.Email?.toLowerCase() || '').includes(searchLower)
    );
  };

  const filterRequests = (requests) => {
    if (!memberSearchTerm.trim()) return requests;
    const searchLower = memberSearchTerm.toLowerCase();
    return requests.filter(request => 
      request.name.toLowerCase().includes(searchLower) ||
      request.email.toLowerCase().includes(searchLower)
    );
  };

  const projectLeads = filterMembers(projectMembers.filter(m => m.ProjectRole === 'Host' || m.ProjectRole === 'Co-Host'));
  const members = filterMembers(projectMembers.filter(m => m.ProjectRole === 'Member'));
  const filteredRequests = filterRequests(joinRequests);

  // Check if user can access danger zone (only Host)
  const canAccessDangerZone = isHost && !isArchived;

  return (
    <div className="tpd-settings">
      <div className="tpd-settings-layout">
        {/* Settings Sidebar */}
        <div className="tpd-settings-sidebar">
          <h3 className="tpd-settings-sidebar-title">{isArchived ? "ARCHIVED PROJECT (READ ONLY)" : "Settings"}</h3>
          {[
            { key: "general", label: "General", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg> },
            { key: "members", label: "Members", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            ...(canAccessDangerZone ? [{ key: "danger", label: "Danger Zone", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }] : [])
          ].filter(Boolean).map(item => (
            <button 
              key={item.key} 
              className={`tpd-settings-nav-item ${activeSettingsTab === item.key ? "active" : ""}`} 
              onClick={() => setActiveSettingsTab(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="tpd-settings-content">
          {activeSettingsTab === "general" && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title">General Settings {isArchived && "(Read Only)"}</h3>
              <p className="tpd-settings-desc">Manage your project details and preferences.</p>
              
              {!isHost && !isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#e8f4fd',
                  color: '#0a5d7e',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px'
                }}>
                  <strong>Note:</strong> You have {isCoHost ? 'Co-Host' : 'Member'} permissions. Some settings may be restricted.
                </div>
              )}

              {isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  <strong>🔒 This project is archived.</strong> All settings are read-only.
                </div>
              )}

              {saveSuccess && (
                <div className="tpd-success-message" style={{
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  Project updated successfully!
                </div>
              )}

              {saveError && (
                <div className="tpd-error-message" style={{
                  backgroundColor: '#f8d7da',
                  color: '#721c24',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  ⚠ {saveError}
                </div>
              )}

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Name</label>
                <input 
                  className="tpd-form-input" 
                  value={settings.projectName} 
                  onChange={e => setSettings(s => ({ ...s, projectName: e.target.value }))} 
                  placeholder="Enter project name"
                  disabled={!isHost || isArchived}
                  readOnly={isArchived}
                />
                {!isHost && !isArchived && (
                  <small style={{ color: '#999', display: 'block', marginTop: '4px' }}>
                    Only project host can edit project name
                  </small>
                )}
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Code</label>
                <div className="tpd-code-field">
                  <input 
                    className="tpd-form-input tpd-code-input" 
                    value={settings.projectCode} 
                    disabled
                    readOnly
                    placeholder="Project code"
                  />
                  <button 
                    className="tpd-copy-btn" 
                    onClick={handleCopyCode}
                    title="Copy project code"
                    style={{
                      backgroundColor: copied ? '#28a745' : '#f9f9fb',
                      color: copied ? 'white' : '#555'
                    }}
                  >
                    {copied ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    )}
                  </button>
                </div>
                <span className="tpd-form-hint">Share this code with team members to join the project.</span>
              </div>

              <div className="tpd-form-group">
                <label className="tpd-form-label">Project Description</label>
                <textarea 
                  className="tpd-form-textarea" 
                  rows={3} 
                  value={settings.projectDescription} 
                  onChange={e => setSettings(s => ({ ...s, projectDescription: e.target.value }))} 
                  placeholder="Describe your project..."
                  disabled={!isHost || isArchived}
                  readOnly={isArchived}
                />
              </div>

              {!isArchived && isHost && (
                <button 
                  className="tpd-btn-primary" 
                  style={{ marginTop: 8 }}
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          )}

          {activeSettingsTab === "members" && (
            <div className="tpd-settings-section">
              <div className="tpd-members-header">
                <div>
                  <h3 className="tpd-settings-title">Members {isArchived && "(Read Only)"}</h3>
                  <p className="tpd-settings-desc">Manage project members and their roles.</p>
                </div>
                {(isHost || isCoHost) && !isArchived && (
                  <button className="tpd-btn-primary" onClick={() => setShowInviteModal(true)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Invite Member
                  </button>
                )}
              </div>

              {isArchived && (
                <div className="tpd-role-info" style={{
                  backgroundColor: '#f0f0f0',
                  color: '#666',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  <strong>🔒 Archived project - Members are view-only</strong>
                </div>
              )}

              {/* Search Bar */}
              <div className="tpd-member-search" style={{ marginBottom: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#999',
                      pointerEvents: 'none'
                    }}
                  >
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <input
                    type="text"
                    className="tpd-form-input"
                    placeholder="Search members by name or email..."
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    style={{ 
                      paddingLeft: '36px',
                      width: '100%'
                    }}
                  />
                  {memberSearchTerm && (
                    <button
                      onClick={() => setMemberSearchTerm("")}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Member Tabs */}
              <div style={{
                display: 'flex',
                borderBottom: '2px solid #e0e0e0',
                marginBottom: '24px',
                gap: '4px',
                flexWrap: 'wrap'
              }}>
                <button
                  className={`member-tab ${activeMemberTab === 'leads' ? 'active' : ''}`}
                  onClick={() => setActiveMemberTab('leads')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeMemberTab === 'leads' ? '#ff6a00' : '#666',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeMemberTab === 'leads' ? '3px solid #ff6a00' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Project Host/Co-Host ({projectLeads.length})
                </button>
                
                <button
                  className={`member-tab ${activeMemberTab === 'members' ? 'active' : ''}`}
                  onClick={() => setActiveMemberTab('members')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: activeMemberTab === 'members' ? '#ff6a00' : '#666',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeMemberTab === 'members' ? '3px solid #ff6a00' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Team Members ({members.length})
                </button>

                {!isArchived && isHost && (
                  <button
                    className={`member-tab ${activeMemberTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveMemberTab('requests')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: activeMemberTab === 'requests' ? '#ff6a00' : '#666',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeMemberTab === 'requests' ? '3px solid #ff6a00' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    Join Requests
                    {joinRequests.length > 0 && (
                      <span style={{
                        background: '#ff6a00',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '12px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>
                        {joinRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {loadingMembers || loadingRequests ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Loading members...
                </div>
              ) : (
                <>
                  {/* Project Hosts/Co-Hosts Tab */}
                  {activeMemberTab === 'leads' && (
                    <>
                      {projectLeads.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: projectLeads.length > 4 ? '300px' : 'auto',
                              overflowY: projectLeads.length > 4 ? 'auto' : 'visible',
                              paddingRight: projectLeads.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {projectLeads.map(member => (
                                <div className="tpd-member-row" key={member.UserID}>
                                  <div className="tpd-member-row-left">
                                    <div className={`tpd-member-avatar-lg ${member.ProjectRole === 'Host' ? 'host' : 'cohost'}`}>
                                      {member.FirstName?.[0]}{member.LastName?.[0]}
                                    </div>
                                    <div>
                                      <span className="tpd-member-name-lg">
                                        {member.FirstName} {member.LastName}
                                        {member.UserID === currentUserId && " (You)"}
                                      </span>
                                      <span className="tpd-member-email">{member.Email}</span>
                                    </div>
                                  </div>
                                  <div className="tpd-member-row-right">
                                    {member.ProjectRole === 'Host' ? (
                                      <span className="tpd-role-badge host">Host</span>
                                    ) : (
                                      <>
                                        {!isArchived && isHost && member.UserID !== currentUserId ? (
                                          <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <button 
                                              className="tpd-role-badge cohost clickable"
                                              onClick={() => setOpenRoleDropdown(openRoleDropdown === member.UserID ? null : member.UserID)}
                                              disabled={updatingRole}
                                              style={{ cursor: 'pointer' }}
                                            >
                                              Co-Host ▼
                                            </button>
                                            {openRoleDropdown === member.UserID && (
                                              <div className="tpd-role-dropdown">
                                                <button
                                                  className="tpd-role-option"
                                                  onClick={() => handleRoleChange(member.UserID, 'Co-Host')}
                                                >
                                                  Co-Host
                                                </button>
                                                <button
                                                  className="tpd-role-option"
                                                  onClick={() => handleRoleChange(member.UserID, 'Member')}
                                                >
                                                  Member
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="tpd-role-badge cohost">Co-Host</span>
                                        )}
                                        
                                        {!isArchived && isHost && member.ProjectRole === 'Co-Host' && member.UserID !== currentUserId && (
                                          <button 
                                            className="tpd-btn-ghost"
                                            onClick={() => handleRemoveMember(member.UserID)}
                                            style={{ marginLeft: '8px' }}
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {projectLeads.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {projectLeads.length} members. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching project hosts or co-hosts found." : "No project hosts or co-hosts found."}
                        </div>
                      )}
                    </>
                  )}

                  {/* Team Members Tab */}
                  {activeMemberTab === 'members' && (
                    <>
                      {members.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: members.length > 4 ? '300px' : 'auto',
                              overflowY: members.length > 4 ? 'auto' : 'visible',
                              paddingRight: members.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {members.map(member => (
                                <div className="tpd-member-row" key={member.UserID}>
                                  <div className="tpd-member-row-left">
                                    <div className="tpd-member-avatar-lg">
                                      {member.FirstName?.[0]}{member.LastName?.[0]}
                                    </div>
                                    <div>
                                      <span className="tpd-member-name-lg">
                                        {member.FirstName} {member.LastName}
                                        {member.UserID === currentUserId && " (You)"}
                                      </span>
                                      <span className="tpd-member-email">{member.Email}</span>
                                    </div>
                                  </div>
                                  <div className="tpd-member-row-right">
                                    {!isArchived && isHost ? (
                                      <div style={{ position: 'relative' }}>
                                        <button 
                                          className="tpd-role-badge team-member clickable"
                                          onClick={() => setOpenRoleDropdown(openRoleDropdown === member.UserID ? null : member.UserID)}
                                          disabled={updatingRole}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          Member ▼
                                        </button>
                                        {openRoleDropdown === member.UserID && (
                                          <div className="tpd-role-dropdown">
                                            <button
                                              className="tpd-role-option"
                                              onClick={() => handleRoleChange(member.UserID, 'Co-Host')}
                                            >
                                              Co-Host
                                            </button>
                                            <button
                                              className="tpd-role-option"
                                              onClick={() => handleRoleChange(member.UserID, 'Member')}
                                            >
                                              Member
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="tpd-role-badge team-member">Member</span>
                                    )}
                                    {!isArchived && isHost && member.UserID !== currentUserId && (
                                      <button 
                                        className="tpd-btn-ghost"
                                        onClick={() => handleRemoveMember(member.UserID)}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {members.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {members.length} members. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching team members found." : "No team members found."}
                        </div>
                      )}
                    </>
                  )}

                  {/* Join Requests Tab */}
                  {!isArchived && activeMemberTab === 'requests' && isHost && (
                    <>
                      {filteredRequests.length > 0 ? (
                        <div className="tpd-members-group">
                          <div 
                            className="tpd-members-list-container" 
                            style={{ 
                              maxHeight: filteredRequests.length > 4 ? '300px' : 'auto',
                              overflowY: filteredRequests.length > 4 ? 'auto' : 'visible',
                              paddingRight: filteredRequests.length > 4 ? '8px' : '0'
                            }}
                          >
                            <div className="tpd-members-list">
                              {filteredRequests.map(request => {
                                const userId = request.id.replace('req-', '');
                                
                                return (
                                  <div className="tpd-member-row" key={request.id}>
                                    <div className="tpd-member-row-left">
                                      <div className="tpd-member-avatar-lg pending">
                                        {request.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="tpd-member-name-lg">
                                          {request.name}
                                        </span>
                                        <span className="tpd-member-email">{request.email}</span>
                                      </div>
                                    </div>
                                    <div className="tpd-member-row-right">
                                      {isHost ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <button 
                                            className="tpd-request-approve-icon"
                                            onClick={() => handleApproveRequest(request.id, parseInt(userId))}
                                            title="Approve"
                                            style={{
                                              background: '#e6f9ed',
                                              color: '#2d9b53',
                                              border: 'none',
                                              borderRadius: '6px',
                                              width: '32px',
                                              height: '32px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                              e.target.style.background = '#2d9b53';
                                              e.target.style.color = 'white';
                                            }}
                                            onMouseLeave={e => {
                                              e.target.style.background = '#e6f9ed';
                                              e.target.style.color = '#2d9b53';
                                            }}
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </button>
                                          <button 
                                            className="tpd-request-reject-icon"
                                            onClick={() => handleRejectRequest(request.id, parseInt(userId))}
                                            title="Reject"
                                            style={{
                                              background: '#fde8e8',
                                              color: '#e15050',
                                              border: 'none',
                                              borderRadius: '6px',
                                              width: '32px',
                                              height: '32px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => {
                                              e.target.style.background = '#e15050';
                                              e.target.style.color = 'white';
                                            }}
                                            onMouseLeave={e => {
                                              e.target.style.background = '#fde8e8';
                                              e.target.style.color = '#e15050';
                                            }}
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <line x1="18" y1="6" x2="6" y2="18"/>
                                              <line x1="6" y1="6" x2="18" y2="18"/>
                                            </svg>
                                          </button>
                                        </div>
                                      ) : (
                                        <span style={{ color: '#d97706', fontWeight: 600, fontSize: '13px' }}>
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {filteredRequests.length > 4 && (
                            <div style={{ 
                              textAlign: 'center', 
                              marginTop: '10px', 
                              fontSize: '12px', 
                              color: '#888' 
                            }}>
                              Showing {filteredRequests.length} requests. Scroll to see more.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                          {memberSearchTerm ? "No matching join requests found." : "No join requests found."}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeSettingsTab === "danger" && canAccessDangerZone && (
            <div className="tpd-settings-section">
              <h3 className="tpd-settings-title" style={{ color: '#e15050' }}>
                Danger Zone
              </h3>
              <p className="tpd-settings-desc">
                Irreversible and destructive actions. Proceed with caution.
              </p>

              {/* Archive Project Card */}
              <div className="tpd-danger-card">
                <div>
                  <h4 className="tpd-danger-title">Archive This Project</h4>
                  <p className="tpd-danger-desc">
                    Mark the project as archived. It will be read-only and hidden from your active projects.
                    You can restore it later from the archives.
                  </p>
                </div>
                <button 
                  className="tpd-btn-outline-danger"
                  onClick={() => setShowArchiveModal(true)}
                >
                  Archive Project
                </button>
              </div>

              {/* Delete Project Card */}
              <div className="tpd-danger-card critical">
                <div>
                  <h4 className="tpd-danger-title">Delete This Project</h4>
                  <p className="tpd-danger-desc">
                    Permanently delete the project and all associated data. 
                    The project will be moved to archive before deletion.
                    <strong style={{ color: '#e15050', display: 'block', marginTop: '8px' }}>
                      This action cannot be undone!
                    </strong>
                  </p>
                </div>
                <button 
                  className="tpd-btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Project
                </button>
              </div>
            </div>
          )}

          {/* Show message for non-hosts trying to access danger zone */}
          {activeSettingsTab === "danger" && !canAccessDangerZone && !isArchived && (
            <div className="tpd-settings-section">
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9f9f9',
                borderRadius: '12px',
                color: '#666'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" style={{ marginBottom: '16px' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3 style={{ margin: '0 0 8px', color: '#e15050' }}>Access Restricted</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Only project hosts can access the Danger Zone.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="teacher-modal-backdrop" onClick={() => { 
          if (!isLoading) {
            setShowInviteModal(false); 
            setInviteEmail(""); 
            setInviteRole("Team Member");
          }
        }}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()}>
            <div className="tpd-invite-modal-header">
              <h3>Invite Member</h3>
              <button 
                className="tpd-close-btn" 
                onClick={() => { 
                  setShowInviteModal(false); 
                  setInviteEmail(""); 
                  setInviteRole("Team Member");
                }}
                disabled={isLoading}
              >
                &times;
              </button>
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
                  disabled={isLoading}
                />
              </div>
              <div className="tpd-form-group">
                <label className="tpd-form-label">Role</label>
                <div className="tpd-role-select">
                  <button
                    className={`tpd-role-option ${inviteRole === "Project Co-Host" ? "active instructor" : ""}`}
                    onClick={() => !isLoading && setInviteRole("Project Co-Host")}
                    disabled={isLoading || !isHost} // Only host can invite co-hosts
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Project Co-Host</span>
                  </button>
                  <button
                    className={`tpd-role-option ${inviteRole === "Team Member" ? "active member" : ""}`}
                    onClick={() => !isLoading && setInviteRole("Team Member")}
                    disabled={isLoading}
                    type="button"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <span>Team Member</span>
                  </button>
                </div>
                {!isHost && (
                  <small style={{ color: '#999', display: 'block', marginTop: '8px', fontSize: '11px' }}>
                    Only hosts can invite Co-Hosts
                  </small>
                )}
              </div>
            </div>
            <div className="tpd-invite-modal-footer">
              <button 
                className="tpd-btn-outline" 
                onClick={() => { 
                  setShowInviteModal(false); 
                  setInviteEmail(""); 
                  setInviteRole("Team Member");
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="tpd-btn-primary" 
                onClick={handleInviteMember}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="teacher-modal-backdrop" onClick={() => setShowArchiveModal(false)}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="tpd-invite-modal-header">
              <h3 style={{ color: '#e15050' }}>Archive Project</h3>
              <button className="tpd-close-btn" onClick={() => setShowArchiveModal(false)}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="1.5">
                  <path d="M21 8v13H3V8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 3H1v5h22V3z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="10" y1="12" x2="14" y2="12" strokeLinecap="round"/>
                </svg>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px' }}>
                Are you sure you want to archive <strong>{settings.projectName}</strong>?
              </p>
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                The project will be moved to archives and become read-only. 
                You can restore it later from the Archives page.
              </p>

              {archiveError && (
                <div style={{
                  backgroundColor: '#fde8e8',
                  color: '#e15050',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  ⚠ {archiveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="tpd-btn-outline"
                  onClick={() => setShowArchiveModal(false)}
                  disabled={archiveLoading}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-outline-danger"
                  onClick={handleArchiveProject}
                  disabled={archiveLoading}
                >
                  {archiveLoading ? "Archiving..." : "Confirm Archive"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="teacher-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="tpd-invite-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="tpd-invite-modal-header">
              <h3 style={{ color: '#e15050' }}>⚠️ Permanently Delete Project</h3>
              <button className="tpd-close-btn" onClick={() => setShowDeleteModal(false)}>&times;</button>
            </div>
            <div className="tpd-invite-modal-body">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e15050" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              
              <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold', color: '#e15050' }}>
                This action cannot be undone!
              </p>
              <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '15px' }}>
                You are about to permanently delete <strong>{settings.projectName}</strong>.
              </p>
              
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e15050' }}>
                  <strong>This will:</strong>
                </p>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '13px' }}>
                  <li>Archive the project permanently</li>
                  <li>Delete all tasks associated with this project</li>
                  <li>Remove all team members from the project</li>
                  <li>Make the project inaccessible to everyone</li>
                </ul>
              </div>

              <p style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
                Type <strong>"{settings.projectName}"</strong> to confirm:
              </p>
              
              <input
                type="text"
                className="tpd-form-input"
                placeholder="Enter project name"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                style={{ marginBottom: '15px' }}
              />

              {deleteError && (
                <div style={{
                  backgroundColor: '#fde8e8',
                  color: '#e15050',
                  padding: '10px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  ⚠ {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="tpd-btn-outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmInput("");
                    setDeleteError("");
                  }}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button 
                  className="tpd-btn-danger"
                  onClick={handleDeleteProject}
                  disabled={deleteLoading || deleteConfirmInput !== settings.projectName}
                  style={{ 
                    opacity: (deleteLoading || deleteConfirmInput !== settings.projectName) ? 0.5 : 1,
                    cursor: (deleteLoading || deleteConfirmInput !== settings.projectName) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleteLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Activities Page Component (Updated with archived tasks and restore functionality)
function ActivitiesPage({ projectId, isArchived, onActivityClick, onRestoreTask }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeActivityTab, setActiveActivityTab] = useState("feed");
  const [activities, setActivities] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userProjectRole, setUserProjectRole] = useState("");
  const [restoringTask, setRestoringTask] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setCurrentUserId(storedUser.UserID || storedUser.user_id || storedUser.id);
    }
  }, []);

  useEffect(() => {
    const fetchUserProjectRole = async () => {
      if (!projectId || !currentUserId) return;
      
      try {
        const response = await fetch(
          `http://localhost/PMT/api/general/get_project_members.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          const currentUser = result.members.find(m => m.UserID === currentUserId);
          if (currentUser) {
            setUserProjectRole(currentUser.ProjectRole);
          }
        }
      } catch (err) {
        console.error("Error fetching user project role:", err);
      }
    };

    fetchUserProjectRole();
  }, [projectId, currentUserId]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost/PMT/api/activities/get_activity_feed.php?ProjectID=${projectId}&limit=100`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setActivities(result.activities || []);
        }
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projectId]);

  useEffect(() => {
    const fetchArchivedTasks = async () => {
      if (!projectId) return;
      
      setLoadingArchived(true);
      try {
        const response = await fetch(
          `http://localhost/PMT/api/activities/get_archived_tasks.php?ProjectID=${projectId}&limit=50`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setArchivedTasks(result.archived_tasks || []);
        }
      } catch (err) {
        console.error("Error fetching archived tasks:", err);
      } finally {
        setLoadingArchived(false);
      }
    };

    fetchArchivedTasks();
  }, [projectId]);

  useEffect(() => {
    const fetchPermissionRequests = async () => {
      if (!projectId || !currentUserId) return;
      
      setLoadingRequests(true);
      try {
        const response = await fetch(
          `http://localhost/PMT/api/activities/get_permission_requests.php?ProjectID=${projectId}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        if (result.status === "success") {
          setPermissionRequests(result.requests || []);
        }
      } catch (err) {
        console.error("Error fetching permission requests:", err);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchPermissionRequests();
  }, [projectId, currentUserId]);

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'To Do': 'In Progress',
      'In Progress': 'For Review',
      'For Review': 'Done'
    };
    return statusFlow[currentStatus] || currentStatus;
  };

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const getActionIcon = (action) => {
    if (!action) return "📋";
    if (action.includes("Created task")) return "📝";
    if (action.includes("Updated task status")) return "🔄";
    if (action.includes("Renamed task")) return "✏️";
    if (action.includes("Updated due date")) return "📅";
    if (action.includes("Added attachment")) return "📎";
    if (action.includes("Assigned users")) return "👥";
    if (action.includes("Removed assignees")) return "👤";
    if (action.includes("Joined project")) return "➕";
    if (action.includes("Invited member")) return "📧";
    if (action.includes("Removed member")) return "❌";
    if (action.includes("Updated member role")) return "👔";
    if (action.includes("Updated project")) return "⚙️";
    if (action.includes("Archived task")) return "📦";
    if (action.includes("Restored task")) return "♻️";
    return "📋";
  };

  const handleActivityClick = (activity) => {
    onActivityClick(activity);
  };

  const handleRestoreTask = async (taskId) => {
    if (!window.confirm("Restore this task? It will be set to 'To Do' status.")) {
      return;
    }

    setRestoringTask(taskId);
    
    try {
      await onRestoreTask(taskId);
      // Remove from archived tasks list after successful restore
      setArchivedTasks(prev => prev.filter(task => task.TaskID !== taskId));
    } catch (err) {
      console.error("Error restoring task:", err);
    } finally {
      setRestoringTask(null);
    }
  };

  const handleRequestPermission = async (request) => {
    alert(`Permission request sent for task: ${request.taskName || request.task}`);
  };

// Replace the handleApproveRequest function in ActivitiesPage component:

const handleApproveRequest = async (requestId, e) => {
  e.stopPropagation();
  const request = permissionRequests.find(r => r.id === requestId);
  if (!request) return;

  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    console.log("Approving request with data:", {
      TaskID: request.taskId,
      UserID: userId,
      TargetUserID: request.userId,
      action: "approve"
    });

    const response = await fetch("http://localhost/PMT/api/activities/update_task_assignee_permission.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: request.taskId,
        UserID: userId,
        TargetUserID: request.userId,
        action: "approve"
      })
    });

    // Get the response as text first
    const responseText = await response.text();
    console.log("Raw server response:", responseText);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response that caused error:", responseText.substring(0, 200));
      throw new Error("Server returned invalid JSON. Check PHP error logs.");
    }

    if (result.status === "success") {
      // Remove the request from the list
      setPermissionRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Show success message
      alert("Permission approved! Task has been moved to For Review and user can now update status.");
      
      // Optionally refresh the tasks if you want to show the updated status
      // You might want to call a refresh function here if you have one
      
    } else {
      alert(result.message || "Failed to approve request");
    }
  } catch (err) {
    console.error("Error approving request:", err);
    alert(`Error: ${err.message}`);
  }
};

const handleRejectRequest = async (requestId, e) => {
  e.stopPropagation();
  const request = permissionRequests.find(r => r.id === requestId);
  if (!request) return;

  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    const response = await fetch("http://localhost/PMT/api/activities/update_task_assignee_permission.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: request.taskId,
        UserID: userId,
        TargetUserID: request.userId,
        action: "reject"
      })
    });

    const responseText = await response.text();
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response:", responseText.substring(0, 200));
      throw new Error("Server returned invalid JSON");
    }

    if (result.status === "success") {
      setPermissionRequests(prev => prev.filter(r => r.id !== requestId));
      alert("Request rejected.");
    } else {
      alert(result.message || "Failed to reject request");
    }
  } catch (err) {
    console.error("Error rejecting request:", err);
    alert(`Error: ${err.message}`);
  }
};

  const filteredActivities = (activities || []).filter(activity =>
    activity?.Action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity?.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity?.UserName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchivedTasks = (archivedTasks || []).filter(task =>
    task?.TaskName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task?.Description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task?.ArchivedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRequests = (permissionRequests || []).filter(request => {
    if (!request) return false;
    const taskName = request.taskName || request.task || '';
    const requester = request.requester || '';
    return taskName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           requester.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isHostOrCoHost = userProjectRole === 'Host' || userProjectRole === 'Co-Host';

  if (loading || loadingArchived || loadingRequests) {
    return <div className="tpd-loading">Loading activities...</div>;
  }

  return (
    <div className="tpd-activities">
      {/* Activities Header */}
      <div className="tpd-activities-header">
        <div>
          <h3 className="tpd-activities-title">Activity Center {isArchived && "(Read Only)"}</h3>
          <p className="tpd-activities-subtitle">
            {isArchived 
              ? "View historical activities (no new actions allowed)." 
              : "Track project activities and permission requests."}
          </p>
        </div>
        <div className="tpd-activities-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="tpd-search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input 
            className="tpd-search-input" 
            placeholder="Search activities or requests..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Activity Tabs */}
      <div className="tpd-activity-tabs">
        <button
          className={`tpd-activity-tab ${activeActivityTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveActivityTab('feed')}
        >
          Activity Feed
        </button>
        {!isArchived && (
          <button
            className={`tpd-activity-tab ${activeActivityTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('archived')}
          >
            Archived Tasks
            {archivedTasks.length > 0 && (
              <span className="tpd-request-badge">
                {archivedTasks.length}
              </span>
            )}
          </button>
        )}
        {!isArchived && isHostOrCoHost && (
          <button
            className={`tpd-activity-tab ${activeActivityTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveActivityTab('requests')}
          >
            Permission Requests
            {permissionRequests.length > 0 && (
              <span className="tpd-request-badge">
                {permissionRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

        {/* // In the ActivitiesPage component, update the activity feed rendering: */}

        {activeActivityTab === 'feed' && (
          <div className="tpd-activity-feed-container">
            <div className="tpd-notification-feed">
              {filteredActivities.length > 0 ? (
                filteredActivities.map(activity => (
                  <div 
                    key={activity.LogID} 
                    className="tpd-notification-item"
                    onClick={() => handleActivityClick(activity)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tpd-notification-avatar">
                      <span className="tpd-activity-user-avatar" style={{
                        background: activity.UserRole === 'Host' ? '#1a1a2e' : 
                                  activity.UserRole === 'Co-Host' ? '#20c5e0' : '#555'
                      }}>
                        {getInitials(activity.UserName)}
                      </span>
                    </div>
                    <div className="tpd-notification-content">
                      <div className="tpd-notification-header">
                        <h4 className="tpd-notification-title">
                          <span className="tpd-activity-icon">{getActionIcon(activity.Action)}</span> {activity.Action}
                        </h4>
                        <span className="tpd-notification-time">{activity.TimeAgo}</span>
                      </div>
                      {activity.Description && (
                        <p className="tpd-notification-description">{activity.Description}</p>
                      )}
                      <div className="tpd-notification-footer">
                        <span className="tpd-notification-user">
                          <span className="tpd-notification-user-name">{activity.UserName}</span>
                          {activity.UserRole && (
                            <span className="tpd-role-badge" style={{ 
                              background: activity.UserRole === 'Host' ? '#1a1a2e' : 
                                          activity.UserRole === 'Co-Host' ? '#e8f8fb' : '#f0f0f3',
                              color: activity.UserRole === 'Host' ? '#fff' : 
                                    activity.UserRole === 'Co-Host' ? '#0ea5c7' : '#555',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 600
                            }}>
                              {activity.UserRole}
                            </span>
                          )}
                          {/* Show special badge for archived/restored tasks */}
                          {activity.Action?.includes('Archived') && (
                            <span className="tpd-role-badge" style={{ 
                              background: '#fde8e8',
                              color: '#e15050',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px'
                            }}>
                              Archived
                            </span>
                          )}
                          {activity.Action?.includes('Restored') && (
                            <span className="tpd-role-badge" style={{ 
                              background: '#e6f9ed',
                              color: '#2d9b53',
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px'
                            }}>
                              Restored
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="tpd-empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                  </svg>
                  <p>No activities found.</p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Archived Tasks Tab */}
      {!isArchived && activeActivityTab === 'archived' && (
        <div className="tpd-request-container">
          <div className="tpd-notification-feed">
            {filteredArchivedTasks.length > 0 ? (
              filteredArchivedTasks.map(task => (
                <div 
                  key={task.TaskID} 
                  className="tpd-notification-item"
                >
                  <div className="tpd-notification-avatar">
                    <span className="tpd-activity-user-avatar" style={{ background: '#e15050' }}>
                      📦
                    </span>
                  </div>
                  <div className="tpd-notification-content">
                    <div className="tpd-notification-header">
                      <h4 className="tpd-notification-title">
                        Archived Task: {task.TaskName}
                      </h4>
                      <span className="tpd-notification-time">{task.TimeAgo}</span>
                    </div>
                    {task.Description && (
                      <p className="tpd-notification-description">{task.Description}</p>
                    )}
                    {task.DueDate && (
                      <p className="tpd-notification-description" style={{ fontSize: '12px', color: '#888' }}>
                        Due: {new Date(task.DueDate).toLocaleDateString()}
                      </p>
                    )}
                    <p className="tpd-notification-description" style={{ fontSize: '12px', color: '#888' }}>
                      Archived by: {task.ArchivedBy}
                    </p>
                    <div className="tpd-notification-footer">
                      <div className="tpd-notification-status">
                        <span className="tpd-notification-user-name">Status: Archived</span>
                      </div>
                      {isHostOrCoHost && (
                        <button 
                          className="tpd-btn-primary"
                          onClick={() => handleRestoreTask(task.TaskID)}
                          disabled={restoringTask === task.TaskID}
                          style={{ 
                            fontSize: '12px', 
                            padding: '6px 12px',
                            backgroundColor: '#20c5e0'
                          }}
                        >
                          {restoringTask === task.TaskID ? "Restoring..." : "Restore Task"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="tpd-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                </svg>
                <p>No archived tasks found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Requests Tab */}
      {!isArchived && activeActivityTab === 'requests' && isHostOrCoHost && (
        <div className="tpd-request-container">
          <div className="tpd-notification-feed">
            {filteredRequests.length > 0 ? (
              filteredRequests.map(request => (
                <div 
                  key={request.id} 
                  className="tpd-notification-item"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="tpd-notification-avatar">
                    <span className="tpd-activity-user-avatar" style={{ background: '#d97706' }}>
                      {getInitials(request.requester)}
                    </span>
                  </div>
                  <div className="tpd-notification-content">
                    <div className="tpd-notification-header">
                      <h4 className="tpd-notification-title">Permission Request: {request.taskName || request.task}</h4>
                      <span className="tpd-notification-time">{request.timeAgo || 'Just now'}</span>
                    </div>
                    <p className="tpd-notification-description">
                      {request.requester} is requesting to change status from <strong>{request.currentStatus}</strong> to <strong>For Review</strong>
                    </p>
                    <div className="tpd-notification-footer">
                      <div className="tpd-notification-status">
                        <span className="tpd-notification-user-name">{request.requester}</span>
                        <span className="tpd-status-badge" style={{ 
                          backgroundColor: '#fff3e6',
                          color: '#d97706',
                          marginLeft: '8px'
                        }}>
                          pending
                        </span>
                      </div>
                      <div className="tpd-notification-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          className="tpd-request-approve"
                          onClick={(e) => handleApproveRequest(request.id, e)}
                          title="Approve"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          className="tpd-request-reject"
                          onClick={(e) => handleRejectRequest(request.id, e)}
                          title="Reject"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="tpd-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="#bbb" strokeWidth="1.5"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="#bbb" strokeWidth="2"/>
                </svg>
                <p>No permission requests found.</p>
              </div>
            )}
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
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [isArchived, setIsArchived] = useState(project?.Status === 'Archived');
  const [settings, setSettings] = useState({
    projectName: project?.ProjectName || "Sample Project 1",
    projectDescription: project?.FullDescription || project?.Description || "A collaborative project management dashboard for educational teams.",
    projectCode: project?.Code || "PRJ-2025-001"
  });
  
  // State for activity detail modal
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const [currentUserRole, setCurrentUserRole] = useState('');
  const [userPermissions, setUserPermissions] = useState({});

  // Fetch project members
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!project?.ProjectID) return;
      
      try {
        const response = await fetch(
          `http://localhost/PMT/api/general/get_project_members.php?ProjectID=${project.ProjectID}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          }
        );
        
        const result = await response.json();
        
        if (result.status === "success") {
          setProjectMembers(result.members);
        }
      } catch (err) {
        console.error("Error fetching project members:", err);
      }
    };

    fetchProjectMembers();
  }, [project]);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && projectMembers.length > 0) {
      const userId = storedUser.UserID || storedUser.user_id || storedUser.id;
      const currentMember = projectMembers.find(m => m.UserID === userId);
      if (currentMember) {
        setCurrentUserRole(currentMember.ProjectRole);
      }
    }
  }, [projectMembers]);

// Fetch user permissions for all tasks
useEffect(() => {
  const fetchUserPermissions = async () => {
    if (!project?.ProjectID) return;
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser?.UserID || storedUser?.user_id || storedUser?.id;
    
    if (!userId) return;
    
    try {
      const response = await fetch(
        `http://localhost/PMT/api/activities/get_task_permissions.php?ProjectID=${project.ProjectID}&UserID=${userId}`
      );
      const result = await response.json();
      
      if (result.status === "success") {
        console.log("Permissions fetched:", result.permissions);
        setUserPermissions(result.permissions || {});
      } else {
        console.error("Failed to fetch permissions:", result);
      }
    } catch (err) {
      console.error("Error fetching user permissions:", err);
    }
  };
  
  fetchUserPermissions();
}, [project]);

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!project?.ProjectID) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setWarning(null);

    try {
      const response = await fetch(
        `http://localhost/PMT/api/general/get_tasks.php?ProjectID=${project.ProjectID}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      );

      const result = await response.json();

      if (result.status === "success") {
        const organizedTasks = {
          todo: [],
          inprogress: [],
          review: [],
          done: []
        };

        result.tasks.forEach(task => {
          const columnKey = statusToColumn[task.Status] || "todo";
          
          const formattedTask = {
            id: task.TaskID.toString(),
            content: task.TaskName,
            description: task.Description || "",
            assigned: task.AssignedTo ? task.AssignedTo.map(user => user.Name) : [],
            assignedIds: task.AssignedTo ? task.AssignedTo.map(user => user.UserID) : [],
            due: task.DueDate || "TBD",
            status: task.Status,
            attachments: task.Attachment ? [{ name: task.Attachment }] : [],
            comments: [],
            projectId: project.ProjectID,
            projectName: project.ProjectName
          };

          organizedTasks[columnKey].push(formattedTask);
        });

        setTeacherTasks(organizedTasks);
      } else {
        setWarning(result.message || "Failed to fetch tasks");
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setWarning("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const handleArchiveTask = async (taskId) => {
    if (isArchived) {
      alert("Cannot archive tasks in an archived project");
      return;
    }

    if (!window.confirm("Are you sure you want to archive this task? It will be moved to archives.")) {
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("http://localhost/PMT/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: taskId,
          ProjectID: project?.ProjectID,
          Status: "Archived",
          UpdatedBy: userId,
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Task archived successfully!");
        setTeacherShowModal(false);
        await fetchTasks(); // Refresh tasks
      } else {
        alert(result.message || "Failed to archive task");
      }
    } catch (err) {
      console.error("Error archiving task:", err);
      alert("Network error. Please try again.");
    }
  };

  // Handler for restoring tasks
  const handleRestoreTask = async (taskId) => {
    if (!window.confirm("Restore this task? It will be set to 'To Do' status.")) {
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    try {
      const response = await fetch("http://localhost/PMT/api/general/update_task.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TaskID: taskId,
          ProjectID: project?.ProjectID,
          Status: "To Do",
          UserID: userId
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        alert("Task restored successfully!");
        setTeacherShowModal(false);
        await fetchTasks(); // Refresh tasks
      } else {
        alert(result.message || "Failed to restore task");
      }
    } catch (err) {
      console.error("Error restoring task:", err);
      alert("Network error. Please try again.");
    }
  };

  // Handler for activity click
  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setShowActivityDetail(true);
  };

// Update the canDragTask function:
const canDragTask = (taskId) => {
  // Host and Co-Host can always drag
  if (currentUserRole === 'Host' || currentUserRole === 'Co-Host') {
    return true;
  }
  
  // For members, check if they have can_update_status = 'Yes'
  const permission = userPermissions[taskId];
  
  console.log(`Task ${taskId} permission:`, permission);
  
  // Check different possible permission structures
  if (permission) {
    // If it's a boolean
    if (permission === true) return true;
    
    // If it's an object with permission_status property
    if (permission.permission_status === 'Yes' || permission.permission_status === true) return true;
    
    // If it's a string 'Yes'
    if (permission === 'Yes') return true;
    
    // If it's an object with can_update_status property
    if (permission.can_update_status === 'Yes' || permission.can_update_status === true) return true;
  }
  
  return false;
};


const onDragEnd = async (result) => {
  if (isArchived) {
    alert("Cannot modify tasks in an archived project");
    return;
  }
  
  const { source, destination, draggableId } = result;
  if (!destination) return;

  // Check if user can drag this task
  if (!canDragTask(draggableId)) {
    alert("You don't have permission to move this task. Request permission from a host or co-host.");
    return;
  }

  // Get the task being moved
  const sourceTasks = Array.from(teacherTasks[source.droppableId]);
  const destTasks = Array.from(teacherTasks[destination.droppableId]);
  const [movedTask] = sourceTasks.splice(source.index, 1);
  
  // Update task status based on destination column
  const newStatus = columnToStatus[destination.droppableId];
  movedTask.status = newStatus;
  
  destTasks.splice(destination.index, 0, movedTask);
  
  const updatedTasks = {
    ...teacherTasks,
    [source.droppableId]: sourceTasks,
    [destination.droppableId]: destTasks
  };

  // Optimistically update UI
  setTeacherTasks(updatedTasks);

  try {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const userId = storedUser.UserID || storedUser.user_id || storedUser.id;

    console.log("Updating task status via drag:", {
      TaskID: parseInt(draggableId),
      ProjectID: project.ProjectID,
      Status: newStatus,
      UserID: userId
    });

    const response = await fetch("http://localhost/PMT/api/general/update_task.php", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        TaskID: parseInt(draggableId),
        ProjectID: project.ProjectID,
        Status: newStatus,
        UserID: userId
      })
    });

    const responseText = await response.text();
    console.log("Raw response from update_task:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Server returned invalid JSON");
    }

    if (result.status === "success") {
      console.log("Task status updated successfully via drag");
    } else {
      console.error("Failed to update task status:", result.message);
      // Revert the UI if update failed
      fetchTasks(); // Refresh tasks from server
      alert("Failed to update task status. Please try again.");
    }
  } catch (err) {
    console.error("Error updating task status:", err);
    // Revert the UI if update failed
    fetchTasks(); // Refresh tasks from server
    alert("Failed to update task status. Please refresh the page.");
  }
};

  const handleTaskClick = (task) => {
    setSelectedTask({ 
      ...task, 
      projectName: project?.ProjectName || "SAMPLE PROJECT 1",
      projectId: project?.ProjectID
    });
    setTeacherShowModal(true);
  };

  const handleEditSave = async () => {
    setTeacherShowModal(false);
    await fetchTasks();
  };

  const handleAddSave = (newTask) => {
    const columnKey = statusToColumn[newTask.status] || "todo";
    setTeacherTasks(prev => ({
      ...prev,
      [columnKey]: [...(prev[columnKey] || []), newTask]
    }));
  };

  const totalTasks = Object.values(teacherTasks).flat().length;
  const completed = teacherTasks.done?.length || 0;
  const inProgress = teacherTasks.inprogress?.length || 0;
  const inReview = teacherTasks.review?.length || 0;
  const overdue = Object.values(teacherTasks).flat().filter(t => isOverdue(t.due)).length;

  // Filter navigation pages for archived projects (hide Activities tab)
  const navPages = isArchived 
    ? ["overview", "kanban", "settings"] 
    : ["overview", "kanban", "activities", "settings"];

  // Check if user can add tasks (Host or Co-Host only)
  const canAddTasks = currentUserRole === 'Host' || currentUserRole === 'Co-Host';

  if (loading) {
    return (
      <div className="teacher-pd-wrapper">
        <div className="teacher-pd-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="teacher-pd-wrapper">
        <div className="teacher-pd-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px', flexDirection: 'column' }}>
          <p className="teacher-input-warning" style={{ marginBottom: '20px' }}>⚠ {warning}</p>
          <button 
            className="teacher-btn teacher-save-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-pd-wrapper">
      <div className="teacher-pd-bg">
        <header className="teacher-pd-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="teacher-pd-title">
              {project?.ProjectName || "Project Title"} 
              {isArchived && <span style={{ marginLeft: '10px', fontSize: '14px', color: '#888', fontWeight: 'normal' }}>(Archived)</span>}
            </div>
            
            <nav className="teacher-pd-nav">
              {navPages.map(page => (
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

          {teacherActivePage === "kanban" && !isArchived && canAddTasks && (
            <button 
              className="teacher-btn teacher-add-task-btn" 
              onClick={() => setAddShowModal(true)}
            >
              Add Task
            </button>
          )}
          {teacherActivePage === "kanban" && !isArchived && !canAddTasks && (
            <div style={{ color: '#888', fontSize: '14px' }}>👤 View-only mode (Host/Co-Host can add tasks)</div>
          )}
          {isArchived && teacherActivePage === "kanban" && (
            <div style={{ color: '#888', fontSize: '14px' }}>🔒 Read-only mode</div>
          )}
        </header>

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
              setTeacherActivePage={setTeacherActivePage}
              isArchived={isArchived}
            />
          )}

          {teacherActivePage === "kanban" && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="teacher-kanban-wrapper">
                <div className="teacher-kanban-container">
                  {teacherColumns.map(col => (
                    <Droppable droppableId={col.key} key={col.key}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="teacher-kanban-column"
                          style={{ background: snapshot.isDraggingOver && !isArchived ? "#2a2a2a" : "#23242b" }}
                        >
                          <div style={{ color: col.color, fontWeight: 600, marginBottom: 12 }}>
                            {col.label} ({teacherTasks[col.key]?.length || 0})
                          </div>

                            {teacherTasks[col.key]?.map((task, idx) => {
                              const overdue = isOverdue(task.due);
                              const canDrag = canDragTask(task.id);

                              return (
                                <Draggable 
                                  key={task.id} 
                                  draggableId={task.id} 
                                  index={idx}
                                  isDragDisabled={isArchived || !canDrag}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`teacher-kanban-task ${snapshot.isDragging ? "dragging" : ""} ${overdue ? "overdue-task" : ""} ${task.status === "Done" ? "done-task" : ""} ${isArchived ? "archived-task" : ""}`}
                                      onClick={() => handleTaskClick(task)}
                                      style={{ 
                                        ...provided.draggableProps.style,
                                        cursor: isArchived ? 'default' : (canDrag ? 'grab' : 'default'),
                                        opacity: isArchived ? 0.8 : 1
                                      }}
                                    >
                                      <div>{task.content}</div>
                                      <small style={{ opacity: 0.7 }}>
                                        Assigned: {getAssignedDisplay(task.assigned)}
                                      </small>
                                      {overdue && <span className="overdue-badge">Overdue!</span>}
                                      {/* Removed the "no-drag" message */}
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
              </div>
            </DragDropContext>
          )}

          {teacherActivePage === "activities" && !isArchived && (
            <ActivitiesPage 
              projectId={project?.ProjectID} 
              isArchived={isArchived}
              onActivityClick={handleActivityClick}
              onRestoreTask={handleRestoreTask}
            />
          )}
          
          {teacherActivePage === "settings" && (
            <SettingsPage 
              project={project} 
              settings={settings} 
              setSettings={setSettings}
              projectId={project?.ProjectID}
              setTeacherActivePage={setTeacherActivePage}
              isArchived={isArchived}
            />
          )}
        </main>

        {teacherShowModal && (
          <TeacherTaskDetailModal
            show={teacherShowModal}
            task={selectedTask}
            setTask={setSelectedTask}
            onClose={() => setTeacherShowModal(false)}
            onSave={handleEditSave}
            onArchiveTask={handleArchiveTask}
            onRestoreTask={handleRestoreTask}
            projectMembers={projectMembers}
            isArchived={isArchived}
            currentUserRole={currentUserRole}
          />
        )}

        {addShowModal && (
          <AddTaskModal
            show={addShowModal}
            onClose={() => setAddShowModal(false)}
            onSave={handleAddSave}
            projectId={project?.ProjectID}
            projectName={project?.ProjectName || "SAMPLE PROJECT 1"}
            projectMembers={projectMembers}
            isArchived={isArchived}
            currentUserRole={currentUserRole}
          />
        )}

        {/* Activity Detail Modal */}
        {showActivityDetail && selectedActivity && (
          <div className="teacher-modal-backdrop" onClick={() => setShowActivityDetail(false)}>
            <div className="tpd-activity-detail-modal" onClick={e => e.stopPropagation()} style={{
              background: 'white',
              borderRadius: '16px',
              width: '500px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'modalSlideUp 0.3s ease'
            }}>
              <div className="tpd-activity-detail-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #eee'
              }}>
                <div className="tpd-activity-detail-badge" style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: selectedActivity.Action?.includes('Archived') ? '#e15050' :
                                  selectedActivity.Action?.includes('Restored') ? '#20c5e0' :
                                  selectedActivity.Action?.includes('Created') ? '#0ea5c7' :
                                  selectedActivity.Action?.includes('Updated') ? '#d97706' : '#555'
                }}>
                  {selectedActivity.Action || 'Activity'}
                </div>
                <button className="tpd-close-btn" onClick={() => setShowActivityDetail(false)} style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}>&times;</button>
              </div>

              <div className="tpd-activity-detail-body" style={{ padding: '24px' }}>
                <div className="tpd-activity-user-info" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '24px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div className="tpd-activity-user-avatar large" style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: selectedActivity.UserRole === 'Host' ? '#1a1a2e' : 
                              selectedActivity.UserRole === 'Co-Host' ? '#20c5e0' : '#555',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700
                  }}>
                    {selectedActivity.FirstName?.[0]}{selectedActivity.LastName?.[0]}
                  </div>
                  <div className="tpd-activity-user-details">
                    <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                      {selectedActivity.UserName || `${selectedActivity.FirstName} ${selectedActivity.LastName}`}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tpd-activity-user-email" style={{ fontSize: '13px', color: '#888' }}>
                        {selectedActivity.Email}
                      </span>
                      {selectedActivity.UserRole && (
                        <span className="tpd-role-badge" style={{ 
                          background: selectedActivity.UserRole === 'Host' ? '#1a1a2e' : 
                                      selectedActivity.UserRole === 'Co-Host' ? '#e8f8fb' : '#f0f0f3',
                          color: selectedActivity.UserRole === 'Host' ? '#fff' : 
                                selectedActivity.UserRole === 'Co-Host' ? '#0ea5c7' : '#555',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {selectedActivity.UserRole}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tpd-activity-content" style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div className="tpd-activity-icon-large" style={{ fontSize: '32px', lineHeight: 1 }}>
                    {selectedActivity.Action?.includes('Archived') ? '📦' :
                    selectedActivity.Action?.includes('Restored') ? '♻️' :
                    selectedActivity.Action?.includes('Created') ? '📝' :
                    selectedActivity.Action?.includes('Updated') ? '🔄' : '📋'}
                  </div>
                  <div className="tpd-activity-text" style={{ flex: 1 }}>
                    <p className="tpd-activity-action" style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1a1a2e',
                      margin: '0 0 8px'
                    }}>
                      {selectedActivity.Action}
                    </p>
                    <p className="tpd-activity-description" style={{
                      fontSize: '14px',
                      color: '#666',
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {selectedActivity.Description}
                    </p>
                  </div>
                </div>

                <div className="tpd-activity-metadata" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '16px',
                  background: '#ffffff',
                  border: '1px solid #eee',
                  borderRadius: '8px'
                }}>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Project</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{selectedActivity.ProjectName}</span>
                  </div>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Date & Time</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{new Date(selectedActivity.LogDate).toLocaleDateString()} at {new Date(selectedActivity.LogDate).toLocaleTimeString()}</span>
                  </div>
                  <div className="tpd-metadata-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span className="tpd-metadata-label" style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>Time ago</span>
                    <span className="tpd-metadata-value" style={{
                      fontSize: '13px',
                      color: '#1a1a2e',
                      fontWeight: 500
                    }}>{selectedActivity.TimeAgo}</span>
                  </div>
                </div>

                {selectedActivity.Action?.includes('Archived task') && (
                  <div className="tpd-activity-warning" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    fontSize: '13px',
                    background: '#fde8e8',
                    color: '#e15050',
                    border: '1px solid #fecaca'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>This task has been archived and is no longer active.</span>
                  </div>
                )}

                {selectedActivity.Action?.includes('Restored task') && (
                  <div className="tpd-activity-success" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginTop: '20px',
                    fontSize: '13px',
                    background: '#e6f9ed',
                    color: '#2d9b53',
                    border: '1px solid #b8e6c9'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>This task has been restored and set to 'To Do' status.</span>
                  </div>
                )}
              </div>

              <div className="tpd-activity-detail-footer" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '20px 24px',
                borderTop: '1px solid #eee'
              }}>
                <button className="tpd-btn-primary" onClick={() => setShowActivityDetail(false)} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeacherProjectDashboard;