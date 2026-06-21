import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api } from '../utils/api';
import Swal from 'sweetalert2';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { 
  LogOut, LayoutDashboard, Trophy, Award, Users, BookOpen, Plus, 
  Trash2, Copy, Edit3, Settings, ShieldAlert, Key, UserPlus, 
  UserCheck, UserX, Printer, CheckCircle, Clock, Link,
  Upload, Loader2, Shield, Calendar, MapPin, User, BarChart3
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form States
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('general');
  const [allJudgesList, setAllJudgesList] = useState([]);
  const [activityForm, setActivityForm] = useState({
    id: null,
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    host_organization: '',
    status: 'Draft',
    scoring_algorithm: 'standard_average',
    competition_type: 'in_institution',
    criteria: [{ id: 'crit_1', name: 'หัวข้อหลักที่ 1', max_score: 10, weight: 1.0, children: [] }],
    expected_judges: 3,
    logo_url: '',
    banner_url: '',
    login_config: {
      template: 'template_1',
      logo_urls: [],
      banner_url: '',
      show_title: true,
      show_date: true,
      show_location: true,
      show_host: true
    },
    judges: []
  });

  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const [autoGenJudge, setAutoGenJudge] = useState(false);
  const [judgeForm, setJudgeForm] = useState({
    username: '',
    password: '',
    fullname: '',
    institution_code: ''
  });

  const [showEditJudgeModal, setShowEditJudgeModal] = useState(false);
  const [editJudgeForm, setEditJudgeForm] = useState({
    id: null,
    fullname: '',
    username: '',
    institution_code: ''
  });

  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdData, setResetPwdData] = useState({ judgeId: null, judgeName: '', newPassword: '' });
  const [inlineJudgeForm, setInlineJudgeForm] = useState({ fullname: '', institution_code: '' });
  const [showInlineJudgeForm, setShowInlineJudgeForm] = useState(false);

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogos, setUploadingLogos] = useState({});
  const [uploadingSingleLogo, setUploadingSingleLogo] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    institution_logo: '',
    institution_name: 'วิทยาลัยสารพัดช่างน่าน'
  });
  const [uploadingSettingLogo, setUploadingSettingLogo] = useState(false);

  const [showManageActivityModal, setShowManageActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', type: 'individual', institution_code: '', project_title: '', team_members: '', project_url: '', attachment_url: '' });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [manageTab, setManageTab] = useState('participants'); // 'participants' or 'report'
  const [liveReportData, setLiveReportData] = useState(null);

  const getLeafNodes = (nodes) => {
    let leaves = [];
    const traverse = (list) => {
      if (!list) return;
      for (const node of list) {
        if (!node.children || node.children.length === 0) {
          leaves.push(node);
        } else {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return leaves;
  };

  const fetchLiveReport = async (activityId) => {
    try {
      const data = await api.get(`/api/reports/leaderboard/${activityId}`);
      setLiveReportData(data);
    } catch (err) {
      console.error('Error fetching live report:', err);
    }
  };

  const [selectedLiveReportActivityId, setSelectedLiveReportActivityId] = useState('');
  const [liveReportDataFullscreen, setLiveReportDataFullscreen] = useState(null);
  const [selectedLiveReportActivity, setSelectedLiveReportActivity] = useState(null);

  const fetchLiveReportFullscreen = async (activityId) => {
    if (!activityId) return;
    try {
      const data = await api.get(`/api/reports/leaderboard/${activityId}`);
      setLiveReportDataFullscreen(data);
    } catch (err) {
      console.error('Error fetching fullscreen live report:', err);
    }
  };

  useEffect(() => {
    let intervalId;
    if (activeTab === 'live_report' && selectedLiveReportActivityId) {
      // Find full activity details (to get criteria structure)
      api.get(`/api/admin/activities/${selectedLiveReportActivityId}`)
        .then(details => {
          setSelectedLiveReportActivity(details);
          fetchLiveReportFullscreen(selectedLiveReportActivityId);
        })
        .catch(err => console.error('Error fetching activity details:', err));

      // Auto refresh every 5 seconds
      intervalId = setInterval(() => {
        fetchLiveReportFullscreen(selectedLiveReportActivityId);
      }, 5000);
    } else {
      setSelectedLiveReportActivity(null);
      setLiveReportDataFullscreen(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, selectedLiveReportActivityId]);

  useEffect(() => {
    let intervalId;
    if (showManageActivityModal && selectedActivity && manageTab === 'report') {
      fetchLiveReport(selectedActivity.id);
      
      // Auto refresh every 5 seconds
      intervalId = setInterval(() => {
        fetchLiveReport(selectedActivity.id);
      }, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showManageActivityModal, selectedActivity, manageTab]);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsData = await api.get('/api/admin/dashboard');
        setStats(statsData);
      } else if (activeTab === 'activities') {
        const actData = await api.get('/api/admin/activities');
        setActivities(actData);
      } else if (activeTab === 'judges') {
        const jdData = await api.get('/api/admin/judges');
        setJudges(jdData);
      } else if (activeTab === 'settings') {
        const settingsData = await api.get('/api/admin/settings');
        setSystemSettings(settingsData);
      } else if (activeTab === 'live_report') {
        const actData = await api.get('/api/admin/activities');
        setActivities(actData);
        if (actData.length > 0 && !selectedLiveReportActivityId) {
          setSelectedLiveReportActivityId(actData[0].id.toString());
        }
      }
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบประเมินผลใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4A2C6D',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/login');
      }
    });
  };

  const fetchAllJudgesForAssignment = async () => {
    try {
      const data = await api.get('/api/admin/judges');
      setAllJudgesList(data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTIVITY ACTIONS ---
  const handleOpenCreateActivity = () => {
    setIsEditingActivity(false);
    setModalActiveTab('general');
    setActivityForm({
      id: null,
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      location: '',
      host_organization: '',
      status: 'Draft',
      scoring_algorithm: 'standard_average',
      competition_type: 'in_institution',
      criteria: [{ id: 'crit_1', name: 'เกณฑ์ที่ 1', max_score: 100, weight: 1.0 }],
      expected_judges: 3,
      logo_url: '',
      banner_url: '',
      login_config: {
        template: 'template_1',
        logo_urls: [],
        banner_url: '',
        show_title: true,
        show_date: true,
        show_location: true,
        show_host: true
      },
      judges: []
    });
    fetchAllJudgesForAssignment();
    setShowActivityModal(true);
  };

  const handleOpenEditActivity = async (activity) => {
    setIsEditingActivity(true);
    setModalActiveTab('general');
    try {
      const fullDetails = await api.get(`/api/admin/activities/${activity.id}`);
      const allJudges = await api.get('/api/admin/judges');
      setAllJudgesList(allJudges);

      let parsedConfig = {
        template: 'template_1',
        logo_urls: [],
        banner_url: '',
        show_title: true,
        show_date: true,
        show_location: true,
        show_host: true
      };
      if (fullDetails.login_config) {
        try {
          parsedConfig = typeof fullDetails.login_config === 'string' 
            ? JSON.parse(fullDetails.login_config) 
            : fullDetails.login_config;
        } catch (e) {
          console.error('Failed to parse login_config:', e);
        }
      }

      setActivityForm({
        id: fullDetails.id,
        title: fullDetails.title,
        description: fullDetails.description || '',
        start_date: fullDetails.start_date.substring(0, 16),
        end_date: fullDetails.end_date.substring(0, 16),
        location: fullDetails.location || '',
        host_organization: fullDetails.host_organization || '',
        status: fullDetails.status,
        scoring_algorithm: fullDetails.scoring_algorithm,
        competition_type: fullDetails.competition_type || 'in_institution',
        criteria: typeof fullDetails.criteria === 'string' ? JSON.parse(fullDetails.criteria) : fullDetails.criteria,
        expected_judges: fullDetails.expected_judges || 3,
        logo_url: fullDetails.logo_url || '',
        banner_url: fullDetails.banner_url || '',
        login_config: parsedConfig,
        judges: fullDetails.judges.map(j => ({ id: j.id, is_head_judge: !!j.is_head_judge }))
      });
      setShowActivityModal(true);
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  // --- RECURSIVE HIERARCHICAL CRITERIA BUILDER LOGIC ---
  const calculateMaxScore = (children) => {
    if (!children || children.length === 0) return 0;
    return children.reduce((sum, child) => {
      const childMax = parseFloat(child.max_score) || 0;
      const childW = child.weight !== undefined ? parseFloat(child.weight) : 1.0;
      return sum + (childMax * childW);
    }, 0);
  };

  const updateCriteriaNode = (nodes, id, field, value) => {
    return nodes.map(node => {
      if (node.id === id) {
        let updatedNode = { ...node, [field]: value };
        return updatedNode;
      }
      if (node.children && node.children.length > 0) {
        const updatedChildren = updateCriteriaNode(node.children, id, field, value);
        let updatedNode = { ...node, children: updatedChildren };
        updatedNode.max_score = calculateMaxScore(updatedChildren);
        return updatedNode;
      }
      return node;
    });
  };

  const handleCriteriaNodeChange = (nodeId, field, value) => {
    const parsedValue = (field === 'max_score' || field === 'weight') ? (parseFloat(value) || 0) : value;
    const updatedCriteria = updateCriteriaNode(activityForm.criteria, nodeId, field, parsedValue);
    setActivityForm({ ...activityForm, criteria: updatedCriteria });
  };

  const addCriteriaNode = (parentId) => {
    const nextId = `crit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newNode = { id: nextId, name: '', max_score: 10, weight: 1.0, children: [] };
    
    if (!parentId) {
      setActivityForm({
        ...activityForm,
        criteria: [...activityForm.criteria, { ...newNode, name: `หัวข้อหลักที่ ${activityForm.criteria.length + 1}` }]
      });
      return;
    }

    const insertChild = (nodes) => {
      return nodes.map(node => {
        if (node.id === parentId) {
          const updatedChildren = [...(node.children || []), { 
            ...newNode, 
            name: node.children && node.children.length > 0 
              ? `หัวข้อรองที่ ${node.children.length + 1}` 
              : `หัวข้อย่อยที่ 1` 
          }];
          return {
            ...node,
            children: updatedChildren,
            max_score: calculateMaxScore(updatedChildren)
          };
        }
        if (node.children && node.children.length > 0) {
          const updatedChildren = insertChild(node.children);
          return {
            ...node,
            children: updatedChildren,
            max_score: calculateMaxScore(updatedChildren)
          };
        }
        return node;
      });
    };

    setActivityForm({
      ...activityForm,
      criteria: insertChild(activityForm.criteria)
    });
  };

  const removeCriteriaNode = (nodeId) => {
    const deleteChild = (nodes) => {
      let filtered = nodes.filter(node => node.id !== nodeId);
      return filtered.map(node => {
        if (node.children && node.children.length > 0) {
          const updatedChildren = deleteChild(node.children);
          return {
            ...node,
            children: updatedChildren,
            max_score: calculateMaxScore(updatedChildren)
          };
        }
        return node;
      });
    };

    const updatedCriteria = deleteChild(activityForm.criteria);
    if (updatedCriteria.length === 0) {
      Swal.fire('คำเตือน', 'ต้องมีหัวข้อหลักอย่างน้อย 1 รายการ', 'warning');
      return;
    }
    setActivityForm({ ...activityForm, criteria: updatedCriteria });
  };

  const renderCriteriaTree = (nodes, depth = 1) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      
      let depthClass = "bg-white border-primary-light/20 border-l-4 border-l-primary";
      let titlePlaceholder = "ชื่อหัวข้อหลัก";
      if (depth === 2) {
        depthClass = "bg-blue-50/20 border-info-light/20 border-l-4 border-l-info ml-6";
        titlePlaceholder = "ชื่อหัวข้อรอง";
      } else if (depth === 3) {
        depthClass = "bg-orange-50/20 border-accent-light/20 border-l-4 border-l-accent ml-12";
        titlePlaceholder = "ชื่อหัวข้อย่อย";
      }

      return (
        <div key={node.id} className="space-y-2">
          <div className={`flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-lg border hover:shadow-sm transition-all ${depthClass}`}>
            <div className="flex-1">
              <input
                type="text"
                required
                placeholder={titlePlaceholder}
                value={node.name}
                onChange={(e) => handleCriteriaNodeChange(node.id, 'name', e.target.value)}
                className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-white font-semibold"
              />
            </div>

            <div className="w-full sm:w-28 flex items-center space-x-1">
              <input
                type="number"
                required
                min="1"
                disabled={hasChildren}
                placeholder="คะแนนเต็ม"
                value={hasChildren ? parseFloat(node.max_score.toFixed(2)) : node.max_score}
                onChange={(e) => handleCriteriaNodeChange(node.id, 'max_score', e.target.value)}
                className={`w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center font-bold ${
                  hasChildren ? 'bg-gray-100 text-gray-500 font-medium' : 'bg-white text-gray-800'
                }`}
              />
            </div>

            <div className="w-full sm:w-28">
              <input
                type="number"
                step="0.1"
                required
                placeholder="น้ำหนักคูณ"
                value={node.weight}
                onChange={(e) => handleCriteriaNodeChange(node.id, 'weight', e.target.value)}
                className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center font-semibold bg-white"
              />
            </div>

            <div className="flex items-center space-x-1 justify-end w-20">
              {depth < 3 && (
                <button
                  type="button"
                  onClick={() => addCriteriaNode(node.id)}
                  title={depth === 1 ? "เพิ่มหัวข้อรอง" : "เพิ่มหัวข้อย่อย"}
                  className="p-1.5 text-primary hover:bg-primary-soft rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => removeCriteriaNode(node.id)}
                className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {hasChildren && (
            <div className="space-y-2">
              {renderCriteriaTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('คำเตือน', 'กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น (.jpeg, .jpg, .png, .gif, .webp)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('คำเตือน', 'ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 5MB', 'warning');
      return;
    }
    setUploadingBanner(true);
    try {
      const data = await api.upload('/api/admin/upload', file);
      setActivityForm(prev => ({
        ...prev,
        banner_url: data.url,
        login_config: { ...prev.login_config, banner_url: data.url }
      }));
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleLogoUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('คำเตือน', 'กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น (.jpeg, .jpg, .png, .gif, .webp)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('คำเตือน', 'ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 5MB', 'warning');
      return;
    }
    setUploadingLogos(prev => ({ ...prev, [index]: true }));
    try {
      const data = await api.upload('/api/admin/upload', file);
      const newLogos = [...(activityForm.login_config.logo_urls || [])];
      newLogos[index] = data.url;
      setActivityForm(prev => ({
        ...prev,
        login_config: { ...prev.login_config, logo_urls: newLogos }
      }));
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploadingLogos(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSingleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('คำเตือน', 'กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น (.jpeg, .jpg, .png, .gif, .webp)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('คำเตือน', 'ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 5MB', 'warning');
      return;
    }
    setUploadingSingleLogo(true);
    try {
      const data = await api.upload('/api/admin/upload', file);
      setActivityForm(prev => ({
        ...prev,
        logo_url: data.url
      }));
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploadingSingleLogo(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/admin/settings', systemSettings);
      Swal.fire('สำเร็จ', 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleSettingLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire('คำเตือน', 'กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น (.jpeg, .jpg, .png, .gif, .webp)', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('คำเตือน', 'ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 5MB', 'warning');
      return;
    }
    setUploadingSettingLogo(true);
    try {
      const data = await api.upload('/api/admin/upload', file);
      setSystemSettings(prev => ({
        ...prev,
        institution_logo: data.url
      }));
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploadingSettingLogo(false);
    }
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title || !activityForm.start_date || !activityForm.end_date) {
      Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    // Recursive tree nodes validation
    const validateTreeNodes = (nodes) => {
      for (const node of nodes) {
        if (!node.name) return false;
        if (!node.children || node.children.length === 0) {
          if (node.max_score <= 0) return false;
        } else {
          if (!validateTreeNodes(node.children)) return false;
        }
      }
      return true;
    };

    const isValid = validateTreeNodes(activityForm.criteria);
    if (!isValid) {
      Swal.fire('คำเตือน', 'กรุณาระบุชื่อเกณฑ์ทุกช่อง และคะแนนเต็มของเกณฑ์ระดับล่างสุดต้องมากกว่า 0', 'warning');
      return;
    }

    const hasHeadJudge = activityForm.judges.some(j => j.is_head_judge);
    if (activityForm.judges.length > 0 && !hasHeadJudge) {
      Swal.fire('คำเตือน', 'กรุณาแต่งตั้งประธานกรรมการประเมินตัดสินอย่างน้อย 1 ท่าน ในแท็บมอบหมายกรรมการ', 'warning');
      return;
    }

    try {
      if (isEditingActivity) {
        await api.put(`/api/admin/activities/${activityForm.id}`, activityForm);
        Swal.fire('สำเร็จ', 'แก้ไขข้อมูลกิจกรรมการแข่งขันเรียบร้อยแล้ว', 'success');
      } else {
        await api.post('/api/admin/activities', activityForm);
        Swal.fire('สำเร็จ', 'สร้างกิจกรรมการแข่งขันเรียบร้อยแล้ว', 'success');
      }
      setShowActivityModal(false);
      fetchDashboardData();
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleCloneActivity = async (id) => {
    Swal.fire({
      title: 'คัดลอกกิจกรรมการแข่งขัน?',
      text: 'นี่จะเป็นการคัดลอกเกณฑ์คะแนนและการตั้งค่าต่างๆ ไปยังกิจกรรมใหม่สถานะ "ร่าง (Draft)" โดยจะรีเซ็ตกำหนดการ กรรมการ และคะแนนที่ส่งไปแล้วทั้งหมด',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4A2C6D',
      confirmButtonText: 'ยืนยันการคัดลอก',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.post(`/api/admin/activities/${id}/clone`);
          Swal.fire('คัดลอกสำเร็จ!', 'คัดลอกเรียบร้อยแล้ว กิจกรรมใหม่อยู่ในสถานะ "ร่าง"', 'success');
          fetchDashboardData();
        } catch (err) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
      }
    });
  };

  const handleDeleteActivity = async (act) => {
    // First check if it has scores to decide dialog type
    const hasScores = (act.evaluations_submitted || 0) > 0;

    if (hasScores) {
      // Step 1: Warn about scores
      const step1 = await Swal.fire({
        title: '⚠️ กิจกรรมนี้มีคะแนนที่บันทึกแล้ว!',
        html: `<div class="text-left text-sm space-y-2">
          <p class="font-bold text-red-600">กิจกรรม "${act.title}" มีข้อมูลดังนี้:</p>
          <ul class="list-disc list-inside text-gray-700 space-y-1">
            <li>คะแนนที่กรรมการส่งแล้ว <strong>${act.evaluations_submitted || 0} ครั้ง</strong></li>
            <li>ผู้เข้าแข่งขัน <strong>${act.participant_count || 0} รายการ</strong></li>
          </ul>
          <p class="text-red-500 font-semibold mt-2">ข้อมูลทั้งหมดจะถูกลบถาวรและไม่สามารถกู้คืนได้!</p>
        </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D32F2F',
        confirmButtonText: 'รับทราบ ต้องการลบจริง',
        cancelButtonText: 'ยกเลิก'
      });
      if (!step1.isConfirmed) return;

      // Step 2: Final confirm by typing activity name
      const step2 = await Swal.fire({
        title: 'ยืนยันการลบถาวร',
        html: `<p class="text-sm text-gray-600 mb-2">พิมพ์คำว่า <strong class="text-red-600">ยืนยันลบ</strong> เพื่อยืนยันการลบข้อมูลทั้งหมด</p>`,
        input: 'text',
        inputPlaceholder: 'พิมพ์ ยืนยันลบ',
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#D32F2F',
        confirmButtonText: 'ลบถาวรทันที',
        cancelButtonText: 'ยกเลิก',
        preConfirm: (val) => {
          if (val !== 'ยืนยันลบ') {
            Swal.showValidationMessage('กรุณาพิมพ์ ยืนยันลบ ให้ถูกต้องเพื่อดำเนินการ');
          }
        }
      });
      if (!step2.isConfirmed) return;

      try {
        await api.delete(`/api/admin/activities/${act.id}?force=true`);
        Swal.fire('ลบแล้ว!', 'ลบกิจกรรมและข้อมูลทั้งหมดเรียบร้อยแล้ว', 'success');
        fetchDashboardData();
      } catch (err) {
        Swal.fire('ข้อผิดพลาด', err.message, 'error');
      }
    } else {
      // No scores — simple confirm
      Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: 'กิจกรรมจะถูกลบถาวร ไม่สามารถกู้คืนได้',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D32F2F',
        confirmButtonText: 'ยืนยันการลบ',
        cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await api.delete(`/api/admin/activities/${act.id}`);
            Swal.fire('ลบแล้ว!', 'ลบกิจกรรมเรียบร้อยแล้ว', 'success');
            fetchDashboardData();
          } catch (err) {
            Swal.fire('ข้อผิดพลาด', err.message, 'error');
          }
        }
      });
    }
  };

  const handleCopyJudgeLink = (activityId) => {
    const link = `${window.location.origin}/activities/${activityId}/login`;
    navigator.clipboard.writeText(link);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกลิงก์สำเร็จ',
      text: 'คัดลอกลิงก์สำหรับเข้าสู่ระบบประเมินของกรรมการเรียบร้อยแล้ว',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true
    });
  };

  // --- MANAGE ACTIVITY (PARTICIPANTS) ---
  const handleOpenManageActivity = async (activity) => {
    setManageTab('participants');
    setLiveReportData(null);
    try {
      const fullDetails = await api.get(`/api/admin/activities/${activity.id}`);
      setSelectedActivity(fullDetails);
      setShowManageActivityModal(true);
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('คำเตือน', 'ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 5MB', 'warning');
      return;
    }
    setUploadingAttachment(true);
    try {
      const data = await api.upload('/api/admin/upload', file);
      setNewParticipant(prev => ({
        ...prev,
        attachment_url: data.url
      }));
      Swal.fire('สำเร็จ!', 'อัปโหลดไฟล์เอกสารแนบเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    if (!newParticipant.name) {
      Swal.fire('คำเตือน', 'กรุณากรอกชื่อผู้แข่งขัน', 'warning');
      return;
    }
    if (selectedActivity.competition_type === 'out_institution' && !newParticipant.institution_code) {
      Swal.fire('คำเตือน', 'กรุณากรอกรหัสสถาบัน/วิทยาลัย', 'warning');
      return;
    }
    if (newParticipant.type === 'team' && !newParticipant.team_members) {
      Swal.fire('คำเตือน', 'กรุณากรอกรายชื่อสมาชิกในทีมอย่างน้อย 1 คน', 'warning');
      return;
    }

    const payload = {
      name: newParticipant.name,
      type: newParticipant.type,
      institution_code: selectedActivity.competition_type === 'out_institution' ? newParticipant.institution_code : null,
      project_title: newParticipant.project_title || null,
      team_members: newParticipant.type === 'team' ? newParticipant.team_members : null,
      project_url: newParticipant.project_url || null,
      attachment_url: newParticipant.attachment_url || null
    };

    try {
      const result = await api.post(`/api/admin/activities/${selectedActivity.id}/participants`, payload);
      const updatedParts = [...selectedActivity.participants, { id: result.id, ...payload }];
      setSelectedActivity({ ...selectedActivity, participants: updatedParts });
      setNewParticipant({ name: '', type: 'individual', institution_code: '', project_title: '', team_members: '', project_url: '', attachment_url: '' });
      Swal.fire('สำเร็จ!', 'เพิ่มรายชื่อผู้แข่งขันเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleDeleteParticipant = async (partId) => {
    try {
      await api.delete(`/api/admin/participants/${partId}`);
      const updatedParts = selectedActivity.participants.filter(p => p.id !== partId);
      setSelectedActivity({ ...selectedActivity, participants: updatedParts });
      Swal.fire('สำเร็จ!', 'ลบรายชื่อผู้แข่งขันเรียบร้อยแล้ว', 'success');
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleCreateJudgeInline = async () => {
    if (!inlineJudgeForm.fullname) {
      Swal.fire('คำเตือน', 'กรุณากรอกชื่อ-นามสกุลกรรมการ', 'warning');
      return;
    }
    try {
      const payload = {
        fullname: inlineJudgeForm.fullname,
        institution_code: inlineJudgeForm.institution_code,
        autoGenerate: true
      };
      const result = await api.post('/api/admin/judges', payload);
      
      const usernameVal = result.credentials ? result.credentials.username : result.username;
      const passwordVal = result.credentials ? result.credentials.password : result.password;

      // Auto-copy to clipboard
      const credText = `ชื่อผู้ใช้งาน: ${usernameVal}\nรหัสผ่าน: ${passwordVal}`;
      navigator.clipboard.writeText(credText).catch(err => console.error('Clipboard copy failed', err));

      Swal.fire({
        title: 'ลงทะเบียนกรรมการสำเร็จ!',
        html: `
          <div class="text-left space-y-2 text-sm p-3 bg-gray-50 border rounded-lg font-sans">
            <div class="font-bold text-primary">ชื่อ-นามสกุล: <span class="text-gray-800">${inlineJudgeForm.fullname}</span></div>
            <div>ชื่อผู้ใช้งาน (Username): <code class="bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold text-primary">${usernameVal}</code></div>
            <div>รหัสผ่าน (Password): <code class="bg-primary/10 px-1.5 py-0.5 rounded font-mono font-bold text-primary">${passwordVal}</code></div>
          </div>
          <p class="text-[11px] text-danger font-semibold mt-3">** คัดลอกข้อมูลนี้ส่งให้กรรมการสำหรับเข้าใช้งานระบบ **</p>
        `,
        icon: 'success',
        confirmButtonColor: '#4A2C6D',
        confirmButtonText: 'ตกลง'
      });

      // Reset inline form and hide it
      setInlineJudgeForm({ fullname: '', institution_code: '' });
      setShowInlineJudgeForm(false);

      // Re-fetch all judges
      const allJudges = await api.get('/api/admin/judges');
      setAllJudgesList(allJudges);

      // Auto-assign the new judge
      setActivityForm(prev => {
        const updatedJudges = [...prev.judges, { id: result.id, is_head_judge: false }];
        const hasHead = updatedJudges.some(j => j.is_head_judge);
        if (updatedJudges.length > 0 && !hasHead) {
          Swal.fire({
            icon: 'warning',
            title: 'ยังไม่กำหนดประธานกรรมการ',
            text: 'กรุณาคลิกปุ่ม "แต่งตั้งประธาน" ที่ชื่อกรรมการที่ต้องการ',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
        }
        return {
          ...prev,
          judges: updatedJudges
        };
      });
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  // --- JUDGE MANAGEMENT ACTIONS ---
  const handleCreateJudge = async (e) => {
    e.preventDefault();
    if (!judgeForm.fullname) {
      Swal.fire('คำเตือน', 'กรุณากรอกชื่อ-นามสกุลกรรมการ', 'warning');
      return;
    }
    if (!autoGenJudge && (!judgeForm.username || !judgeForm.password)) {
      Swal.fire('คำเตือน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน', 'warning');
      return;
    }

    const payload = {
      fullname: judgeForm.fullname,
      institution_code: judgeForm.institution_code,
      autoGenerate: autoGenJudge
    };
    if (!autoGenJudge) {
      payload.username = judgeForm.username;
      payload.password = judgeForm.password;
    }

    try {
      const res = await api.post('/api/admin/judges', payload);
      if (res.credentials) {
        Swal.fire({
          title: 'สร้างบัญชีกรรมการสำเร็จ',
          html: `
            <div class="text-left bg-gray-50 p-4 rounded-lg border text-sm font-mono space-y-2 mt-2">
              <div><strong>ชื่อผู้ใช้งาน:</strong> ${res.credentials.username}</div>
              <div><strong>รหัสผ่าน:</strong> ${res.credentials.password}</div>
            </div>
            <p class="text-xs text-danger font-semibold mt-3">* ข้อมูลนี้จะถูกคัดลอกไปยังคลิปบอร์ดโดยอัตโนมัติ</p>
          `,
          icon: 'success',
          confirmButtonColor: '#4A2C6D',
          confirmButtonText: 'ตกลง'
        }).then(() => {
          navigator.clipboard.writeText(`Username: ${res.credentials.username}\nPassword: ${res.credentials.password}`);
        });
      } else {
        Swal.fire('สำเร็จ', 'สร้างบัญชีผู้ใช้งานกรรมการเรียบร้อยแล้ว', 'success');
      }
      setShowJudgeModal(false);
      setAutoGenJudge(false);
      setJudgeForm({ username: '', password: '', fullname: '', institution_code: '' });
      fetchDashboardData();
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleOpenEditJudge = (judge) => {
    setEditJudgeForm({
      id: judge.id,
      fullname: judge.fullname,
      username: judge.username,
      institution_code: judge.institution_code || ''
    });
    setShowEditJudgeModal(true);
  };

  const handleUpdateJudge = async (e) => {
    e.preventDefault();
    if (!editJudgeForm.fullname || !editJudgeForm.username) {
      Swal.fire('คำเตือน', 'กรุณากรอกชื่อและชื่อผู้ใช้ให้ครบถ้วน', 'warning');
      return;
    }

    try {
      await api.put(`/api/admin/judges/${editJudgeForm.id}`, editJudgeForm);
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลกรรมการเรียบร้อยแล้ว', 'success');
      setShowEditJudgeModal(false);
      fetchDashboardData();
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleToggleJudgeStatus = async (judge) => {
    const newStatus = judge.status === 'active' ? 'disabled' : 'active';
    const actionText = newStatus === 'active' ? 'เปิดการใช้งาน' : 'ระงับการใช้งาน';

    Swal.fire({
      title: `ยืนยัน ${actionText}?`,
      text: `คุณแน่ใจหรือไม่ว่าต้องการ${actionText.toLowerCase()} บัญชีผู้ใช้ของคุณ ${judge.fullname}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'active' ? '#0288D1' : '#D32F2F',
      confirmButtonText: `ยืนยันการตั้งค่า`,
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.put(`/api/admin/judges/${judge.id}/status`, { status: newStatus });
          Swal.fire('ปรับสถานะแล้ว', `บัญชีได้รับการปรับเป็นสถานะ ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับใช้งาน'} แล้ว`, 'success');
          fetchDashboardData();
        } catch (err) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
      }
    });
  };

  const handleOpenResetPassword = (judge) => {
    setResetPwdData({ judgeId: judge.id, judgeName: judge.fullname, newPassword: '' });
    setShowResetPwdModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdData.newPassword || resetPwdData.newPassword.length < 6) {
      Swal.fire('คำเตือน', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษรขึ้นไป', 'warning');
      return;
    }

    try {
      await api.put(`/api/admin/judges/${resetPwdData.judgeId}/reset-password`, { password: resetPwdData.newPassword });
      Swal.fire('สำเร็จ', 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว', 'success');
      setShowResetPwdModal(false);
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleDeleteJudge = async (judge) => {
    Swal.fire({
      title: 'ยืนยันการลบรายชื่อกรรมการ?',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อกรรมการ "${judge.fullname}" ออกจากระบบ? การลบนี้ไม่สามารถกู้คืนได้`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#D32F2F',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/admin/judges/${judge.id}`);
          Swal.fire('ลบเรียบร้อยแล้ว', 'ลบรายชื่อกรรมการออกจากระบบเรียบร้อยแล้ว', 'success');
          fetchDashboardData();
        } catch (err) {
          const htmlMessage = err.message.replace(/\n/g, '<br />');
          Swal.fire({
            title: 'ไม่สามารถลบกรรมการได้',
            html: `<div class="text-left text-sm mt-2">${htmlMessage}</div>`,
            icon: 'error',
            confirmButtonColor: '#4A2C6D',
            confirmButtonText: 'ตกลง'
          });
        }
      }
    });
  };

  // --- RENDERING CHARTS FOR LIVE DASHBOARD ---
  const renderDashboardCharts = () => {
    if (!stats || !stats.liveRankings || stats.liveRankings.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
          ไม่พบการแข่งขันที่มีสถานะกำลังดำเนินงาน (Active) อยู่ในขณะนี้ กรุณาเปิดสถานะการแข่งขันเพื่อติดตามอันดับคะแนน
        </div>
      );
    }

    return stats.liveRankings.map((comp) => {
      const labels = comp.rankings.map(r => r.name);
      const dataValues = comp.rankings.map(r => r.score);

      const chartData = {
        labels,
        datasets: [
          {
            label: 'คะแนนสรุปสุดท้าย',
            data: dataValues,
            backgroundColor: 'rgba(74, 44, 109, 0.75)',
            borderColor: 'rgb(74, 44, 109)',
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `ตารางคะแนน: ${comp.title} (การคิดคะแนน: ${comp.scoring_algorithm.toUpperCase().replace('_', ' ')})`,
            font: { size: 16, weight: 'bold', family: 'Kanit' },
            color: '#4A2C6D'
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#E5E7EB' }
          },
          y: {
            grid: { display: false }
          }
        }
      };

      return (
        <div key={comp.activity_id} className="bg-white rounded-xl shadow-md p-6 hover-scale mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-3 font-sans">อันดับคะแนนสด (Standings)</h3>
              <div className="space-y-2 overflow-y-auto max-h-48 pr-2">
                {comp.rankings.map((part, idx) => (
                  <div key={part.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-sm font-medium truncate w-40">
                      {idx + 1}. {part.name} <span className="text-xs text-gray-500">({part.institution_code})</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-primary-soft text-primary-dark font-medium">
                        ประเมินแล้ว {part.evaluations_submitted} ท่าน
                      </span>
                      <span className="text-sm font-bold text-accent">{part.score}</span>
                    </div>
                  </div>
                ))}
                {comp.rankings.length === 0 && (
                  <div className="text-xs text-gray-500 text-center py-4">ยังไม่มีผู้เข้าร่วมแข่งขันในรายการนี้</div>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(`/print-report/${comp.activity_id}`)}
              className="mt-4 py-2.5 bg-info hover:bg-info-dark text-white rounded-lg flex items-center justify-center text-sm font-semibold transition-all shadow"
            >
              <Printer className="w-4 h-4 mr-2" /> พิมพ์รายงานอย่างเป็นทางการ (A4)
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-primary-dark text-white p-6 flex flex-col justify-between shrink-0 no-print">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <Award className="w-8 h-8 text-accent-light" />
            <div>
              <h1 className="text-lg font-bold">NPC_Evaluate</h1>
              <p className="text-xs text-primary-soft">ผู้ดูแลระบบ (Admin)</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'dashboard' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">ติดตามผลสด (Live)</span>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'activities' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <Trophy className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">จัดการการแข่งขัน</span>
            </button>
            <button
              onClick={() => setActiveTab('judges')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'judges' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">จัดการกรรมการประเมิน</span>
            </button>
            <button
              onClick={() => setActiveTab('live_report')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'live_report' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">รายงานผลคะแนนเรียลไทม์</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'settings' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">ตั้งค่าระบบทั่วไป</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-primary/30 mt-6">
          <div className="text-xs text-primary-soft truncate mb-3">แอดมิน: {user?.fullname}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 bg-danger hover:bg-danger-dark text-white rounded-lg text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-primary-dark">
              {activeTab === 'dashboard' && 'แดชบอร์ดติดตามผลแข่งขัน'}
              {activeTab === 'activities' && 'การจัดการกิจกรรมการแข่งขัน'}
              {activeTab === 'judges' && 'การดูแลและตั้งค่ากรรมการ'}
              {activeTab === 'live_report' && 'รายงานผลคะแนนเรียลไทม์ (เต็มจอ)'}
              {activeTab === 'settings' && 'การตั้งค่าระบบและตราโลโก้'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">วิทยาลัยสารพัดช่างน่าน (Nan Polytechnic College)</p>
          </div>
          <div className="mt-4 md:mt-0 text-sm font-semibold px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2.5 animate-pulse"></span>
            เชื่อมต่อกับฐานข้อมูลหลักแล้ว
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && stats && (
              <div className="space-y-8">
                {/* Stats Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary flex items-center justify-between hover-scale">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold">การแข่งขันทั้งหมด</div>
                      <div className="text-3xl font-extrabold mt-1 text-primary-dark">{stats.activitiesCount}</div>
                    </div>
                    <Trophy className="w-10 h-10 text-primary-light" />
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-info flex items-center justify-between hover-scale">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold">กรรมการประเมิน</div>
                      <div className="text-3xl font-extrabold mt-1 text-info-dark">{stats.judgesCount}</div>
                    </div>
                    <Users className="w-10 h-10 text-info-light" />
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-accent flex items-center justify-between hover-scale">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-bold">ผู้แข่ง / ทีมผู้แข่งขัน</div>
                      <div className="text-3xl font-extrabold mt-1 text-accent-dark">{stats.participantsCount}</div>
                    </div>
                    <BookOpen className="w-10 h-10 text-accent-light" />
                  </div>
                </div>

                {/* Charts Area */}
                <div>
                  <h3 className="text-lg font-bold text-primary-dark mb-4">รายงานอันดับผลคะแนนเรียลไทม์</h3>
                  {renderDashboardCharts()}
                </div>
              </div>
            )}

            {/* 2. ACTIVITIES TAB */}
            {activeTab === 'activities' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-primary-dark">รายการกิจกรรมทั้งหมดในระบบ</h3>
                  <button
                    onClick={handleOpenCreateActivity}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center text-sm font-semibold transition-all shadow"
                  >
                    <Plus className="w-4 h-4 mr-2" /> สร้างรายการแข่งขันใหม่
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">กิจกรรมแข่งขัน</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ช่วงเวลากิจกรรม</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">หลักเกณฑ์คำนวณ</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">กรรมการ / ผู้แข่ง</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">สถานะ</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {activities.map((act) => (
                        <tr key={act.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{act.title}</div>
                            <div className="text-xs text-gray-500 truncate w-64">{act.description}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-gray-900 font-medium">เริ่ม: {new Date(act.start_date).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">สิ้นสุด: {new Date(act.end_date).toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 capitalize font-semibold text-xs text-gray-700">
                            {act.scoring_algorithm === 'standard_average' && 'ค่าเฉลี่ยปกติ'}
                            {act.scoring_algorithm === 'coi_prevention' && 'ป้องกันผลประโยชน์ทับซ้อน (COI)'}
                            {act.scoring_algorithm === 'trimmed_mean' && 'ค่าเฉลี่ยตัดหัวท้าย (Trimmed)'}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium">
                            <div>กรรมการประเมิน: <span className="text-primary font-bold">{act.judge_count}</span> ท่าน</div>
                            <div>ทีมแข่งขัน: <span className="text-info font-bold">{act.participant_count}</span> ทีม</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              act.status === 'Active' ? 'bg-green-100 text-green-800' :
                              act.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                              act.status === 'Completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {act.status === 'Active' ? 'ดำเนินงาน' :
                               act.status === 'Draft' ? 'ร่าง' :
                               act.status === 'Completed' ? 'เสร็จสิ้น' : 'เก็บถาวร'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center space-x-2">
                            <button
                              onClick={() => handleOpenManageActivity(act)}
                              title="จัดการทีมและกรรมการประเมินผล"
                              className="p-2 text-info hover:bg-info/10 rounded-lg transition-all"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditActivity(act)}
                              title="แก้ไขรายละเอียด"
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCloneActivity(act.id)}
                              title="คัดลอกกิจกรรม"
                              className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCopyJudgeLink(act.id)}
                              title="คัดลอกลิงก์สำหรับกรรมการ"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Link className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act)}
                              title="ลบกิจกรรมถาวร"
                              className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. JUDGES TAB */}
            {activeTab === 'judges' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-primary-dark">ฐานข้อมูลรายชื่อกรรมการประเมิน</h3>
                  <button
                    onClick={() => setShowJudgeModal(true)}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center text-sm font-semibold transition-all shadow"
                  >
                    <UserPlus className="w-4 h-4 mr-2" /> เพิ่มรายชื่อกรรมการใหม่
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ชื่อ-นามสกุลจริง</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ชื่อผู้ใช้งาน (Username)</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">สังกัด / สถาบัน</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ประเมินแล้ว</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">สถานะการทำงาน</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {judges.map((jd) => (
                        <tr key={jd.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold text-gray-900">{jd.fullname}</td>
                          <td className="px-6 py-4 font-mono text-xs">{jd.username}</td>
                          <td className="px-6 py-4 font-medium text-gray-600">{jd.institution_code}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded font-bold">
                              ประเมินแล้ว {jd.submission_count} ครั้ง
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                              jd.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {jd.status === 'active' ? 'เปิดใช้งาน' : 'ระงับใช้งาน'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center space-x-2">
                            <button
                              onClick={() => handleOpenEditJudge(jd)}
                              title="แก้ไขข้อมูลกรรมการ"
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleJudgeStatus(jd)}
                              title={jd.status === 'active' ? 'ปิดการเข้าใช้งานระบบของกรรมการ' : 'เปิดการใช้งานบัญชี'}
                              className={`p-2 rounded-lg transition-all ${
                                jd.status === 'active' ? 'text-danger hover:bg-danger/10' : 'text-info hover:bg-info/10'
                              }`}
                            >
                              {jd.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleOpenResetPassword(jd)}
                              title="ตั้งค่ารหัสผ่านใหม่"
                              className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteJudge(jd)}
                              title="ลบรายชื่อกรรมการ"
                              className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 max-w-2xl hover-scale transition-all">
                <h3 className="text-lg font-bold text-primary-dark mb-6">ตั้งค่าข้อมูลสถานศึกษาหลัก</h3>
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Institution Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2 font-sans">
                      ชื่อสถานศึกษา (สถาบัน)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ระบุชื่อสถานศึกษา เช่น วิทยาลัยสารพัดช่างน่าน"
                      value={systemSettings.institution_name}
                      onChange={(e) => setSystemSettings({ ...systemSettings, institution_name: e.target.value })}
                      className="w-full border rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Institution Logo */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2 font-sans">
                      โลโก้สถานศึกษาถาวร
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-xl bg-gray-50/50">
                      {systemSettings.institution_logo ? (
                        <div className="relative group shrink-0">
                          <img
                            src={systemSettings.institution_logo}
                            alt="Institution Logo"
                            className="w-24 h-24 object-contain rounded-lg border bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => setSystemSettings({ ...systemSettings, institution_logo: '' })}
                            className="absolute -top-2 -right-2 p-1 bg-red-100 hover:bg-red-200 text-red-500 rounded-full transition-all border border-red-200 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-lg border border-dashed border-gray-300 flex items-center justify-center bg-white shrink-0 text-gray-400">
                          <Shield className="w-8 h-8" />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-2">
                        {uploadingSettingLogo ? (
                          <div className="h-10 border border-dashed rounded-lg flex items-center justify-center space-x-2 bg-white px-4">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-xs text-gray-400 font-semibold">กำลังอัปโหลด...</span>
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-300 hover:border-primary bg-white rounded-lg p-2.5 flex items-center justify-center cursor-pointer transition-all relative h-10">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSettingLogoUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center space-x-2">
                              <Upload className="w-4 h-4 text-gray-400" />
                              <span className="text-xs font-semibold text-gray-500">เลือกไฟล์ตราสัญลักษณ์สถานศึกษา</span>
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400">ไฟล์นามสกุล .jpeg, .jpg, .png, .gif, .webp ขนาดไฟล์ไม่เกิน 5MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t pt-4">
                    <button
                      type="submit"
                      className="py-2.5 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow-md flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> บันทึกการตั้งค่าถาวร
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 5. FULL SCREEN LIVE REPORT TAB */}
            {activeTab === 'live_report' && (
              <div className="space-y-6 font-sans">
                {/* Selector Header */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    เลือกกิจกรรมการแข่งขันที่ต้องการดูรายงานผลคะแนนสด:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <select
                      value={selectedLiveReportActivityId}
                      onChange={(e) => {
                        setSelectedLiveReportActivityId(e.target.value);
                        setLiveReportDataFullscreen(null);
                      }}
                      className="flex-1 border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white font-semibold text-gray-700"
                    >
                      <option value="">-- กรุณาเลือกกิจกรรมการแข่งขัน --</option>
                      {activities.map(act => (
                        <option key={act.id} value={act.id}>
                          {act.title} [{act.status === 'Active' ? 'กำลังตัดสิน 🟢' : act.status === 'Completed' ? 'เสร็จสิ้น 🔴' : 'แบบร่าง 🟡'}]
                        </option>
                      ))}
                    </select>
                    {selectedLiveReportActivityId && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => window.open(`/print-report/${selectedLiveReportActivityId}`, '_blank')}
                          className="py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
                        >
                          <Printer className="w-4 h-4" />
                          พิมพ์รายงาน (A4)
                        </button>
                        <button
                          type="button"
                          onClick={() => fetchLiveReportFullscreen(selectedLiveReportActivityId)}
                          className="py-2.5 px-4 bg-white hover:bg-gray-150 text-gray-700 border border-gray-300 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all shrink-0"
                        >
                          รีเฟรชตอนนี้
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Section */}
                {!selectedLiveReportActivityId ? (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 border border-gray-100">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-bold text-base">กรุณาเลือกกิจกรรมการแข่งขันด้านบนเพื่อติดตามผลคะแนนเรียลไทม์</p>
                  </div>
                ) : !liveReportDataFullscreen || !selectedLiveReportActivity ? (
                  <div className="flex items-center justify-center py-24 bg-white rounded-xl shadow-md border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Banner */}
                    <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-sm text-emerald-800 font-bold uppercase tracking-wider">
                          โหมดการติดตามผลคะแนนสดเรียลไทม์ (อัปเดตอัตโนมัติทุก 5 วินาที)
                        </span>
                      </div>
                      <div className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                        ประเภทเกณฑ์: {selectedLiveReportActivity.scoring_algorithm === 'standard_average' && 'ค่าเฉลี่ยปกติ'}
                        {selectedLiveReportActivity.scoring_algorithm === 'coi_prevention' && 'ป้องกัน COI'}
                        {selectedLiveReportActivity.scoring_algorithm === 'trimmed_mean' && 'Trimmed Mean'}
                      </div>
                    </div>

                    {/* Competitor Score Cards */}
                    <div className="space-y-6">
                      {liveReportDataFullscreen.leaderboard.map((row, index) => {
                        let rankBadge = "bg-gray-150 text-gray-800";
                        if (index === 0) rankBadge = "bg-yellow-400 text-white font-bold border border-yellow-500 shadow-sm";
                        else if (index === 1) rankBadge = "bg-slate-300 text-white font-bold border border-slate-400 shadow-sm";
                        else if (index === 2) rankBadge = "bg-amber-600 text-white font-bold border border-amber-700 shadow-sm";

                        return (
                          <div key={row.participant_id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-md hover:shadow-lg transition-all">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4 mb-4">
                              <div className="flex items-center gap-4">
                                <span className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-black shrink-0 ${rankBadge}`}>
                                  {index + 1}
                                </span>
                                 <div>
                                  <h5 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>{row.name}</span>
                                    {row.institution_code && (
                                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-bold uppercase border">
                                        {row.institution_code}
                                      </span>
                                    )}
                                  </h5>

                                  {row.project_title && (
                                    <div className="text-xs font-semibold text-primary mt-1">
                                      🏆 ผลงาน: <span className="text-gray-700 font-normal">{row.project_title}</span>
                                    </div>
                                  )}

                                  {row.team_members && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      👥 สมาชิกทีม: <span className="text-gray-700 font-normal">{row.team_members}</span>
                                    </div>
                                  )}

                                  {(row.project_url || row.attachment_url) && (
                                    <div className="flex items-center gap-2.5 mt-2">
                                      {row.project_url && (
                                        <a href={row.project_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-info bg-info/5 border border-info/10 px-2 py-0.5 rounded-full font-bold">
                                          🔗 ลิงก์
                                        </a>
                                      )}
                                      {row.attachment_url && (
                                        <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-success bg-success/5 border border-success/10 px-2 py-0.5 rounded-full font-bold">
                                          📁 ไฟล์แนบ
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  <p className="text-xs text-gray-500 font-semibold mt-1">
                                    จำนวนกรรมการที่ประเมินแล้ว: {row.evaluations_count} / {selectedLiveReportActivity.expected_judges || 3} ท่าน
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-8 bg-primary-soft/10 px-4 py-2 rounded-xl border border-primary/10">
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-500 font-bold block uppercase">คะแนนเฉลี่ยรวม</span>
                                  <span className="text-2xl font-black text-primary">{row.final_score.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {row.judges_scores.length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <table className="min-w-full text-left text-xs font-sans">
                                  <thead>
                                    <tr className="border-b border-gray-300 text-[10px] text-gray-500 uppercase font-extrabold tracking-wider">
                                      <th className="py-2.5 px-3">หัวข้อการประเมิน</th>
                                      {row.judges_scores.map((js, idx) => (
                                        <th key={js.judge_id} className="py-2.5 px-3 text-center" title={js.judge_name}>
                                          กรรมการท่านที่ {idx + 1}<br/>
                                          <span className="text-[8px] font-normal truncate max-w-[90px] block mx-auto text-gray-400">({js.judge_name})</span>
                                        </th>
                                      ))}
                                      <th className="py-2.5 px-3 text-center bg-gray-100/50">คะแนนรวม</th>
                                      <th className="py-2.5 px-3 text-right">คะแนนเฉลี่ย</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {(() => {
                                      const parsedCriteria = typeof selectedLiveReportActivity.criteria === 'string'
                                        ? JSON.parse(selectedLiveReportActivity.criteria)
                                        : selectedLiveReportActivity.criteria;
                                      return getLeafNodes(parsedCriteria).map(leaf => {
                                        const judgesWithScore = row.judges_scores.filter(js => js.scores[leaf.id] !== undefined);
                                        const leafSum = judgesWithScore.reduce((s, js) => s + parseFloat(js.scores[leaf.id]), 0);
                                        const leafAvg = judgesWithScore.length > 0 ? (leafSum / judgesWithScore.length).toFixed(2) : '-';
                                        return (
                                          <tr key={leaf.id} className="hover:bg-gray-100/50">
                                            <td className="py-3 px-3 font-bold text-gray-700">
                                              {leaf.name}
                                            </td>
                                            {row.judges_scores.map(js => {
                                              const val = js.scores[leaf.id] !== undefined ? js.scores[leaf.id] : '-';
                                              return (
                                                <td key={js.judge_id} className="py-3 px-3 text-center font-mono font-bold text-gray-600">
                                                  {val}
                                                </td>
                                              );
                                            })}
                                            <td className="py-3 px-3 text-center font-mono font-bold bg-gray-100/30 text-gray-700">
                                              {leafSum.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                                              {leafAvg}
                                            </td>
                                          </tr>
                                        );
                                      });
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-6 text-center text-gray-400 italic text-xs">
                                ยังไม่มีผลคะแนนประเมินบันทึกจากกรรมการสำหรับผู้เข้าแข่งขันรายนี้
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {liveReportDataFullscreen.leaderboard.length === 0 && (
                        <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 border border-gray-100">
                          ไม่พบผู้เข้าแข่งขันหรือทีมในกิจกรรมการประกวดนี้
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* --- ACTIVITY CREATE/EDIT MODAL --- */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto hover-scale">
            <h3 className="text-xl font-bold text-primary mb-4 border-b pb-3">
              {isEditingActivity ? 'แก้ไขรายละเอียดเกณฑ์การแข่งขัน' : 'สร้างรายการแข่งขันและกำหนดเกณฑ์คะแนน'}
            </h3>

            {/* Modal Tabs Selection */}
            <div className="flex border-b mb-6 no-print text-xs sm:text-sm font-semibold">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`py-2 px-4 border-b-2 transition-all ${
                  modalActiveTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'
                }`}
              >
                ข้อมูลทั่วไป
              </button>
              <button
                type="button"
                onClick={() => setModalActiveTab('criteria')}
                className={`py-2 px-4 border-b-2 transition-all ${
                  modalActiveTab === 'criteria' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'
                }`}
              >
                โครงสร้างเกณฑ์คะแนน
              </button>
              <button
                type="button"
                onClick={() => setModalActiveTab('judges')}
                className={`py-2 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
                  modalActiveTab === 'judges' 
                    ? 'border-primary text-primary' 
                    : activityForm.judges.length > 0 && !activityForm.judges.some(j => j.is_head_judge)
                      ? 'border-transparent text-red-500 hover:text-red-600 font-bold'
                      : 'border-transparent text-gray-500 hover:text-primary'
                }`}
              >
                <span>คณะกรรมการตัดสิน ({activityForm.judges.length})</span>
                {activityForm.judges.length > 0 && !activityForm.judges.some(j => j.is_head_judge) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" title="ยังไม่ได้แต่งตั้งประธานกรรมการ" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalActiveTab('loginSettings')}
                className={`py-2 px-4 border-b-2 transition-all ${
                  modalActiveTab === 'loginSettings' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-primary'
                }`}
              >
                ตกแต่งหน้าเข้าสู่ระบบ
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              {/* TAB 1: GENERAL INFO */}
              {modalActiveTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อรายการแข่งขัน *</label>
                      <input
                        type="text"
                        required
                        value={activityForm.title}
                        onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ประเภทการแข่งขัน</label>
                      <select
                        value={activityForm.competition_type}
                        onChange={(e) => setActivityForm({ ...activityForm, competition_type: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="in_institution">ในสถานศึกษา (Internal)</option>
                        <option value="out_institution">นอกสถานศึกษา (External)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">เกณฑ์การคำนวณ</label>
                      <select
                        value={activityForm.scoring_algorithm}
                        onChange={(e) => setActivityForm({ ...activityForm, scoring_algorithm: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="standard_average">ค่าเฉลี่ยปกติ (Standard)</option>
                        <option value="coi_prevention">ป้องกันผลประโยชน์ทับซ้อน (COI)</option>
                        <option value="trimmed_mean">ตัดคะแนนหัวท้าย (Trimmed)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">จำนวนกรรมการที่กำหนด *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={activityForm.expected_judges}
                        onChange={(e) => setActivityForm({ ...activityForm, expected_judges: parseInt(e.target.value, 10) || 1 })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">คำอธิบาย/รายละเอียดกิจกรรม</label>
                    <textarea
                      value={activityForm.description}
                      onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none h-20"
                    />
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">วันเวลาเริ่มการตัดสินการประเมิน *</label>
                      <input
                        type="datetime-local"
                        required
                        value={activityForm.start_date}
                        onChange={(e) => setActivityForm({ ...activityForm, start_date: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">วันเวลาสิ้นสุดการประเมินตัดสิน *</label>
                      <input
                        type="datetime-local"
                        required
                        value={activityForm.end_date}
                        onChange={(e) => setActivityForm({ ...activityForm, end_date: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">สถานะกิจกรรม</label>
                      <select
                        value={activityForm.status}
                        onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="Draft">ร่างคำสั่ง (Draft)</option>
                        <option value="Active">เปิดการตัดสิน (Active)</option>
                        <option value="Completed">เสร็จสิ้นสมบูรณ์ (Completed)</option>
                        <option value="Archived">เก็บประวัติถาวร (Archived)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">สถานที่ตัดสินการแข่งขัน</label>
                      <input
                        type="text"
                        value={activityForm.location}
                        onChange={(e) => setActivityForm({ ...activityForm, location: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="ตัวอย่าง: อาคารตัดสิน 4 แผนกอิเล็กทรอนิกส์"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">หน่วยงานเจ้าภาพ / สถาบันผู้จัด</label>
                      <input
                        type="text"
                        value={activityForm.host_organization}
                        onChange={(e) => setActivityForm({ ...activityForm, host_organization: e.target.value })}
                        className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="ตัวอย่าง: วิทยาลัยสารพัดช่างน่าน"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CRITERIA TREE */}
              {modalActiveTab === 'criteria' && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-primary text-sm uppercase">โครงสร้างข้อเกณฑ์รายละเอียดการให้คะแนน (จัดกลุ่มหัวข้อหลัก &gt; หัวข้อรอง &gt; หัวข้อย่อย)</h4>
                    <button
                      type="button"
                      onClick={() => addCriteriaNode(null)}
                      className="py-2 px-3 bg-primary-soft hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center transition-all"
                    >
                      <Plus className="w-4 h-4 mr-1" /> เพิ่มหัวข้อหลัก
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center space-x-3 px-3 mb-2 text-xs font-bold text-gray-500 uppercase">
                    <div className="flex-1">ชื่อหัวข้อเกณฑ์ประเมิน</div>
                    <div className="w-28 text-center">คะแนนเต็ม</div>
                    <div className="w-28 text-center">น้ำหนักคูณ (Weight)</div>
                    <div className="w-20 text-right">การจัดการ</div>
                  </div>

                  <div className="space-y-3">
                    {renderCriteriaTree(activityForm.criteria)}
                  </div>
                </div>
              )}

              {/* TAB 3: JUDGES ASSIGNMENT */}
              {modalActiveTab === 'judges' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-primary text-sm uppercase">มอบหมายคณะกรรมการผู้ประเมินผลสำหรับกิจกรรมนี้</h4>
                    <span className="text-xs bg-primary-soft text-primary-dark px-2.5 py-0.5 rounded-full font-bold">
                      เลือกแล้ว {activityForm.judges.length} ท่าน
                    </span>
                  </div>

                  {activityForm.judges.length !== activityForm.expected_judges ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-semibold flex items-center gap-1.5 mb-4 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>จำนวนกรรมการยังไม่ตรงตามที่ตั้งค่าไว้ (เลือกแล้ว {activityForm.judges.length} / ต้องการ {activityForm.expected_judges} ท่าน)</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-1.5 mb-4">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>จำนวนกรรมการครบตามที่ต้องการแล้ว ({activityForm.judges.length} / {activityForm.expected_judges} ท่าน)</span>
                    </div>
                  )}

                  {activityForm.judges.length > 0 && !activityForm.judges.some(j => j.is_head_judge) && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold flex items-center gap-1.5 mb-4 animate-pulse">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>กรุณาแต่งตั้งประธานกรรมการประเมินตัดสิน (คลิกปุ่ม "แต่งตั้งประธาน" ที่ชื่อกรรมการที่ต้องการ)</span>
                    </div>
                  )}

                  {activityForm.judges.length > 20 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-semibold flex items-center gap-1.5 animate-pulse mb-4">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>คำแนะนำ: จำนวนกรรมการสำหรับแต่ละกิจกรรมไม่ควรเกิน 20 ท่าน</span>
                    </div>
                  )}

                  {showInlineJudgeForm ? (
                    <div className="p-3 bg-primary-soft/10 border border-primary/20 rounded-lg space-y-3 mb-4 font-sans">
                      <div className="text-xs font-bold text-primary-dark uppercase">ลงทะเบียนกรรมการใหม่แบบรวดเร็ว</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">ชื่อ-นามสกุลกรรมการ *</label>
                          <input
                            type="text"
                            placeholder="เช่น อ.สมพร พรประเสริฐ"
                            value={inlineJudgeForm.fullname}
                            onChange={(e) => setInlineJudgeForm({ ...inlineJudgeForm, fullname: e.target.value })}
                            className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                            ชื่อสถานศึกษา / หน่วยงานต้นสังกัด
                            {activityForm.competition_type === 'out_institution' && (
                              <span className="ml-1 text-orange-500">(สำคัญ: ระบุเพื่อตรวจสอบการขัดแย้งทางผลประโยชน์)</span>
                            )}
                          </label>
                          <input
                            type="text"
                            placeholder={activityForm.competition_type === 'out_institution' ? 'เช่น วิทยาลัยสารพัดช่างน่าน, วิทยาลัยเทคนิคน่าน' : 'เช่น วิทยาลัยสารพัดช่างน่าน (เว้นว่างได้)'}
                            value={inlineJudgeForm.institution_code}
                            onChange={(e) => setInlineJudgeForm({ ...inlineJudgeForm, institution_code: e.target.value })}
                            className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          />
                          {activityForm.competition_type === 'out_institution' && (
                            <p className="text-[9px] text-orange-400 mt-0.5">* กรรมการที่มาจากสถาบันเดียวกับผู้แข่งขันจะถูกแสดงแจ้งเตือนในรายการ</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowInlineJudgeForm(false)}
                          className="py-1 px-3 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateJudgeInline}
                          className="py-1 px-3 bg-primary hover:bg-primary-dark text-white rounded text-xs font-semibold shadow"
                        >
                          ลงทะเบียนและมอบหมาย
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={() => setShowInlineJudgeForm(true)}
                        className="py-1.5 px-3 bg-primary-soft hover:bg-primary/20 text-primary border border-primary/10 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> ลงทะเบียนกรรมการใหม่เพิ่มในระบบ
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {allJudgesList.map((jd) => {
                      const isAssigned = activityForm.judges.some(j => j.id === jd.id);
                      const isHead = activityForm.judges.some(j => j.id === jd.id && j.is_head_judge);

                      const toggleJudge = () => {
                        let updatedJudges;
                        if (isAssigned) {
                          updatedJudges = activityForm.judges.filter(j => j.id !== jd.id);
                        } else {
                          updatedJudges = [...activityForm.judges, { id: jd.id, is_head_judge: false }];
                        }
                        
                        setActivityForm({
                          ...activityForm,
                          judges: updatedJudges
                        });

                        const hasHead = updatedJudges.some(j => j.is_head_judge);
                        if (updatedJudges.length > 0 && !hasHead) {
                          Swal.fire({
                            icon: 'warning',
                            title: 'ยังไม่กำหนดประธานกรรมการ',
                            text: 'กรุณาคลิกปุ่ม "แต่งตั้งประธาน" ที่ชื่อกรรมการที่ต้องการ',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                          });
                        }
                      };

                      const setHead = () => {
                        const updatedJudges = activityForm.judges.map(j => ({
                          ...j,
                          is_head_judge: j.id === jd.id
                        }));
                        setActivityForm({
                          ...activityForm,
                          judges: updatedJudges
                        });
                        
                        Swal.fire({
                          icon: 'success',
                          title: 'แต่งตั้งประธานกรรมการสำเร็จ',
                          text: `ตั้ง ${jd.fullname} เป็นประธานกรรมการ`,
                          toast: true,
                          position: 'top-end',
                          showConfirmButton: false,
                          timer: 3000,
                          timerProgressBar: true
                        });
                      };

                      return (
                        <div key={jd.id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-150 rounded-lg hover:bg-gray-100/50 transition-all">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={toggleJudge}
                              className="w-4 h-4 text-primary focus:ring-primary rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-800">{jd.fullname}</div>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-[10px] text-gray-500 font-semibold">
                                  สังกัด: {jd.institution_code || <span className="italic text-gray-400">ไม่ระบุ</span>}
                                </span>
                                {activityForm.competition_type === 'out_institution' && jd.institution_code && (() => {
                                  const participantInstitutions = (selectedActivity?.participants || []).map(p => (p.institution_code || '').trim().toLowerCase()).filter(Boolean);
                                  const judgeInst = jd.institution_code.trim().toLowerCase();
                                  const hasConflict = participantInstitutions.some(pi => pi === judgeInst || pi.includes(judgeInst) || judgeInst.includes(pi));
                                  return hasConflict ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 border border-orange-300 text-orange-700 text-[9px] font-bold">
                                      ⚠️ สถาบันมีผู้เข้าแข่งขัน
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          </div>

                          {isAssigned && (
                            <button
                              type="button"
                              onClick={setHead}
                              className={`py-1 px-2.5 rounded-full text-[10px] font-bold border transition-all ${
                                isHead 
                                  ? 'bg-accent/10 text-accent border-accent' 
                                  : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {isHead ? '★ ประธานกรรมการ' : 'แต่งตั้งประธาน'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {allJudgesList.length === 0 && (
                      <div className="text-xs text-gray-500 text-center py-6">ไม่พบรายชื่อคณะกรรมการในระบบ กรุณาลงทะเบียนกรรมการก่อน</div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LOGIN PAGE CUSTOMIZATION */}
              {modalActiveTab === 'loginSettings' && (
                <div className="space-y-6 font-sans">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Control Panel (Left column of the tab) */}
                    <div className="flex-1 space-y-5">
                      <div>
                        <h4 className="font-bold text-primary text-xs uppercase mb-3">เลือกรูปแบบการจัดวาง (Template)</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <label className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/50 transition-all">
                            <input
                              type="radio"
                              name="login_template"
                              value="template_1"
                              checked={activityForm.login_config.template === 'template_1'}
                              onChange={(e) => setActivityForm({
                                ...activityForm,
                                login_config: { ...activityForm.login_config, template: e.target.value }
                              })}
                              className="mt-1 mr-3 text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-800">แบบที่ 1: ตราสัญลักษณ์หน่วยงาน + ข้อมูลรายการแข่งขัน</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">แสดงตราโลโก้ด้านบน (เพิ่มได้สูงสุด 5 ภาพ) และแสดงข้อความรายละเอียดกิจกรรมทั้งหมดด้านล่างตามสีธีมหลัก</div>
                            </div>
                          </label>

                          <label className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/50 transition-all">
                            <input
                              type="radio"
                              name="login_template"
                              value="template_2"
                              checked={activityForm.login_config.template === 'template_2'}
                              onChange={(e) => setActivityForm({
                                ...activityForm,
                                login_config: { ...activityForm.login_config, template: e.target.value }
                              })}
                              className="mt-1 mr-3 text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-800">แบบที่ 2: ใช้แบนเนอร์โปสเตอร์เต็มฝั่งซ้าย (ซ่อนข้อความระบบ)</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">ใช้แบนเนอร์ป้ายประชาสัมพันธ์ขนาดใหญ่สำเร็จรูปแทนเต็มฝั่งซ้ายมือ เหมาะสำหรับผู้จัดที่มีป้ายกิจกรรมอยู่แล้ว (ซ่อนข้อความกิจกรรม วันเวลา สถานที่ และผู้จัดทั้งหมด)</div>
                            </div>
                          </label>

                          <label className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/50 transition-all">
                            <input
                              type="radio"
                              name="login_template"
                              value="custom"
                              checked={activityForm.login_config.template === 'custom'}
                              onChange={(e) => setActivityForm({
                                ...activityForm,
                                login_config: { ...activityForm.login_config, template: e.target.value }
                              })}
                              className="mt-1 mr-3 text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-800">แบบที่ 3: กำหนดเปิด/ปิดข้อความและตราโลโก้เองทั้งหมด</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">เลือกทำรายการเปิดหรือปิดการแสดงผลของข้อความแต่ละส่วน ตราโลโก้ วันที่ สถานที่ และผู้จัด ได้อย่างอิสระผ่านกล่องเลือก</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Logo for the Activity (shown on login page left panel) */}
                      <div className="mb-4">
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                          โลโก้กิจกรรม (แสดงบนหน้าเข้าสู่ระบบ)
                        </label>
                        {uploadingSingleLogo ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 h-24">
                            <div className="flex flex-col items-center space-y-2">
                              <Loader2 className="w-6 h-6 text-primary animate-spin" />
                              <span className="text-xs text-gray-500 font-semibold">กำลังอัปโหลดโลโก้...</span>
                            </div>
                          </div>
                        ) : activityForm.logo_url ? (
                          <div className="flex items-center space-x-3 p-2 bg-gray-50 border rounded-lg h-24">
                            <img
                              src={activityForm.logo_url}
                              alt="Activity Logo"
                              className="w-16 h-16 object-contain rounded border bg-white p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-700 truncate">
                                {activityForm.logo_url.split('/').pop()}
                              </div>
                              <div className="text-[10px] text-gray-400">อัปโหลดสำเร็จแล้ว</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActivityForm({ ...activityForm, logo_url: '' })}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 hover:border-primary rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative h-24 bg-white">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSingleLogoUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs font-semibold text-gray-600">คลิกเพื่ออัปโหลดโลโก้กิจกรรม</span>
                            <span className="text-[9px] text-gray-400">จำกัดขนาดไฟล์ไม่เกิน 5MB</span>
                          </div>
                        )}
                      </div>

                      {/* URL Background image field (Always shown, is background in temp 1&3, or direct content in temp 2) */}
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1.5">
                          {activityForm.login_config.template === 'template_2' ? 'ภาพแบนเนอร์เต็มแผงซ้ายมือ *' : 'ภาพพื้นหลังฝั่งซ้ายมือ (ทางเลือก)'}
                        </label>
                        {uploadingBanner ? (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 h-24">
                            <div className="flex flex-col items-center space-y-2">
                              <Loader2 className="w-6 h-6 text-primary animate-spin" />
                              <span className="text-xs text-gray-500 font-semibold">กำลังอัปโหลดแบนเนอร์...</span>
                            </div>
                          </div>
                        ) : activityForm.login_config.banner_url ? (
                          <div className="flex items-center space-x-3 p-2 bg-gray-50 border rounded-lg h-24">
                            <img 
                              src={activityForm.login_config.banner_url} 
                              alt="Banner Preview" 
                              className="w-20 h-16 object-cover rounded border bg-white" 
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-700 truncate">
                                {activityForm.login_config.banner_url.split('/').pop()}
                              </div>
                              <div className="text-[10px] text-gray-400">อัปโหลดสำเร็จแล้ว</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActivityForm(prev => ({
                                ...prev,
                                banner_url: '',
                                login_config: { ...prev.login_config, banner_url: '' }
                              }))}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 hover:border-primary rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative h-24 bg-white">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleBannerUpload}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs font-semibold text-gray-600">คลิกเพื่ออัปโหลดไฟล์รูปภาพ</span>
                            <span className="text-[9px] text-gray-400">จำกัดขนาดไฟล์ไม่เกิน 5MB</span>
                          </div>
                        )}
                      </div>

                      {/* Logo URL inputs (Only for Template 1 and Custom) */}
                      {activityForm.login_config.template !== 'template_2' && (
                        <div className="space-y-3">
                          <label className="block text-xs font-bold uppercase text-gray-600 mb-1 font-sans">
                            ตราโลโก้ด้านบน (อัปโหลดสูงสุด 5 ภาพ)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[0, 1, 2, 3, 4].map((index) => {
                              const currentVal = activityForm.login_config.logo_urls?.[index] || '';
                              const isUploading = !!uploadingLogos[index];
                              
                              return (
                                <div key={index} className="flex flex-col p-2.5 bg-gray-50 border rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500 font-bold">โลโก้ภาพที่ {index + 1}:</span>
                                    {currentVal && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLogos = [...(activityForm.login_config.logo_urls || [])];
                                          newLogos[index] = '';
                                          setActivityForm(prev => ({
                                            ...prev,
                                            login_config: { ...prev.login_config, logo_urls: newLogos }
                                          }));
                                        }}
                                        className="text-red-500 hover:text-red-700 p-0.5 rounded transition-all"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>

                                  {isUploading ? (
                                    <div className="h-14 border border-dashed rounded-lg flex items-center justify-center space-x-1.5 bg-white">
                                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                      <span className="text-[10px] text-gray-400 font-semibold">กำลังอัปโหลด...</span>
                                    </div>
                                  ) : currentVal ? (
                                    <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border">
                                      <img 
                                        src={currentVal} 
                                        alt={`Logo ${index + 1}`} 
                                        className="w-10 h-10 object-contain rounded bg-gray-50 p-0.5 border" 
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[9px] text-gray-500 truncate">
                                          {currentVal.split('/').pop()}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="border border-dashed border-gray-300 hover:border-primary bg-white rounded-lg p-2 flex items-center justify-center cursor-pointer transition-all relative h-14">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleLogoUpload(e, index)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                      />
                                      <div className="flex items-center space-x-2">
                                        <Upload className="w-4 h-4 text-gray-400" />
                                        <span className="text-[10px] font-semibold text-gray-500">เลือกไฟล์ภาพ</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Custom checkboxes (Only for Custom template) */}
                      {activityForm.login_config.template === 'custom' && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-2.5">
                          <h5 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">เลือกหัวข้อที่จะให้แสดงบนหน้าจอ</h5>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activityForm.login_config.show_title !== false}
                                onChange={(e) => setActivityForm({
                                  ...activityForm,
                                  login_config: { ...activityForm.login_config, show_title: e.target.checked }
                                })}
                                className="w-4 h-4 text-primary focus:ring-primary rounded"
                              />
                              <span className="text-gray-700 font-semibold">ชื่อรายการแข่งขัน</span>
                            </label>
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activityForm.login_config.show_date !== false}
                                onChange={(e) => setActivityForm({
                                  ...activityForm,
                                  login_config: { ...activityForm.login_config, show_date: e.target.checked }
                                })}
                                className="w-4 h-4 text-primary focus:ring-primary rounded"
                              />
                              <span className="text-gray-700 font-semibold">วันเวลาเริ่มตัดสิน</span>
                            </label>
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activityForm.login_config.show_location !== false}
                                onChange={(e) => setActivityForm({
                                  ...activityForm,
                                  login_config: { ...activityForm.login_config, show_location: e.target.checked }
                                })}
                                className="w-4 h-4 text-primary focus:ring-primary rounded"
                              />
                              <span className="text-gray-700 font-semibold">สถานที่แข่งขัน</span>
                            </label>
                            <label className="flex items-center space-x-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activityForm.login_config.show_host !== false}
                                onChange={(e) => setActivityForm({
                                  ...activityForm,
                                  login_config: { ...activityForm.login_config, show_host: e.target.checked }
                                })}
                                className="w-4 h-4 text-primary focus:ring-primary rounded"
                              />
                              <span className="text-gray-700 font-semibold">ผู้รับผิดชอบการแข่งขัน</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LIVE VISUAL PREVIEW BOX (Right column of the tab) */}
                    <div className="w-full lg:w-72 space-y-2 shrink-0">
                      <h4 className="font-bold text-gray-600 text-xs uppercase">ตัวอย่างการแสดงผลฝั่งซ้ายมือ (Live Preview)</h4>
                      <div 
                        className="w-full h-96 rounded-xl border shadow-inner relative overflow-hidden bg-gradient-to-br from-[#1a1230] via-[#351F4F] to-[#120a22] text-white p-4 flex flex-col justify-between"
                        style={activityForm.login_config.banner_url ? (
                          activityForm.login_config.template === 'template_2' ? {
                            backgroundImage: `url(${activityForm.login_config.banner_url})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center',
                            backgroundColor: '#120a22'
                          } : {
                            backgroundImage: `linear-gradient(rgba(26, 18, 48, 0.85), rgba(18, 10, 34, 0.9)), url(${activityForm.login_config.banner_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }
                        ) : {}}
                      >
                        {/* Header logo simulation */}
                        {activityForm.login_config.template !== 'template_2' && (
                          <div className="flex items-center gap-1 opacity-70">
                            <Shield className="w-3.5 h-3.5 text-primary-light" />
                            <span className="text-[9px] font-mono font-bold tracking-wider">NPC_Evaluate</span>
                          </div>
                        )}

                        {activityForm.login_config.template === 'template_2' ? (
                          // Template 2 shows banner only, text is hidden
                          <div className="my-auto text-center py-6 bg-black/10 rounded border border-white/5 backdrop-blur-[1px]">
                            <span className="text-[10px] bg-black/50 text-gray-300 font-bold px-2 py-1 rounded">
                              แสดงแบนเนอร์ป้ายแบบเต็มพื้นที่
                            </span>
                          </div>
                        ) : (
                          // Template 1 or Custom
                          <div className="flex flex-col items-center text-center my-auto py-2">
                            {/* Render logos */}
                            <div className="flex flex-wrap justify-center gap-1.5 mb-3 max-w-full">
                              {((activityForm.login_config.logo_urls || []).filter(url => url && typeof url === 'string' && url.trim().length > 0).length > 0) ? (
                                (activityForm.login_config.logo_urls || []).filter(url => url && typeof url === 'string' && url.trim().length > 0).map((url, idx) => (
                                  <img key={idx} src={url} alt="logo preview" className="w-8 h-8 object-contain rounded-full bg-white/10 p-0.5 border border-white/20" />
                                ))
                              ) : (
                                // SVG Default circle preview
                                <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-primary-light">
                                  <Award className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            {/* Render text with conditional show logic */}
                            <div className="space-y-1.5 max-w-full">
                              {(activityForm.login_config.template === 'template_1' || activityForm.login_config.show_title !== false) && (
                                <h5 className="text-[11px] font-extrabold text-white leading-tight line-clamp-2">
                                  {activityForm.title || 'ชื่อรายการแข่งขัน'}
                                </h5>
                              )}

                              <div className="text-[9px] text-gray-300 space-y-0.5 mt-2 bg-black/20 p-1.5 rounded-lg border border-white/5 inline-block text-left">
                                {(activityForm.login_config.template === 'template_1' || activityForm.login_config.show_date !== false) && (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-2.5 h-2.5 text-primary-light" />
                                    <span>วันที่: {activityForm.start_date ? new Date(activityForm.start_date).toLocaleDateString('th-TH') : '1 ม.ค. 70'}</span>
                                  </div>
                                )}
                                {(activityForm.login_config.template === 'template_1' || activityForm.login_config.show_location !== false) && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-2.5 h-2.5 text-primary-light" />
                                    <span className="truncate max-w-[120px]">สถานที่: {activityForm.location || 'อาคารประเมิน'}</span>
                                  </div>
                                )}
                                {(activityForm.login_config.template === 'template_1' || activityForm.login_config.show_host !== false) && (
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-2.5 h-2.5 text-primary-light" />
                                    <span className="truncate max-w-[120px]">ผู้รับผิดชอบ: {activityForm.host_organization || 'วิทยาลัยสารพัดช่างน่าน'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {activityForm.login_config.template !== 'template_2' && (
                          <div className="text-[8px] text-center text-gray-500 font-semibold">
                            © {new Date().getFullYear()} งานศูนย์ข้อมูลเทคโนโลยีสารสนเทศ
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow"
                >
                  บันทึกการตั้งค่าทั้งหมด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MANAGE PARTICIPANTS & LIVE REPORT MODAL --- */}
      {showManageActivityModal && selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto hover-scale transition-all">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-primary">
                  จัดการกิจกรรม: {selectedActivity.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ประเภทกติกา: {selectedActivity.competition_type === 'out_institution' ? 'ภายนอกสถานศึกษา' : 'ภายในสถานศึกษา'} • เกณฑ์คำนวณ: {selectedActivity.scoring_algorithm.toUpperCase().replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageActivityModal(false);
                  fetchDashboardData();
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b mb-6">
              <button
                type="button"
                onClick={() => setManageTab('participants')}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                  manageTab === 'participants'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                👥 ผู้เข้าร่วมแข่งขัน ({selectedActivity.participants.length})
              </button>
              <button
                type="button"
                onClick={() => setManageTab('report')}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all ${
                  manageTab === 'report'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                📊 รายงานผลคะแนนเรียลไทม์
              </button>
            </div>

            {/* TAB 1: PARTICIPANTS MANAGEMENT */}
            {manageTab === 'participants' && (
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 text-sm border-b pb-2 flex items-center justify-between">
                  <span>รายชื่อทีมแข่งขัน / ผู้เข้าร่วมแข่งขัน</span>
                  <span className="text-xs bg-info/10 text-info-dark px-2.5 py-0.5 rounded-full font-bold">
                    ทั้งหมด {selectedActivity.participants.length} รายการ
                  </span>
                </h4>

                <form onSubmit={handleAddParticipant} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3 font-sans text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ประเภทผู้เข้าแข่งขัน</label>
                      <select
                        value={newParticipant.type}
                        onChange={(e) => setNewParticipant({ ...newParticipant, type: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-semibold bg-white cursor-pointer"
                      >
                        <option value="individual">👤 บุคคล (Individual)</option>
                        <option value="team">👥 ทีม (Team)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อผู้สมัคร / ชื่อทีมแข่งขัน</label>
                      <input
                        type="text"
                        required
                        placeholder="ระบุชื่อทีมแข่งขัน หรือชื่อผู้แข่ง"
                        value={newParticipant.name}
                        onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่อผลงาน / หัวข้อประกวด (ถ้ามี)</label>
                      <input
                        type="text"
                        placeholder="ระบุชื่อผลงาน / หัวข้อประกวดแข่งขัน"
                        value={newParticipant.project_title}
                        onChange={(e) => setNewParticipant({ ...newParticipant, project_title: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    {selectedActivity.competition_type === 'out_institution' ? (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">
                          ชื่อสถานศึกษา / สังกัด <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น วิทยาลัยสารพัดช่างน่าน หรือ วสช.น่าน"
                          value={newParticipant.institution_code}
                          onChange={(e) => setNewParticipant({ ...newParticipant, institution_code: e.target.value })}
                          className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <p className="text-[9px] text-gray-400 mt-0.5">ระบุชื่อหรือรหัสย่อสถานศึกษาที่ผู้เข้าแข่งขันสังกัด</p>
                      </div>
                    ) : null}
                  </div>

                  {newParticipant.type === 'team' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">รายชื่อสมาชิกในทีม (จำเป็นต้องระบุ)</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="ระบุรายชื่อสมาชิกทีมประเมิน (คั่นด้วยเครื่องหมายจุลภาค , หรือขึ้นบรรทัดใหม่)"
                        value={newParticipant.team_members}
                        onChange={(e) => setNewParticipant({ ...newParticipant, team_members: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ลิงก์ผลงานแนบ (URL Link)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/project"
                        value={newParticipant.project_url}
                        onChange={(e) => setNewParticipant({ ...newParticipant, project_url: e.target.value })}
                        className="w-full border rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">ไฟล์เอกสารแนบ (เช่น PDF, ZIP, DOCX)</label>
                      <div className="flex items-center gap-2">
                        {newParticipant.attachment_url ? (
                          <div className="flex-1 flex items-center justify-between p-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
                            <span className="text-green-800 truncate font-mono max-w-[200px]" title={newParticipant.attachment_url}>
                              {newParticipant.attachment_url.split('/').pop()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewParticipant({ ...newParticipant, attachment_url: '' })}
                              className="text-red-500 hover:text-red-700 font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            onChange={handleAttachmentUpload}
                            disabled={uploadingAttachment}
                            className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                          />
                        )}
                        {uploadingAttachment && (
                          <span className="text-[10px] text-gray-500 shrink-0">กำลังอัปโหลด...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={uploadingAttachment}
                      className="py-2 px-5 bg-info hover:bg-info-dark text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> ลงทะเบียนผู้เข้าแข่งขัน
                    </button>
                  </div>
                </form>

                <div className="space-y-2 overflow-y-auto max-h-80 pr-2">
                  {selectedActivity.participants.map((part) => (
                    <div key={part.id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl hover:bg-gray-100/50 transition-all text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              part.type === 'team' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                            }`}>
                              {part.type === 'team' ? 'ทีม' : 'บุคคล'}
                            </span>
                            <span className="text-sm">{part.name}</span>
                            {selectedActivity.competition_type === 'out_institution' && part.institution_code && (
                              <span className="text-[10px] bg-gray-200/70 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">
                                {part.institution_code}
                              </span>
                            )}
                          </div>

                          {part.project_title && (
                            <div className="text-xs font-semibold text-primary-dark mt-1 flex items-center gap-1">
                              <span>🏆 ผลงาน:</span>
                              <span className="text-gray-700 font-normal">{part.project_title}</span>
                            </div>
                          )}

                          {part.type === 'team' && part.team_members && (
                            <div className="text-[11px] text-gray-500 mt-1 flex items-start gap-1 flex-wrap">
                              <span className="font-bold text-gray-600">👥 สมาชิกทีม:</span>
                              <span className="bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-700 font-normal">
                                {part.team_members}
                              </span>
                            </div>
                          )}

                          {(part.project_url || part.attachment_url) && (
                            <div className="flex items-center gap-3 mt-2">
                              {part.project_url && (
                                <a
                                  href={part.project_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-info hover:underline flex items-center gap-1 font-bold bg-info/5 border border-info/10 px-2 py-0.5 rounded-full"
                                >
                                  🔗 ลิงก์ผลงาน
                                </a>
                              )}
                              {part.attachment_url && (
                                <a
                                  href={part.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-success hover:underline flex items-center gap-1 font-bold bg-success/5 border border-success/10 px-2 py-0.5 rounded-full"
                                >
                                  📁 ไฟล์แนบ
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteParticipant(part.id)}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedActivity.participants.length === 0 && (
                    <div className="text-xs text-gray-500 text-center py-6">ยังไม่ได้รับการลงทะเบียนทีมเข้าร่วมประเมิน</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: LIVE REPORT & CRITERIA BREAKDOWN */}
            {manageTab === 'report' && (
              <div className="space-y-4 font-sans">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                      ติดตามรายงานผลตัดสินเรียลไทม์ (อัปเดตทุก 5 วินาที)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`/print-report/${selectedActivity.id}`, '_blank')}
                      className="py-1 px-3 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      พิมพ์รายงาน (A4)
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchLiveReport(selectedActivity.id)}
                      className="py-1 px-3 bg-white hover:bg-gray-150 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      รีเฟรชตอนนี้
                    </button>
                  </div>
                </div>

                {!liveReportData ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-1">
                    {liveReportData.leaderboard.map((row, index) => {
                      let rankBadge = "bg-gray-150 text-gray-800";
                      if (index === 0) rankBadge = "bg-yellow-400 text-white font-bold border border-yellow-500 shadow-sm";
                      else if (index === 1) rankBadge = "bg-slate-300 text-white font-bold border border-slate-400 shadow-sm";
                      else if (index === 2) rankBadge = "bg-amber-600 text-white font-bold border border-amber-700 shadow-sm";

                      return (
                        <div key={row.participant_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-3 mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${rankBadge}`}>
                                {index + 1}
                              </span>
                              <div>
                                <h5 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                  <span>{row.name}</span>
                                  {row.institution_code && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase">
                                      {row.institution_code}
                                    </span>
                                  )}
                                </h5>

                                {row.project_title && (
                                  <div className="text-[11px] font-semibold text-primary mt-1">
                                    🏆 ผลงาน: <span className="text-gray-700 font-normal">{row.project_title}</span>
                                  </div>
                                )}

                                {row.team_members && (
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    👥 สมาชิกทีม: <span className="text-gray-700 font-normal">{row.team_members}</span>
                                  </div>
                                )}

                                {(row.project_url || row.attachment_url) && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {row.project_url && (
                                      <a href={row.project_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-info bg-info/5 border border-info/10 px-1.5 py-0.5 rounded font-bold">
                                        🔗 ลิงก์
                                      </a>
                                    )}
                                    {row.attachment_url && (
                                      <a href={row.attachment_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-success bg-success/5 border border-success/10 px-1.5 py-0.5 rounded font-bold">
                                        📁 ไฟล์แนบ
                                      </a>
                                    )}
                                  </div>
                                )}

                                <p className="text-[10px] text-gray-500 font-semibold mt-1">
                                  คณะกรรมการที่ตัดสินแล้ว: {row.evaluations_count} / {selectedActivity.expected_judges || 3} ท่าน
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 bg-primary-soft/20 px-3 py-1.5 rounded-lg border border-primary/10">
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 font-bold block uppercase">คะแนนเฉลี่ยรวม</span>
                                <span className="text-lg font-black text-primary-dark">{row.final_score.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>

                          {row.judges_scores.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-150 bg-gray-50/50 p-2">
                              <table className="min-w-full text-left text-xs font-sans">
                                <thead>
                                  <tr className="border-b border-gray-200 text-[9px] text-gray-500 uppercase font-extrabold tracking-wider">
                                    <th className="py-2 px-2">หัวข้อการประเมิน</th>
                                    {row.judges_scores.map((js, idx) => (
                                      <th key={js.judge_id} className="py-2 px-2 text-center" title={js.judge_name}>
                                        กรรมการท่านที่ {idx + 1}<br/>
                                        <span className="text-[8px] font-normal truncate max-w-[80px] block mx-auto">({js.judge_name})</span>
                                      </th>
                                    ))}
                                    <th className="py-2 px-2 text-center">คะแนนรวม</th>
                                    <th className="py-2 px-2 text-right">คะแนนเฉลี่ย</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150">
                                  {(() => {
                                    const parsedCriteria = typeof selectedActivity.criteria === 'string'
                                      ? JSON.parse(selectedActivity.criteria)
                                      : selectedActivity.criteria;
                                    return getLeafNodes(parsedCriteria).map(leaf => {
                                      const judgesWithScore = row.judges_scores.filter(js => js.scores[leaf.id] !== undefined);
                                      const leafSum = judgesWithScore.reduce((s, js) => s + parseFloat(js.scores[leaf.id]), 0);
                                      const leafAvg = judgesWithScore.length > 0 ? (leafSum / judgesWithScore.length).toFixed(2) : '-';
                                      return (
                                        <tr key={leaf.id} className="hover:bg-gray-100/50">
                                          <td className="py-2 px-2 font-bold text-gray-700">
                                            {leaf.name}
                                          </td>
                                          {row.judges_scores.map(js => {
                                            const val = js.scores[leaf.id] !== undefined ? js.scores[leaf.id] : '-';
                                            return (
                                              <td key={js.judge_id} className="py-2 px-2 text-center font-mono font-bold text-gray-600">
                                                {val}
                                              </td>
                                            );
                                          })}
                                          <td className="py-2 px-2 text-center font-mono font-bold text-gray-700 bg-gray-100/30">
                                            {leafSum.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-2 text-right font-mono font-black text-primary">
                                            {leafAvg}
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                  
                                  {/* Total Row */}
                                  <tr className="bg-primary-soft/10 font-bold border-t-2 border-gray-300 text-primary-dark">
                                    <td className="py-2.5 px-2">คะแนนรวมสุทธิ (Total Score)</td>
                                    {row.judges_scores.map(js => (
                                      <td key={js.judge_id} className="py-2.5 px-2 text-center font-mono font-black">
                                        {js.total_score.toFixed(2)}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-2 text-center font-mono font-black bg-gray-100/30">
                                      {(() => {
                                        let sum = 0;
                                        row.judges_scores.forEach(js => { sum += js.total_score; });
                                        return sum.toFixed(2);
                                      })()}
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-mono font-black text-accent">
                                      {row.final_score.toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                              ยังไม่มีคณะกรรมการประเมินผลสำหรับผู้เข้าแข่งขันรายนี้
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {liveReportData.leaderboard.length === 0 && (
                      <div className="text-xs text-gray-500 text-center py-12">
                        ไม่พบข้อมูลรายชื่อทีมผู้เข้าร่วมแข่งขันในกิจกรรมนี้
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowManageActivityModal(false);
                  fetchDashboardData();
                }}
                className="py-2 px-6 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow"
              >
                เสร็จสิ้นการจัดการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD JUDGE ACCOUNT MODAL --- */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 hover-scale">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">ลงทะเบียนบัญชีกรรมการใหม่</h3>
            <form onSubmit={handleCreateJudge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อ-นามสกุลกรรมการ</label>
                <input
                  type="text"
                  required
                  value={judgeForm.fullname}
                  onChange={(e) => setJudgeForm({ ...judgeForm, fullname: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="ตัวอย่าง: ดร. สมชาย พจนากร"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">รหัสสถาบัน / สังกัด</label>
                <input
                  type="text"
                  value={judgeForm.institution_code}
                  onChange={(e) => setJudgeForm({ ...judgeForm, institution_code: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="ตัวอย่าง: NPC, CTC (เว้นว่างได้)"
                />
              </div>

              <div className="flex items-center space-x-2 bg-primary-soft/10 p-2.5 rounded-lg border border-primary/10">
                <input
                  type="checkbox"
                  id="autoGenJudge"
                  checked={autoGenJudge}
                  onChange={(e) => setAutoGenJudge(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded cursor-pointer"
                />
                <label htmlFor="autoGenJudge" className="text-xs font-bold text-primary cursor-pointer select-none">
                  สร้างชื่อผู้ใช้และรหัสผ่านอัตโนมัติ
                </label>
              </div>

              {!autoGenJudge && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อผู้ใช้ (Username)</label>
                    <input
                      type="text"
                      required={!autoGenJudge}
                      value={judgeForm.username}
                      onChange={(e) => setJudgeForm({ ...judgeForm, username: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="ตัวอย่าง: judge_somchai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">รหัสผ่านเริ่มต้นสำหรับการใช้งาน</label>
                    <input
                      type="password"
                      required={!autoGenJudge}
                      value={judgeForm.password}
                      onChange={(e) => setJudgeForm({ ...judgeForm, password: e.target.value })}
                      className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="ความยาวขั้นต่ำ 6 ตัวอักษร"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowJudgeModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow"
                >
                  สร้างบัญชีกรรมการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {showResetPwdModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 hover-scale">
            <h3 className="text-lg font-bold text-primary mb-2 border-b pb-2">เปลี่ยนรหัสผ่านการใช้งาน</h3>
            <p className="text-xs text-gray-500 mb-4">รีเซ็ตรหัสผ่านสำหรับกรรมการท่าน: <strong className="text-gray-800">{resetPwdData.judgeName}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ระบุรหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  value={resetPwdData.newPassword}
                  onChange={(e) => setResetPwdData({ ...resetPwdData, newPassword: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="ความยาวขั้นต่ำ 6 ตัวอักษร"
                />
              </div>
              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetPwdModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow"
                >
                  อัปเดตรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT JUDGE MODAL --- */}
      {showEditJudgeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 hover-scale">
          <h3 className="text-lg font-bold text-primary mb-1 border-b pb-2">แก้ไขข้อมูลกรรมการ</h3>
            <p className="text-xs text-gray-500 mb-4">สามารถแก้ไขชื่อ, ชื่อผู้ใช้งาน (ใช้ล็อคอิน) และสถานศึกษาของกรรมการได้ หากต้องการเปลี่ยนรหัสผ่าน ใช้ปุ่มตั้งรหัสผ่านแยกต่างหาก</p>
            <form onSubmit={handleUpdateJudge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อ-นามสกุลกรรมการ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={editJudgeForm.fullname}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, fullname: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น judge01 หรือ npc_judge1"
                  value={editJudgeForm.username}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, username: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">กรรมการจะใช้ชื่อนี้ล็อคอินเข้าสู่ระบบประเมิน</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">ชื่อสถานศึกษา / หน่วยงานต้นสังกัด</label>
                <input
                  type="text"
                  value={editJudgeForm.institution_code}
                  onChange={(e) => setEditJudgeForm({ ...editJudgeForm, institution_code: e.target.value })}
                  className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="เช่น วิทยาลัยสารพัดช่างน่าน (เว้นว่างได้)"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">ใช้ตรวจสอบไม่ให้กรรมการตัดสินสถาบันของตนเอง (ใช้จัดการข้อขัดแย้งทางผลประโยชน์)</p>
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditJudgeModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-all shadow"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
