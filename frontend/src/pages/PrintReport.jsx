import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { api, getUploadUrl } from '../utils/api';
import Swal from 'sweetalert2';
import { ArrowLeft, Printer } from 'lucide-react';

const PrintReport = () => {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchReport();
  }, [activityId]);

  const fetchReport = async () => {
    try {
      const result = await api.get(`/api/reports/leaderboard/${activityId}`);
      setData(result);
    } catch (err) {
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">
        ไม่พบข้อมูลรายงานคะแนนกิจกรรมแข่งขันดังกล่าว
      </div>
    );
  }

  const { activity, leaderboard, head_judge_name, activity_judges, system_settings } = data;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sarabun text-black antialiased">
      {/* Action Header - Screen Only */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow no-print font-sans">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              if (user?.role === 'admin') {
                navigate('/admin');
              } else {
                navigate(activityId ? `/activities/${activityId}/evaluate` : '/judge');
              }
            }
          }}
          className="flex items-center text-sm font-bold text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> กลับสู่แดชบอร์ดหลัก
        </button>

        <button
          onClick={handlePrint}
          className="py-2 px-5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold shadow transition-all flex items-center"
        >
          <Printer className="w-4 h-4 mr-2" /> สั่งพิมพ์เอกสารรายงานอันดับ (A4)
        </button>
      </div>

      {/* Official Document - Printable */}
      <div className="max-w-[21cm] min-h-[29.7cm] mx-auto bg-white p-[1.5cm] shadow-lg border border-gray-200 printable-document font-sarabun text-black flex flex-col justify-between">
        <div>
          {/* Logo / Garuda Emblem */}
          <div className="flex justify-center mb-4">
            {system_settings?.institution_logo ? (
              <img 
                src={getUploadUrl(system_settings.institution_logo)} 
                alt="Institution Logo" 
                className="h-20 w-auto object-contain"
              />
            ) : (
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black">
                <path d="M50 5C48 15 35 22 30 25C25 28 15 28 5 25C10 38 18 42 22 55C18 60 12 70 8 80C18 78 28 72 35 68C38 75 42 85 45 95C48 85 52 85 55 95C58 85 62 75 65 68C72 72 82 78 92 80C88 70 82 60 78 55C82 42 90 38 95 25C85 28 75 28 70 25C65 22 52 15 50 5Z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <circle cx="50" cy="40" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M40 40H60" stroke="currentColor" strokeWidth="2"/>
                <path d="M50 48V65" stroke="currentColor" strokeWidth="2"/>
                <path d="M42 55H58" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </div>

          {/* Title / Headers */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="print-heading text-lg font-bold uppercase leading-none">รายงานผลคะแนนการตัดสินการแข่งขันอย่างเป็นทางการ</h1>
            <h2 className="print-heading text-base font-bold leading-none">{activity.title}</h2>
            <p>หน่วยงานเจ้าภาพตัดสิน: {activity.host_organization || system_settings?.institution_name || 'วิทยาลัยสารพัดช่างน่าน'}</p>
            <p>สถานที่จัดการประเมินแข่งขัน: {activity.location || 'อาคารอเนกประสงค์'}</p>

          </div>

          {/* Competition Data Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr>
                <th style={{ width: '10%', textAlign: 'center' }} className="border border-black bg-gray-50 font-bold p-1.5">อันดับ</th>
                <th style={{ width: activity.competition_type === 'out_institution' ? '50%' : '70%', textAlign: 'left' }} className="border border-black bg-gray-50 font-bold p-1.5">รายชื่อผู้เข้าแข่งขัน / ทีมผู้แข่งขัน</th>
                {activity.competition_type === 'out_institution' && (
                  <th style={{ width: '20%', textAlign: 'center' }} className="border border-black bg-gray-50 font-bold p-1.5">รหัสสถาบันสังกัด</th>
                )}
                <th style={{ width: '20%', textAlign: 'center' }} className="border border-black bg-gray-50 font-bold p-1.5">คะแนนเฉลี่ยสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, idx) => (
                <tr key={row.participant_id}>
                  <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold">{idx + 1}</td>
                  <td style={{ textAlign: 'left' }} className="border border-black p-1.5 font-bold leading-tight">
                    <div>{row.name}</div>
                    {row.project_title && (
                      <div className="text-gray-700 font-semibold mt-0.5">
                        🏆 ผลงาน: <span className="font-normal">{row.project_title}</span>
                      </div>
                    )}
                    {row.team_members && (
                      <div className="text-gray-600 font-semibold mt-0.5">
                        👥 สมาชิก: <span className="font-normal">{row.team_members.split('\n').join(', ')}</span>
                      </div>
                    )}
                    {row.advisors && (
                      <div className="text-gray-600 font-semibold mt-0.5">
                        👨‍🏫 ที่ปรึกษา: <span className="font-normal">{row.advisors.split('\n').join(', ')}</span>
                      </div>
                    )}
                  </td>
                  {activity.competition_type === 'out_institution' && (
                    <td style={{ textAlign: 'center' }} className="border border-black p-1.5">{row.institution_code || '-'}</td>
                  )}
                  <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold">{typeof row.final_score === 'number' ? row.final_score.toFixed(2) : row.final_score}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={activity.competition_type === 'out_institution' ? 4 : 3} style={{ textAlign: 'center' }} className="border border-black p-3">
                    ไม่พบตารางสรุปผลคะแนนสำหรับรายการตัดสินแข่งนี้ในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>



          {/* Signatures Block for All Judges */}
          <div className="mt-6 border-t pt-4">
            <p className="font-bold mb-5 text-center">คณะกรรมการประเมินตัดสินลงนามรับรองผลการแข่งขัน:</p>
            <div className="flex flex-wrap justify-center gap-y-6 gap-x-12">
              {activity_judges && activity_judges.length > 0 ? (
                [...activity_judges]
                  .sort((a, b) => {
                    const getWeight = (r) => {
                      const val = r === true ? 1 : r === false ? 0 : parseInt(r, 10) || 0;
                      if (val === 1) return 3; // President
                      if (val === 2) return 2; // Secretary
                      return 1; // Normal Judge
                    };
                    return getWeight(a.is_head_judge) - getWeight(b.is_head_judge);
                  })
                  .map((j) => (
                    <div key={j.id} className="text-center w-60">
                      <p className="mb-6 text-gray-500">ลงลายมือชื่อผู้ประเมินตัดสิน:</p>
                      <p className="border-b border-black w-48 mx-auto mb-1"></p>
                      <p className="font-bold">({j.fullname})</p>
                      <p className="text-gray-600">
                        {parseInt(j.is_head_judge, 10) === 1 ? 'ประธานกรรมการ' : parseInt(j.is_head_judge, 10) === 2 ? 'กรรมการและเลขานุการ' : 'กรรมการผู้ประเมิน'}
                      </p>
                    </div>
                  ))
              ) : leaderboard.length > 0 && [...leaderboard[0].judges_scores]
                  .sort((a, b) => (a.judge_name === head_judge_name ? 1 : 0) - (b.judge_name === head_judge_name ? 1 : 0))
                  .map((js) => {
                    const isHead = js.judge_name === head_judge_name;
                    return (
                      <div key={js.judge_id} className="text-center w-60">
                        <p className="mb-6 text-gray-500">ลงลายมือชื่อผู้ประเมินตัดสิน:</p>
                        <p className="border-b border-black w-48 mx-auto mb-1"></p>
                        <p className="font-bold">({js.judge_name})</p>
                        <p className="text-gray-600">
                          {isHead ? 'ประธานกรรมการ' : 'กรรมการผู้ประเมิน'}
                        </p>
                      </div>
                    );
                  })}
              {(!activity_judges || activity_judges.length === 0) && (leaderboard.length === 0 || leaderboard[0].judges_scores.length === 0) && (
                <p className="text-gray-400 italic text-center w-full">ยังไม่มีคณะกรรมการบันทึกคะแนนในระบบ</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Page 2+: Detailed Competitor Sheets */}
      {leaderboard.map((row) => {
        const parsedCriteria = typeof activity.criteria === 'string' ? JSON.parse(activity.criteria) : activity.criteria;
        const leafCriteria = getLeafNodes(parsedCriteria);

        return (
          <React.Fragment key={row.participant_id}>
            {/* PART 1: Summary Matrix Page */}
            <div className="max-w-[21cm] min-h-[29.7cm] mx-auto bg-white p-[1.5cm] shadow-lg border border-gray-200 printable-document page-break mt-8 font-sarabun text-black flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="print-heading text-lg font-bold uppercase leading-none">รายละเอียดคะแนนสรุปผลการประเมิน</h1>
                  <h2 className="print-heading text-base font-bold mt-1">{activity.title}</h2>
                  <div className="mt-3 p-2.5 bg-gray-50 border rounded-lg text-left space-y-1">
                    <div><strong>ชื่อผู้แข่งขัน/ทีม:</strong> {row.name}</div>
                    <div><strong>ประเภท:</strong> {row.type === 'team' ? 'ประเภททีม 👥' : 'ประเภทบุคคล 👤'}</div>
                    {activity.competition_type === 'out_institution' && row.institution_code && (
                      <div><strong>สังกัดสถาบัน/วิทยาลัย:</strong> {row.institution_code}</div>
                    )}
                    {row.project_title && (
                      <div><strong>ชื่อผลงาน:</strong> {row.project_title}</div>
                    )}
                    {row.type === 'team' && row.team_members && (
                      <div><strong>รายชื่อสมาชิกในทีม:</strong> {row.team_members.split('\n').join(', ')}</div>
                    )}
                    {row.advisors && (
                      <div><strong>ครูที่ปรึกษา:</strong> {row.advisors.split('\n').join(', ')}</div>
                    )}
                    <div><strong>คะแนนรวมเฉลี่ยสุทธิ:</strong> <span className="font-bold text-primary">{row.final_score.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* Section 1: ตารางคะแนนรวมของกรรมการทุกคน */}
                <div className="mb-6">
                  <h3 className="print-heading font-bold border-b border-black pb-1 mb-2">ส่วนที่ 1: ตารางคะแนนสรุปการประเมินจากกรรมการทุกคน</h3>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }} className="border border-black bg-gray-50 font-bold p-1.5">หัวข้อการประเมิน</th>
                        {row.judges_scores.map((js, idx) => (
                          <th key={js.judge_id} className="border border-black bg-gray-50 font-bold p-1.5 text-center" title={js.judge_name}>
                            กรรมการท่านที่ {idx + 1}<br/>
                            <span className="font-normal">({js.judge_name})</span>
                          </th>
                        ))}
                        <th style={{ textAlign: 'center' }} className="border border-black bg-gray-50 font-bold p-1.5">คะแนนรวม</th>
                        <th style={{ textAlign: 'center' }} className="border border-black bg-gray-50 font-bold p-1.5">คะแนนเฉลี่ย</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leafCriteria.map(leaf => {
                        const judgesWithScore = row.judges_scores.filter(js => js.scores[leaf.id] !== undefined);
                        const leafSum = judgesWithScore.reduce((s, js) => s + parseFloat(js.scores[leaf.id]), 0);
                        const leafAvg = judgesWithScore.length > 0 ? (leafSum / judgesWithScore.length).toFixed(2) : '-';
                        return (
                          <tr key={leaf.id}>
                            <td style={{ textAlign: 'left' }} className="border border-black p-1.5">
                              {leaf.name}
                            </td>
                            {row.judges_scores.map(js => {
                              const val = js.scores[leaf.id] !== undefined ? js.scores[leaf.id] : '-';
                              return (
                                <td key={js.judge_id} style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold">
                                  {val}
                                </td>
                              );
                            })}
                            <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold bg-gray-50">
                              {leafSum.toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold">
                              {leafAvg}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="bg-gray-50 font-bold">
                        <td style={{ textAlign: 'left' }} className="border border-black p-1.5 text-xs font-bold">คะแนนรวมสุทธิ (Total Score)</td>
                        {row.judges_scores.map(js => (
                          <td key={js.judge_id} style={{ textAlign: 'center' }} className="border border-black p-1.5 text-xs font-bold">
                            {js.total_score.toFixed(2)}
                          </td>
                        ))}
                        <td style={{ textAlign: 'center' }} className="border border-black p-1.5 text-xs font-bold bg-gray-50">
                          {(() => {
                            let sum = 0;
                            row.judges_scores.forEach(js => { sum += js.total_score; });
                            return sum.toFixed(2);
                          })()}
                        </td>
                        <td style={{ textAlign: 'center' }} className="border border-black p-1.5 text-xs font-bold text-primary">
                          {row.final_score.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Print Timestamp */}
              <div className="mt-8 text-left text-gray-400 border-t pt-2 flex justify-between">
                <span>ส่งพิมพ์โดยระบบ NPC_Evaluate ({row.name}) - ตารางสรุปผล</span>
                <span>วันที่พิมพ์: {new Date().toLocaleString()}</span>
              </div>
            </div>

            {/* PART 2: Individual Judge Scorecards (1 page per judge) */}
            {row.judges_scores.map((js, idx) => (
              <div key={js.judge_id} className="max-w-[21cm] min-h-[29.7cm] mx-auto bg-white p-[1.5cm] shadow-lg border border-gray-200 printable-document page-break mt-8 font-sarabun text-black flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h1 className="print-heading text-lg font-bold uppercase leading-none">รายละเอียดคะแนนประเมินรายบุคคล</h1>
                    <h2 className="print-heading text-base font-bold mt-1">{activity.title}</h2>
                    <div className="mt-3 p-2.5 bg-gray-50 border rounded-lg text-left space-y-1">
                      <div><strong>ชื่อผู้แข่งขัน/ทีม:</strong> {row.name}</div>
                      <div><strong>ประเภท:</strong> {row.type === 'team' ? 'ประเภททีม 👥' : 'ประเภทบุคคล 👤'}</div>
                      {activity.competition_type === 'out_institution' && row.institution_code && (
                        <div><strong>สังกัดสถาบัน/วิทยาลัย:</strong> {row.institution_code}</div>
                      )}
                      {row.project_title && (
                        <div><strong>ชื่อผลงาน:</strong> {row.project_title}</div>
                      )}
                      {row.type === 'team' && row.team_members && (
                        <div><strong>รายชื่อสมาชิกในทีม:</strong> {row.team_members.split('\n').join(', ')}</div>
                      )}
                      {row.advisors && (
                        <div><strong>ครูที่ปรึกษา:</strong> {row.advisors.split('\n').join(', ')}</div>
                      )}
                    </div>
                  </div>

                  {/* Section 2: รายงานคะแนนรายบุคคล */}
                  <div>
                    <h3 className="font-bold border-b border-black pb-1 mb-2">
                      ส่วนที่ 2: ใบบันทึกคะแนนดิบรายบุคคล (กรรมการคนที่ {idx + 1})
                    </h3>
                    <div className="border border-gray-300 p-3 rounded-lg bg-gray-50/50">
                      <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                        <span className="font-bold text-primary">กรรมการคนที่ {idx + 1}: {js.judge_name}</span>
                        <span className="text-gray-500">{js.judge_institution ? `สังกัด: ${js.judge_institution}` : ''}</span>
                      </div>
                      <table className="w-full border-collapse mb-1">
                        <thead>
                          <tr>
                            <th style={{ width: '75%', textAlign: 'left' }} className="border border-black bg-gray-50 p-1.5 font-bold">เกณฑ์การประเมิน</th>
                            <th style={{ width: '25%', textAlign: 'center' }} className="border border-black bg-gray-50 p-1.5 font-bold">คะแนน (ดิบ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leafCriteria.map(leaf => {
                            const val = js.scores[leaf.id] !== undefined ? js.scores[leaf.id] : '-';
                            return (
                              <tr key={leaf.id}>
                                <td style={{ textAlign: 'left' }} className="border border-black p-1.5">{leaf.name}</td>
                                <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-bold">{val}</td>
                              </tr>
                            );
                          })}
                          <tr className="font-bold bg-gray-50">
                            <td style={{ textAlign: 'left' }} className="border border-black p-1.5 font-bold">รวมคะแนน (ดิบ) สุทธิ</td>
                            <td style={{ textAlign: 'center' }} className="border border-black p-1.5 font-black">{js.total_score.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Signature line for this judge */}
                  <div className="mt-6 flex justify-end">
                    <div className="text-center w-60">
                      <p className="mb-6">ลงลายมือชื่อผู้ประเมินตัดสิน:</p>
                      <p className="border-b border-black w-48 mx-auto mb-1"></p>
                      <p className="font-bold">({js.judge_name})</p>
                      <p className="text-gray-500">กรรมการผู้ประเมิน</p>
                    </div>
                  </div>
                </div>

                {/* Footer Print Timestamp */}
                <div className="mt-8 text-left text-gray-400 border-t pt-2 flex justify-between">
                  <span>ส่งพิมพ์โดยระบบ NPC_Evaluate ({row.name}) - ใบคะแนนกรรมการคนที่ {idx + 1}</span>
                  <span>วันที่พิมพ์: {new Date().toLocaleString()}</span>
                </div>
              </div>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default PrintReport;
