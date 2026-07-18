import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import { AutoCompleteSearch } from './components/AutoCompleteSearch'
import type { SearchUser } from './components/AutoCompleteSearch'
import { useNavigate, useLocation } from 'react-router-dom'
import { NotificationBell } from './components/NotificationBell'
import { UserCardModal } from './components/user/UserCardModal'
import { Settings, LogOut, User, AlertTriangle } from 'lucide-react'

const getApiBaseUrl = () => {
  const url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'
  return url.endsWith('/') ? url.slice(0, -1) : url
}
const API_BASE_URL = getApiBaseUrl()

interface User {
  id: string
  nickname: string
  realName: string
  phone: string
  address: string
  email: string
  description: string
  status: string
  avatarUrl: string
  firstLogin: boolean
}

const SCHEMAS: { 
  [key: string]: { 
    fields: { 
      key: string; 
      label: string; 
      type: string; 
      required?: boolean; 
      selectOptions?: string[]; 
      hideInTable?: boolean; 
      hideInForm?: boolean; 
    }[] 
  } 
} = {
  configs: {
    fields: [
      { key: 'kind', label: '類別 (Kind)', type: 'text', required: true },
      { key: 'name', label: '屬性名稱 (Name)', type: 'text', required: true },
      { key: 'orderSn', label: '排序編號 (Order SN)', type: 'number', required: true },
      { key: 'value', label: '設定值 (Value)', type: 'text', required: true },
      { key: 'description', label: '功能描述 (Description)', type: 'text', required: true },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  functions: {
    fields: [
      { key: 'id', label: '唯一識別碼 (ID)', type: 'text', required: true, hideInTable: true, hideInForm: true },
      { key: 'pId', label: '父功能 (Parent Function)', type: 'select', hideInTable: true },
      { key: 'name', label: '功能名稱 (Name - 英文)', type: 'text', required: true },
      { key: 'orderSn', label: '排序編號 (Order SN)', type: 'number', required: true },
      { key: 'type', label: '功能類型 (Type)', type: 'select', selectOptions: ['HOME', 'PAGE', 'SETT'] },
      { key: 'description', label: '中文描述 (Description)', type: 'text', required: true },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  groups: {
    fields: [
      { key: 'id', label: '唯一識別碼 (ID)', type: 'text', required: true, hideInTable: true, hideInForm: true },
      { key: 'name', label: '群組名稱 (Name)', type: 'text', required: true },
      { key: 'description', label: '群組描述 (Description)', type: 'text', required: true },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  },
  users: {
    fields: [
      { key: 'id', label: '唯一識別碼 (ID)', type: 'text', required: true, hideInTable: true, hideInForm: true },
      { key: 'nickname', label: '暱稱 (Nickname)', type: 'text', required: true },
      { key: 'realName', label: '真實姓名 (Real Name)', type: 'text' },
      { key: 'phone', label: '電話 (Phone)', type: 'text' },
      { key: 'address', label: '地址 (Address)', type: 'text' },
      { key: 'email', label: '電子郵件 (Email)', type: 'text' },
      { key: 'description', label: '簡介 (Description)', type: 'text' },
      { key: 'status', label: '狀態 (Status)', type: 'select', selectOptions: ['ACTIVE', 'INACTIVE'] },
    ]
  }
};

const INITIAL_DATA: { [key: string]: any[] } = {
  configs: [
    { kind: 'SYS', name: 'NAME', orderSn: 0, value: 'jjHomeProMgt', description: '系統顯示名稱', status: 'ACTIVE' },
    { kind: 'SYS', name: 'VERSION', orderSn: 1, value: '1.0.0', description: '系統版本號', status: 'ACTIVE' },
  ],
  functions: [
    { id: '00000000-0000-0000-0000-00000000', pId: '', name: 'Home', orderSn: 0, type: 'HOME', description: '首頁', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0000-00000001', pId: '', name: 'User', orderSn: 0, type: 'PAGE', description: '使用者', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0099-00000000', pId: '', name: 'Setting', orderSn: 0, type: 'PAGE', description: '設定', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0099-00000001', pId: '00000000-0000-0000-0099-00000000', name: 'Setting_configs', orderSn: 0, type: 'SETT', description: '參數設定', status: 'ACTIVE' },
    { id: '00000000-0000-0000-0099-00000002', pId: '00000000-0000-0000-0099-00000000', name: 'Setting_Auth', orderSn: 1, type: 'SETT', description: '權限設定', status: 'ACTIVE' },
  ],
  groups: []
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const StatusFlag = {
  Disabled:  1 << 0,  // 1
  Hidden:    1 << 1,  // 2
  Locked:    1 << 2,  // 4
  Completed: 1 << 3,  // 8
};

const toStatusObj = (statusVal: any): any => {
  const defaultObj = {
    disabled: false,
    hidden: false,
    locked: false,
    completed: false,
  };

  if (statusVal === undefined || statusVal === null) {
    return defaultObj;
  }

  // If it's already an object, merge with default to ensure all fields exist
  if (typeof statusVal === 'object') {
    return { ...defaultObj, ...statusVal };
  }

  // If it's a legacy string
  if (typeof statusVal === 'string') {
    const str = statusVal.toUpperCase().trim();
    if (str === 'INACTIVE' || str === 'DISABLED') {
      return { ...defaultObj, disabled: true };
    }
    // If it's a numeric string, parse it
    const parsedInt = parseInt(str, 10);
    if (!isNaN(parsedInt)) {
      statusVal = parsedInt;
    } else {
      return defaultObj;
    }
  }

  // If it's a number
  if (typeof statusVal === 'number') {
    return {
      disabled: (statusVal & StatusFlag.Disabled) === StatusFlag.Disabled,
      hidden: (statusVal & StatusFlag.Hidden) === StatusFlag.Hidden,
      locked: (statusVal & StatusFlag.Locked) === StatusFlag.Locked,
      completed: (statusVal & StatusFlag.Completed) === StatusFlag.Completed,
    };
  }

  return defaultObj;
};

const normalizeStatus = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(normalizeStatus);
  }
  if (typeof data === 'object') {
    const copy = { ...data };
    if (copy.status !== undefined) {
      copy.status = toStatusObj(copy.status);
    }
    if (copy.subFunctions && Array.isArray(copy.subFunctions)) {
      copy.subFunctions = copy.subFunctions.map(normalizeStatus);
    }
    return copy;
  }
  return data;
};

const CRUDTable: React.FC<{ objectName: string; token: string | null; onConfigChange?: () => void }> = ({ objectName, token, onConfigChange }) => {
  const typeKey = objectName.toLowerCase() === 'functions' 
    ? 'functions' 
    : objectName.toLowerCase() === 'groups'
      ? 'groups'
      : objectName.toLowerCase() === 'users'
        ? 'users'
        : 'configs';
  const schema = SCHEMAS[typeKey] || SCHEMAS.configs;
  
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  const fetchItems = async () => {
    if (!token) return;
    try {
      const url = typeKey === 'functions' 
        ? `${API_BASE_URL}/api/v1/all_functions` 
        : typeKey === 'groups'
          ? `${API_BASE_URL}/api/v1/groups`
          : typeKey === 'users'
            ? `${API_BASE_URL}/api/users`
            : `${API_BASE_URL}/api/v1/configs`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(normalizeStatus(res.data) || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setItems(INITIAL_DATA[typeKey] || INITIAL_DATA.configs);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [typeKey, token]);

  const handleOpenAdd = () => {
    const defaultForm: any = {};
    schema.fields.forEach(f => {
      if (f.key === 'id' && (typeKey === 'functions' || typeKey === 'groups')) {
        defaultForm[f.key] = generateUUID();
      } else if (f.key === 'pId' && typeKey === 'functions') {
        defaultForm[f.key] = '';
      } else if (f.key === 'status') {
        defaultForm[f.key] = {
          disabled: false,
          hidden: false,
          locked: false,
          completed: false
        };
      } else {
        defaultForm[f.key] = f.type === 'number' ? 0 : f.type === 'select' ? f.selectOptions?.[0] : '';
      }
    });
    setForm(defaultForm);
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setForm({ 
      ...item, 
      status: {
        disabled: false,
        hidden: false,
        locked: false,
        completed: false,
        ...(item.status && typeof item.status === 'object' ? item.status : {})
      }
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleDelete = async (item: any) => {
    if (!token) return;
    if (!window.confirm('確定要刪除此筆資料嗎？')) return;
    try {
      const url = typeKey === 'functions'
        ? `${API_BASE_URL}/api/v1/functions/${item.id}`
        : typeKey === 'groups'
          ? `${API_BASE_URL}/api/v1/groups/${item.id}`
          : `${API_BASE_URL}/api/v1/configs?kind=${item.kind}&name=${item.name}&orderSn=${item.orderSn}`;
      
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchItems();

      if (typeKey === 'configs' && onConfigChange) {
        onConfigChange();
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('刪除失敗。');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const url = typeKey === 'functions'
        ? `${API_BASE_URL}/api/v1/functions`
        : typeKey === 'groups'
          ? `${API_BASE_URL}/api/v1/groups`
          : `${API_BASE_URL}/api/v1/configs`;
      
      await axios.post(url, form, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchItems();
      setShowFormModal(false);

      if (typeKey === 'configs' && onConfigChange) {
        onConfigChange();
      }
    } catch (err) {
      console.error('Failed to save item:', err);
      alert('儲存失敗，請檢查資料格式是否正確。');
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)', textTransform: 'capitalize' }}>{objectName} 維護清單</h4>
        {typeKey !== 'users' && (
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            + 新增資料
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              {schema.fields.filter(f => !f.hideInTable).map(f => (
                <th key={f.key} style={{ padding: '12px' }}>{f.label.split(' ')[0]}</th>
              ))}
              {typeKey !== 'users' && (
                <th style={{ padding: '12px', textAlign: 'right' }}>操作</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {schema.fields.filter(f => !f.hideInTable).map(f => (
                  <td key={f.key} style={{ padding: '12px', color: f.key === 'status' ? undefined : 'var(--text-primary)' }}>
                    {f.key === 'status' ? (
                      (() => {
                        const statusObj = item[f.key] || {};
                        const badges = [];
                        
                        if (statusObj.disabled) {
                          badges.push(
                            <span key="disabled" style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              background: 'rgba(239, 68, 68, 0.1)', 
                              color: 'var(--accent-red)',
                              fontWeight: 600
                            }}>
                              失效
                            </span>
                          );
                        }
                        if (statusObj.hidden) {
                          badges.push(
                            <span key="hidden" style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              background: 'rgba(245, 158, 11, 0.1)', 
                              color: '#f59e0b',
                              fontWeight: 600
                            }}>
                              隱藏
                            </span>
                          );
                        }
                        if (statusObj.locked) {
                          badges.push(
                            <span key="locked" style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              background: 'rgba(59, 130, 246, 0.1)', 
                              color: 'var(--accent-blue)',
                              fontWeight: 600
                            }}>
                              鎖定
                            </span>
                          );
                        }
                        if (statusObj.completed) {
                          badges.push(
                            <span key="completed" style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              background: 'rgba(16, 185, 129, 0.1)', 
                              color: 'var(--accent-green)',
                              fontWeight: 600
                            }}>
                              完成
                            </span>
                          );
                        }
                        
                        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{badges}</div>;
                      })()
                    ) : (
                      item[f.key] !== undefined && item[f.key] !== null ? String(item[f.key]) : '-'
                    )}
                  </td>
                ))}
                {typeKey !== 'users' && (
                  <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', marginRight: '12px', fontSize: '0.85rem' }}
                    >
                      編輯
                    </button>
                    <button 
                      onClick={() => handleDelete(item)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      刪除
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showFormModal && (
        <div className="modal-overlay" style={{ zIndex: 1200, overflowY: 'auto', padding: '40px 0', alignItems: 'flex-start' }}>
          <form className="glass-panel modal-content" onSubmit={handleSubmit} style={{ width: '95%', maxWidth: '450px', padding: '24px', gap: '16px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', textAlign: 'center' }}>
              {isEditing ? `編輯 ${objectName.slice(0, -1)}` : `新增 ${objectName.slice(0, -1)}`}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {schema.fields.filter(f => !f.hideInForm).map(f => (
                <div key={f.key} className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.label}</label>
                  {f.key === 'status' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={!!form.status?.disabled} 
                          onChange={(e) => setForm({ ...form, status: { ...form.status, disabled: e.target.checked } })}
                        />
                        失效 (Disabled)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={!!form.status?.hidden} 
                          onChange={(e) => setForm({ ...form, status: { ...form.status, hidden: e.target.checked } })}
                        />
                        隱藏 (Hidden)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={!!form.status?.locked} 
                          onChange={(e) => setForm({ ...form, status: { ...form.status, locked: e.target.checked } })}
                        />
                        鎖定 (Locked)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                        <input 
                          type="checkbox" 
                          checked={!!form.status?.completed} 
                          onChange={(e) => setForm({ ...form, status: { ...form.status, completed: e.target.checked } })}
                        />
                        完成 (Completed)
                      </label>
                    </div>
                  ) : f.key === 'pId' && typeKey === 'functions' ? (
                    <select 
                      className="form-control" 
                      value={form[f.key] || ''} 
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '8px' }}
                    >
                      <option value="">(無)</option>
                      {items.filter(item => {
                        const isActive = item.status && typeof item.status === 'object' ? !item.status.disabled : item.status === 'ACTIVE';
                        return isActive && (!isEditing || item.id !== form.id);
                      }).map(opt => (
                        <option key={opt.id} value={opt.id}>
                          {opt.description} ({opt.name})
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'select' ? (
                    <select 
                      className="form-control" 
                      value={form[f.key] || ''} 
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '8px' }}
                    >
                      {f.selectOptions?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type={f.type} 
                      className="form-control" 
                      value={form[f.key] === undefined ? '' : form[f.key]} 
                      onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })} 
                      required={f.required} 
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowFormModal(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '80px' }}>
                確定
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const SettingAuthTable: React.FC<{ token: string | null }> = ({ token }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  
  // Modal state
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Left Block: Users
  const [users, setUsers] = useState<any[]>([]);
  const [checkedUserIds, setCheckedUserIds] = useState<{ [key: string]: boolean }>({});
  const [userSearch, setUserSearch] = useState('');

  // Modal Right Block: Functions
  const [functions, setFunctions] = useState<any[]>([]);
  const [checkedFunctionIds, setCheckedFunctionIds] = useState<{ [key: string]: boolean }>({});
  const [functionSearch, setFunctionSearch] = useState('');

  // Fetch groups
  const fetchGroups = async () => {
    if (!token) return;
    setIsLoadingGroups(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out hidden groups
      const normalized = normalizeStatus(res.data) || [];
      const unhidden = normalized.filter((g: any) => !g.status?.hidden);
      setGroups(unhidden);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [token]);

  // Open modal for a specific group
  const handleOpenMaintenance = async (group: any) => {
    setSelectedGroup(group);
    setCheckedUserIds({});
    setCheckedFunctionIds({});
    setUserSearch('');
    setFunctionSearch('');
    setShowModal(true);

    if (!token) return;
    try {
      // 1. Fetch all users
      const usersRes = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(normalizeStatus(usersRes.data) || []);

      // 2. Fetch all functions
      const funcsRes = await axios.get(`${API_BASE_URL}/api/v1/all_functions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFunctions(normalizeStatus(funcsRes.data) || []);

      // 3. Fetch existing GROUP_USER maps for this group
      const userMapsRes = await axios.get(`${API_BASE_URL}/api/v1/maps?kind=GROUP_USER&map_a_id=${group.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userMaps = userMapsRes.data || [];
      const userChecked: { [key: string]: boolean } = {};
      userMaps.forEach((m: any) => {
        userChecked[m.mapBID] = true;
      });
      setCheckedUserIds(userChecked);

      // 4. Fetch existing GROUP_FUNCTION maps for this group
      const funcMapsRes = await axios.get(`${API_BASE_URL}/api/v1/maps?kind=GROUP_FUNCTION&map_a_id=${group.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const funcMaps = funcMapsRes.data || [];
      const funcChecked: { [key: string]: boolean } = {};
      funcMaps.forEach((m: any) => {
        funcChecked[m.mapBID] = true;
      });
      setCheckedFunctionIds(funcChecked);
    } catch (err) {
      console.error('Failed to fetch relation data:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedGroup) return;

    setIsSaving(true);
    try {
      // Get checked lists
      const mapBUserIds = Object.keys(checkedUserIds).filter(id => checkedUserIds[id]);
      const mapBFuncIds = Object.keys(checkedFunctionIds).filter(id => checkedFunctionIds[id]);

      // Call batch updates in parallel
      await Promise.all([
        axios.post(
          `${API_BASE_URL}/api/v1/maps/batch`,
          {
            mapAID: selectedGroup.id,
            kind: 'GROUP_USER',
            mapBIDs: mapBUserIds
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.post(
          `${API_BASE_URL}/api/v1/maps/batch`,
          {
            mapAID: selectedGroup.id,
            kind: 'GROUP_FUNCTION',
            mapBIDs: mapBFuncIds
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ]);

      alert('維護成功！');
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save batch maps:', err);
      alert('維護失敗，請重試。');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered lists for rendering in modal
  const filteredUsers = users.filter((u: any) => {
    const q = userSearch.toLowerCase();
    return (
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.realName && u.realName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const filteredFunctions = functions.filter((f: any) => {
    const q = functionSearch.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  });

  const isAllFilteredUsersChecked = filteredUsers.length > 0 && filteredUsers.every(u => !!checkedUserIds[u.id]);
  const handleToggleAllUsers = (checked: boolean) => {
    const updated = { ...checkedUserIds };
    filteredUsers.forEach(u => {
      updated[u.id] = checked;
    });
    setCheckedUserIds(updated);
  };

  const isAllFilteredFunctionsChecked = filteredFunctions.length > 0 && filteredFunctions.every(f => !!checkedFunctionIds[f.id]);
  const handleToggleAllFunctions = (checked: boolean) => {
    const updated = { ...checkedFunctionIds };
    filteredFunctions.forEach(f => {
      updated[f.id] = checked;
    });
    setCheckedFunctionIds(updated);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--card-border)', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--accent-blue)' }}>權限群組維護清單 (未隱藏)</h4>
      </div>

      {isLoadingGroups ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>群組名稱</th>
                <th style={{ padding: '12px' }}>群組描述</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{group.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{group.description || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button 
                      onClick={() => handleOpenMaintenance(group)}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                    >
                      成員及權限維護
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>無任何未隱藏的群組</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedGroup && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '1000px', padding: '24px', position: 'relative' }}>
            <button 
              className="modal-close-btn" 
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 'bold' }}>
              {selectedGroup.name} - 成員及權限維護
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Left Column: Group Users */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <h5 style={{ fontSize: '0.95rem', color: 'var(--accent-blue)', marginBottom: '12px', fontWeight: 600 }}>群組下轄人員</h5>
                <input 
                  type="text" 
                  placeholder="搜尋人員 (暱稱/姓名/Email)..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    marginBottom: '12px',
                  }}
                />
                <div style={{ overflowY: 'auto', maxHeight: '350px', minHeight: '350px', paddingRight: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isAllFilteredUsersChecked}
                            onChange={(e) => handleToggleAllUsers(e.target.checked)}
                            title="全選 / 取消全選"
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '8px' }}>暱稱</th>
                        <th style={{ padding: '8px' }}>姓名</th>
                        <th style={{ padding: '8px' }}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={!!checkedUserIds[u.id]}
                              onChange={(e) => setCheckedUserIds({ ...checkedUserIds, [u.id]: e.target.checked })}
                            />
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{u.nickname}</td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{u.realName || '-'}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{u.email}</td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>無匹配的人員</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Group Functions */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <h5 style={{ fontSize: '0.95rem', color: 'var(--accent-purple)', marginBottom: '12px', fontWeight: 600 }}>群組可權限功能</h5>
                <input 
                  type="text" 
                  placeholder="搜尋功能 (名稱/描述)..." 
                  value={functionSearch}
                  onChange={(e) => setFunctionSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--card-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    marginBottom: '12px',
                  }}
                />
                <div style={{ overflowY: 'auto', maxHeight: '350px', minHeight: '350px', paddingRight: '4px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={isAllFilteredFunctionsChecked}
                            onChange={(e) => handleToggleAllFunctions(e.target.checked)}
                            title="全選 / 取消全選"
                            style={{ cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '8px' }}>中文描述</th>
                        <th style={{ padding: '8px' }}>功能名稱 (英文)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFunctions.map((f) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={!!checkedFunctionIds[f.id]}
                              onChange={(e) => setCheckedFunctionIds({ ...checkedFunctionIds, [f.id]: e.target.checked })}
                            />
                          </td>
                          <td style={{ padding: '8px', color: 'var(--text-primary)' }}>{f.description}</td>
                          <td style={{ padding: '8px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{f.name}</td>
                        </tr>
                      ))}
                      {filteredFunctions.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>無匹配的功能</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowModal(false)}
                disabled={isSaving}
              >
                取消
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={isSaving}
                style={{ minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isSaving ? <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: 'currentColor' }}></div> : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const oAuthCalled = useRef(false)
  
  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  const [profileForm, setProfileForm] = useState({
    nickname: '',
    realName: '',
    phone: '',
    address: '',
    description: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [selectedSearchUser, setSelectedSearchUser] = useState<SearchUser | null>(null)
  const [homeFunction, setHomeFunction] = useState<any>({
    name: 'Home',
    description: '首頁',
    type: 'HOME',
    subFunctions: []
  })
  
  const [appName, setAppName] = useState('jjHomeProMgt')
  const [is404, setIs404] = useState(false)
  const [currentFunction, setCurrentFunction] = useState<any>(null)
  const [isValidatingRoute, setIsValidatingRoute] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [hasSettingPermission, setHasSettingPermission] = useState<boolean>(false)

  // Configure Axios global interceptor for 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Token expired or invalid, log out the user
          logout()
        }
        return Promise.reject(error)
      }
    )
    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])


  // Handle clicking outside user avatar dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close user dropdown when route changes
  useEffect(() => {
    setIsUserDropdownOpen(false)
  }, [location])

  // Check URL callback routing on page load
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const path = window.location.pathname
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')

      if (path.startsWith('/auth/callback/') && code) {
        if (oAuthCalled.current) return
        oAuthCalled.current = true

        setIsLoading(true)
        setLoginError(null)
        
        // Extract provider from URL, e.g. /auth/callback/google -> google
        const provider = path.split('/')[3]

        try {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/${provider}/callback`, {
            code: code,
          })

          const { token: receivedToken, isNewUser, user: receivedUser } = response.data
          
          // Save credentials
          localStorage.setItem('token', receivedToken)
          localStorage.setItem('user', JSON.stringify(receivedUser))
          
          setToken(receivedToken)
          setUser(receivedUser)

          // Clear code and callback route from URL, redirect to intended path
          const redirectTo = sessionStorage.getItem('redirect_to') || '/'
          sessionStorage.removeItem('redirect_to')
          window.history.replaceState({}, document.title, redirectTo)

          if (isNewUser) {
            // New user must fill out profile immediately
            setProfileForm({
              nickname: receivedUser.nickname || '',
              realName: receivedUser.realName || '',
              phone: receivedUser.phone || '',
              address: receivedUser.address || '',
              description: receivedUser.description || '',
            })
            setShowProfileModal(true)
          }
        } catch (err: any) {
          console.error(err)
          setLoginError(
            err.response?.data?.error || 'Authentication callback failed. Please try again.'
          )
          window.history.replaceState({}, document.title, '/')
        } finally {
          setIsLoading(false)
        }
      }
    }

    handleOAuthCallback()
  }, [])

  const fetchSystemName = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/configs/sys/name`)
      if (response.data && response.data.name) {
        setAppName(response.data.name)
      }
      setBackendError(null)
    } catch (err: any) {
      console.error('Failed to fetch system name:', err)
      if (!err.response) {
        setBackendError('網路連線失敗，無法連接到後端伺服器。')
      }
    }
  }

  // Fetch system name config on mount
  useEffect(() => {
    fetchSystemName()
  }, [])

  // Dynamic function routing verification helper
  const validateRoute = async (tokenVal = token, userVal = user) => {
    // Clear route errors if not logged in
    if (!tokenVal || !userVal) {
      setIs404(false)
      setCurrentFunction(null)
      return
    }

    const path = location.pathname
    // Skip OAuth callback path
    if (path.startsWith('/auth/callback')) {
      return
    }

    let functionName = path.slice(1)
    if (functionName === '') {
      setIs404(false)
      setCurrentFunction({ name: 'Home', description: '首頁', type: 'HOME', subFunctions: [] })
      setIsValidatingRoute(false)
      return
    }

    // If nested path, it's an invalid function name
    if (functionName.includes('/')) {
      setIs404(true)
      setCurrentFunction(null)
      return
    }

    setIsValidatingRoute(true)
    setIs404(false)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/functions?name=${functionName}`, {
        headers: {
          Authorization: `Bearer ${tokenVal}`
        }
      })
      const funcData = response.data
      setCurrentFunction(normalizeStatus(funcData))
      setBackendError(null)
    } catch (err: any) {
      console.error('Route validation failed:', err)
      setIs404(true)
      setCurrentFunction(null)
      if (!err.response) {
        setBackendError('網路連線失敗，無法連接到後端伺服器。')
      }
    } finally {
      setIsValidatingRoute(false)
    }
  }

  // Dynamic function routing verification
  useEffect(() => {
    validateRoute(token, user)
  }, [location.pathname, token, user])

  const fetchHomeFunction = async (tokenVal: string | null) => {
    if (!tokenVal) return
    try {
      setBackendError(null)
      const response = await axios.get(`${API_BASE_URL}/api/v1/functions?name=Home`, {
        headers: {
          Authorization: `Bearer ${tokenVal}`
        }
      })
      setHomeFunction(normalizeStatus(response.data))
    } catch (err: any) {
      console.error('Failed to fetch home function:', err)
      if (!err.response) {
        setBackendError('網路連線失敗，無法連接到後端伺服器。')
      } else {
        setBackendError(`取得功能選單失敗: ${err.response?.data?.error || err.message}`)
      }
    }
  }

  const checkSettingPermission = async (tokenVal: string | null, userVal: any) => {
    if (!tokenVal || !userVal) {
      setHasSettingPermission(false)
      return
    }
    try {
      await axios.get(`${API_BASE_URL}/api/v1/functions?name=Setting`, {
        headers: {
          Authorization: `Bearer ${tokenVal}`
        }
      })
      setHasSettingPermission(true)
    } catch (err) {
      setHasSettingPermission(false)
    }
  }

  // Fetch home function details once logged in
  useEffect(() => {
    if (token && user) {
      fetchHomeFunction(token)
      checkSettingPermission(token, user)
    }
  }, [token, user])

  // General layout function block renderer
  const renderFunctionBlocks = (func: any) => {
    if (!func) return null

    const showFirst = func.name && func.name.toLowerCase() !== 'home'
    const showSecond = func.name === 'Home' || func.name === 'User' || func.type === 'SETT'
    const showThird = func.subFunctions && func.subFunctions.length > 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* First Block: Function name and other details */}
        {showFirst && (
          <div style={{ padding: '8px 0' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {func.description}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>功能名稱: {func.name} | 類型: {func.type}</p>
          </div>
        )}

        {/* Separator between First and Second, or First and Third */}
        {showFirst && (showSecond || showThird) && (
          <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '0' }} />
        )}

        {/* Second Block: Function content */}
        {showSecond && (
          <div style={{ padding: '8px 0' }}>
            {func.name === 'User' && user && (
              <div className="profile-header-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                {user.avatarUrl ? (
                  <img className="avatar" src={user.avatarUrl} alt={user.nickname} style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
                ) : (
                  <div className="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '2rem', background: 'var(--accent-purple)' }}>
                    {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{user.nickname}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>真實姓名: {user.realName || '未填寫'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>聯絡電話: {user.phone || '未填寫'}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>聯絡地址: {user.address || '未填寫'}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>介紹: {user.description || '這個人很懶，什麼都沒寫。'}</p>
                </div>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  onClick={openEditProfile}
                  style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}
                >
                  編輯資訊
                </button>
              </div>
            )}
            {func.name === 'Home' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', opacity: 0.5, border: '2px dashed var(--card-border)', borderRadius: '16px', margin: '12px 0' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontSize: '1rem' }}>主畫面功能按鈕尚未規劃，暫時維持空白</p>
              </div>
            )}
            {func.type === 'SETT' && (
              func.name === 'Setting_Auth' ? (
                <SettingAuthTable token={token} />
              ) : (
                <CRUDTable objectName={func.name.split('_').pop() || 'Config'} token={token} onConfigChange={fetchSystemName} />
              )
            )}
          </div>
        )}

        {/* Separator between Second and Third */}
        {showSecond && showThird && (
          <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '0' }} />
        )}

        {/* Third Block: Sub-functions */}
        {showThird && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {func.subFunctions.map((sub: any) => (
                <div 
                  key={sub.id}
                  className="sub-func-btn-container" 
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <button
                    className="btn btn-outline"
                    onClick={() => navigateTo(`/${sub.name}`)}
                    style={{
                      width: '8vw',
                      height: '8vw',
                      minWidth: '80px',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                      padding: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      wordBreak: 'break-all',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-purple)'
                      e.currentTarget.style.boxShadow = 'var(--neon-purple)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = ''
                      e.currentTarget.style.boxShadow = ''
                    }}
                  >
                    {sub.description}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const navigateTo = (path: string) => {
    navigate(path)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setShowProfileModal(false)
  }

  // Trigger login redirect by fetching the OAuth authorization URL
  const handleLogin = async (provider: string) => {
    setIsLoading(true)
    setLoginError(null)

    // Save intended destination path for redirection after callback
    const currentPath = window.location.pathname
    if (currentPath && !currentPath.startsWith('/auth/callback')) {
      sessionStorage.setItem('redirect_to', currentPath)
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/${provider}`)
      const { url } = response.data
      if (url) {
        window.location.href = url
      } else {
        throw new Error('OAuth URL not found')
      }
    } catch (err: any) {
      console.error(err)
      setLoginError(err.response?.data?.error || `Failed to start ${provider} login.`)
      setIsLoading(false)
    }
  }

  // Open profile editing modal
  const openEditProfile = () => {
    if (user) {
      setProfileForm({
        nickname: user.nickname || '',
        realName: user.realName || '',
        phone: user.phone || '',
        address: user.address || '',
        description: user.description || '',
      })
      setProfileError(null)
      setShowProfileModal(true)
    }
  }

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedNickname = profileForm.nickname.trim()
    if (!trimmedNickname) {
      setProfileError('Nickname is required')
      return
    }

    setIsSavingProfile(true)
    setProfileError(null)

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/v1/users/me`,
        {
          nickname: trimmedNickname,
          realName: profileForm.realName,
          phone: profileForm.phone,
          address: profileForm.address,
          description: profileForm.description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const updatedUser = response.data
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      setShowProfileModal(false)
    } catch (err: any) {
      console.error(err)
      setProfileError(err.response?.data?.error || 'Failed to save profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Determine if we need to show the forced login overlay
  // Forced if: no token exists, or loading/callback is not active but there is no user object
  const showForcedLogin = !token || !user

  if (isLoading && !token) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner" style={{ width: '40px', height: '40px', color: 'var(--accent-purple)' }}></div>
        <p>連線第三方登入驗證中，請稍候...</p>
      </div>
    )
  }

  return (
    <>
      {backendError && (
        <div className="bg-rose-950/85 border-b border-rose-500/30 text-rose-200 px-6 py-3.5 text-sm flex items-center justify-between gap-4 backdrop-blur-md z-[2000] relative animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold text-rose-350">系統連線異常：</span>
              <span>{backendError}</span>
              <span className="text-slate-400 ml-2 font-mono text-xs">(API Base: {API_BASE_URL})</span>
            </div>
          </div>
          <button 
            onClick={() => {
              fetchSystemName()
              if (token && user) {
                fetchHomeFunction(token)
                checkSettingPermission(token, user)
                validateRoute(token, user)
              }
            }}
            className="text-xs bg-rose-500/20 hover:bg-rose-500/35 hover:text-white text-rose-200 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shrink-0 border border-rose-500/25 active:scale-95"
          >
            重新整理連線
          </button>
        </div>
      )}
      {/* Top Navbar */}
      <header className="app-header">
        <div 
          className="logo-container"
          onClick={() => { window.location.href = '/' }}
          style={{ cursor: 'pointer' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-blue)" />
                <stop offset="100%" stopColor="var(--accent-purple)" />
              </linearGradient>
            </defs>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="logo-text">{appName}</span>
        </div>
        {user && (
          <div className="user-nav-profile">
            {/* 1. Collapsible Search Box / Magnifying Glass Icon */}
            <AutoCompleteSearch
              token={token}
              apiBaseUrl={API_BASE_URL}
              onNavigate={navigateTo}
              onSelectUser={setSelectedSearchUser}
            />

            {/* 2. Notification Bell Icon */}
            <NotificationBell
              token={token}
              apiBaseUrl={API_BASE_URL}
              onNavigate={navigateTo}
            />

            {/* 3. User Avatar and Popover (far right) */}
            <div className="relative" ref={userDropdownRef}>
              <div 
                className="user-nav-trigger" 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {user.avatarUrl ? (
                  <img className="avatar" src={user.avatarUrl} alt={user.nickname} style={{ margin: 0 }} />
                ) : (
                  <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', margin: 0 }}>
                    {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>

              {isUserDropdownOpen && (
                <div 
                  className="absolute right-0 mt-3 origin-top-right rounded-2xl border border-slate-800/80 bg-slate-900/90 backdrop-blur-md shadow-2xl z-50 overflow-hidden"
                  style={{
                    width: '320px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    animation: 'scaleIn 0.2s ease-out'
                  }}
                >
                  {/* User Header */}
                  <div className="flex flex-col items-center gap-2 pb-5 mb-2 border-b border-slate-800/60">
                    {user.avatarUrl ? (
                      <img className="w-12 h-12 rounded-full border border-white/10" src={user.avatarUrl} alt={user.nickname} />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center font-bold text-lg text-white">
                        {user.nickname ? user.nickname.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-slate-100">{user.nickname}</span>
                    <span className="text-xs text-slate-400 truncate max-w-full">{user.email || ''}</span>
                  </div>

                  {/* Options */}
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false)
                      navigateTo('/User')
                    }}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-lg transition-colors text-left w-full cursor-pointer"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    個人檔案
                  </button>
                  
                  {hasSettingPermission && (
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false)
                        navigateTo('/Setting')
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-lg transition-colors text-left w-full cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      設定
                    </button>
                  )}

                  <hr className="border-slate-800/50 my-1" />

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false)
                      logout()
                    }}
                    className="flex items-center gap-3 px-5 py-3 text-sm text-rose-450 hover:bg-rose-955/20 hover:text-rose-350 rounded-lg transition-colors text-left w-full cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" />
                    登出
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {user && (
          <div className="dashboard-container">
            {user.firstLogin && (
              <div className="first-login-banner">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 style={{ fontWeight: 600 }}>請完成首次登入設定</h4>
                  <p style={{ color: 'rgba(59, 130, 246, 0.85)', fontSize: '0.9rem' }}>
                    這是您第一次登入，必須填寫並確認您的個人暱稱以解鎖完整功能。
                  </p>
                </div>
                <button className="btn btn-primary" onClick={openEditProfile} style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: '0.875rem' }}>
                  立即設定
                </button>
              </div>
            )}

            {is404 ? (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', textAlign: 'center', padding: '40px', margin: '20px 0', border: '1px solid var(--accent-red)' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px', filter: 'drop-shadow(var(--neon-red))' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>404 Function Not Found</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>您存取的系統功能選單或頁面不存在或已被停用。</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { window.location.href = '/' }}
                  style={{ padding: '10px 24px' }}
                >
                  返回首頁
                </button>
              </div>
            ) : isValidatingRoute ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', opacity: 0.6 }}>
                <div className="spinner" style={{ width: '30px', height: '30px', color: 'var(--accent-purple)', marginBottom: '16px' }}></div>
                <p style={{ fontSize: '0.95rem' }}>載入並驗證系統功能選單中...</p>
              </div>
            ) : (
              renderFunctionBlocks(homeFunction)
            )}
          </div>
        )}
      </main>

      {/* 1. Forced Login Modal */}
      {showForcedLogin && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(var(--neon-purple))' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            </div>
            <h2 className="modal-title">歡迎登入 {appName}</h2>
            <p className="modal-subtitle">請選擇您喜好的社群帳號，立即開始您的管理之旅。</p>

            {loginError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {/* LINE Login */}
              <button 
                className="btn oauth-btn oauth-btn-line" 
                onClick={() => handleLogin('line')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 10.3c0-5.7-5.4-10.3-12-10.3S0 4.6 0 10.3c0 5.1 4.3 9.3 10.1 10.1.4.1.9.3.9.7v2.3c0 .6-.3.8-.1.9.1.1.7-.2 3.5-2.1 4.1-1.3 9.6-4.9 9.6-11.9zM7.5 13.9H5.7V6.7h1.8v7.2zm4.8 0h-3.6V6.7h1.8V12h1.8v1.9zm2.7 0h-1.8V6.7h1.8v7.2zm5.7 0H19L17.2 9.5v4.4h-1.8V6.7h1.8l1.8 4.4V6.7h1.8v7.2z"/>
                </svg>
                使用 LINE 帳號登入
              </button>

              {/* Google Login */}
              <button 
                className="btn oauth-btn oauth-btn-google" 
                onClick={() => handleLogin('google')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                使用 Google 帳號登入
              </button>

              {/* GitHub Login */}
              <button 
                className="btn oauth-btn oauth-btn-github" 
                onClick={() => handleLogin('github')}
                disabled={isLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                使用 GitHub 帳號登入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. General Function Modal (for type PAGE) */}
      {currentFunction && (currentFunction.type === 'PAGE' || currentFunction.type === 'SETT') && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ 
            width: currentFunction.type === 'SETT' ? '90%' : '80%', 
            maxWidth: currentFunction.type === 'SETT' ? '90%' : '800px', 
            padding: '32px', 
            position: 'relative' 
          }}>
            {/* Close button (X) in top right */}
            <button 
              className="modal-close-btn" 
              onClick={() => navigateTo(currentFunction.parentName ? `/${currentFunction.parentName}` : '/')}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '4px',
                lineHeight: '1',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              &times;
            </button>

            {/* Render three blocks for this PAGE function */}
            {renderFunctionBlocks(currentFunction)}
          </div>
        </div>
      )}

      {/* 2. Edit Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <form className="glass-panel modal-content" onSubmit={handleSaveProfile} style={{ gap: '20px' }}>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              完成個人檔案設定
            </h2>
            
            {profileError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                {profileError}
              </div>
            )}

            {/* Nickname (Required) */}
            <div className="form-group">
              <label className="form-label">
                使用者暱稱 (Nickname)<span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入暱稱（不可重複）"
                value={profileForm.nickname}
                onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                required
              />
            </div>

            {/* Real Name */}
            <div className="form-group">
              <label className="form-label">真實姓名 (Real Name)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的真實姓名"
                value={profileForm.realName}
                onChange={(e) => setProfileForm({ ...profileForm, realName: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">聯絡電話 (Phone)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的電話號碼"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">通訊地址 (Address)</label>
              <input
                type="text"
                className="form-control"
                placeholder="請輸入您的通訊地址"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">個人簡介 (Description)</label>
              <textarea
                className="form-control"
                placeholder="介紹一下你自己吧..."
                value={profileForm.description}
                onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              {/* Only show cancel button if they are NOT in forced first-login completion */}
              {user && !user.firstLogin && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowProfileModal(false)}
                  disabled={isSavingProfile}
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSavingProfile}
                style={{ minWidth: '100px' }}
              >
                {isSavingProfile ? (
                  <div className="spinner"></div>
                ) : (
                  '儲存設定'
                )}
              </button>
            </div>
          </form>
        </div>
      )}


      {/* User Detail Modal */}
      {selectedSearchUser && (
        <UserCardModal
          userId={selectedSearchUser.id}
          currentUserId={user ? user.id : ''}
          token={token}
          apiBaseUrl={API_BASE_URL}
          onClose={() => setSelectedSearchUser(null)}
          onEdit={() => {
            setSelectedSearchUser(null)
            setShowProfileModal(true)
          }}
        />
      )}
    </>
  )
}

export default App
