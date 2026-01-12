import React, { useState, useEffect } from 'react';
import './employees.css';
import './generateReportPage.css';

//const API = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
// for running locally
const API = 'http://localhost:8080';

interface Employee {
  id: number;
  employee: string;
  classification: string;
}


type Option = 'generateReport' | 'orderHistory' | 'employees' | 'inventory';

interface EmployeesProps {
  onSelectOption: (option: Option) => void;
}

const EmployeesPage: React.FC<EmployeesProps> = ({ onSelectOption }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ employee: '', classification: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ employee: '', classification: 'Cashier' });
  const [searchTerm, setSearchTerm] = useState('');
  const [dAndT, setDandT] = useState(new Date());
    
  // update date and time
  useEffect(() => {
    const interval = setInterval(() => setDandT(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

    // add weather
    const [temp, setTemp] = useState<number | null>(null);
    const [weatherCode, setWeatherCode] = useState<number | null>(null);
    useEffect(() => {
      const fetchWeather = async () => {
        try {
          const res = await fetch(`${API}/api/weather`);
          const data = await res.json();
  
          if (res.ok && data.temp !== undefined) {
            setTemp(data.temp);
          }
          if (res.ok && data.weatherCode !== undefined) {
            setWeatherCode(data.weatherCode);
          }
        } catch (err) {
          console.error(err);
        } 
      };
      fetchWeather();
    }, []);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API}/api/employees`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error loading employees from database');
      setLoading(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditForm({ employee: emp.employee, classification: emp.classification });
  };

  const handleSaveEdit = async () => {
    if (!editForm.employee.trim()) {
      alert('Employee name cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${API}/api/employees/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: editForm.employee,
          classification: editForm.classification
        }),
      });

      if (!response.ok) throw new Error('Failed to update employee');
      
      // Update local state
      setEmployees(employees.map(emp => 
        emp.id === editingId ? { ...emp, ...editForm } : emp
      ));
      setEditingId(null);
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee in database');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ employee: '', classification: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const response = await fetch(`${API}/api/employees/${id}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) throw new Error('Failed to delete employee');
      
      setEmployees(employees.filter(emp => emp.id !== id));
      alert('Employee deleted successfully!');
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee from database');
    }
  };

  const handleAddEmployee = async () => {
    if (!addForm.employee.trim()) return;

    try {
      const newId = Math.max(...employees.map(e => e.id), -1) + 1;
      const newEmployee = { id: newId, ...addForm };

      const response = await fetch(`${API}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee), 
      });

      if (!response.ok) throw new Error('Failed to add employee');

      const savedEmployee = await response.json();
      setEmployees([...employees, savedEmployee]);
      setAddForm({ employee: '', classification: 'Cashier' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toString().includes(searchTerm)
  );

  if (loading) {
    return <div className="employees-container">Loading...</div>;
  }

  return (
    <div className="employees-container">
      <div className="employees-box">
        <header className="employees-header">
          <h1 className="employees-title">Manager - Employees</h1>
          <div className="employee-actions">
            <button onClick={() => window.location.href = '/manager'} className="control-btn">Back</button>
          </div>
        </header>

        <div className="employees-content">
          <div className="employees-controls">
            
            <div className="employees-search-add">
              <input
                type="text"
                placeholder="Search by ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="add-employee-button"
              >
                {showAddForm ? 'Cancel' : '+ Add Employee'}
              </button>
            </div>

            {showAddForm && (
              <div className="add-form">
                <h3>Add New Employee</h3>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Employee Name"
                    value={addForm.employee}
                    onChange={(e) => setAddForm({ ...addForm, employee: e.target.value })}
                    className="form-input"
                  />
                  <select
                    value={addForm.classification}
                    onChange={(e) => setAddForm({ ...addForm, classification: e.target.value })}
                    className="form-select"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                  </select>
                  <button onClick={handleAddEmployee} className="save-button">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="employees-table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Classification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.id}</td>
                    <td>
                      {editingId === emp.id ? (
                        <input
                          type="text"
                          value={editForm.employee}
                          onChange={(e) => setEditForm({ ...editForm, employee: e.target.value })}
                          className="edit-input"
                        />
                      ) : (
                        emp.employee
                      )}
                    </td>
                    <td>
                      {editingId === emp.id ? (
                        <select
                          value={editForm.classification}
                          onChange={(e) => setEditForm({ ...editForm, classification: e.target.value })}
                          className="edit-select"
                        >
                          <option value="Cashier">Cashier</option>
                          <option value="Manager">Manager</option>
                        </select>
                      ) : (
                        <span className={`classification-badge ${emp.classification.toLowerCase()}`}>
                          {emp.classification}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === emp.id ? (
                        <div className="action-buttons">
                          <button onClick={handleSaveEdit} className="save-button">
                            Save
                          </button>
                          <button onClick={handleCancelEdit} className="cancel-button">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button onClick={() => handleEdit(emp)} className="edit-button">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="delete-button">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length === 0 && (
              <div className="no-results">No employees found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeesPage;