import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api, getUploadUrl } from '../utils/api';
import Swal from 'sweetalert2';
import { Shield, Lock, User, Eye, EyeOff, Calendar, MapPin, Award, X, Plus } from 'lucide-react';

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
    institution_name: '',
    project_title: '',
    team_members: '',
    project_url: '',
    department: '',
    level: '',
    year: ''
  });
  const [teamMembersList, setTeamMembersList] = useState(['']);
  const [advisorsList, setAdvisorsList] = useState(['']);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

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
  }, [activityId]);  const getDefaultType = () => {
    const regConfig = activityInfo?.login_config?.reg_config || {};
    const allowInd = regConfig.allow_individual !== false;
    const allowTeam = regConfig.allow_team !== false;
    if (allowInd && !allowTeam) return 'individual';
    if (!allowInd && allowTeam) return 'team';
    return 'individual';
  };

  useEffect(() => {
    if (activityInfo) {
      setRegForm(prev => ({
        ...prev,
        type: getDefaultType()
      }));
    }
  }, [activityInfo]);

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
        title: 'เข้าสู่ระบบสำเร็จ',
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

    const regConfig = activityInfo?.login_config?.reg_config || {};

    if (activityInfo?.competition_type === 'out_institution') {
      if (!regForm.institution_code) {
        Swal.fire({
          icon: 'error',
          title: 'ระบุข้อมูลไม่ครบถ้วน',
          text: 'กรุณาระบุรหัสย่อวิทยาลัย/สังกัดสถาบัน',
          confirmButtonColor: '#D32F2F'
        });
        return;
      }
      if (regConfig.show_institution !== false && !regForm.institution_name) {
        Swal.fire({
          icon: 'error',
          title: 'ระบุข้อมูลไม่ครบถ้วน',
          text: 'กรุณาระบุชื่อสถานศึกษา/วิทยาลัย',
          confirmButtonColor: '#D32F2F'
        });
        return;
      }
    }

    const teamMembersString = regForm.type === 'team'
      ? teamMembersList.filter(m => m.trim() !== '').join('\n')
      : '';

    if (regForm.type === 'team' && !teamMembersString) {
      Swal.fire({
        icon: 'error',
        title: 'ระบุข้อมูลไม่ครบถ้วน',
        text: 'กรุณาระบุรายชื่อสมาชิกในทีมอย่างน้อย 1 คน',
        confirmButtonColor: '#D32F2F'
      });
      return;
    }

    const advisorsString = regConfig.show_advisor !== false
      ? advisorsList.filter(a => a.trim() !== '').join('\n')
      : '';

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', regForm.name);
      formData.append('type', regForm.type);
      if (activityInfo?.competition_type === 'out_institution') {
        formData.append('institution_code', regForm.institution_code);
        formData.append('institution_name', regConfig.show_institution !== false ? regForm.institution_name : '');
      } else {
        formData.append('institution_code', '');
        formData.append('institution_name', '');
      }
      formData.append('project_title', regConfig.show_project_title !== false ? regForm.project_title : '');
      formData.append('team_members', teamMembersString);
      formData.append('project_url', regConfig.show_project_url !== false ? regForm.project_url : '');
      formData.append('department', (regForm.type === 'individual' && regConfig.show_department !== false) ? regForm.department : '');
      formData.append('level', (regForm.type === 'individual' && regConfig.show_level_year !== false) ? regForm.level : '');
      formData.append('year', (regForm.type === 'individual' && regConfig.show_level_year !== false) ? regForm.year : '');
      formData.append('advisors', advisorsString);
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
        title: 'ลงทะเบียนสำเร็จ',
        text: 'ข้อมูลการสมัครของคุณถูกบันทึกเรียบร้อยแล้ว คณะกรรมการจะทำการประเมินผลงานของท่าน',
        confirmButtonColor: '#4A2C6D'
      });

      // Reset form and go back to login view
      setRegForm({
        name: '',
        type: getDefaultType(),
        institution_code: '',
        institution_name: '',
        project_title: '',
        team_members: '',
        project_url: '',
        department: '',
        level: '',
        year: ''
      });
      setTeamMembersList(['']);
      setAdvisorsList(['']);
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
  const institutionName = systemSettings?.institution_name || 'วิทยาลัยสารพัดช่างน่าน';
  const institutionEnglishName = institutionName === 'วิทยาลัยสารพัดช่างน่าน' ? 'Nan Polytechnic College' : institutionName;

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-[#F7F6F3] text-stone-900 selection:bg-primary/15 selection:text-primary-dark">
      {/* LEFT PANEL: Branding & Competition Details */}
      <div
        className="w-full md:w-1/2 bg-[#1E142D] text-white flex flex-col justify-between p-8 md:p-12 relative overflow-hidden shrink-0 min-h-[36vh] md:min-h-screen"
        style={bannerUrl ? (isTemplate2 ? {
          backgroundImage: `url(${bannerUrl})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: '#120a22'
        } : {
          backgroundImage: `linear-gradient(rgba(30, 20, 45, 0.88), rgba(20, 13, 31, 0.94)), url(${bannerUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }) : {}}
      >
        {/* Brand Header */}
        {!isTemplate2 && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white/90" strokeWidth={1.75} />
            </div>
            <span className="font-medium text-sm text-white/90 tracking-tight">NPC_Evaluate</span>
          </div>
        )}

        {/* Content Section */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left my-auto py-8">
          {isTemplate2 ? (
            // Template 2 hides all default logos & texts
            <div className="hidden"></div>
          ) : (
            // Template 1 or Custom
            <>
              {/* Logo element(s) */}
              {logoUrls.length > 0 ? (
                <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6 max-w-full">
                  {logoUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Logo ${idx + 1}`}
                      className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-xl bg-white p-2 border border-white/15"
                    />
                  ))}
                </div>
              ) : systemSettings?.institution_logo && !logoLoadError ? (
                <div className="mb-6">
                  <img
                    src={getUploadUrl(systemSettings.institution_logo)}
                    alt={institutionName}
                    onError={() => setLogoLoadError(true)}
                    className="w-24 h-24 md:w-28 md:h-28 object-contain rounded-xl bg-white p-2.5 border border-white/15"
                  />
                </div>
              ) : activityInfo?.logo_url && !logoLoadError ? (
                <div className="mb-6">
                  <img
                    src={getUploadUrl(activityInfo.logo_url)}
                    alt={activityInfo.title || 'Logo'}
                    onError={() => setLogoLoadError(true)}
                    className="w-24 h-24 md:w-28 md:h-28 object-contain rounded-xl bg-white p-2.5 border border-white/15"
                  />
                </div>
              ) : (
                <div className="mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white/90 shrink-0">
                    <Shield className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
                  </div>
                </div>
              )}

              {/* Activity Information */}
              {activityInfo ? (
                <div className="space-y-4 max-w-lg">
                  {(loginConfig.template === 'template_1' || loginConfig.show_title !== false) && (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 text-white/90 text-xs font-medium rounded-md">
                        <Award className="w-3.5 h-3.5 text-amber-300" strokeWidth={1.75} />
                        <span>ห้องประเมินผลเฉพาะกิจกรรม</span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-semibold text-white leading-snug tracking-tight">
                        {activityInfo.title}
                      </h1>
                    </>
                  )}

                  {/* Info list */}
                  {(loginConfig.template === 'template_1' ||
                    loginConfig.show_date !== false ||
                    loginConfig.show_location !== false ||
                    loginConfig.show_host !== false) && (
                    <div className="mt-6 space-y-3 text-sm text-white/80 border-t border-white/15 pt-5 max-w-sm mx-auto md:mx-0">
                      {(loginConfig.template === 'template_1' || loginConfig.show_date !== false) && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.75} />
                          <span>วันตัดสิน: {new Date(activityInfo.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                      {(loginConfig.template === 'template_1' || loginConfig.show_location !== false) && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">สถานที่: {activityInfo.location || 'ไม่ระบุสถานที่'}</span>
                        </div>
                      )}
                      {(loginConfig.template === 'template_1' || loginConfig.show_host !== false) && (
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-white/60 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">ผู้รับผิดชอบ: {activityInfo.host_organization || institutionName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight leading-tight">
                    NPC_Evaluate
                  </h1>
                  <p className="text-white/80 text-sm md:text-base leading-relaxed">
                    ระบบประเมินและตัดสินการประกวดการแข่งขันระดับหน่วย/จังหวัด {institutionName}
                  </p>
                  <div className="border-t border-white/15 pt-4 mt-4">
                    <span className="text-xs text-white/60 font-medium block">
                      {institutionEnglishName}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info (Left) */}
        {!isTemplate2 && (
          <div className="text-center md:text-left text-xs text-white/55 mt-4">
            © {new Date().getFullYear()} พัฒนาโดย งานศูนย์ข้อมูลเทคโนโลยีสารสนเทศและการสื่อสาร
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Clean Login Form Card */}
      <div className="w-full md:w-1/2 bg-[#F7F6F3] flex items-center justify-center p-6 md:p-12 min-h-[64vh] md:min-h-screen">
        <div className="w-full max-w-md bg-white rounded-xl border border-stone-200/90 shadow-sm p-6 md:p-8">
          {viewMode === 'login' ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-semibold text-stone-900 tracking-tight">เข้าสู่ระบบการตัดสิน</h2>
                <p className="text-sm text-stone-500 mt-1">กรุณากรอกข้อมูลผู้ใช้งาน (Username) และรหัสผ่าน</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-username" className="block text-sm font-medium text-stone-700 mb-1.5">
                    ชื่อผู้ใช้ (Username)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 pointer-events-none">
                      <User className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                      placeholder="กรอกชื่อผู้ใช้ของคุณ"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-stone-700 mb-1.5">
                    รหัสผ่าน (Password)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400 pointer-events-none">
                      <Lock className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                      placeholder="กรอกรหัสผ่านของคุณ"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 transition-colors flex items-center justify-center text-sm mt-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'เข้าสู่ระบบ'
                  )}
                </button>
              </form>

              {loginConfig.enable_registration && (
                <div className="text-center mt-5 pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setViewMode('register')}
                    className="text-sm font-medium text-primary hover:text-primary-dark hover:underline transition-colors"
                  >
                    ลงทะเบียนผู้เข้าแข่งขันออนไลน์ (Online Registration) →
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-semibold text-stone-900 tracking-tight">ลงทะเบียนผู้เข้าแข่งขัน</h2>
                <p className="text-sm text-stone-500 mt-1">กรอกรายละเอียดเพื่อลงทะเบียนรับการประเมินการแข่งขัน</p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {(() => {
                  const regConfig = activityInfo?.login_config?.reg_config || {};
                  const allowInd = regConfig.allow_individual !== false;
                  const allowTeam = regConfig.allow_team !== false;
                  if (allowInd && allowTeam) {
                    return (
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-2">ประเภทผู้เข้าแข่งขัน</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRegForm({ ...regForm, type: 'individual' })}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                              regForm.type === 'individual'
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            บุคคล (Individual)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegForm({ ...regForm, type: 'team' })}
                            className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                              regForm.type === 'team'
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            กลุ่ม / ทีม (Team)
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">
                    {regForm.type === 'team' ? 'ชื่อทีมแข่งขัน' : 'ชื่อ-นามสกุลจริงผู้สมัคร'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                    placeholder={regForm.type === 'team' ? "ตัวอย่าง: ทีมวิศวกรคอมพิวเตอร์" : "ตัวอย่าง: นายสมชาย ยินดี"}
                    disabled={loading}
                  />
                </div>

                {(() => {
                  const regConfig = activityInfo?.login_config?.reg_config || {};
                  return (
                    <>
                      {regForm.type === 'individual' && (regConfig.show_department !== false || regConfig.show_level_year !== false) && (
                        <div className={`grid grid-cols-1 ${
                          (regConfig.show_department !== false && regConfig.show_level_year !== false) ? 'md:grid-cols-3' : 'md:grid-cols-2'
                        } gap-3`}>
                          {regConfig.show_department !== false && (
                            <div>
                              <label className="block text-xs font-medium text-stone-600 mb-1.5">แผนกวิชา</label>
                              <select
                                value={regForm.department}
                                onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 text-sm cursor-pointer"
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
                          )}
                          {regConfig.show_level_year !== false && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-stone-600 mb-1.5">ระดับชั้น</label>
                                <select
                                  value={regForm.level}
                                  onChange={(e) => setRegForm({ ...regForm, level: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 text-sm cursor-pointer"
                                  disabled={loading}
                                >
                                  <option value="">-- เลือกระดับชั้น --</option>
                                  <option value="ปวช">ปวช</option>
                                  <option value="ปวส">ปวส</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-stone-600 mb-1.5">ปีที่</label>
                                <select
                                  value={regForm.year}
                                  onChange={(e) => setRegForm({ ...regForm, year: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 text-sm cursor-pointer"
                                  disabled={loading}
                                >
                                  <option value="">-- เลือกปีที่ --</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {activityInfo?.competition_type === 'out_institution' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {regConfig.show_institution !== false && (
                            <div>
                              <label className="block text-xs font-medium text-stone-600 mb-1.5">
                                ชื่อสถานศึกษา / วิทยาลัย <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={regForm.institution_name}
                                onChange={(e) => setRegForm({ ...regForm, institution_name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                                placeholder="ระบุชื่อวิทยาลัยเต็ม เช่น วิทยาลัยสารพัดช่างน่าน"
                                disabled={loading}
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1.5">
                              รหัสย่อสถานศึกษา (เช่น NanTC, CTC) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={regForm.institution_code}
                              onChange={(e) => setRegForm({ ...regForm, institution_code: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                              placeholder="ระบุตัวย่อ เช่น NanTC, CTC"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      )}

                      {regConfig.show_project_title !== false && (
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1.5">ชื่อผลงาน / โครงการที่เข้าแข่งขัน (ถ้ามี)</label>
                          <input
                            type="text"
                            value={regForm.project_title}
                            onChange={(e) => setRegForm({ ...regForm, project_title: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                            placeholder="ระบุชื่อสิ่งประดิษฐ์/ผลงาน/โครงการ"
                            disabled={loading}
                          />
                        </div>
                      )}

                      {regForm.type === 'team' && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-stone-600">รายชื่อสมาชิกในทีม <span className="text-red-500">*</span></label>
                          <div className="space-y-2">
                            {teamMembersList.map((member, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  required={idx === 0}
                                  placeholder={`ชื่อสมาชิกคนที่ ${idx + 1}`}
                                  value={member}
                                  onChange={(e) => {
                                    const newList = [...teamMembersList];
                                    newList[idx] = e.target.value;
                                    setTeamMembersList(newList);
                                  }}
                                  className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                                  disabled={loading}
                                />
                                {teamMembersList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...teamMembersList];
                                      newList.splice(idx, 1);
                                      setTeamMembersList(newList);
                                    }}
                                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors shrink-0"
                                    title="ลบ"
                                    aria-label="ลบสมาชิก"
                                    disabled={loading}
                                  >
                                    <X className="w-4 h-4" strokeWidth={1.75} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setTeamMembersList([...teamMembersList, ''])}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark hover:underline font-medium transition-colors"
                            disabled={loading}
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>เพิ่มสมาชิกในทีม</span>
                          </button>
                        </div>
                      )}

                      {regConfig.show_project_url !== false && (
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1.5">ลิงก์ข้อมูลเพิ่มเติม / วิดีโอนำเสนอ (ถ้ามี)</label>
                          <input
                            type="url"
                            value={regForm.project_url}
                            onChange={(e) => setRegForm({ ...regForm, project_url: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                            placeholder="เช่น https://github.com/... หรือ YouTube URL"
                            disabled={loading}
                          />
                        </div>
                      )}

                      {regConfig.show_advisor !== false && (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-stone-600">ครูที่ปรึกษา (มีมากกว่า 1 คน หรือไม่มีก็ได้)</label>
                          {advisorsList.length > 0 && (
                            <div className="space-y-2">
                              {advisorsList.map((advisor, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder={`ชื่อครูที่ปรึกษาคนที่ ${idx + 1}`}
                                    value={advisor}
                                    onChange={(e) => {
                                      const newList = [...advisorsList];
                                      newList[idx] = e.target.value;
                                      setAdvisorsList(newList);
                                    }}
                                    className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-stone-900 placeholder:text-stone-400 text-sm"
                                    disabled={loading}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...advisorsList];
                                      newList.splice(idx, 1);
                                      setAdvisorsList(newList);
                                    }}
                                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-md transition-colors shrink-0"
                                    title="ลบ"
                                    aria-label="ลบครูที่ปรึกษา"
                                    disabled={loading}
                                  >
                                    <X className="w-4 h-4" strokeWidth={1.75} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setAdvisorsList([...advisorsList, ''])}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-dark hover:underline font-medium transition-colors"
                            disabled={loading}
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>เพิ่มครูที่ปรึกษา</span>
                          </button>
                        </div>
                      )}

                      {regConfig.show_attachment !== false && (
                        <div>
                          <label className="block text-xs font-medium text-stone-600 mb-1.5">ไฟล์เอกสารแนบ (ถ้ามี)</label>
                          <input
                            type="file"
                            accept=".pdf,.zip,.rar,.tar,.gz,image/*"
                            onChange={(e) => setAttachmentFile(e.target.files[0])}
                            className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/15 file:cursor-pointer"
                            disabled={loading}
                          />
                          <p className="text-[11px] text-stone-400 mt-1">ไฟล์ไม่เกิน 5MB (รองรับ PDF, ZIP, RAR, รูปภาพ)</p>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex gap-3 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setRegForm({
                        name: '',
                        type: getDefaultType(),
                        institution_code: '',
                        institution_name: '',
                        project_title: '',
                        team_members: '',
                        project_url: '',
                        department: '',
                        level: '',
                        year: ''
                      });
                      setTeamMembersList(['']);
                      setAdvisorsList(['']);
                      setAttachmentFile(null);
                    }}
                    className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg text-xs transition-colors"
                    disabled={loading}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-medium rounded-lg transition-colors flex items-center justify-center text-xs"
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

          <div className="mt-8 text-center text-xs text-stone-400 border-t border-stone-100 pt-5">
            ระบบบันทึกคะแนนที่ปลอดภัยสิทธิ์แบบ Append-Only • {institutionName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
