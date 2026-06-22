import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api, getUploadUrl } from '../utils/api';
import Swal from 'sweetalert2';
import { 
  LogOut, ClipboardList, History, Award, BookOpen, 
  ChevronRight, ArrowLeft, Star, FileText, CheckCircle, Clock, Printer, Users
} from 'lucide-react';

const JudgeDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { activityId } = useParams();

  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [liveReportData, setLiveReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Grading Form State
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [scoresForm, setScoresForm] = useState({}); // { crit_id: score }
  const [submitting, setSubmitting] = useState(false);

  const fetchLiveReport = async () => {
    if (!activityId) return;
    try {
      const data = await api.get(`/api/reports/leaderboard/${activityId}`);
      setLiveReportData(data);
    } catch (err) {
      console.error('Error fetching live report:', err);
    }
  };

  const currentTask = tasks.find(t => t.id === parseInt(activityId));
  const isHeadJudge = parseInt(currentTask?.is_head_judge, 10) === 1;
  const isSecretary = parseInt(currentTask?.is_head_judge, 10) === 2;
  const canPrint = user?.role === 'admin' || isHeadJudge || isSecretary;

  useEffect(() => {
    let intervalId;
    if (activityId && user && user.role === 'admin' && activeTab === 'live_report') {
      fetchLiveReport();
      intervalId = setInterval(() => {
        fetchLiveReport();
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, activityId, user, isHeadJudge]);

  useEffect(() => {
    fetchTasks();
    if (user && user.role !== 'admin') {
      fetchHistory();
    }
  }, [activeTab, activityId, user]);

  const fetchTasks = async () => {
    try {
      if (activityId) {
        if (user.role === 'admin') {
          // Admin Preview Mode
          const data = await api.get(`/api/admin/activities/${activityId}`);
          const formattedTask = {
            id: data.id,
            title: data.title,
            description: data.description,
            status: data.status,
            scoring_algorithm: data.scoring_algorithm,
            criteria: typeof data.criteria === 'string' ? JSON.parse(data.criteria) : data.criteria,
            is_head_judge: false,
            participants: (data.participants || []).map(p => ({
              id: p.id,
              name: p.name,
              type: p.type,
              institution_code: p.institution_code,
              evaluated: false,
              total_score: null,
              submitted_at: null
            }))
          };
          setTasks([formattedTask]);
        } else {
          // Judge specific activity mode
          const data = await api.get('/api/judge/tasks');
          const filtered = data.filter(t => t.id === parseInt(activityId));
          if (filtered.length === 0) {
            Swal.fire({
              icon: 'error',
              title: 'ไม่มีสิทธิ์เข้าถึง',
              text: 'คุณไม่ได้รับมอบหมายให้เป็นกรรมการในกิจกรรมนี้',
              confirmButtonColor: '#4A2C6D'
            }).then(() => {
              navigate('/judge');
            });
            return;
          }
          setTasks(filtered);
        }
      } else {
        // Normal Judge mode
        if (user.role === 'admin') {
          navigate('/admin');
          return;
        }
        const data = await api.get('/api/judge/tasks');
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
      if (activityId) {
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลกิจกรรมการประเมินได้',
          confirmButtonColor: '#4A2C6D'
        }).then(() => {
          if (user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/judge');
          }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.get('/api/judge/history');
      if (activityId) {
        setHistory(data.filter(r => r.activity_id === parseInt(activityId)));
      } else {
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบตัดสินประเมินผลใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4A2C6D',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        if (activityId) {
          navigate(`/activities/${activityId}/login`);
        } else {
          navigate('/login');
        }
      }
    });
  };

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

  const handleOpenGrading = (activity, participant) => {
    setSelectedActivity(activity);
    setSelectedParticipant(participant);
    
    const leaves = getLeafNodes(activity.criteria);
    const initialScores = {};
    leaves.forEach(leaf => {
      initialScores[leaf.id] = 0;
    });
    setScoresForm(initialScores);
  };

  const handleScoreChange = (critId, maxScore, value) => {
    let num = parseFloat(value);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxScore) num = maxScore;

    setScoresForm({
      ...scoresForm,
      [critId]: num
    });
  };

  const calculateLiveTotal = () => {
    if (!selectedActivity) return 0;
    
    const calculateTreeScore = (nodes, submitted) => {
      const evaluateNode = (node) => {
        if (!node.children || node.children.length === 0) {
          return parseFloat(submitted[node.id]) || 0;
        }
        let sum = 0;
        for (const child of node.children) {
          const w = child.weight !== undefined ? parseFloat(child.weight) : 1.0;
          sum += evaluateNode(child) * w;
        }
        return sum;
      };

      let total = 0;
      for (const mainNode of nodes) {
        const w = mainNode.weight !== undefined ? parseFloat(mainNode.weight) : 1.0;
        total += evaluateNode(mainNode) * w;
      }
      return total;
    };

    return parseFloat(calculateTreeScore(selectedActivity.criteria, scoresForm).toFixed(2));
  };

  const handleSubmitGrade = (e) => {
    e.preventDefault();

    const leaves = getLeafNodes(selectedActivity.criteria);
    const invalid = leaves.some(
      leaf => scoresForm[leaf.id] === undefined || scoresForm[leaf.id] < 0 || scoresForm[leaf.id] > leaf.max_score
    );

    if (invalid) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุคะแนนให้ถูกต้องตามเกณฑ์ขั้นต่ำและขั้นสูงสุด', 'error');
      return;
    }

    const liveTotal = calculateLiveTotal();

    let breakdownHtml = `
      <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-2 mt-3 font-sans max-h-60 overflow-y-auto">
        <h4 class="font-bold text-primary mb-2">สรุปรายการคะแนนแต่ละเกณฑ์:</h4>
    `;
    leaves.forEach(leaf => {
      const score = scoresForm[leaf.id] || 0;
      breakdownHtml += `
        <div class="flex justify-between border-b border-gray-100 py-1">
          <span>${leaf.name} (เต็ม ${leaf.max_score})</span>
          <span class="font-semibold">${score} / ${leaf.max_score}</span>
        </div>
      `;
    });
    breakdownHtml += `
        <div class="flex justify-between font-bold text-base text-accent border-t border-gray-300 pt-2 mt-2">
          <span>คะแนนสรุปรวมสุทธิ:</span>
          <span>${liveTotal}</span>
        </div>
      </div>
      <p class="text-xs text-red-500 font-bold mt-4">
        ⚠️ สำคัญมาก: เมื่อคลิกส่งคะแนนแล้ว ระบบความปลอดภัยจะล็อคข้อมูลแบบถาวร ไม่สามารถเข้ามาแก้ไขหรือลบคะแนนได้อีกต่อไป
      </p>
    `;

    Swal.fire({
      title: 'ตรวจสอบผลคะแนนก่อนการยืนยัน',
      html: breakdownHtml,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4A2C6D',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ยืนยันการส่งผลและล็อคคะแนน',
      cancelButtonText: 'แก้ไขคะแนน'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSubmitting(true);
        try {
          await api.post('/api/judge/scores', {
            activityId: selectedActivity.id,
            participantId: selectedParticipant.id,
            scores: scoresForm
          });

          Swal.fire({
            icon: 'success',
            title: 'ส่งผลการตัดสินสำเร็จ!',
            text: 'ระบบได้ทำการจัดเก็บและล็อคผลประเมินการตัดสินเป็นที่เรียบร้อย',
            confirmButtonColor: '#4A2C6D'
          });

          setSelectedActivity(null);
          setSelectedParticipant(null);
          fetchTasks();
        } catch (err) {
          Swal.fire('การส่งคะแนนล้มเหลว', err.message, 'error');
        } finally {
          setSubmitting(false);
        }
      }
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
              <p className="text-xs text-primary-soft">ระบบของคณะกรรมการ</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => {
                setActiveTab('tasks');
                setSelectedActivity(null);
                setSelectedParticipant(null);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                activeTab === 'tasks' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
              }`}
            >
              <ClipboardList className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">รายการตัดสินแข่งขัน</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('live_report');
                  setSelectedActivity(null);
                  setSelectedParticipant(null);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === 'live_report' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
                }`}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">รายงานคะแนนเรียลไทม์</span>
              </button>
            )}
            {canPrint && (
              <button
                onClick={() => {
                  window.open(`${import.meta.env.BASE_URL}print-report/${activityId}`, '_blank');
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all text-primary-soft hover:bg-primary/20 hover:text-white"
              >
                <Printer className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">พิมพ์รายงาน (A4)</span>
              </button>
            )}
            {user?.role !== 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('history');
                  setSelectedActivity(null);
                  setSelectedParticipant(null);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === 'history' ? 'bg-primary text-white font-semibold shadow-md' : 'text-primary-soft hover:bg-primary/20'
                }`}
              >
                <History className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">ประวัติการประเมินย้อนหลัง</span>
              </button>
            )}
          </nav>
        </div>

        <div className="pt-6 border-t border-primary/30 mt-6">
          <div className="text-xs text-primary-soft truncate mb-1">
            {user?.role === 'admin' ? `ผู้ดูแลระบบ: ${user?.fullname}` : `กรรมการ: ${user?.fullname}`}
          </div>
          <div className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-3">
            {user?.role === 'admin' ? 'บทบาท: ผู้ดูแลระบบ' : `สังกัดสถาบัน: ${user?.institution_code}`}
          </div>
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
              {activeTab === 'tasks' && 'การตัดสินและประเมินผลแข่งขัน'}
              {activeTab === 'history' && 'ประวัติรายการส่งคะแนนสะสม'}
              {activeTab === 'live_report' && 'รายงานผลคะแนนประเมินเรียลไทม์'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'tasks' && 'กรุณาเลือกรายการการแข่งขันด้านล่าง เพื่อดำเนินการให้คะแนน'}
              {activeTab === 'history' && 'รายการคะแนนตัดสินแข่งขันที่ท่านได้ยืนยันการบันทึกแล้ว'}
              {activeTab === 'live_report' && 'ติดตามรายงานผลการตัดสินของกิจกรรมการแข่งขันนี้แบบเรียลไทม์'}
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-sm font-semibold px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center">
            {user?.role === 'admin' ? (
              <>
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-2.5"></span>
                โหมดพรีวิวผู้ดูแลระบบ
              </>
            ) : isHeadJudge ? (
              <>
                <span className="w-2.5 h-2.5 bg-purple-600 rounded-full mr-2.5 animate-pulse"></span>
                ★ ประธานกรรมการ (เชื่อมต่อแล้ว)
              </>
            ) : isSecretary ? (
              <>
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2.5 animate-pulse"></span>
                ✍️ กรรมการและเลขานุการ (เชื่อมต่อแล้ว)
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2.5 animate-pulse"></span>
                กรรมการเชื่อมต่อแล้ว
              </>
            )}
          </div>
        </header>

        {user?.role === 'admin' && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 flex items-center gap-3">
            <span className="text-xl">👁️</span>
            <div>
              <h4 className="font-bold text-sm">โหมดพรีวิวสำหรับผู้ดูแลระบบ</h4>
              <p className="text-xs text-yellow-700 mt-0.5">
                คุณสามารถดูเกณฑ์การประเมินและรายชื่อผู้เข้าแข่งได้ แต่ไม่สามารถกรอกคะแนนหรือส่งผลคะแนนเพื่อบันทึกได้
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* TASKS TAB */}
            {activeTab === 'tasks' && !selectedActivity && (
              <div className="space-y-6">
                {tasks.map(act => (
                  <div key={act.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover-scale">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-primary-dark">{act.title}</h3>
                        <p className="text-xs text-gray-500">{act.description}</p>
                      </div>
                      <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                        {parseInt(act.is_head_judge, 10) === 1 && (
                          <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 text-accent text-xs font-bold rounded-full">
                            ★ ประธานกรรมการ
                          </span>
                        )}
                        {parseInt(act.is_head_judge, 10) === 2 && (
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full">
                            ✍️ กรรมการและเลขานุการ
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          act.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {act.status === 'Active' ? 'เปิดประเมินผล' : 'เสร็จสิ้น'}
                        </span>
                      </div>
                    </div>

                    {act.participants && act.participants.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {act.participants.map(part => (
                          <div 
                            key={part.id} 
                            className={`p-4 rounded-xl border flex flex-col justify-between min-h-[10.5rem] h-auto transition-all ${
                              part.evaluated 
                                ? 'bg-primary-soft/30 border-primary-light/20' 
                                : 'bg-white border-gray-200 hover:border-primary/40 hover:shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <span className="text-[10px] text-gray-500 font-bold tracking-wide uppercase flex items-center gap-1">
                                  <span>{part.type === 'team' ? '👥 ทีม' : '👤 บุคคล'}</span>
                                  {act.competition_type === 'out_institution' && part.institution_code && (
                                    <span className="bg-gray-100 text-gray-600 px-1 rounded font-mono font-bold">({part.institution_code})</span>
                                  )}
                                </span>
                                {part.evaluated ? (
                                  <span className="flex items-center text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" /> ประเมินแล้ว
                                  </span>
                                ) : (
                                  <span className="flex items-center text-xs text-yellow-700 font-semibold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                                    <Clock className="w-3 h-3 mr-1" /> รอดำเนินการ
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-gray-800 mt-2 line-clamp-1">{part.name}</h4>

                              {part.project_title && (
                                <div className="text-[11px] text-primary-dark font-semibold mt-1 truncate">
                                  🏆 ผลงาน: <span className="text-gray-600 font-normal">{part.project_title}</span>
                                </div>
                              )}

                              {part.type === 'team' && part.team_members && (
                                <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                                  <span className="font-bold">สมาชิก:</span> {part.team_members}
                                </div>
                              )}

                              {(part.project_url || part.attachment_url) && (
                                <div className="flex items-center gap-2 mt-2">
                                  {part.project_url && (
                                    <a
                                      href={part.project_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] text-info font-bold bg-info/5 border border-info/10 px-1.5 py-0.5 rounded"
                                    >
                                      🔗 ลิงก์
                                    </a>
                                  )}
                                  {part.attachment_url && (
                                    <a
                                      href={getUploadUrl(part.attachment_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] text-success font-bold bg-success/5 border border-success/10 px-1.5 py-0.5 rounded"
                                    >
                                      📁 ไฟล์แนบ
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex justify-between items-end mt-3 border-t pt-2.5">
                              {part.evaluated ? (
                                <div className="w-full flex justify-between items-center">
                                  <span className="text-[10px] text-gray-400 font-semibold">คะแนนรวมที่ประเมิน</span>
                                  <span className="text-base font-black text-primary-dark">{part.total_score}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenGrading(act, part)}
                                  className="w-full py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center"
                                >
                                  {user?.role === 'admin' ? 'ดูเกณฑ์การตัดสิน' : 'เริ่มให้คะแนนการตัดสิน'} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs font-semibold flex flex-col items-center justify-center p-6">
                        <Users className="w-8 h-8 text-gray-300 mb-2" />
                        <span>ยังไม่มีรายชื่อผู้เข้าแข่งขันลงทะเบียนในกิจกรรมนี้</span>
                        <span className="text-[10px] text-gray-400 font-normal mt-1">กรุณาแจ้งผู้ดูแลระบบ (Admin) ให้ทำการเพิ่มผู้เข้าแข่งขันในระบบ</span>
                      </div>
                    )}
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
                    ขณะนี้ไม่มีรายการกิจกรรมแข่งขันใดได้รับมอบหมายให้ตัดสินประเมินผล
                  </div>
                )}
              </div>
            )}

            {/* GRADING SCREEN */}
            {activeTab === 'tasks' && selectedActivity && selectedParticipant && (
              <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto border border-gray-100 hover-scale font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivity(null);
                    setSelectedParticipant(null);
                  }}
                  className="mb-6 flex items-center text-sm font-bold text-gray-500 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับไปรายการงานทั้งหมด
                </button>

                <div className="border-b pb-4 mb-6">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedActivity.competition_type === 'out_institution' && selectedParticipant.institution_code && (
                      <span className="px-2.5 py-0.5 bg-primary-soft text-primary-dark text-xs font-bold rounded-full uppercase block w-fit">
                        สถาบันผู้แข่ง: {selectedParticipant.institution_code}
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedParticipant.type === 'team' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                    }`}>
                      {selectedParticipant.type === 'team' ? '👥 ทีม (Team)' : '👤 บุคคล (Individual)'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mt-2">
                    {selectedParticipant.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">ประเมินของรายการ: {selectedActivity.title}</p>

                  {/* Details of project, team members and files */}
                  {selectedParticipant.project_title && (
                    <div className="mt-3 text-sm font-semibold text-primary flex items-center gap-1.5 bg-primary-soft/10 border border-primary-light/10 p-2.5 rounded-lg">
                      <span>🏆 ชื่อผลงาน:</span>
                      <span className="text-gray-800 font-normal">{selectedParticipant.project_title}</span>
                    </div>
                  )}

                  {selectedParticipant.type === 'team' && selectedParticipant.team_members && (
                    <div className="mt-2 text-xs text-gray-600 flex items-start gap-1 bg-gray-50 border border-gray-150 p-2.5 rounded-lg flex-wrap">
                      <span className="font-bold text-gray-700">👥 รายชื่อสมาชิกในทีม:</span>
                      <span className="text-gray-800 font-normal">{selectedParticipant.team_members}</span>
                    </div>
                  )}

                  {(selectedParticipant.project_url || selectedParticipant.attachment_url) && (
                    <div className="flex items-center gap-3 mt-3">
                      {selectedParticipant.project_url && (
                        <a
                          href={selectedParticipant.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-info hover:underline flex items-center gap-1 font-bold bg-info/5 border border-info/10 px-3 py-1 rounded-full"
                        >
                          🔗 ลิงก์ผลงานประกวด
                        </a>
                      )}
                       {selectedParticipant.attachment_url && (
                         <a
                           href={getUploadUrl(selectedParticipant.attachment_url)}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-xs text-success hover:underline flex items-center gap-1 font-bold bg-success/5 border border-success/10 px-3 py-1 rounded-full"
                         >
                           📁 ดาวน์โหลดไฟล์แนบ
                         </a>
                       )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitGrade} className="space-y-6">
                  {/* Recursive Judge Criteria Forms */}
                  {(() => {
                    const renderJudgeCriteria = (nodes, depth = 1) => {
                      return nodes.map((node) => {
                        const hasChildren = node.children && node.children.length > 0;
                        
                        if (hasChildren) {
                          let titleClass = "text-sm font-bold text-primary-dark uppercase mt-6 mb-3 border-b pb-1 flex items-center";
                          let containerClass = "space-y-4";
                          if (depth === 2) {
                            titleClass = "text-xs font-bold text-info-dark uppercase mt-4 mb-2 ml-4 flex items-center";
                            containerClass = "space-y-3 ml-4";
                          }
                          
                          return (
                            <div key={node.id} className="space-y-1">
                              <div className={titleClass}>
                                <Star className="w-3.5 h-3.5 mr-1.5 text-accent-light" />
                                <span>{node.name}</span>
                                <span className="text-[10px] text-gray-400 font-medium font-sans normal-case ml-2">
                                  (น้ำหนักคูณกลุ่มนี้: {node.weight}x)
                                </span>
                              </div>
                              <div className={containerClass}>
                                {renderJudgeCriteria(node.children, depth + 1)}
                              </div>
                            </div>
                          );
                        } else {
                          const weight = node.weight !== undefined ? parseFloat(node.weight) : 1.0;
                          return (
                            <div key={node.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative hover:shadow-sm transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-800 text-xs">{node.name}</h4>
                                  <span className="text-[10px] text-gray-400 font-semibold uppercase font-sans">
                                    ตัวคูณระดับย่อย: {weight}x
                                  </span>
                                </div>
                                <span className="text-xs font-black text-gray-500">คะแนนเต็ม: {node.max_score}</span>
                              </div>

                              <div className="flex items-center mt-3">
                                <input
                                  type="number"
                                  step="0.5"
                                  required
                                  min="0"
                                  max={node.max_score}
                                  value={scoresForm[node.id] || ''}
                                  onChange={(e) => handleScoreChange(node.id, node.max_score, e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono font-bold"
                                  placeholder={user?.role === 'admin' ? 'ไม่สามารถระบุคะแนนได้ในโหมดพรีวิว' : `กรอกคะแนนประเมินระหว่าง 0 ถึง ${node.max_score}`}
                                  disabled={submitting || user?.role === 'admin'}
                                />
                              </div>
                            </div>
                          );
                        }
                      });
                    };
                    return renderJudgeCriteria(selectedActivity.criteria);
                  })()}

                  <div className="bg-primary-soft/50 rounded-lg p-4 border border-primary-light/10 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-gray-600 font-bold uppercase tracking-wider block">คะแนนสะสมสุทธิเฉลี่ย</span>
                      <span className="text-xs text-gray-400">(คำนวณถ่วงน้ำหนักตามเกณฑ์เรียลไทม์)</span>
                    </div>
                    <span className="text-3xl font-black text-primary-dark">{calculateLiveTotal()}</span>
                  </div>

                  {user?.role === 'admin' ? (
                    <div className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-lg border border-gray-300 text-center text-sm">
                      👁️ โหมดพรีวิว - ไม่สามารถส่งคะแนนตัดสินได้
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-accent hover:bg-accent-dark text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center text-base"
                    >
                      {submitting ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'ส่งผลคะแนนตัดสิน (ล็อคคะแนนถาวร)'
                      )}
                    </button>
                  )}
                </form>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && user?.role !== 'admin' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">กิจกรรมแข่งขัน</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ผู้แข่ง / ทีมผู้แข่ง</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">วันเวลาที่ทำการตัดสิน</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">คะแนนประเมินตัดสิน</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {history.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold text-gray-900">{record.activity_title}</td>
                          <td className="px-6 py-4 text-gray-800 font-medium">{record.participant_name}</td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(record.submitted_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-primary-soft text-primary-dark rounded font-mono font-bold text-sm">
                              {parseFloat(record.total_score)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center text-gray-500 py-8 text-sm">
                            ยังไม่มีรายการส่งคะแนนประเมินตัดสินการประกวดแข่งขันของท่านในระบบ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LIVE REPORT TAB */}
            {activeTab === 'live_report' && user?.role === 'admin' && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 font-sans space-y-6">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                      ติดตามรายงานผลตัดสินแบบเรียลไทม์ (อัปเดตทุก 5 วินาที)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => window.open(`${import.meta.env.BASE_URL}print-report/${activityId}`, '_blank')}
                      className="py-1 px-3 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      พิมพ์รายงาน (A4)
                    </button>
                    <button
                      type="button"
                      onClick={fetchLiveReport}
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
                  <div className="space-y-6">
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
                                <p className="text-[10px] text-gray-500 font-semibold mt-1">
                                  คณะกรรมการที่ตัดสินแล้ว: {row.evaluations_count} / {liveReportData.activity.expected_judges || 3} ท่าน
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
                                    <th className="py-2 px-2 text-center">คะแนนเต็ม</th>
                                    {row.judges_scores.map((js, idx) => (
                                      <th key={js.judge_id} className="py-2 px-2 text-center" title={js.judge_name}>
                                        คะแนนกรรมการท่านที่ {idx + 1}<br/>
                                        <span className="text-[8px] font-normal truncate max-w-[80px] block mx-auto">({js.judge_name})</span>
                                      </th>
                                    ))}
                                    <th className="py-2 px-2 text-center">คะแนนรวม</th>
                                    <th className="py-2 px-2 text-right">คะแนนเฉลี่ย</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150">
                                  {getLeafNodes(liveReportData.activity.criteria).map(leaf => (
                                    <tr key={leaf.id} className="hover:bg-gray-100/50">
                                      <td className="py-2 px-2 font-bold text-gray-700">
                                        {leaf.name}
                                      </td>
                                      <td className="py-2 px-2 text-center font-mono font-semibold text-gray-500">
                                        {leaf.max_score}
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
                                        {(() => {
                                          let sum = 0;
                                          row.judges_scores.forEach(js => {
                                            if (js.scores[leaf.id] !== undefined) {
                                              sum += parseFloat(js.scores[leaf.id]);
                                            }
                                          });
                                          return sum.toFixed(2);
                                        })()}
                                      </td>
                                      <td className="py-2 px-2 text-right font-mono font-black text-primary">
                                        {(() => {
                                          let sum = 0;
                                          let count = 0;
                                          row.judges_scores.forEach(js => {
                                            if (js.scores[leaf.id] !== undefined) {
                                              sum += parseFloat(js.scores[leaf.id]);
                                              count++;
                                            }
                                          });
                                          return count > 0 ? (sum / count).toFixed(2) : '-';
                                        })()}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Total Row */}
                                  <tr className="bg-primary-soft/10 font-bold border-t-2 border-gray-300 text-primary-dark">
                                    <td className="py-2.5 px-2">คะแนนรวมสุทธิ (Total Score)</td>
                                    <td className="py-2.5 px-2 text-center font-mono font-black">
                                      {getLeafNodes(liveReportData.activity.criteria).reduce((sum, leaf) => sum + parseFloat(leaf.max_score), 0)}
                                    </td>
                                    {row.judges_scores.map(js => (
                                      <td key={js.judge_id} className="py-2.5 px-2 text-center font-mono font-black">
                                        {js.total_score.toFixed(2)}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-2 text-center font-mono font-black bg-gray-100/30">
                                      {(() => {
                                        let sum = 0;
                                        row.judges_scores.forEach(js => {
                                          sum += js.total_score;
                                        });
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
          </>
        )}
      </main>
    </div>
  );
};

export default JudgeDashboard;
