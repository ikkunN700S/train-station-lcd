const CACHE_LIFETIME = 60 * 60 * 1000; // 1時間

// 画面ごとの時刻表データを保持するオブジェクト
const boardData = {
    1: [], // 画面1のデータ
    2: [], // 画面2のデータ
    3: []  // 画面3のデータ
};

const typeDataMap = {
    "local": { text: "普　通", className: "type-local" },
    "semirapid": { text: "区間快速", className: "type-semirapid" },
    "rapid": { text: "快　速", className: "type-rapid" },
    "newrapid": { text: "新快速", className: "type-newrapid" },
    "specialrapid": { text: "特別快速", className: "type-specialrapid" }
};

// --- 時刻計算ロジック ---
function timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    // 0時〜3時は翌日扱い(+24h)
    if (hours >= 0 && hours <= 3) hours += 24;
    return hours * 60 + minutes;
}

// --- 長体処理（画面IDを指定できるように拡張） ---
function adjustDestinationWidth(boardId, rowNumber) {
    const container = document.querySelector(`#board-${boardId} .board-row:nth-child(${rowNumber + 1}) .col-dest`);
    const textElement = document.getElementById(`disp-dest-${boardId}-${rowNumber}`);
    if (!textElement || !container) return;
    
    textElement.style.transform = 'scaleX(1)';
    const containerWidth = container.clientWidth - 20; 
    const textWidth = textElement.scrollWidth;

    if (textWidth > containerWidth) {
        const ratio = containerWidth / textWidth;
        textElement.style.transform = `scaleX(${ratio})`;
    }
}

// --- データ取得ロジック（特定の画面に対して読み込む） ---
async function loadTimetableForBoard(boardId, sheetKey) {
    // セレクトボックスの要素と、タイトルの要素を取得
    const selectEl = document.getElementById(`select-board-${boardId}`);
    const titleEl = document.getElementById(`board-title-${boardId}`);
    
    if (selectEl && titleEl) {
        // 現在選択されている <option> のテキストを取得してタイトルに反映
        const selectedText = selectEl.options[selectEl.selectedIndex].text;
        titleEl.textContent = selectedText;
    }

    const gid = sheetIds[sheetKey];
    if (!gid) return;

    const cacheKey = `timetable_${sheetKey}`;
    const timeKey = `timetable_${sheetKey}_time`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(timeKey);

    // キャッシュ利用
    if (cachedData && cachedTime) {
        const timeDiff = new Date().getTime() - parseInt(cachedTime, 10);
        if (timeDiff < CACHE_LIFETIME) {
            boardData[boardId] = JSON.parse(cachedData);
            updateBoardDisplay(boardId);
            return;
        } else {
            // 期限切れデータは破棄する
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timeKey);
            console.log(`[Board ${boardId}] キャッシュの有効期限が切れたため破棄しました。再取得します。`);
        }
    }

    // ネットワーク取得
    try {
        const response = await fetch(CSV_BASE_URL + gid);
        if (!response.ok) throw new Error("HTTP Status " + response.status);
        
        const csvText = await response.text();
        const rows = csvText.trim().split('\n');
        
        const parsedData = rows.slice(1).filter(row => row.trim() !== '').map(row => {
            const cols = row.split(',');
            return {
                departure: cols[0], type: cols[1], dest: cols[2], cars: cols[3], pos: cols[4]
            };
        });

        localStorage.setItem(cacheKey, JSON.stringify(parsedData));
        localStorage.setItem(timeKey, new Date().getTime().toString());

        boardData[boardId] = parsedData;
        updateBoardDisplay(boardId);

    } catch (error) {
        console.warn(`[Board ${boardId}] データ取得失敗`, error);
        if (cachedData) {
            boardData[boardId] = JSON.parse(cachedData);
            updateBoardDisplay(boardId);
        }
    }
}

