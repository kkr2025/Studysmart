import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.ts';
import { StudyTask, TaskCompletion } from '../types.ts';
import { getFormattedDate } from '../logic/utils.ts';
import DonutChart from './DonutChart.tsx';

interface StudyPlannerProps {
  studentId: string;
  studentBatch: string;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({ studentId, studentBatch }) => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [studentId, studentBatch]);

  const fetchTasks = async () => {
    try {
      const today = getFormattedDate();

      // 1. Fetch study tasks for today (assigned to 'All' or student's specific class)
      let fetchedTasks: StudyTask[] = [];
      const { data: dbTasks, error: taskErr } = await supabase
        .from('study_tasks')
        .select('*')
        .eq('assigned_date', today);

      if (!taskErr && dbTasks && dbTasks.length > 0) {
        fetchedTasks = dbTasks.filter(
          t => t.target_batch === 'All' || t.target_batch === studentBatch
        );
      }

      // If no tasks from DB, check localStorage fallback
      if (fetchedTasks.length === 0) {
        const localTasks = localStorage.getItem(`smartstudy_tasks_${today}`);
        if (localTasks) {
          try {
            const parsed = JSON.parse(localTasks);
            fetchedTasks = parsed.filter(
              (t: StudyTask) => t.target_batch === 'All' || t.target_batch === studentBatch
            );
          } catch (e) {}
        }
      }

      setTasks(fetchedTasks);

      // 2. Fetch completed tasks for this student
      const completedSet = new Set<string>();
      const { data: dbCompletions, error: compErr } = await supabase
        .from('task_completions')
        .select('task_id')
        .eq('student_id', studentId);

      if (!compErr && dbCompletions) {
        dbCompletions.forEach((c: any) => completedSet.add(c.task_id));
      } else {
        // LocalStorage fallback
        const localComps = localStorage.getItem(`smartstudy_comp_${studentId}`);
        if (localComps) {
          try {
            JSON.parse(localComps).forEach((id: string) => completedSet.add(id));
          } catch (e) {}
        }
      }

      setCompletedTaskIds(completedSet);
    } catch (err) {
      console.error('Error fetching study planner:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    const isCompleted = completedTaskIds.has(taskId);
    const updated = new Set(completedTaskIds);

    if (isCompleted) {
      updated.delete(taskId);
    } else {
      updated.add(taskId);
    }
    setCompletedTaskIds(updated);

    // Save to local storage
    localStorage.setItem(`smartstudy_comp_${studentId}`, JSON.stringify(Array.from(updated)));

    // Save to Supabase
    try {
      if (isCompleted) {
        await supabase
          .from('task_completions')
          .delete()
          .eq('task_id', taskId)
          .eq('student_id', studentId);
      } else {
        await supabase
          .from('task_completions')
          .insert([{
            task_id: taskId,
            student_id: studentId,
            completed_at: new Date().toISOString()
          }]);
      }
    } catch (e) {
      console.warn('Could not sync completion to cloud, saved locally:', e);
    }
  };

  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => completedTaskIds.has(t.id)).length;
  const completionPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="premium-card p-6 mb-6 text-center text-xs text-[#64748B]">
        Loading today's study plan...
      </div>
    );
  }

  return (
    <div className="premium-card mb-6 border-[#D1FAE5] shadow-lg shadow-emerald-950/5">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#D1FAE5]">
        <div>
          <h3 className="text-base font-black text-[#064E3B] flex items-center gap-1.5">
            <span>📖</span>
            <span>Today's Study Plan</span>
          </h3>
          <p className="text-[11px] font-semibold text-[#059669]">
            Assigned for Class {studentBatch}
          </p>
        </div>
        <span className="text-xs bg-[#ECFDF5] text-[#047857] px-2.5 py-1 rounded-full font-bold border border-[#A7F3D0]">
          {completedCount} / {totalTasks} Done
        </span>
      </div>

      {totalTasks === 0 ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-sm font-bold text-[#064E3B]">No tasks assigned yet today</p>
          <p className="text-xs text-[#64748B] mt-1">Check back when your teacher updates the daily plan!</p>
        </div>
      ) : (
        <div>
          {/* Donut Progress Chart */}
          <div className="bg-[#F0FDF4] rounded-2xl p-4 mb-4 flex items-center justify-around border border-[#D1FAE5]">
            <DonutChart
              percentage={completionPercentage}
              label="Completed"
              size={110}
              strokeWidth={11}
              primaryColor="#059669"
              trackColor="#D1FAE5"
            />
            <div className="text-right">
              <p className="text-xs font-bold text-[#64748B] uppercase">Today's Progress</p>
              <p className="text-2xl font-black text-[#064E3B]">
                {completedCount} <span className="text-sm font-bold text-[#059669]">/ {totalTasks}</span>
              </p>
              <p className="text-xs text-[#059669] font-semibold mt-1">
                {completionPercentage === 100
                  ? '🎉 All Finished!'
                  : `${totalTasks - completedCount} tasks remaining`}
              </p>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-2.5">
            {tasks.map((task) => {
              const done = completedTaskIds.has(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    done
                      ? 'bg-[#ECFDF5] border-[#10B981] text-[#064E3B]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#10B981]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        done
                          ? 'bg-[#059669] text-white shadow-sm'
                          : 'border-2 border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {done && '✓'}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${done ? 'line-through text-[#047857]/70' : 'text-[#0F172A]'}`}>
                        {task.title}
                      </p>
                      <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wide">
                        {task.subject}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    done ? 'bg-[#D1FAE5] text-[#064E3B]' : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                  }`}>
                    {done ? 'Completed' : 'Tap to Complete'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
