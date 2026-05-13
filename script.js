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

// 時刻表データからリアルタイムに表示する情報を更新する
// スプレッドシートの公開CSV URL
const CSV_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSUtXNKeKAMDN6dXxti5lbUcL8RHC1Hv5cICtJjHdwA7iS4pF44y1hWvWYK1udPhlXrZcySZGIk8dFU/pub?output=csv&single=true&gid=";

// シートID
const sheetIds = {
    "chuo_nagoya_weekday_d": "0",          // 中央西線名古屋平日下りシートのgid
    "chuo_nagoya_holiday_d": "393799729",  // 中央西線名古屋休日下りシートのgid
    "chuo_tsurumai_weekday_d": "2108810631", // 中央西線鶴舞平日下りシートのgid
    "chuo_tsurumai_holiday_d": "1025263841", // 中央西線鶴舞休日下りシートのgid
    "chuo_tsurumai_weekday_u": "672148058", // 中央西線鶴舞平日上りシートのgid
    "chuo_tsurumai_holiday_u": "1531316906",  // 中央西線鶴舞休日上りシートのgid
    "subway_tsurumai_weekday_t": "1138879033", // 地下鉄鶴舞平日豊田市方面
    "subway_tsurumai_holiday_t": "667488261", // 地下鉄鶴舞休日豊田市方面
    "subway_shiogama_weekday_k": "371307575", // 地下鉄塩釜口平日上小田井方面
    "subway_shiogama_holiday_k": "1015188927"  // 地下鉄塩釜口休日上小田井方面
};

// ③ 読み込み失敗時に使用する初期値（画像通りの表示設定）
const defaultTimetable = [
    { departure: "01:30", type: "local", dest: "塩尻", cars: "8両", pos: "○1～8" },
    { departure: "02:30", type: "specialrapid", dest: "中津川", cars: "8両", pos: "○1～8" }
    // 必要に応じて3段目以降のダミーデータも追加可能
];

// グローバル変数として時刻表を保持
let timetable = [];

// 指定したキー（例："chuo_weekday"）のシートを読み込む関数
async function loadTimetable(sheetKey) {
    const gid = sheetIds[sheetKey];
    if (!gid) {
        console.error("指定されたシートが存在しません:", sheetKey);
        applyFallback();
        return;
    }

    const url = CSV_BASE_URL + gid;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        
        const csvText = await response.text();
        const rows = csvText.trim().split('\n');
        
        // ヘッダーを除き、空行を無視してパース
        timetable = rows.slice(1)
            .filter(row => row.trim() !== '') // 空行を除外
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

        console.log(`[${sheetKey}] データの読み込みに成功しました`);
        updateDisplayFromTimetable();

    } catch (error) {
        console.warn("データの読み込みに失敗しました。初期値を適用します。", error);
        applyFallback();
    }
}

// 失敗時に初期値をセットする関数
function applyFallback() {
    timetable = [...defaultTimetable];
    
    updateDisplayFromTimetable();
}

document.addEventListener('DOMContentLoaded', () => {
    // 起動時は平日のデータを読み込む（テスト用に休日を指定してもOK）
    loadTimetable("chuo_tsurumai_weekday_u"); 
    
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