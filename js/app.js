// 主應用程式邏輯
let selectedCount = 1;
let isDrawn = false;
let drawnCards = [];
let currentReadingId = null; // 當前抽牌紀錄的 ID

// 張數選擇
document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isDrawn) return;
        document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCount = parseInt(btn.dataset.count);
    });
});

// 抽牌按鈕
document.getElementById('drawBtn').addEventListener('click', () => {
    if (isDrawn) {
        resetDraw();
    } else {
        drawCards();
    }
});

// 抽牌功能
function drawCards() {
    const display = document.getElementById('cardsDisplay');
    display.innerHTML = '';
    drawnCards = [];
    
    // 隨機抽取不重複的牌
    const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
    const drawn = shuffled.slice(0, selectedCount);
    
    drawn.forEach(card => {
        const isReversed = Math.random() < 0.5;
        drawnCards.push({ ...card, isReversed });
        
        const wrapper = document.createElement('div');
        wrapper.className = `card-wrapper${isReversed ? ' reversed' : ''}`;
        
        const meaningText = isReversed ? card.reversed : card.upright;
        
        wrapper.innerHTML = `
            <div class="card-container">
                <!-- 底層：牌義 -->
                <div class="card-meaning-layer">
                    <div class="meaning-title">
                        ${isReversed ? '<span class="reversed-tag">逆</span> ' : ''}${card.name}
                    </div>
                    <div class="meaning-keywords-inline">${card.keywords}</div>
                    <div class="meaning-desc">${meaningText}</div>
                </div>
                <!-- 上層：牌卡圖片 -->
                <div class="card-image-layer">
                    <div class="card-frame">
                        <div class="card-inner">
                            <img class="card-img" src="./78張牌圖檔/${card.file}.jpg" alt="${card.name}">
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-name">
                ${isReversed ? '<span class="reversed-tag">逆</span> ' : ''}${card.name}
            </div>
        `;
        
        // 觸控裝置支援 - 點擊切換牌卡顯示
        const container = wrapper.querySelector('.card-container');
        let isTouchDevice = false;
        
        // 偵測觸控事件
        container.addEventListener('touchend', (e) => {
            isTouchDevice = true;
            e.preventDefault(); // 防止觸發 click 事件
            container.classList.toggle('touched');
        });
        
        // 桌面裝置的點擊（如果不是觸控裝置）
        container.addEventListener('click', (e) => {
            if (!isTouchDevice) {
                // 桌面裝置不需要點擊切換，用 hover 即可
            }
        });
        
        display.appendChild(wrapper);
    });
    
    // 顯示筆記區（如果已登入）
    if (currentUser && isSupabaseConfigured()) {
        document.getElementById('noteSection').style.display = 'block';
        document.getElementById('noteInput').value = '';
        document.getElementById('noteCharCount').textContent = '0';
        document.getElementById('noteSaveBtn').textContent = '💾 儲存筆記';
        document.getElementById('noteSaveBtn').classList.remove('saved');
    }
    
    // 更新按鈕狀態
    isDrawn = true;
    const drawBtn = document.getElementById('drawBtn');
    drawBtn.textContent = '重新抽牌';
    drawBtn.classList.add('reset-mode');
    
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.add('disabled');
    });
    
    // 如果已登入，儲存抽牌紀錄
    if (currentUser && isSupabaseConfigured()) {
        saveReading(drawnCards);
    }
}

// 重置抽牌
function resetDraw() {
    const display = document.getElementById('cardsDisplay');
    const hoverHint = document.getElementById('hoverHint');
    display.innerHTML = '';
    hoverHint.style.display = 'none';
    document.getElementById('noteSection').style.display = 'none';
    drawnCards = [];
    currentReadingId = null;
    
    isDrawn = false;
    const drawBtn = document.getElementById('drawBtn');
    drawBtn.textContent = '抽 牌';
    drawBtn.classList.remove('reset-mode');
    
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('disabled');
    });
}

