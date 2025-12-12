// 主應用程式邏輯
let selectedCount = 1;
let isDrawn = false;
let drawnCards = [];
let currentReadingId = null; // 當前抽牌紀錄的 ID
let currentAIInterpretation = null; // 當前 AI 解牌結果
let currentReadingMode = 'question'; // 解牌模式：'question' 問問題 / 'advice' 尋求建議
let currentDeckMode = 'all'; // 抽牌範圍：'all' 全抽 / 'major' 大牌 / 'minor40' 小牌40張 / 'minor56' 小牌56張

// 牌組定義
const MAJOR_ARCANA = tarotCards.slice(0, 22); // 大牌 22 張
const MINOR_ARCANA = tarotCards.slice(22); // 小牌 56 張
// 小牌 40 張（只有數字牌 1-10，不含宮廷牌）
const MINOR_40 = MINOR_ARCANA.filter(card => {
    // 排除宮廷牌（侍衛、騎士、皇后、國王）
    return !card.name.includes('侍衛') && 
           !card.name.includes('騎士') && 
           !card.name.includes('皇后') && 
           !card.name.includes('國王');
});

// 根據模式取得可抽的牌組
function getAvailableDeck() {
    switch (currentDeckMode) {
        case 'major': return MAJOR_ARCANA;
        case 'minor40': return MINOR_40;
        case 'minor56': return MINOR_ARCANA;
        default: return tarotCards;
    }
}

// 設定抽牌範圍
function setDeckMode(mode) {
    if (isDrawn) return; // 已抽牌時不能切換
    currentDeckMode = mode;
    document.querySelectorAll('.deck-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.deck === mode);
    });
}

// API 端點（本地開發用 localhost，部署後用相對路徑）
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : '';

// 設定解牌模式
function setReadingMode(mode) {
    currentReadingMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
}

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
    const hoverHint = document.getElementById('hoverHint');
    display.innerHTML = '';
    drawnCards = [];
    
    // 根據抽牌範圍取得可用牌組
    const availableDeck = getAvailableDeck();
    
    // 隨機抽取不重複的牌
    const shuffled = [...availableDeck].sort(() => Math.random() - 0.5);
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
        
        // 觸控裝置支援
        const container = wrapper.querySelector('.card-container');
        container.addEventListener('touchstart', (e) => {
            container.classList.toggle('touched');
        });
        
        display.appendChild(wrapper);
    });
    
    // 顯示提示
    hoverHint.style.display = 'block';
    
    // 顯示 AI 解牌按鈕
    document.getElementById('aiSection').style.display = 'block';
    document.getElementById('aiResult').style.display = 'none';
    document.getElementById('aiBtn').disabled = false;
    document.getElementById('aiBtn').classList.remove('loading');
    document.getElementById('aiBtn').innerHTML = '🔮 AI 解牌';
    currentAIInterpretation = null;
    
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
        console.log('✅ 已登入，準備儲存抽牌紀錄...');
        saveReading(drawnCards);
    } else {
        console.log('⚠️ 未登入或 Supabase 未設定，不儲存紀錄');
        console.log('currentUser:', currentUser);
        console.log('isSupabaseConfigured:', isSupabaseConfigured());
    }
}

// 重置抽牌
function resetDraw() {
    const display = document.getElementById('cardsDisplay');
    const hoverHint = document.getElementById('hoverHint');
    display.innerHTML = '';
    hoverHint.style.display = 'none';
    document.getElementById('noteSection').style.display = 'none';
    document.getElementById('aiSection').style.display = 'none';
    document.getElementById('aiResult').style.display = 'none';
    drawnCards = [];
    currentReadingId = null;
    currentAIInterpretation = null;
    
    isDrawn = false;
    const drawBtn = document.getElementById('drawBtn');
    drawBtn.textContent = '抽 牌';
    drawBtn.classList.remove('reset-mode');
    
    document.querySelectorAll('.count-btn').forEach(btn => {
        btn.classList.remove('disabled');
    });
}

