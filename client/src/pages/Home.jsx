import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import Greeting from '../components/Greeting';
import QuickCards from '../components/QuickCards';
import TimerCard from '../components/TimerCard';
import TodayTasks from '../components/TodayTasks';
import { todayStr } from '../utils/date';

export default function Home() {
    const [subjects, setSubjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [exams, setExams] = useState([]);
    const [name, setName] = useState(() => localStorage.getItem('odaklan_name') || '');

    useEffect(() => {
        Promise.all([api.getSubjects(), api.getTasks(todayStr()), api.getExams()])
            .then(([s, t, e]) => {
                setSubjects(s);
                setTasks(t);
                setExams(e);
            })
            .catch(() => { });
    }, []);
    useEffect(() => {
        api.getProfile()
            .then((p) => {
                setName(p.name || '');
                localStorage.setItem('odaklan_name', p.name || '');
            })
            .catch(() => { });
    }, []);

    // пункты чек-листов экзаменов, назначенные на сегодня, показываем рядом с обычными задачами
    const examTasks = useMemo(() => {
        const today = todayStr();
        return exams.flatMap((exam) =>
            (exam.subtasks ?? [])
                .filter((s) => s.date === today)
                .map((s) => ({
                    _id: s._id,
                    title: s.title,
                    completed: s.done,
                    examId: exam._id,
                    color: exam.color,
                    tag: exam.title,
                }))
        );
    }, [exams]);
    const todayList = useMemo(() => [...tasks, ...examTasks], [tasks, examTasks]);

    async function toggleTask(id) {
        try {
            const examTask = examTasks.find((t) => t._id === id);
            if (examTask) {
                const updated = await api.toggleSubtask(examTask.examId, id);
                setExams((list) => list.map((e) => (e._id === updated._id ? updated : e)));
                return;
            }
            const updated = await api.toggleTask(id);
            setTasks((list) => list.map((t) => (t._id === updated._id ? updated : t)));
        } catch {
            // ошибку покажем позже, когда сделаем общие уведомления
        }
    }

    return (
        <>
            <Greeting name={name} />
            <div className="home-grid">
                <TimerCard subjects={subjects} onSubjectsChange={setSubjects} />
                <div className="home-side">
                    <TodayTasks tasks={todayList} subjects={subjects} onToggle={toggleTask} />
                    <QuickCards exams={exams} />
                </div>
            </div>
        </>
    );
}