// 儲存抽牌紀錄到 Supabase
async function saveReading(cards) {
    if (!currentUser || !isSupabaseConfigured()) return;
    
    const reading = {
        user_id: currentUser.id,
        cards: cards.map(c => ({
            name: c.name,
            file: c.file,
            isReversed: c.isReversed
        })),
        note: '',
        created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
        .from('readings')
        .insert([reading])
        .select();
    
    if (error) {
        console.error('儲存抽牌紀錄失敗:', error);
    } else {
        console.log('抽牌紀錄已儲存');
        if (data && data.length > 0) {
            currentReadingId = data[0].id;
        }
    }
}

// 儲存筆記
async function saveNote() {
    if (!currentReadingId || !currentUser) {
        alert('請先抽牌');
        return;
    }
    
    const noteInput = document.getElementById('noteInput');
    const note = noteInput.value.trim();
    
    const { error } = await supabase
        .from('readings')
        .update({ note: note })
        .eq('id', currentReadingId);
    
    if (error) {
        console.error('儲存筆記失敗:', error);
        alert('儲存失敗，請重試');
    } else {
        const btn = document.getElementById('noteSaveBtn');
        btn.textContent = '✓ 已儲存';
        btn.classList.add('saved');
        setTimeout(() => {
            btn.textContent = '💾 儲存筆記';
            btn.classList.remove('saved');
        }, 2000);
    }
}

// 更新筆記（在歷史紀錄中編輯）
async function updateNote(readingId, note) {
    const { error } = await supabase
        .from('readings')
        .update({ note: note })
        .eq('id', readingId);
    
    if (error) {
        console.error('更新筆記失敗:', error);
        alert('更新失敗，請重試');
        return false;
    }
    
    // 更新本地資料
    const reading = calendarData.find(r => r.id === readingId);
    if (reading) {
        reading.note = note;
    }
    
    return true;
}

// 監聽筆記輸入字數
document.getElementById('noteInput')?.addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('noteCharCount').textContent = count;
});

// ===== 日曆功能 =====
let calendarData = [];
let currentCalendarDate = new Date();
let selectedDate = null;

// 顯示日曆
async function showCalendar() {
    if (!currentUser || !isSupabaseConfigured()) {
        alert('請先登入');
        return;
    }
    
    document.getElementById('calendarModal').style.display = 'flex';
    await loadCalendarData();
    renderCalendar();
}

// 隱藏日曆
function hideCalendar() {
    document.getElementById('calendarModal').style.display = 'none';
    selectedDate = null;
}

// 載入日曆資料
async function loadCalendarData() {
    const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('載入日曆資料失敗:', error);
        calendarData = [];
        return;
    }
    
    calendarData = data || [];
    updateStats();
}

