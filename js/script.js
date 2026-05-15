// 行先テキストの幅を調整する関数
function adjustDestinationWidth(rowNumber) {
    const container = document.querySelector(`.board-row:nth-child(${rowNumber + 1}) .col-dest`);
    const textElement = document.getElementById(`disp-dest-${rowNumber}`);
    
    // 一旦スケールをリセットして実際の幅を測る
    textElement.style.transform = 'scaleX(1)';
    
    const containerWidth = container.clientWidth - 20; // 左右パディング分を引く
    const textWidth = textElement.scrollWidth;

    if (textWidth > containerWidth) {
        // はみ出す場合、比率を計算して縮小 (scaleX)
        const ratio = containerWidth / textWidth;
        textElement.style.transform = `scaleX(${ratio})`;
    } else {
        // 収まる場合は縮小解除
        textElement.style.transform = 'scaleX(1)';
    }
}

let isAutoUpdateEnabled = true; // 自動更新の初期状態（ON）

const typeData = {
    "local": { text: "普　通", className: "type-local" },
    "semirapid": { text: "区間快速", className: "type-semirapid" },
    "rapid": { text: "快　速", className: "type-rapid" },
    "newrapid": { text: "新快速", className: "type-newrapid" },
    "specialrapid": { text: "特別快速", className: "type-specialrapid"}
};

