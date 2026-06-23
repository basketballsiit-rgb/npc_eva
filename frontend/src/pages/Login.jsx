import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api, getUploadUrl } from '../utils/api';
import Swal from 'sweetalert2';
import { Shield, Lock, User, Eye, EyeOff, Calendar, MapPin, Award } from 'lucide-react';

const Login = () => {
  const { activityId } = useParams();
  const [activityInfo, setActivityInfo] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Registration View States
  const [viewMode, setViewMode] = useState('login'); // 'login' or 'register'
  const [regForm, setRegForm] = useState({
    name: '',
    type: 'individual',
    institution_code: '',
    project_title: '',
    team_members: '',
    project_url: '',
    department: '',
    level: '',
    year: ''
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    if (activityId) {
      const fetchActivity = async () => {
        try {
          const data = await api.get(`/api/auth/activities/public/${activityId}`);
          setActivityInfo(data);
          if (data.system_settings) {
            setSystemSettings(data.system_settings);
          }
        } catch (err) {
          console.error(err);
          Swal.fire('ข้อผิดพลาด', 'ไม่พบรหัสกิจกรรมการประเมินนี้ในระบบ', 'error');
        }
      };
      fetchActivity();
    } else {
      const fetchSettings = async () => {
        try {
          const data = await api.get('/api/auth/settings');
          setSystemSettings(data);
        } catch (err) {
          console.error('Failed to fetch system settings:', err);
        }
      };
      fetchSettings();
    }
  }, [activityId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      Swal.fire({
        icon: 'error',
        title: 'กรอกข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกทั้งชื่อผู้ใช้และรหัสผ่าน',
        confirmButtonColor: '#4A2C6D'
      });
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { username, password, activityId });
      login(data);
      
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ!',
        text: `ยินดีต้อนรับคุณ ${data.fullname}`,
        timer: 1500,
        showConfirmButton: false,
      });

      if (activityId) {
        navigate(`/activities/${activityId}/evaluate`);
      } else {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/judge');
        }
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เข้าสู่ระบบล้มเหลว',
        text: error.message === 'Invalid username or password' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : error.message,
        confirmButtonColor: '#D32F2F'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regForm.name) {
      Swal.fire({
        icon: 'error',
        title: 'ระบุข้อมูลไม่ครบถ้วน',
        text: regForm.type === 'team' ? 'กรุณาระบุชื่อทีมแข่งขัน' : 'กรุณาระบุชื่อผู้แข่งขัน',
        confirmButtonColor: '#D32F2F'
      });
      return;
    }

    if (activityInfo?.competition_type === 'out_institution' && !regForm.institution_code) {
      Swal.fire({
        icon: 'error',
        title: 'ระบุข้อมูลไม่ครบถ้วน',
        text: 'กรุณาระบุรหัสวิทยาลัย/สังกัดสถาบัน',
        confirmButtonColor: '#D32F2F'
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', regForm.name);
      formData.append('type', regForm.type);
      if (activityInfo?.competition_type === 'out_institution') {
        formData.append('institution_code', regForm.institution_code);
      } else {
        formData.append('institution_code', '');
      }
      formData.append('project_title', regForm.project_title);
      formData.append('team_members', regForm.team_members);
      formData.append('project_url', regForm.project_url);
      formData.append('department', regForm.department);
      formData.append('level', regForm.level);
      formData.append('year', regForm.year);
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/auth/activities/public/${activityId}/register`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      }

      Swal.fire({
        icon: 'success',
        title: 'ลงทะเบียนสำเร็จ!',
        text: 'ข้อมูลการสมัครของคุณถูกบันทึกเรียบร้อยแล้ว คณะกรรมการจะทำการประเมินผลงานของท่าน',
        confirmButtonColor: '#4A2C6D'
      });

      // Reset form and go back to login view
      setRegForm({
        name: '',
        type: 'individual',
        institution_code: '',
        project_title: '',
        team_members: '',
        project_url: '',
        department: '',
        level: '',
        year: ''
      });
      setAttachmentFile(null);
      setViewMode('login');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'ลงทะเบียนไม่สำเร็จ',
        text: err.message,
        confirmButtonColor: '#D32F2F'
      });
    } finally {
      setLoading(false);
    }
  };

  // Parse login customization config
  let loginConfig = {
    template: 'template_1',
    logo_urls: [],
    banner_url: '',
    show_title: true,
    show_date: true,
    show_location: true,
    show_host: true
  };
  if (activityInfo?.login_config) {
    try {
      loginConfig = typeof activityInfo.login_config === 'string'
        ? JSON.parse(activityInfo.login_config)
        : activityInfo.login_config;
    } catch (e) {
      console.error('Failed to parse login_config on login page:', e);
    }
  }

  const isTemplate2 = loginConfig.template === 'template_2';
  const logoUrls = (loginConfig.logo_urls || []).filter(url => url && url.trim().length > 0).map(getUploadUrl);
  const bannerUrl = getUploadUrl(loginConfig.banner_url || activityInfo?.banner_url);

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* LEFT PANEL: Branding & Competition Details */}
      <div 
        className="w-full md:w-1/2 bg-gradient-to-br from-[#1a1230] via-[#351F4F] to-[#120a22] text-white flex flex-col justify-between p-8 md:p-12 relative overflow-hidden shrink-0 min-h-[38vh] md:min-h-screen"
        style={bannerUrl ? (isTemplate2 ? {
          backgroundImage: `url(${bannerUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: '#120a22'
        } : {
          backgroundImage: `linear-gradient(rgba(26, 18, 48, 0.85), rgba(18, 10, 34, 0.9)), url(${bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }) : {}}
      >
        {/* Subtle decorative circles (only show if not template 2) */}
        {!isTemplate2 && (
          <>
            <div className="absolute w-96 h-96 bg-primary-light/10 rounded-full -top-12 -left-12 blur-3xl"></div>
            <div className="absolute w-96 h-96 bg-info/10 rounded-full -bottom-12 -right-12 blur-3xl"></div>
          </>
        )}

        {/* Brand Header */}
        {!isTemplate2 && (
          <div className="z-10 flex items-center justify-between md:justify-start gap-2 bg-black/20 md:bg-transparent p-2 md:p-0 rounded-lg backdrop-blur-sm md:backdrop-blur-none border border-white/5 md:border-transparent">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-light shrink-0" />
              <span className="font-bold tracking-wider text-sm opacity-90 font-mono">NPC_Evaluate</span>
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="z-10 flex flex-col items-center md:items-start text-center md:text-left my-auto py-8">
          {isTemplate2 ? (
            // Template 2 hides all default logos & texts
            <div className="hidden"></div>
          ) : (
            // Template 1 or Custom
            <>
              {/* Logo element(s) */}
              {logoUrls.length > 0 ? (
                <div className="w-full flex flex-wrap justify-center gap-3 mb-6 max-w-full">
                  {logoUrls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt={`Logo ${idx + 1}`} 
                      className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-md rounded-full bg-white/10 p-1.5 border border-white/20"
                    />
                  ))}
                </div>
              ) : systemSettings?.institution_logo ? (
                <div className="w-full flex justify-center mb-6">
                  <img 
                    src={getUploadUrl(systemSettings.institution_logo)} 
                    alt="Institution Logo" 
                    className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-lg rounded-xl bg-white p-2 border border-white/10"
                  />
                </div>
              ) : activityInfo?.logo_url ? (
                <div className="w-full flex justify-center mb-6">
                  <img 
                    src={getUploadUrl(activityInfo.logo_url)} 
                    alt="Logo" 
                    className="w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-lg rounded-full bg-white/5 p-2 border border-white/10"
                  />
                </div>
              ) : (
                <div className="w-full flex justify-center mb-6">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-primary-light shrink-0">
                    <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3" />
                      <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="1" />
                      <circle cx="50" cy="50" r="35" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M50 30 L58 40 L55 58 L50 63 L45 58 L42 40 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
                      <path d="M50 35 L55 42 L53 54 L50 58 L47 54 L45 42 Z" stroke="currentColor" strokeWidth="1" />
                      <circle cx="50" cy="45" r="3" fill="currentColor" />
                      <path d="M25 50 L27 52 L25 54 L23 52 Z" fill="currentColor" />
                      <path d="M75 50 L77 52 L75 54 L73 52 Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Activity Information */}
              {activityInfo ? (
                <div className="space-y-4 max-w-lg">
                  {(loginConfig.template === 'template_1' || loginConfig.show_title !== false) && (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-light/20 border border-primary-light/30 text-primary-light text-xs font-bold rounded-full uppercase tracking-wider mb-1">
                        <Award className="w-3.5 h-3.5 text-accent animate-pulse" />
                        <span>ห้องประเมินผลเฉพาะกิจกรรม</span>
                      </div>
                      <h1 className="text-xl md:text-3xl font-extrabold text-white leading-snug tracking-tight drop-shadow-md">
                        {activityInfo.title}
                      </h1>
                    </>
                  )}
                  
                  {/* Info list */}
                  {(loginConfig.template === 'template_1' || 
                    loginConfig.show_date !== false || 
                    loginConfig.show_location !== false || 
                    loginConfig.show_host !== false) && (
                    <div className="mt-6 space-y-3 text-sm text-gray-200 border-t border-white/10 pt-5 max-w-sm mx-auto md:mx-0 font-medium">
                      {(loginConfig.template === 'template_1' || loginConfig.show_date !== false) && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-primary-light shrink-0" />
                          <span>วันตัดสิน: {new Date(activityInfo.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      {(loginConfig.template === 'template_1' || loginConfig.show_location !== false) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary-light shrink-0" />
                          <span className="truncate">สถานที่: {activityInfo.location || 'ไม่ระบุสถานที่'}</span>
                        </div>
                      )}
                      {(loginConfig.template === 'template_1' || loginConfig.show_host !== false) && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-primary-light shrink-0" />
                          <span className="truncate">ผู้รับผิดชอบ: {activityInfo.host_organization || 'วิทยาลัยสารพัดช่างน่าน'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none">
                    NPC_Evaluate
                  </h1>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    ระบบประเมินและตัดสินการประกวดการแข่งขันระดับหน่วย/จังหวัด {systemSettings?.institution_name || 'วิทยาลัยสารพัดช่างน่าน'}
                  </p>
                  <div className="border-t border-white/10 pt-4 mt-3">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                      {systemSettings?.institution_name === 'วิทยาลัยสารพัดช่างน่าน' ? 'Nan Polytechnic College' : (systemSettings?.institution_name || 'Nan Polytechnic College')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info (Left) */}
        {!isTemplate2 && (
          <div className="z-10 text-center md:text-left text-xs text-gray-400/80 font-medium mt-4 bg-black/10 md:bg-transparent px-2 py-1 rounded backdrop-blur-sm md:backdrop-blur-none inline-block self-center md:self-start">
            © {new Date().getFullYear()} พัฒนาโดย งานศูนย์ข้อมูลเทคโนโลยีสารสนเทศและการสื่อสาร
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Clean Login Form Card */}
      <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-8 md:p-12 min-h-[62vh] md:min-h-screen relative">
        <div className="absolute w-96 h-96 bg-primary-light/5 rounded-full -bottom-12 -right-12 blur-3xl"></div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 z-10 hover-scale">
          {viewMode === 'login' ? (
            <>
              <div className="mb-6 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">เข้าสู่ระบบการตัดสิน</h2>
                <p className="text-sm text-gray-500 mt-1">กรุณากรอกข้อมูลผู้ใช้งาน (Username) และรหัสผ่าน</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อผู้ใช้ (Username)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold"
                      placeholder="กรอกชื่อผู้ใช้ของคุณ"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน (Password)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold"
                      placeholder="กรอกรหัสผ่านของคุณ"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 transition-all flex items-center justify-center text-base mt-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </button>
              </form>

              {loginConfig.enable_registration && (
                <div className="text-center mt-5 pt-4 border-t border-dashed border-gray-100">
                  <button
                    type="button"
                    onClick={() => setViewMode('register')}
                    className="text-sm font-bold text-primary hover:text-primary-dark hover:underline transition-all"
                  >
                    ลงทะเบียนผู้เข้าแข่งขันออนไลน์ (Online Registration) →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">ลงทะเบียนผู้เข้าแข่งขัน</h2>
                <p className="text-sm text-gray-500 mt-1">กรอกรายละเอียดเพื่อลงทะเบียนรับการประเมินการแข่งขัน</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">ประเภทผู้เข้าแข่งขัน</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, type: 'individual' })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        regForm.type === 'individual'
                          ? 'bg-primary/10 border-primary text-primary shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      บุคคล (Individual)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegForm({ ...regForm, type: 'team' })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        regForm.type === 'team'
                          ? 'bg-primary/10 border-primary text-primary shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      กลุ่ม / ทีม (Team)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                    {regForm.type === 'team' ? 'ชื่อทีมแข่งขัน' : 'ชื่อ-นามสกุลจริงผู้สมัคร'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold"
                    placeholder={regForm.type === 'team' ? "ตัวอย่าง: ทีมวิศวกรคอมพิวเตอร์" : "ตัวอย่าง: นายสมชาย ยินดี"}
                    disabled={loading}
                  />
                </div>

                {regForm.type === 'individual' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">แผนกวิชา</label>
                      <select
                        value={regForm.department}
                        onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold cursor-pointer bg-white"
                        disabled={loading}
                      >
                        <option value="">-- เลือกแผนกวิชา --</option>
                        <option value="การบัญชี">การบัญชี</option>
                        <option value="ช่างยนต์">ช่างยนต์</option>
                        <option value="ช่างไฟฟ้า">ช่างไฟฟ้า</option>
                        <option value="ช่างอิเล็กทรอนิกส์">ช่างอิเล็กทรอนิกส์</option>
                        <option value="เทคโนโลยีสารสนเทศ">เทคโนโลยีสารสนเทศ</option>
                        <option value="การตลาด">การตลาด</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">ระดับชั้น</label>
                      <select
                        value={regForm.level}
                        onChange={(e) => setRegForm({ ...regForm, level: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold cursor-pointer bg-white"
                        disabled={loading}
                      >
                        <option value="">-- เลือกระดับชั้น --</option>
                        <option value="ปวช">ปวช</option>
                        <option value="ปวส">ปวส</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">ปีที่</label>
                      <select
                        value={regForm.year}
                        onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold cursor-pointer bg-white"
                        disabled={loading}
                      >
                        <option value="">-- เลือกปีที่ --</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>
                  </div>
                )}

                {activityInfo?.competition_type === 'out_institution' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                      รหัสวิทยาลัย / สถาบันต้นสังกัด <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.institution_code}
                      onChange={(e) => setRegForm({ ...regForm, institution_code: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold"
                      placeholder="ระบุตัวย่อ เช่น NanTC, CTC"
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">ชื่อผลงาน / โครงการที่เข้าแข่งขัน (ถ้ามี)</label>
                  <input
                    type="text"
                    value={regForm.project_title}
                    onChange={(e) => setRegForm({ ...regForm, project_title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-semibold"
                    placeholder="ระบุชื่อสิ่งประดิษฐ์/ผลงาน/โครงการ"
                    disabled={loading}
                  />
                </div>

                {regForm.type === 'team' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">รายชื่อสมาชิกในทีม (เขียนเรียงบรรทัด)</label>
                    <textarea
                      value={regForm.team_members}
                      onChange={(e) => setRegForm({ ...regForm, team_members: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm font-medium"
                      placeholder="1. นายสมชาย ดีใจ&#10;2. นางสาวสมศรี มีสุข"
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">ลิงก์ข้อมูลเพิ่มเติม / วิดีโอนำเสนอ (ถ้ามี)</label>
                  <input
                    type="url"
                    value={regForm.project_url}
                    onChange={(e) => setRegForm({ ...regForm, project_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-900 text-sm"
                    placeholder="เช่น https://github.com/... หรือ YouTube URL"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 font-semibold text-gray-700">ไฟล์เอกสารแนบ (ถ้ามี)</label>
                  <input
                    type="file"
                    accept=".pdf,.zip,.rar,.tar,.gz,image/*"
                    onChange={(e) => setAttachmentFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                    disabled={loading}
                  />
                  <p className="text-[9px] text-gray-400 mt-1">ไฟล์ไม่เกิน 5MB (รองรับ PDF, ZIP, RAR, รูปภาพ)</p>
                </div>

                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setRegForm({
                        name: '',
                        type: 'individual',
                        institution_code: '',
                        project_title: '',
                        team_members: '',
                        project_url: '',
                        department: '',
                        level: '',
                        year: ''
                      });
                      setAttachmentFile(null);
                    }}
                    className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-all"
                    disabled={loading}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow transition-all flex items-center justify-center text-xs"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'ยืนยันลงทะเบียน'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="mt-8 text-center text-xs text-gray-400 font-medium border-t border-gray-100 pt-5">
            ระบบบันทึกคะแนนที่ปลอดภัยสิทธิ์แบบ Append-Only • วิทยาลัยสารพัดช่างน่าน
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