// 更新統計
function updateStats() {
    // 總抽牌次數
    document.getElementById('statTotalReadings').textContent = calendarData.length;
    
    // 抽牌天數（不重複的日期）
    const uniqueDays = new Set(calendarData.map(r => {
        const d = new Date(r.created_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }));
    document.getElementById('statTotalDays').textContent = uniqueDays.size;
    
    // 計算連續天數
    const streak = calculateStreak();
    document.getElementById('statStreak').textContent = streak;
}

// 計算連續天數
function calculateStreak() {
    if (calendarData.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 取得所有有抽牌的日期（去重）
    const datesWithReadings = [...new Set(calendarData.map(r => {
        const d = new Date(r.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }))].sort((a, b) => b - a);
    
    if (datesWithReadings.length === 0) return 0;
    
    // 檢查今天或昨天是否有抽牌
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const latestDate = new Date(datesWithReadings[0]);
    if (latestDate < yesterday) return 0;
    
    // 計算連續天數
    let streak = 1;
    for (let i = 1; i < datesWithReadings.length; i++) {
        const current = new Date(datesWithReadings[i - 1]);
        const prev = new Date(datesWithReadings[i]);
        const diffDays = (current - prev) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

// 渲染日曆
function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // 更新月份標題
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    document.getElementById('calendarMonth').textContent = `${year}年 ${monthNames[month]}`;
    
    // 取得當月資訊
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // 取得當月有抽牌的日期
    const readingDates = new Set();
    calendarData.forEach(r => {
        const d = new Date(r.created_at);
        if (d.getFullYear() === year && d.getMonth() === month) {
            readingDates.add(d.getDate());
        }
    });
    
    // 今天
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    // 生成日曆格子
    let html = '';
    
    // 上個月的日期
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${prevMonthLastDay - i}</div>`;
    }
    
    // 當月日期
    for (let day = 1; day <= daysInMonth; day++) {
        const classes = ['calendar-day'];
        if (isCurrentMonth && day === today.getDate()) classes.push('today');
        if (readingDates.has(day)) classes.push('has-reading');
        if (selectedDate && selectedDate.year === year && selectedDate.month === month && selectedDate.day === day) {
            classes.push('selected');
        }
        
        html += `<div class="${classes.join(' ')}" onclick="selectDate(${year}, ${month}, ${day})">${day}</div>`;
    }
    
    // 下個月的日期
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }
    
    document.getElementById('calendarDays').innerHTML = html;
}

// 選擇日期
function selectDate(year, month, day) {
    selectedDate = { year, month, day };
    renderCalendar();
    showDayReadings(year, month, day);
}

// 顯示當日抽牌紀錄
function showDayReadings(year, month, day) {
    const dayReadings = calendarData.filter(r => {
        const d = new Date(r.created_at);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    
    const container = document.getElementById('dayReadings');
    const title = document.getElementById('dayReadingsTitle');
    const list = document.getElementById('dayReadingsList');
    
    if (dayReadings.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    title.textContent = `${month + 1}/${day} 的抽牌紀錄 (${dayReadings.length}次)`;
    
    list.innerHTML = dayReadings.map(reading => {
        const time = new Date(reading.created_at).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const cardsHtml = reading.cards.map(card => 
            `<div class="history-card${card.isReversed ? ' reversed' : ''}">
                <img class="history-card-img" src="./78張牌圖檔/${card.file}.jpg" alt="${card.name}">
                <span class="history-card-name">${card.isReversed ? '逆 ' : ''}${card.name}</span>
            </div>`
        ).join('');
        
        const noteHtml = reading.note 
            ? `<div class="day-reading-note" id="note-display-${reading.id}">
                    <span class="day-reading-note-text">${escapeHtml(reading.note)}</span>
                    <button class="day-reading-note-edit" onclick="toggleEditNote('${reading.id}')">✏️</button>
               </div>
               <div class="edit-note-container" id="note-edit-${reading.id}" style="display: none;">
                    <textarea id="note-textarea-${reading.id}" maxlength="50">${escapeHtml(reading.note)}</textarea>
                    <div class="edit-note-actions">
                        <button class="edit-note-cancel" onclick="cancelEditNote('${reading.id}')">取消</button>
                        <button class="edit-note-save" onclick="saveEditNote('${reading.id}')">儲存</button>
                    </div>
               </div>`
            : `<div class="day-reading-note note-empty" id="note-display-${reading.id}">
                    <span class="day-reading-note-text">點擊新增筆記...</span>
                    <button class="day-reading-note-edit" onclick="toggleEditNote('${reading.id}')">✏️</button>
               </div>
               <div class="edit-note-container" id="note-edit-${reading.id}" style="display: none;">
                    <textarea id="note-textarea-${reading.id}" maxlength="50" placeholder="寫下你的感想..."></textarea>
                    <div class="edit-note-actions">
                        <button class="edit-note-cancel" onclick="cancelEditNote('${reading.id}')">取消</button>
                        <button class="edit-note-save" onclick="saveEditNote('${reading.id}')">儲存</button>
                    </div>
               </div>`;
        
        return `
            <div class="day-reading-item" data-reading-id="${reading.id}">
                <div class="day-reading-time">🕐 ${time}</div>
                <div class="day-reading-cards">${cardsHtml}</div>
                ${noteHtml}
            </div>
        `;
    }).join('');
}

// 上個月
function prevMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    selectedDate = null;
    document.getElementById('dayReadings').style.display = 'none';
    renderCalendar();
}

// 下個月
function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    selectedDate = null;
    document.getElementById('dayReadings').style.display = 'none';
    renderCalendar();
}

// ===== 筆記編輯功能 =====

// HTML 轉義
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 切換編輯模式
function toggleEditNote(readingId) {
    const display = document.getElementById(`note-display-${readingId}`);
    const edit = document.getElementById(`note-edit-${readingId}`);
    
    display.style.display = 'none';
    edit.style.display = 'block';
    
    const textarea = document.getElementById(`note-textarea-${readingId}`);
    textarea.focus();
}

// 取消編輯
function cancelEditNote(readingId) {
    const display = document.getElementById(`note-display-${readingId}`);
    const edit = document.getElementById(`note-edit-${readingId}`);
    
    display.style.display = 'flex';
    edit.style.display = 'none';
    
    // 還原原本的值
    const reading = calendarData.find(r => r.id === readingId);
    if (reading) {
        document.getElementById(`note-textarea-${readingId}`).value = reading.note || '';
    }
}

// 儲存編輯的筆記
async function saveEditNote(readingId) {
    const textarea = document.getElementById(`note-textarea-${readingId}`);
    const note = textarea.value.trim();
    
    const success = await updateNote(readingId, note);
    
    if (success) {
        const display = document.getElementById(`note-display-${readingId}`);
        const edit = document.getElementById(`note-edit-${readingId}`);
        const noteText = display.querySelector('.day-reading-note-text');
        
        if (note) {
            noteText.textContent = note;
            display.classList.remove('note-empty');
        } else {
            noteText.textContent = '點擊新增筆記...';
            display.classList.add('note-empty');
        }
        
        display.style.display = 'flex';
        edit.style.display = 'none';
    }
}

// 點擊彈窗外部關閉
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});