function setupSync(rowNumber) {
    // 時刻、両数、位置の同期
    ['time', 'cars', 'pos'].forEach(field => {
        const input = document.getElementById(`input-${field}-${rowNumber}`);
        const disp = document.getElementById(`disp-${field}-${rowNumber}`);
        input.addEventListener('input', (e) => { disp.textContent = e.target.value; });
    });

    // 行先の同期と幅調整
    const destInput = document.getElementById(`input-dest-${rowNumber}`);
    const destDisp = document.getElementById(`disp-dest-${rowNumber}`);
    
    destInput.addEventListener('input', (e) => {
        destDisp.textContent = e.target.value;
        adjustDestinationWidth(rowNumber); // 文字が変わるたびに計算
    });

    // 初回実行時にも幅を調整
    adjustDestinationWidth(rowNumber);

    // 種別の同期
    const typeInput = document.getElementById(`input-type-${rowNumber}`);
    const typeDisp = document.getElementById(`disp-type-${rowNumber}`);
    typeInput.addEventListener('change', (e) => {
        const data = typeData[e.target.value];
        typeDisp.textContent = data.text;
        typeDisp.className = 'type-box ' + data.className;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSync(1);
    setupSync(2);
    
    // ウィンドウサイズが変わったときも再計算
    window.addEventListener('resize', () => {
        adjustDestinationWidth(1);
        adjustDestinationWidth(2);
    });
});

// ③ 読み込み失敗時に使用する初期値
const defaultTimetable = [
    { departure: "01:30", type: "local", dest: "塩尻", cars: "8両", pos: "○1～8" },
    { departure: "02:30", type: "specialrapid", dest: "中津川", cars: "8両", pos: "○1～8" }
];

// グローバル変数として時刻表を保持
let timetable = [];

// キャッシュの有効期限（ミリ秒）: 1時間 = 3600000ms
const CACHE_LIFETIME = 60 * 60 * 1000; 

// --- データ取得部分（キャッシュ機能付き） ---
async function loadTimetable(sheetKey) {
    const gid = sheetIds[sheetKey];
    if (!gid) {
        console.error("指定されたシートが存在しません:", sheetKey);
        applyFallback();
        return;
    }

    // 1. キャッシュの確認
    const cacheKey = `timetable_${sheetKey}`;       // データ保存用のキー
    const timeKey = `timetable_${sheetKey}_time`; // 取得時刻保存用のキー

    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(timeKey);

    // キャッシュが存在し、かつ有効期限内であればそれを使う
    if (cachedData && cachedTime) {
        const now = new Date().getTime();
        const timeDiff = now - parseInt(cachedTime, 10);

        if (timeDiff < CACHE_LIFETIME) {
            console.log(`[${sheetKey}] キャッシュからデータを読み込みました`);
            timetable = JSON.parse(cachedData); // JSON文字列を配列に戻す
            updateDisplayFromTimetable(true);
            return; // ここで処理を終了し、フェッチは行わない
        } else {
            // 期限切れデータは破棄する
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timeKey);
            console.log(`[${sheetKey}] キャッシュの有効期限が切れたため破棄しました。再取得します。`);
        }
    }

    // 2. キャッシュがない、または期限切れの場合はCSVをフェッチする
    const url = CSV_BASE_URL + gid;

    try {
        console.log(`[${sheetKey}] ネットワークからCSVを取得中...`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        
        const csvText = await response.text();
        const rows = csvText.trim().split('\n');
        
        // ヘッダーを除き、空行を無視してパース
        timetable = rows.slice(1)
            .filter(row => row.trim() !== '') 
            .map(row => {
                const cols = row.split(',');
                return {
                    departure: cols[0],
                    type: cols[1],
                    dest: cols[2],
                    cars: cols[3],
                    pos: cols[4]
                };
            });

        // 3. 取得したデータをキャッシュとして保存
        localStorage.setItem(cacheKey, JSON.stringify(timetable)); // 配列を文字列化して保存
        localStorage.setItem(timeKey, new Date().getTime().toString()); // 現在のミリ秒を保存

        console.log(`[${sheetKey}] 新しいデータを取得し、キャッシュを更新しました`);
        updateDisplayFromTimetable(true);

    } catch (error) {
        console.warn(`[${sheetKey}] データの取得に失敗しました。`, error);
        
        // エラー時、もし古いキャッシュが残っていれば期限切れでも「暫定的に」それを使う（オフライン対策）
        if (cachedData) {
            console.log("オフライン/エラーのため、期限切れのキャッシュを暫定使用します。");
            timetable = JSON.parse(cachedData);
            updateDisplayFromTimetable(true);
        } else {
            // キャッシュすら無ければ初期値を適用
            applyFallback();
        }
    }
}

// 失敗時に初期値をセットする関数
function applyFallback() {
    timetable = [...defaultTimetable];
    
    updateDisplayFromTimetable();
}

document.addEventListener('DOMContentLoaded', () => {
    initSelectOptions();

    // 初期読み込み
    loadTimetable("tokaido_kanayama_weekday_d"); // 起動時デフォルト
    
    // 定期更新（10秒ごと）
    setInterval(updateDisplayFromTimetable, 10000);
});

// 時間の文字列 (例: "15:30") を、0時からの合計分数 (例: 930) に変換する関数
function timeToMinutes(timeStr) {
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    // 0時〜3時台は「翌日」として扱い、+24時間（24時〜27時）にする
    if (hours >= 0 && hours <= 3) {
        hours += 24;
    }

    return hours * 60 + minutes;
}

// 時刻表から「これからの列車」を探して表示を更新するメイン関数
function updateDisplayFromTimetable() {
    // 自動更新がOFFの場合は、ここで処理を抜ける
    if (!isAutoUpdateEnabled) {
        return;
    }

    const now = new Date();
    // 現在時刻
    let currentHours = now.getHours();
    const currentMins = now.getMinutes();

    // 現在時刻も、0時〜3時の間は「24時〜27時」として扱う
    if (currentHours >= 0 && currentHours <= 3) {
        currentHours += 24;
    }

    const currentMinutes = currentHours * 60 + currentMins;

    // 時刻表配列から、現在時刻「以降」に発車する列車だけを抽出（フィルタリング）
    const upcomingTrains = timetable.filter(train => {
        return timeToMinutes(train.departure) >= currentMinutes;
    });

    // 1段目と2段目の表示を更新
    for (let i = 1; i <= 2; i++) {
        // upcomingTrains[0] が次発、upcomingTrains[1] が次々発
        const train = upcomingTrains[i - 1];

        if (train) {
            // 列車データがある場合、各DOMのテキストを更新
            document.getElementById(`disp-time-${i}`).textContent = train.departure;
            document.getElementById(`disp-dest-${i}`).textContent = train.dest;
            document.getElementById(`disp-cars-${i}`).textContent = train.cars;
            document.getElementById(`disp-pos-${i}`).textContent = train.pos;

            // 種別ボックスの更新
            const typeDisp = document.getElementById(`disp-type-${i}`);
            const tData = typeData[train.type];
            typeDisp.textContent = tData.text;
            typeDisp.className = 'type-box ' + tData.className;

            // 長い駅名に対応するための関数を呼び出し
            adjustDestinationWidth(i);

            // 入力フォームの内容を更新
            document.getElementById(`input-time-${i}`).value = train.departure;
            document.getElementById(`input-dest-${i}`).value = train.dest;
            document.getElementById(`input-cars-${i}`).value = train.cars;
            document.getElementById(`input-pos-${i}`).value = train.pos;
            
            // select要素の選択状態も更新
            document.getElementById(`input-type-${i}`).value = train.type;
        } else {
            // 本日の最終電車が終わった場合などの処理（表示を消す）
            document.getElementById(`disp-time-${i}`).textContent = "";
            document.getElementById(`disp-dest-${i}`).textContent = "";
            document.getElementById(`disp-cars-${i}`).textContent = "";
            document.getElementById(`disp-pos-${i}`).textContent = "";
            const typeDisp = document.getElementById(`disp-type-${i}`);
            typeDisp.textContent = "";
            typeDisp.className = 'type-box'; 

            // 入力フォームをクリア
            document.getElementById(`input-time-${i}`).value = "";
            document.getElementById(`input-dest-${i}`).value = "";
            document.getElementById(`input-cars-${i}`).value = "";
            document.getElementById(`input-pos-${i}`).value = "";
            document.getElementById(`input-type-${i}`).value = "local"; // デフォルト値など
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // トグルスイッチのイベントリスナー設定
    const toggleCheckbox = document.getElementById('auto-update-toggle');

    toggleCheckbox.addEventListener('change', (e) => {
        isAutoUpdateEnabled = e.target.checked;
        
        // OFF -> ON に切り替えた瞬間は、即座に時刻表データで上書きする
        if (isAutoUpdateEnabled) {
            updateDisplayFromTimetable();
        }
    });

    // 10秒(10000ミリ秒)ごとに updateDisplayFromTimetable を実行し続ける
    setInterval(updateDisplayFromTimetable, 10000);

    // ウィンドウサイズ変更時の長体再計算
    window.addEventListener('resize', () => {
        adjustDestinationWidth(1);
        adjustDestinationWidth(2);
    });
});

document.getElementById('schedule-selector').addEventListener('change', (e) => {
    const selectedKey = e.target.value;
    loadTimetable(selectedKey);
});