// --- 画面更新ロジック ---
function updateBoardDisplay(boardId) {
    const timetable = boardData[boardId];
    if (!timetable || timetable.length === 0) return;

    const now = new Date();
    let currentHours = now.getHours();
    if (currentHours >= 0 && currentHours <= 3) currentHours += 24;
    const currentMinutes = currentHours * 60 + now.getMinutes();

    const upcomingTrains = timetable.filter(train => timeToMinutes(train.departure) >= currentMinutes);

    for (let row = 1; row <= 2; row++) {
        const train = upcomingTrains[row - 1];
        const timeEl = document.getElementById(`disp-time-${boardId}-${row}`);
        const destEl = document.getElementById(`disp-dest-${boardId}-${row}`);
        const carsEl = document.getElementById(`disp-cars-${boardId}-${row}`);
        const posEl = document.getElementById(`disp-pos-${boardId}-${row}`);
        const typeEl = document.getElementById(`disp-type-${boardId}-${row}`);

        if (train) {
            timeEl.textContent = train.departure;
            destEl.textContent = train.dest;
            carsEl.textContent = train.cars || "";
            posEl.textContent = train.pos || "";
            
            const tData = typeDataMap[train.type];
            if (tData) {
                typeEl.textContent = tData.text;
                typeEl.className = 'type-box ' + tData.className;
            }
            adjustDestinationWidth(boardId, row);
        } else {
            timeEl.textContent = "";
            destEl.textContent = "";
            carsEl.textContent = "";
            posEl.textContent = "";
            typeEl.textContent = "";
            typeEl.className = 'type-box'; 
        }
    }
}

// 全画面の時間を進める定期処理
function tickAllBoards() {
    updateBoardDisplay(1);
    updateBoardDisplay(2);
    updateBoardDisplay(3);
}

// --- 保存機能と初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    initSelectOptions();
    
    const select1 = document.getElementById('select-board-1');
    const select2 = document.getElementById('select-board-2');
    const select3 = document.getElementById('select-board-3');

    const saveBtn = document.getElementById('btn-save');
    const saveMsg = document.getElementById('save-message');

    // 1. LocalStorageから前回の選択状態を復元（なければ初期値）
    const savedKey1 = localStorage.getItem('saved_board_1') || 'tokaido_kanayama_weekday_d';
    const savedKey2 = localStorage.getItem('saved_board_2') || 'tokaido_kanayama_weekday_u';
    const savedKey3 = localStorage.getItem('saved_board_3') || 'chuo_nagoya_weekday_d';

    select1.value = savedKey1;
    select2.value = savedKey2;
    select3.value = savedKey3;

    // 2. 復元した設定に基づいてデータをロード
    loadTimetableForBoard(1, savedKey1);
    loadTimetableForBoard(2, savedKey2);
    loadTimetableForBoard(3, savedKey3);

    // 3. 保存ボタンのクリックイベント
    saveBtn.addEventListener('click', () => {
        const key1 = select1.value;
        const key2 = select2.value;
        const key3 = select3.value;

        // 選択状態を保存
        localStorage.setItem('saved_board_1', key1);
        localStorage.setItem('saved_board_2', key2);
        localStorage.setItem('saved_board_3', key3);

        // 新しい設定で画面を再ロード
        loadTimetableForBoard(1, key1);
        loadTimetableForBoard(2, key2);
        loadTimetableForBoard(3, key3);

        // 保存完了メッセージを一瞬表示
        saveMsg.classList.add('msg-visible');
        setTimeout(() => saveMsg.classList.remove('msg-visible'), 2000);
    });

    // 定期更新（10秒ごと）
    setInterval(tickAllBoards, 10000);

    // ウィンドウサイズ変更時の長体再計算
    window.addEventListener('resize', () => {
        adjustDestinationWidth(1, 1); adjustDestinationWidth(1, 2);
        adjustDestinationWidth(2, 1); adjustDestinationWidth(2, 2);
        adjustDestinationWidth(3, 1); adjustDestinationWidth(3, 2);
    });
});