// 儲存抽牌紀錄到 Supabase
async function saveReading(cards, aiInterpretation = null) {
    if (!currentUser || !isSupabaseConfigured()) {
        console.log('❌ saveReading: 條件不符，無法儲存');
        return;
    }
    
    // 儲存時去除 AI 解牌的前後空白
    const cleanedAI = aiInterpretation ? aiInterpretation.trim() : null;
    
    const reading = {
        user_id: currentUser.id,
        cards: cards.map(c => ({
            name: c.name,
            file: c.file,
            isReversed: c.isReversed
        })),
        note: '',
        ai_interpretation: cleanedAI,
        reading_mode: currentReadingMode,
        created_at: new Date().toISOString()
    };
    
    console.log('📝 準備儲存紀錄:', reading);
    
    const { data, error } = await supabase
        .from('readings')
        .insert([reading])
        .select();
    
    if (error) {
        console.error('❌ 儲存抽牌紀錄失敗:', error);
        console.error('錯誤詳情:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ 抽牌紀錄已儲存:', data);
        if (data && data.length > 0) {
            currentReadingId = data[0].id;
            console.log('📌 currentReadingId:', currentReadingId);
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

// ===== AI 解牌功能 =====

// 請求 AI 解牌
async function requestAIReading() {
    if (drawnCards.length === 0) {
        alert('請先抽牌');
        return;
    }
    
    // 檢查是否可以使用 AI 解牌
    if (!canUseAIReading()) {
        const goToShop = confirm('免費次數已用完，金幣不足！\n\n是否前往商店購買金幣？');
        if (goToShop) {
            showShop();
        }
        return;
    }
    
    // 如果需要消耗金幣，先確認
    if (freeAIReadings <= 0) {
        const confirmUse = confirm(`將消耗 ${AI_READING_COST} 金幣進行 AI 解牌\n\n目前餘額：${userCoins} 金幣\n\n確定要繼續嗎？`);
        if (!confirmUse) return;
    }
    
    const aiBtn = document.getElementById('aiBtn');
    const aiResult = document.getElementById('aiResult');
    const aiResultContent = document.getElementById('aiResultContent');
    
    // 顯示載入狀態
    aiBtn.disabled = true;
    aiBtn.classList.add('loading');
    aiBtn.innerHTML = '🔮 解讀中...';
    aiResult.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/api/ai-reading`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cards: drawnCards.map(c => ({
                    name: c.name,
                    isReversed: c.isReversed
                })),
                mode: currentReadingMode // 傳送解牌模式
            })
        });
        
        if (!response.ok) {
            throw new Error('AI 服務暫時無法使用');
        }
        
        const data = await response.json();
        
        if (data.success && data.interpretation) {
            // 去除前後空白和每行開頭空白
            const interpretation = data.interpretation.trim().replace(/^[ \t]+/gm, '');
            currentAIInterpretation = interpretation;
            
            // 消耗免費次數或金幣
            consumeAIReading();
            
            // 顯示結果
            aiResultContent.textContent = interpretation;
            aiResult.style.display = 'block';
            aiBtn.innerHTML = '✓ 已解牌';
            
            // 如果已登入，更新紀錄加入 AI 解牌結果
            if (currentUser && isSupabaseConfigured() && currentReadingId) {
                await updateReadingWithAI(currentReadingId, interpretation);
            }
        } else {
            throw new Error(data.error || '解牌失敗');
        }
        
    } catch (error) {
        console.error('AI 解牌錯誤:', error);
        alert(error.message || 'AI 解牌失敗，請稍後再試');
        aiBtn.disabled = false;
        aiBtn.classList.remove('loading');
        aiBtn.innerHTML = '🔮 AI 解牌';
    }
}

// 更新紀錄加入 AI 解牌結果
async function updateReadingWithAI(readingId, interpretation) {
    // 儲存時去除前後空白
    const cleanedAI = interpretation ? interpretation.trim() : null;
    
    const { error } = await supabase
        .from('readings')
        .update({ ai_interpretation: cleanedAI })
        .eq('id', readingId);
    
    if (error) {
        console.error('更新 AI 解牌紀錄失敗:', error);
    } else {
        console.log('AI 解牌結果已儲存');
    }
}

// 隱藏 AI 解牌結果
function hideAIResult() {
    document.getElementById('aiResult').style.display = 'none';
}

// 切換歷史紀錄中的 AI 解牌顯示
function toggleAIDisplay(readingId) {
    const content = document.getElementById(`ai-content-${readingId}`);
    const icon = document.getElementById(`ai-toggle-${readingId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

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
        
        // AI 解牌結果（去除前後空白和每行開頭空白）
        const aiText = reading.ai_interpretation 
            ? reading.ai_interpretation.trim().replace(/^[ \t]+/gm, '') 
            : '';
        const aiHtml = aiText 
            ? `<div class="day-reading-ai"><div class="day-reading-ai-header" onclick="toggleAIDisplay('${reading.id}')"><span>🔮 AI 解牌結果</span><span class="ai-toggle-icon" id="ai-toggle-${reading.id}">▼</span></div><div class="day-reading-ai-content" id="ai-content-${reading.id}" style="display: none;">${escapeHtml(aiText)}</div></div>`
            : '';
        
        return `
            <div class="day-reading-item" data-reading-id="${reading.id}">
                <div class="day-reading-time">🕐 ${time}</div>
                <div class="day-reading-cards">${cardsHtml}</div>
                ${aiHtml}
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

// ========== 商店功能 ==========

// 使用者金幣餘額（暫時用本地變數，之後會從資料庫讀取）
let userCoins = 0;
let isFirstPurchase = true;

// AI 解牌免費次數（每月重置）
let freeAIReadings = 5;
const AI_READING_COST = 30; // 每次 AI 解牌消耗金幣

// 更新 AI 解牌使用資訊顯示
function updateAIUsageDisplay() {
    const freeCountEl = document.getElementById('freeCount');
    const coinCostEl = document.getElementById('coinCost');
    
    if (!freeCountEl || !coinCostEl) return;
    
    if (freeAIReadings > 0) {
        freeCountEl.textContent = `免費 ${freeAIReadings} 次`;
        freeCountEl.style.display = 'inline';
        coinCostEl.style.display = 'none';
    } else {
        freeCountEl.style.display = 'none';
        // 使用五角金幣圖示
        coinCostEl.innerHTML = `${AI_READING_COST} ${getPentacleCoin('1em')}/次`;
        coinCostEl.style.display = 'inline';
    }
}

// 消耗 AI 解牌次數或金幣
function consumeAIReading() {
    if (freeAIReadings > 0) {
        freeAIReadings--;
        updateAIUsageDisplay();
        return true;
    } else if (userCoins >= AI_READING_COST) {
        userCoins -= AI_READING_COST;
        updateCoinBalanceDisplay();
        return true;
    } else {
        return false;
    }
}

// 檢查是否可以使用 AI 解牌
function canUseAIReading() {
    return freeAIReadings > 0 || userCoins >= AI_READING_COST;
}

// 金幣包資料
const coinPackages = {
    trial: { name: '體驗包', price: 50, coins: 52, bonus: 4, firstBonus: 68 },
    starter: { name: '入門包', price: 100, coins: 105, bonus: 5, firstBonus: 137 },
    value: { name: '小資包', price: 300, coins: 330, bonus: 10, firstBonus: 429 },
    super: { name: '超值包', price: 500, coins: 575, bonus: 15, firstBonus: 748 },
    premium: { name: '豪華包', price: 1000, coins: 1200, bonus: 20, firstBonus: 1560 },
    ultimate: { name: '尊爵包', price: 3000, coins: 3900, bonus: 30, firstBonus: 5070 }
};

// 訂閱方案資料
const subscriptionPlans = {
    basic: { name: '入門會員', price: 79, monthlyCoins: 50 },
    standard: { name: '標準會員', price: 149, monthlyCoins: 100 },
    pro: { name: '專業會員', price: 299, monthlyCoins: 200 }
};

// 顯示商店
function showShop() {
    if (!currentUser) {
        alert('請先登入才能使用商店功能');
        showLoginModal();
        return;
    }
    
    document.getElementById('shopModal').style.display = 'flex';
    updateShopDisplay();
}

// 隱藏商店
function hideShop() {
    document.getElementById('shopModal').style.display = 'none';
}

// 更新商店顯示
function updateShopDisplay() {
    // 更新金幣餘額
    document.getElementById('shopCoinBalance').textContent = userCoins.toLocaleString();
    document.getElementById('coinBalance').textContent = userCoins.toLocaleString();
    
    // 更新首儲優惠顯示
    const firstPurchaseBanner = document.getElementById('firstPurchaseBanner');
    if (firstPurchaseBanner) {
        firstPurchaseBanner.style.display = isFirstPurchase ? 'flex' : 'none';
    }
    
    // 更新首購金幣顯示
    document.querySelectorAll('.package-first-bonus').forEach(el => {
        el.style.display = isFirstPurchase ? 'block' : 'none';
    });
    
    // 更新新手任務狀態（之後會從資料庫讀取）
    updateWelcomeBonusTasks();
}

// 更新新手任務狀態
function updateWelcomeBonusTasks() {
    // 這裡之後會從資料庫讀取任務完成狀態
    const taskRegister = document.getElementById('taskRegister');
    if (taskRegister && currentUser) {
        taskRegister.classList.add('completed');
        taskRegister.querySelector('.task-check').textContent = '✓';
    }
}

// 選擇金幣包
function selectPackage(packageId) {
    const pkg = coinPackages[packageId];
    if (!pkg) return;
    
    const coinsToGet = isFirstPurchase ? pkg.firstBonus : pkg.coins;
    const message = isFirstPurchase 
        ? `確定要購買「${pkg.name}」嗎？\n\n價格：NT$ ${pkg.price}\n獲得：${coinsToGet} ⭐（含首購加贈 30%）`
        : `確定要購買「${pkg.name}」嗎？\n\n價格：NT$ ${pkg.price}\n獲得：${pkg.coins} ⭐（+${pkg.bonus}% 增量）`;
    
    if (confirm(message)) {
        // 這裡之後會接入實際的金流系統
        alert('🚧 金流系統建置中\n\n目前尚未開放購買，敬請期待！');
        // processPurchase(packageId);
    }
}

// 選擇訂閱方案
function selectSubscription(planId) {
    const plan = subscriptionPlans[planId];
    if (!plan) return;
    
    const message = `確定要訂閱「${plan.name}」嗎？\n\n月費：NT$ ${plan.price}/月\n每月贈送：${plan.monthlyCoins} ⭐`;
    
    if (confirm(message)) {
        // 這裡之後會接入實際的訂閱系統
        alert('🚧 訂閱系統建置中\n\n目前尚未開放訂閱，敬請期待！');
        // processSubscription(planId);
    }
}

// 處理購買（之後實作）
async function processPurchase(packageId) {
    const pkg = coinPackages[packageId];
    const coinsToAdd = isFirstPurchase ? pkg.firstBonus : pkg.coins;
    
    // TODO: 接入金流 API
    // TODO: 更新資料庫金幣餘額
    // TODO: 記錄交易紀錄
    
    userCoins += coinsToAdd;
    if (isFirstPurchase) {
        isFirstPurchase = false;
    }
    
    updateShopDisplay();
    alert(`購買成功！獲得 ${coinsToAdd} ⭐`);
}

// 更新頂部金幣餘額顯示
function updateCoinBalanceDisplay() {
    const coinBalanceEl = document.getElementById('coinBalance');
    if (coinBalanceEl) {
        coinBalanceEl.textContent = userCoins.toLocaleString();
    }
}

// 載入使用者金幣餘額（之後從資料庫讀取）
async function loadUserCoins() {
    if (!currentUser || !isSupabaseConfigured()) return;
    
    // TODO: 從資料庫讀取金幣餘額和免費次數
    // const { data, error } = await supabase
    //     .from('user_coins')
    //     .select('balance, is_first_purchase, free_ai_readings')
    //     .eq('user_id', currentUser.id)
    //     .single();
    
    // 暫時使用預設值
    userCoins = 100; // 新手禮包
    isFirstPurchase = true;
    freeAIReadings = 5; // 每月免費 5 次
    
    updateCoinBalanceDisplay();
    updateAIUsageDisplay();
}

// ========== 收費說明功能 ==========

// 顯示收費說明
function showPricingInfo() {
    document.getElementById('pricingModal').style.display = 'flex';
}

// 隱藏收費說明
function hidePricingInfo() {
    document.getElementById('pricingModal').style.display = 'none';
}

// ========== 五角金幣圖示 ==========

// 五角金幣 SVG 圖示（雙圓圈+星星）
const PENTACLE_SVG = `<svg class="pentacle-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="7" stroke-width="1"></circle><polygon points="12,5 13.5,9.5 18,10 14.5,13 15.5,17.5 12,15 8.5,17.5 9.5,13 6,10 10.5,9.5" fill="currentColor" stroke="none"></polygon></svg>`;

// 取得五角金幣 HTML
function getPentacleCoin(size = '1em') {
    return `<span class="pentacle-coin" style="width:${size};height:${size}">${PENTACLE_SVG}</span>`;
}

// 頁面載入後替換所有 ⭐ 為五角金幣圖示
function replacePentacleIcons() {
    // 需要替換的容器選擇器
    const containers = [
        '.shop-balance',
        '.welcome-bonus',
        '.coin-packages',
        '.subscription-section',
        '.shop-info',
        '.pricing-section',
        '.ai-usage-info'
    ];
    
    containers.forEach(selector => {
        document.querySelectorAll(selector).forEach(container => {
            // 遍歷所有文字節點
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.includes('⭐')) {
                    textNodes.push(node);
                }
            }
            
            textNodes.forEach(textNode => {
                const span = document.createElement('span');
                span.innerHTML = textNode.textContent.replace(/⭐/g, getPentacleCoin('1em'));
                textNode.parentNode.replaceChild(span, textNode);
            });
        });
    });
}

// 頁面載入完成後執行替換
document.addEventListener('DOMContentLoaded', () => {
    // 延遲執行以確保所有元素都已載入
    setTimeout(replacePentacleIcons, 100);
});
