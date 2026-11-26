require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const ScheduleItem = require('../models/ScheduleItem');
const StudySession = require('../models/StudySession');

const pad = (n) => String(n).padStart(2, '0');

// дата в формате YYYY-MM-DD со сдвигом в днях от сегодня
function dateStr(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// момент экзамена: через days дней в hour:minute
function examAt(days, hour, minute = 0) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d;
}

async function main() {
    const email = (process.argv[2] || '').trim().toLowerCase();
    const reset = process.argv.includes('--reset');
    if (!email) {
        console.log('Usage: node src/utils/seed.js your@email [--reset]');
        return;
    }

    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email });
    if (!user || !user.verified) {
        console.log(`Verified user not found: ${email}`);
        return;
    }

    const filter = { user: user._id };
    if ((await Subject.exists(filter)) && !reset) {
        console.log('This user already has data. Run again with --reset to replace it.');
        return;
    }
    if (reset) {
        await Promise.all([
            Subject.deleteMany(filter),
            Task.deleteMany(filter),
            Exam.deleteMany(filter),
            ScheduleItem.deleteMany(filter),
            StudySession.deleteMany(filter),
        ]);
    }

    // предметы
    const subjects = await Subject.insertMany([
        { user: user._id, name: 'Web Teknolojileri', color: '#A78BFA' },
        { user: user._id, name: 'Veri Yapıları', color: '#2DD4BF' },
        { user: user._id, name: 'Matematik', color: '#FB923C' },
        { user: user._id, name: 'İngilizce', color: '#F472B6' },
        { user: user._id, name: 'Fizik', color: '#60A5FA' },
    ]);
    const [web, ds, math, eng, phys] = subjects;

    // учебные сессии за последние две недели (25–50 минут, 1–3 в день)
    const sessions = [];
    const totals = {};
    for (let back = 0; back < 14; back++) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const subject = subjects[Math.floor(Math.random() * subjects.length)];
            const seconds = (25 + Math.floor(Math.random() * 6) * 5) * 60;
            sessions.push({ user: user._id, subject: subject._id, date: dateStr(-back), seconds });
            totals[subject.id] = (totals[subject.id] || 0) + seconds;
        }
    }
    await StudySession.insertMany(sessions);
    for (const s of subjects) {
        await Subject.updateOne({ _id: s._id }, { $set: { studiedSeconds: totals[s.id] || 0 } });
    }

    // задачи: [сдвиг в днях, название, предмет, выполнена]
    const taskList = [
        [-1, 'Lab raporunu gönder', web, true],
        [-1, 'Kelime listesini tekrar et', eng, true],
        [0, 'Form doğrulama ödevini bitir', web, false],
        [0, 'Bağlı liste sorularını çöz', ds, false],
        [0, 'Matematik problemleri 1–10', math, true],
        [1, 'Fizik laboratuvarına hazırlan', phys, false],
        [1, 'İngilizce sunum taslağı', eng, false],
        [2, 'Ağaç yapıları konu özeti', ds, false],
        [3, 'Proje sunumunu hazırla', web, false],
        [4, 'Türev alıştırmaları', math, false],
    ];
    await Task.insertMany(
        taskList.map(([offset, title, subject, completed]) => ({
            user: user._id,
            title,
            subject: subject._id,
            date: dateStr(offset),
            completed,
        }))
    );

    // экзамены с чек-листом подготовки
    await Exam.insertMany([
        {
            user: user._id,
            title: 'Web Teknolojileri Vize',
            date: examAt(6, 10, 0),
            color: '#A78BFA',
            subject: web._id,
            subtasks: [
                { title: 'HTML ve CSS tekrarı', done: true },
                { title: 'JavaScript alıştırmaları', done: true },
                { title: 'REST API konusu', done: false, date: dateStr(2) },
                { title: 'Deneme sınavı çöz', done: false, date: dateStr(4) },
            ],
        },
        {
            user: user._id,
            title: 'Matematik Final',
            date: examAt(12, 13, 30),
            color: '#FB923C',
            subject: math._id,
            subtasks: [
                { title: 'Limit ve süreklilik', done: true },
                { title: 'Türev uygulamaları', done: false, date: dateStr(5) },
                { title: 'İntegral soruları', done: false, date: dateStr(8) },
            ],
        },
        {
            user: user._id,
            title: 'İngilizce Sözlü',
            date: examAt(18, 9, 0),
            color: '#F472B6',
            subject: eng._id,
            subtasks: [
                { title: 'Konuşma konularını yaz', done: false },
                { title: 'Kelime kartları', done: false, date: dateStr(10) },
            ],
        },
    ]);

    // недельное расписание: dayOfWeek 1 = понедельник
    const schedule = [
        [1, web, 'Web Teknolojileri', '09:00', '10:50', 'B201'],
        [1, math, 'Matematik', '13:00', '14:50', 'A105'],
        [2, ds, 'Veri Yapıları', '10:00', '11:50', 'Lab 3'],
        [2, eng, 'İngilizce', '14:00', '15:30', 'C12'],
        [3, phys, 'Fizik', '09:00', '10:50', 'A210'],
        [3, web, 'Web Teknolojileri Lab', '13:00', '14:50', 'Lab 1'],
        [4, ds, 'Veri Yapıları', '09:00', '10:50', 'B104'],
        [4, math, 'Matematik', '11:00', '12:50', 'A105'],
        [5, eng, 'İngilizce', '10:00', '11:30', 'C12'],
        [5, phys, 'Fizik Lab', '13:00', '14:50', 'Lab 2'],
    ];
    await ScheduleItem.insertMany(
        schedule.map(([dayOfWeek, subject, title, startTime, endTime, place]) => ({
            user: user._id,
            subject: subject._id,
            title,
            dayOfWeek,
            startTime,
            endTime,
            place,
        }))
    );

    console.log(`Done: demo data added for ${email}`);
}

main()
    .catch((err) => console.error(err))
    .finally(() => mongoose.disconnect());